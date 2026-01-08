import { NextRequest } from 'next/server'
import { ClaudeService } from '@/lib/claude-api'
import { getAuthenticatedUser, createAdminClient } from '@/lib/supabase-server'

// Vercel config for longer timeout and larger body size (for image uploads)
export const maxDuration = 300 // 5 minutes (requires Vercel Pro for >60s)
export const dynamic = 'force-dynamic'

// Helper to normalize question numbers for deduplication
function normalizeQuestionNumber(qNum: string): string {
  // Normalize for comparison but KEEP section prefixes to distinguish
  // Section A "2a" from Section C "2a"
  return qNum
    .toLowerCase()
    .replace(/^question\s*/i, '')  // Remove "Question" prefix
    .replace(/^q\.?\s*/i, '')       // Remove "Q" or "Q." prefix
    .replace(/\s+/g, '')            // Remove all whitespace for comparison
    .replace(/\(/g, '(')
    .replace(/\)/g, ')')
    // Keep section prefixes like "sectiona", "sectionb", "sectionc" intact
}

// Helper to parse the grading response into structured breakdown
function parseGradingResponse(content: string) {
  const breakdown: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
  }> = []

  // Remove markdown formatting for easier parsing
  const cleanContent = content.replace(/\*\*/g, '')

  // Highly flexible pattern that captures ANY question-like entry with marks
  // Matches: "Question X", "Section A 1(a)", "1a", "1(a)(i)", "Part A 1", "Option 1", etc. followed by Mark: X/Y
  // The lookahead handles many boundary patterns for versatility across different exam formats:
  // - "Question X" (standard)
  // - "Section [A-Z]" (UK A-level style)
  // - "Part [A-Z0-9]" (some US exams)
  // - "Option [0-9]" (choice questions)
  // - "[number][letter], Mark:" (bare numbered questions like "2b, Mark:")
  // - Standard endings: Total, Percentage, Grade, Feedback, Strengths, Areas
  const questionPattern = /(?:Question\s+)?([A-Za-z0-9\s()]+?)[,:\s]+Mark[s]?[:\s]*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*[-–—:]?\s*(.*?)(?=(?:Question\s+\S)|(?:Section\s+[A-Z])|(?:Part\s+[A-Z0-9])|(?:Option\s+[0-9])|(?:\d+[a-z]?\s*[),:\s]+Mark)|Total[:\s]|Percentage[:\s]|Grade[:\s]|Feedback|Strengths|Areas|$)/gis

  const seenQuestions = new Set<string>()
  const results: Array<{
    questionNumber: string
    marksAwarded: number
    marksPossible: number
    explanation: string
    index: number
  }> = []

  let match
  while ((match = questionPattern.exec(cleanContent)) !== null) {
    const rawQuestionNum = match[1].trim()

    // Validate question number format:
    // - Should be short (real question numbers are < 50 chars to allow "Section C Option 2(a)")
    // - Should not contain instruction-like phrases
    // - Should start with digit, letter, or "Section"
    if (rawQuestionNum.length > 50 ||
        /according|scheme|grading|instruct|evaluat|systematic|shows|correct|identified|explained/i.test(rawQuestionNum) ||
        !/^(\d|[a-z]|section|part|option)/i.test(rawQuestionNum)) continue

    // Additional validation: must look like a question identifier
    // Should contain at least one digit or be a section reference
    if (!/\d/.test(rawQuestionNum) && !/^section/i.test(rawQuestionNum)) continue

    const normalizedNum = normalizeQuestionNumber(rawQuestionNum)

    // Skip duplicates
    if (seenQuestions.has(normalizedNum)) continue
    seenQuestions.add(normalizedNum)

    results.push({
      questionNumber: rawQuestionNum,
      marksAwarded: parseFloat(match[2]),
      marksPossible: parseFloat(match[3]),
      explanation: match[4].trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ').substring(0, 2000),
      index: match.index
    })
  }

  // Sort by index to maintain order in which they appeared
  results.sort((a, b) => a.index - b.index)

  // Add to breakdown without the index
  for (const r of results) {
    breakdown.push({
      questionNumber: r.questionNumber,
      marksAwarded: r.marksAwarded,
      marksPossible: r.marksPossible,
      explanation: r.explanation
    })
  }

  // NOTE: Questions are kept in the order Claude outputs them (mark scheme order)
  // No sorting - chronological order as they appear on the test/mark scheme

  // Always calculate totals from the breakdown (more accurate than Claude's Total line)
  const totalMarks = breakdown.reduce((sum, q) => sum + q.marksAwarded, 0)
  const totalPossible = breakdown.reduce((sum, q) => sum + q.marksPossible, 0)

  // Always calculate grade from percentage (American scale)
  // Don't trust Claude's grade - it might use different scales (e.g., "E" which isn't American)
  const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0
  let grade = 'F'
  if (percentage >= 90) grade = 'A'
  else if (percentage >= 80) grade = 'B'
  else if (percentage >= 70) grade = 'C'
  else if (percentage >= 60) grade = 'D'

  return { breakdown, totalMarks, totalPossible, grade }
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  // Get authenticated user (try cookie auth first, fall back to FormData userId)
  let userId: string | null = null
  const cookieUser = await getAuthenticatedUser(request)

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('🚀 Grade exam streaming started')

        const formData = await request.formData()

        // Authentication check
        if (cookieUser) {
          userId = cookieUser.id
        } else {
          const formUserId = formData.get('userId') as string | null
          if (formUserId) {
            userId = formUserId
          }
        }

        if (!userId) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            message: 'You must be logged in to use the grading feature'
          }) + '\n\n'))
          controller.close()
          return
        }

        // Use admin client for database operations
        const supabase = createAdminClient()

        // Verify user is a teacher
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('user_type')
          .eq('id', userId)
          .single()

        if (profileError || !profile) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            message: 'Failed to verify user profile'
          }) + '\n\n'))
          controller.close()
          return
        }

        const isTeacher = profile.user_type === 'teacher'

        // Get form data - mark scheme can be multiple files (if PDF was converted to images)
        const markSchemeFiles = formData.getAll('markScheme') as File[]
        const studentExamFiles = formData.getAll('studentExam') as File[]
        const additionalComments = formData.get('additionalComments') as string | null

        // Get optional metadata fields
        const originalFilename = formData.get('originalFilename') as string | null
        const studentFirstName = formData.get('studentFirstName') as string | null
        const studentLastName = formData.get('studentLastName') as string | null
        const className = formData.get('className') as string | null
        const classPeriod = formData.get('classPeriod') as string | null
        const examTitle = formData.get('examTitle') as string | null

        if (!studentExamFiles || studentExamFiles.length === 0) {
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            message: 'Student exam is required'
          }) + '\n\n'))
          controller.close()
          return
        }

        // Send progress update
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'progress',
          message: 'Processing exam files...'
        }) + '\n\n'))

        // Process mark scheme files (may be multiple images from PDF conversion)
        const markSchemeBuffers: Array<{ buffer: Buffer; name: string; type: string }> = []
        for (const file of markSchemeFiles) {
          const bytes = await file.arrayBuffer()
          markSchemeBuffers.push({
            buffer: Buffer.from(bytes),
            name: file.name,
            type: file.type
          })
        }

        // Process student exam files
        const studentExamBuffers: Array<{ buffer: Buffer; name: string; type: string }> = []
        for (const file of studentExamFiles) {
          const bytes = await file.arrayBuffer()
          studentExamBuffers.push({
            buffer: Buffer.from(bytes),
            name: file.name,
            type: file.type
          })
        }

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'progress',
          message: 'Grading exam...'
        }) + '\n\n'))

        // Generate grading with streaming
        const claudeService = new ClaudeService()
        let fullContent = ''

        const streamGenerator = isTeacher
          ? claudeService.gradeExamWithImagesStream({
              markSchemeText: '',
              studentExamText: '',
              markSchemeFiles: markSchemeBuffers,
              studentExamFiles: studentExamBuffers,
              additionalComments: additionalComments || undefined
            })
          : null

        if (!streamGenerator) {
          // For non-teachers, use the non-streaming student grading
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            message: 'Streaming not available for student grading'
          }) + '\n\n'))
          controller.close()
          return
        }

        for await (const chunk of streamGenerator) {
          fullContent += chunk
          // Send content chunk
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'content',
            chunk
          }) + '\n\n'))
        }

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'progress',
          message: 'Saving results...'
        }) + '\n\n'))

        // Parse the grading response
        const { breakdown, totalMarks, totalPossible, grade } = parseGradingResponse(fullContent)
        const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0

        // Determine student name: use metadata if provided, otherwise extract from original filename
        let studentName = 'Student'
        if (studentFirstName || studentLastName) {
          studentName = [studentFirstName, studentLastName].filter(Boolean).join(' ')
        } else if (originalFilename) {
          // Extract name from original filename (remove extension and _page_X suffix)
          studentName = originalFilename.split(',')[0] // Take first file if multiple
            .replace(/\.[^.]+$/, '') // Remove extension
            .replace(/_page_\d+$/, '') // Remove _page_X suffix
            .trim()
        }

        // Save to database
        const { data: savedGrading, error: saveError } = await supabase
          .from('grading_results')
          .insert({
            user_id: userId,
            student_name: studentName,
            student_first_name: studentFirstName || null,
            student_last_name: studentLastName || null,
            answer_sheet_filename: markSchemeFiles[0]?.name || null,
            student_exam_filename: originalFilename || studentExamFiles.map(f => f.name).join(', '),
            original_filename: originalFilename || null,
            total_marks: totalMarks,
            total_possible_marks: totalPossible,
            percentage: percentage,
            grade: grade,
            content: fullContent,
            grade_breakdown: breakdown,
            additional_comments: additionalComments || null,
            class_name: className || null,
            class_period: classPeriod || null,
            exam_title: examTitle || null
          })
          .select()
          .single()

        if (saveError) {
          console.error('Failed to save grading result:', saveError)
          // Still send the result even if save failed
        }

        const totalTime = Date.now() - startTime
        console.log(`🎉 Streaming grading completed in ${totalTime}ms`)

        // Send completion with report URL
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'complete',
          id: savedGrading?.id,
          gradeReportUrl: savedGrading?.id ? `/grade-report/${savedGrading.id}` : null,
          totalMarks,
          totalPossibleMarks: totalPossible,
          percentage: percentage.toFixed(1),
          grade,
          gradeBreakdown: breakdown
        }) + '\n\n'))

        controller.close()

      } catch (error) {
        console.error('❌ Streaming grading error:', error)
        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'error',
          message: error instanceof Error ? error.message : 'Failed to grade exam'
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
