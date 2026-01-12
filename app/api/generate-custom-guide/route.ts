import { NextRequest, NextResponse } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { FileProcessor } from '@/lib/file-processing'
import { CustomSection } from '@/lib/types/custom-guide'

interface CloudinaryFile {
  url: string
  filename: string
}

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
  // Parse request body first to validate before setting up stream
  let body
  try {
    body = await request.json()
  } catch (e) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { description, subject, gradeLevel, existingContent, cloudinaryFiles, mode } = body

  // Debug logging
  console.log('📚 Generate Custom Guide API - Received request:', {
    hasDescription: !!description,
    subject,
    gradeLevel,
    mode,
    hasCloudinaryFiles: !!cloudinaryFiles && cloudinaryFiles.length > 0,
    fileCount: cloudinaryFiles?.length || 0,
    hasExistingContent: !!existingContent,
    existingContentLength: existingContent?.length || 0
  })

  if (!description?.trim()) {
    return NextResponse.json({ error: 'Please provide a description for your study guide' }, { status: 400 })
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

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Process Cloudinary files if provided (same as home page - /api/generate-study-guide-stream)
        let sourceContent = ''
        let pdfDocuments: Array<{ buffer: Buffer; filename: string }> = [] // Fallback for PDFs that couldn't be text-extracted

        if (cloudinaryFiles && cloudinaryFiles.length > 0) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'progress',
            message: 'Processing your source materials...'
          }) + '\n\n'))

          const processedTexts: string[] = []

          for (const file of cloudinaryFiles as CloudinaryFile[]) {
            console.log(`📄 Processing file from Cloudinary: ${file.filename}`)
            console.log(`📄 URL: ${file.url}`)

            try {
              // Try normal text extraction first
              const processedFile = await FileProcessor.processFileFromUrl(file.url, file.filename)
              processedTexts.push(`--- ${processedFile.name} ---\n${processedFile.content}`)
              console.log(`✅ Text extraction successful for ${file.filename}: ${processedFile.content.length} chars`)
            } catch (extractionError) {
              console.warn(`⚠️ Text extraction failed for ${file.filename}:`, extractionError instanceof Error ? extractionError.message : extractionError)

              // Check if it's a PDF - if so, download the raw buffer for Claude's native PDF reading
              const isPdf = file.filename.toLowerCase().endsWith('.pdf') || file.url.toLowerCase().includes('.pdf')

              if (isPdf) {
                console.log(`📄 Falling back to Claude's native PDF reading for ${file.filename}`)
                controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                  type: 'progress',
                  message: `Using AI vision for ${file.filename}...`
                }) + '\n\n'))

                try {
                  // Download the raw PDF buffer
                  const response = await fetch(file.url)
                  if (!response.ok) {
                    throw new Error(`Failed to download PDF: ${response.status}`)
                  }
                  const arrayBuffer = await response.arrayBuffer()
                  const buffer = Buffer.from(arrayBuffer)

                  pdfDocuments.push({ buffer, filename: file.filename })
                  console.log(`✅ PDF buffer downloaded for Claude vision: ${file.filename} (${buffer.length} bytes)`)
                } catch (downloadError) {
                  console.error(`❌ Failed to download PDF for vision fallback:`, downloadError)
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                    type: 'error',
                    message: `Failed to process ${file.filename}: ${extractionError instanceof Error ? extractionError.message : 'Unknown error'}`
                  }) + '\n\n'))
                  controller.close()
                  return
                }
              } else {
                // Non-PDF file failed extraction - report error
                controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                  type: 'error',
                  message: extractionError instanceof Error ? extractionError.message : 'Failed to process source files'
                }) + '\n\n'))
                controller.close()
                return
              }
            }
          }

          // Combine successfully extracted text
          if (processedTexts.length > 0) {
            sourceContent = processedTexts.join('\n\n')
            console.log(`✅ Processed ${processedTexts.length} files with text extraction, total: ${sourceContent.length} chars`)
          }

          // Log if we have PDF documents for vision fallback
          if (pdfDocuments.length > 0) {
            console.log(`📄 ${pdfDocuments.length} PDF(s) will be sent directly to Claude for vision reading`)
          }
        }

        // Send progress update
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'progress',
          message: (sourceContent || pdfDocuments.length > 0) ? 'Analyzing source materials...' : 'Generating your study guide...'
        }) + '\n\n'))

        let fullContent = ''
        let extractedSectionCount = 0
        let lastProgressUpdate = Date.now()

        const streamGenerator = claudeService.generateCustomGuideStream({
          description,
          subject,
          gradeLevel,
          existingContent,
          sourceContent,
          mode,
          // Pass PDF documents for Claude's native PDF reading when text extraction failed
          pdfDocuments: pdfDocuments.length > 0 ? pdfDocuments : undefined
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
