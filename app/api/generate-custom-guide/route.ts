import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { meterGuide, planBlockResponse, releaseUsage } from '@/lib/plans'
import { consentBlockResponse } from '@/lib/consent'
import { fetchUploadedImages } from '@/lib/uploads/server-images'
import { ClaudeService } from '@/lib/claude-api'
import { CustomSection } from '@/lib/types/custom-guide'

// Helper to extract complete section objects from streaming JSON
function extractCompleteSections(buffer: string, alreadyExtracted: number): { sections: CustomSection[], newExtractedCount: number } {
  const sections: CustomSection[] = []
  let newExtractedCount = alreadyExtracted

  // Look for the "sections" array start
  const sectionsMatch = buffer.match(/"sections"\s*:\s*\[/)
  if (!sectionsMatch) return { sections, newExtractedCount }

  const sectionsStart = buffer.indexOf('[', sectionsMatch.index!)
  if (sectionsStart === -1) return { sections, newExtractedCount }

  // Extract content after "sections": [
  const arrayContent = buffer.slice(sectionsStart + 1)

  // Track bracket depth to find complete section objects
  let depth = 0
  let sectionStart = -1
  let inString = false
  let escapeNext = false
  let sectionCount = 0

  for (let i = 0; i < arrayContent.length; i++) {
    const char = arrayContent[i]

    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      escapeNext = true
      continue
    }

    if (char === '"' && !escapeNext) {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{') {
      if (depth === 0) {
        sectionStart = i
      }
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0 && sectionStart !== -1) {
        sectionCount++
        // We found a complete section object
        if (sectionCount > alreadyExtracted) {
          const sectionJson = arrayContent.slice(sectionStart, i + 1)
          try {
            const section = JSON.parse(sectionJson)
            if (section && section.id && section.type) {
              sections.push(section)
              newExtractedCount = sectionCount
            }
          } catch {
            // Not valid JSON yet, skip
          }
        }
        sectionStart = -1
      }
    } else if (char === ']' && depth === 0) {
      // End of sections array
      break
    }
  }

  return { sections, newExtractedCount }
}

export async function POST(request: NextRequest) {
  // Generating costs real money: signed-in users only (identity from the session).
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Please sign in to generate a guide.' }, { status: 401 })
  const consentBlock = await consentBlockResponse(user.id) // under-13s need a parent's OK first
  if (consentBlock) return consentBlock

  // Parse request body first to validate before setting up stream
  let body
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { description, subject, gradeLevel, existingContent, mode, controls, visuals, codeEditor } = body
  // Prepared in the browser (lib/uploads/prepare.ts): text from files, and uploaded photos/scanned pages.
  const directContent: Array<{ name: string; content: string }> = Array.isArray(body.directContent)
    ? body.directContent.filter((d: { content?: unknown }) => typeof d?.content === 'string').map((d: { name?: unknown; content: string }) => ({ name: String(d.name ?? 'file').slice(0, 120), content: d.content.slice(0, 200000) }))
    : []
  const imageList = Array.isArray(body.images) ? body.images : []

  const hasFiles = directContent.length > 0 || imageList.length > 0
  const hasControls = !!controls && Array.isArray(controls.formats) && controls.formats.length > 0

  // Debug logging
  console.log('📚 Generate Custom Guide API - Received request:', {
    hasDescription: !!description,
    subject,
    gradeLevel,
    mode,
    hasFiles,
    textFiles: directContent.length,
    images: imageList.length,
    hasControls,
    hasExistingContent: !!existingContent,
    existingContentLength: existingContent?.length || 0
  })

  // A description is optional in "generic" mode as long as the user gave the AI
  // something else to work from — source files or structured format controls.
  if (!description?.trim() && !hasFiles && !hasControls) {
    return NextResponse.json({ error: 'Add a description, upload source materials, or choose formats for the AI to generate' }, { status: 400 })
  }

  // Initialize Claude service before starting stream
  let claudeService: ClaudeService
  try {
    claudeService = new ClaudeService()
  } catch (error) {
    console.error('Failed to initialize Claude service:', error)
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Failed to initialize AI service'
    }, { status: 500 })
  }

  // The builder's AI is Premium only; each run counts toward Premium's monthly guides.
  const meter = await meterGuide(user.id, { customAi: true })
  if (meter.block) return planBlockResponse(meter.block)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Text read in the browser (lib/uploads/prepare.ts) and photos from the uploads bucket.
        let sourceContent = ''
        if (directContent.length) {
          sourceContent = [sourceContent, ...directContent.map(d => `--- ${d.name} ---\n${d.content}`)].filter(Boolean).join('\n\n')
        }
        let images: Awaited<ReturnType<typeof fetchUploadedImages>> = []
        if (imageList.length) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message: 'Loading your photos...' }) + '\n\n'))
          images = await fetchUploadedImages(imageList, user.id)
        }

        // Send progress update
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'progress',
          message: (sourceContent || images.length > 0) ? 'Analyzing source materials...' : 'Generating your study guide...'
        }) + '\n\n'))

        let fullContent = ''
        let extractedSectionCount = 0
        let lastProgressUpdate = Date.now()

        const streamGenerator = claudeService.generateCustomGuideStream({
          description: description || '',
          subject,
          gradeLevel,
          existingContent,
          sourceContent,
          mode,
          controls,
          visuals: visuals !== false,
          codeEditor: codeEditor !== false,
          images: images.length > 0 ? images : undefined,
        })

        for await (const chunk of streamGenerator) {
          if (typeof chunk === 'string') {
            fullContent += chunk

            // Try to extract new complete sections
            const { sections: newSections, newExtractedCount } = extractCompleteSections(
              fullContent,
              extractedSectionCount
            )

            // Send each new section immediately
            for (const section of newSections) {
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                type: 'section',
                section
              }) + '\n\n'))
              console.log(`📤 Sent section: ${section.id} (${section.type})`)
            }

            extractedSectionCount = newExtractedCount

            // Send periodic progress updates
            const now = Date.now()
            if (now - lastProgressUpdate > 2000) {
              controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                type: 'progress',
                message: extractedSectionCount > 0
                  ? `Generated ${extractedSectionCount} section${extractedSectionCount > 1 ? 's' : ''}...`
                  : 'Generating content...'
              }) + '\n\n'))
              lastProgressUpdate = now
            }
          }
        }

        // Try to parse the final JSON content for validation
        try {
          // Clean up the content - remove markdown code blocks if present
          let jsonContent = fullContent.trim()
          if (jsonContent.startsWith('```json')) {
            jsonContent = jsonContent.slice(7)
          } else if (jsonContent.startsWith('```')) {
            jsonContent = jsonContent.slice(3)
          }
          if (jsonContent.endsWith('```')) {
            jsonContent = jsonContent.slice(0, -3)
          }
          jsonContent = jsonContent.trim()

          const parsedContent = JSON.parse(jsonContent)

          // Send completion (client may already have all sections, but this confirms we're done)
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'complete',
            customContent: parsedContent,
            sectionCount: parsedContent.sections?.length || 0
          }) + '\n\n'))
        } catch (parseError) {
          console.error('Failed to parse generated content:', parseError)
          // Even if final parse fails, sections were already sent incrementally
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            message: 'Content generation completed but final validation failed. Some sections may have been added.',
            rawContent: fullContent
          }) + '\n\n'))
        }

        controller.close()

      } catch (error) {
        console.error('Custom guide generation error:', error)
        await releaseUsage(meter.eventId)
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
