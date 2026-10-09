import { NextRequest } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { FileProcessor } from '@/lib/file-processing'
import { StudyGuideRequest } from '@/types'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { GOAL_VALUES, MATERIALS_KINDS, normalizeDifficulty, type MaterialsKind } from '@/lib/study-options'
import { hasPremiumFeatures, meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { consentBlockResponse } from '@/lib/consent'
import { buildProfile, learnerHistoryNote } from '@/lib/learner/profile'
import { fetchUploadedImages } from '@/lib/uploads/server-images'
import { parseAdaptive } from '@/lib/adaptive/format'

function sseError(message: string, status: number) {
  return new Response('data: ' + JSON.stringify({ type: 'error', message }) + '\n\n', { status, headers: { 'Content-Type': 'text/event-stream' } })
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  // Identity comes only from the session (never a body userId). Writes use the
  // admin client with that verified id, so they don't depend on RLS.
  const user = await getRequestUser(request)
  if (!user) return sseError('Please sign in to create a study guide', 401)
  // Under-13 students need a parent's OK before anything goes to the AI (COPPA).
  const consentBlock = await consentBlockResponse(user.id)
  if (consentBlock) return consentBlock
  const supabase = createAdminClient()

  // Validate before metering, so a bad request never uses up a guide.
  let body: StudyGuideRequest
  try { body = await request.json() } catch { return sseError('Invalid request', 400) }
  const hasCloudinaryFiles = body.cloudinaryFiles && body.cloudinaryFiles.length > 0
  const hasDirectContent = body.directContent && body.directContent.length > 0
  const hasLegacyFiles = body.files && body.files.length > 0
  // Photos and scanned pages, prepared in the browser and uploaded to Cloudinary.
  const hasImages = Array.isArray(body.images) && body.images.length > 0
  // Students can type what they want to study instead of uploading files.
  const studyRequest = typeof body.studyRequest === 'string' ? body.studyRequest.trim().slice(0, 8000) : ''
  if (!hasCloudinaryFiles && !hasDirectContent && !hasLegacyFiles && !hasImages && studyRequest.length < 3) {
    return sseError('Upload a file or describe what you want to study', 400)
  }
  if (!body.studyGuideName || !body.subject || !body.gradeLevel || !body.format) {
    return sseError('Missing required fields', 400)
  }

  // Plan (lib/plans.ts): free accounts get the four original formats (no Long, no Hard) and 3 guides a week.
  const meter = await meterGuide(user.id, { format: body.format, length: body.length, difficulty: normalizeDifficulty(body.difficultyLevel) })
  if (meter.block) return planBlockResponse(meter.block)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('🚀 Study guide streaming generation started')

        // Send progress update
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Processing your materials...' }) + '\n\n'))

        // Process files from multiple sources
        let allContent: Array<{ name: string; content: string }> = []

        // 1. Process Cloudinary files (fetched and text-extracted server-side)
        if (hasCloudinaryFiles && body.cloudinaryFiles) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Loading your files...' }) + '\n\n'))
          const processedFiles = await Promise.all(
            body.cloudinaryFiles.map(async (cloudinaryFile) => {
              return await FileProcessor.processFileFromUrl(cloudinaryFile.url, cloudinaryFile.filename)
            })
          )
          allContent.push(...processedFiles.map(f => ({ name: f.name, content: f.content })))
        }

        // 2. Add directly processed content (already extracted client-side, bypassed Cloudinary)
        if (hasDirectContent && body.directContent) {
          console.log('Adding direct content:', body.directContent.map((c) => c.name))
          allContent.push(...body.directContent)
        }

        // 3. Handle legacy files format (if any)
        if (hasLegacyFiles && !hasCloudinaryFiles && !hasDirectContent) {
          allContent.push(...body.files!.map((f: { name: string; content: string }) => ({ name: f.name, content: f.content })))
        }

        // 4. Photos and scanned pages go to Claude as images.
        let images: Awaited<ReturnType<typeof fetchUploadedImages>> = []
        if (hasImages) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Loading your photos...' }) + '\n\n'))
          images = await fetchUploadedImages(body.images)
        }

        // Combine all content
        const combinedContent = allContent
          .map(file => `--- ${file.name} ---\n${file.content}`)
          .join('\n\n')

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: allContent.length || hasImages ? 'Creating your study guide...' : 'Writing your study guide from your topic...' }) + '\n\n'))

        // Premium: lean the guide on this student's weak spots in this subject/topic.
        let learnerNote = ''
        if (await hasPremiumFeatures(user.id)) {
          const { data: history } = await supabase
            .from('study_results')
            .select('subject, topic, correct, answered_at, study_guide_id')
            .eq('user_id', user.id)
            .order('answered_at', { ascending: false })
            .limit(2000)
          if (history?.length) {
            learnerNote = learnerHistoryNote(buildProfile(history), {
              subject: body.subject,
              text: [studyRequest, body.topicFocus, body.studyGuideName].filter(Boolean).join('\n'),
            })
          }
        }

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
          difficultyLevel: normalizeDifficulty(body.difficultyLevel),
          additionalInstructions: body.additionalInstructions,
          studyRequest: studyRequest || undefined,
          goal: body.goal && GOAL_VALUES.includes(body.goal) ? body.goal : undefined,
          sourcePolicy: body.sourcePolicy === 'expand' ? 'expand' : 'strict',
          materialsKind: MATERIALS_KINDS.includes(body.materialsKind as MaterialsKind) ? (body.materialsKind as MaterialsKind) : undefined,
          visuals: body.visuals !== false,
          length: body.length === 'short' || body.length === 'long' ? body.length : 'medium',
          images,
          learnerNote,
        })

        // Iterate manually: for-await drops the generator's return value (the usage).
        while (true) {
          const next = await streamGenerator.next()
          if (next.done) {
            usage = next.value?.usage ?? null
            break
          }
          fullContent += next.value
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', chunk: next.value }) + '\n\n'))
        }

        // Adaptive practice is only playable with enough well-formed questions; otherwise
        // fail here (the catch gives the session back) rather than save a broken one.
        if (body.format === 'adaptive' && parseAdaptive(fullContent).questions.length < 8) {
          throw new Error("Your practice questions didn't come out right. Please try again.")
        }

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Saving to database...' }) + '\n\n'))

        // No name given: use the guide's own H1 title rather than the raw topic text.
        let title = body.studyGuideName
        if (body.autoTitle) {
          const h1 = fullContent.match(/^#\s+(.+)$/m)?.[1]
            ?.replace(/\p{Extended_Pictographic}\uFE0F?/gu, '')
            .replace(/[*_`]/g, '')
            .trim()
          if (h1 && h1.length >= 3) title = h1.slice(0, 120)
        }

        // Generated from a study plan unit? Link it back — only to the caller's own plan.
        let parentGuideId: string | null = null
        let planUnit: string | null = null
        if (body.planId && body.planUnit) {
          const { data: plan } = await supabase
            .from('study_guides')
            .select('id, format, user_id')
            .eq('id', body.planId)
            .single()
          const ownerId = user.id
          if (plan && plan.format === 'plan' && ownerId && plan.user_id === ownerId) {
            parentGuideId = plan.id
            planUnit = String(body.planUnit).slice(0, 40)
          }
        }

        // No subject given: work it out from the finished guide, so answers to it
        // land under the right subject on the Progress page.
        let subject = body.subject
        if (!subject || subject === 'general') {
          try {
            subject = (await claudeService.classifySubject({ title, request: studyRequest || body.topicFocus, excerpt: fullContent })) ?? 'general'
          } catch (e) {
            console.error('Subject classification failed:', e)
            subject = 'general'
          }
        }

        // Save to Supabase
        const { data: savedGuide, error: supabaseError } = await supabase
          .from('study_guides')
          .insert({
            title,
            subject,
            grade_level: body.gradeLevel,
            format: body.format,
            content: fullContent,
            topic_focus: body.topicFocus || (studyRequest ? studyRequest.slice(0, 200) : undefined),
            difficulty_level: normalizeDifficulty(body.difficultyLevel),
            additional_instructions: body.additionalInstructions,
            file_count: (body.cloudinaryFiles?.length || 0) + (body.directContent?.length || 0) + (body.files?.length || 0) + (body.images?.length || 0),
            token_usage: usage,
            user_id: user.id,
            parent_guide_id: parentGuideId,
            plan_unit: planUnit
          })
          .select()
          .single()

        if (supabaseError || !savedGuide) {
          await releaseUsage(meter.eventId)
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
        await releaseUsage(meter.eventId) // nothing was saved, so it doesn't count
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
