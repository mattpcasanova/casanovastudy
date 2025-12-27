import { NextRequest } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { FileProcessor } from '@/lib/file-processing'
import { StudyGuideRequest } from '@/types'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  // Get authenticated user (if any)
  const user = await getAuthenticatedUser(request)
  const supabase = createRouteHandlerClient(request)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('🚀 Study guide streaming generation started')
        const body: StudyGuideRequest = await request.json()

        // Validate request
        if ((!body.files || body.files.length === 0) && (!body.cloudinaryFiles || body.cloudinaryFiles.length === 0)) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'error', message: 'No files provided' }) + '\n\n'))
          controller.close()
          return
        }

        if (!body.studyGuideName || !body.subject || !body.gradeLevel || !body.format) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'error', message: 'Missing required fields' }) + '\n\n'))
          controller.close()
          return
        }

        // Send progress update
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Processing your materials...' }) + '\n\n'))

        // Process files
        let processedFiles
        if (body.cloudinaryFiles && body.cloudinaryFiles.length > 0) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Loading your files...' }) + '\n\n'))
          processedFiles = await Promise.all(
            body.cloudinaryFiles.map(async (cloudinaryFile) => {
              return await FileProcessor.processFileFromUrl(cloudinaryFile.url, cloudinaryFile.filename)
            })
          )
        } else {
          processedFiles = body.files!
        }

        // Combine content
        const combinedContent = processedFiles
          .map(file => `--- ${file.name} ---\n${file.content}`)
          .join('\n\n')

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Creating your study guide...' }) + '\n\n'))

        // Generate with streaming
        const claudeService = new ClaudeService()
        let fullContent = ''
        let usage: any = null

        const streamGenerator = claudeService.generateStudyGuideStream({
          content: combinedContent,
          subject: body.subject,
          gradeLevel: body.gradeLevel,
          format: body.format,
          topicFocus: body.topicFocus,
          difficultyLevel: body.difficultyLevel,
          additionalInstructions: body.additionalInstructions
        })

        for await (const chunk of streamGenerator) {
          if (typeof chunk === 'string') {
            fullContent += chunk
            // Send content chunk
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', chunk }) + '\n\n'))
          } else {
            // Final result with usage
            usage = chunk.usage
          }
        }

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Saving to database...' }) + '\n\n'))

        // Save to Supabase
        const { data: savedGuide, error: supabaseError } = await supabase
          .from('study_guides')
          .insert({
            title: body.studyGuideName,
            subject: body.subject,
            grade_level: body.gradeLevel,
            format: body.format,
            content: fullContent,
            topic_focus: body.topicFocus,
            difficulty_level: body.difficultyLevel,
            additional_instructions: body.additionalInstructions,
            file_count: body.cloudinaryFiles?.length || body.files?.length || 0,
            token_usage: usage,
            user_id: user?.id || null  // Associate with authenticated user
          })
          .select()
          .single()

        if (supabaseError || !savedGuide) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'error', message: `Failed to save: ${supabaseError?.message}` }) + '\n\n'))
          controller.close()
          return
        }

        const totalTime = Date.now() - startTime
        console.log(`🎉 Streaming generation completed in ${totalTime}ms`)

        // Send completion with study guide URL
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'complete',
          studyGuideUrl: `/study-guide/${savedGuide.id}`,
          id: savedGuide.id,
          title: savedGuide.title,
          format: savedGuide.format
        }) + '\n\n'))

        controller.close()

      } catch (error) {
        console.error('❌ Streaming generation error:', error)
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to generate study guide'
        }) + '\n\n'))
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
