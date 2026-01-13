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

// Parse the mark scheme summary from Claude's response
function parseMarkSchemeSummary(content: string): { questions: Array<{num: string, marks: number}>, total: number } | null {
  const match = content.match(/\[MARK SCHEME SUMMARY\]([\s\S]*?)\[END SUMMARY\]/i)
  if (!match) return null

  const summaryText = match[1]
  const questions: Array<{num: string, marks: number}> = []

  // Parse entries like "1a(2)" or "Section A 2b(5)" - supports various formats
  // Match patterns: "1a(2)", "1(a)(3)", "Section A 2b(5)", "2 (4)", etc.
  const entryPattern = /([A-Za-z0-9\s()]+?)\s*\((\d+)\)/g
  let entry
  while ((entry = entryPattern.exec(summaryText)) !== null) {
    const questionNum = entry[1].trim()
    const marks = parseInt(entry[2])
    // Skip if it looks like "Total" or other non-question entries
    if (!/total|marks|summary/i.test(questionNum) && marks > 0) {
      questions.push({ num: questionNum, marks })
    }
  }

  const totalMatch = summaryText.match(/Total:\s*(\d+)/i)
  const total = totalMatch ? parseInt(totalMatch[1]) : questions.reduce((s, q) => s + q.marks, 0)

  return { questions, total }
}

// Find questions that were expected but not graded
function findMissingQuestions(
  expected: Array<{num: string, marks: number}>,
  graded: Array<{questionNumber: string, marksPossible: number}>
): Array<{num: string, marks: number}> {
  const normalizedGraded = new Set(graded.map(q => normalizeQuestionNumber(q.questionNumber)))
  return expected.filter(q => !normalizedGraded.has(normalizeQuestionNumber(q.num)))
}

// Filter out questions that weren't in the mark scheme (phantom questions)
function filterToMarkSchemeQuestions(
  graded: Array<{questionNumber: string, marksAwarded: number, marksPossible: number, explanation: string}>,
  expected: Array<{num: string, marks: number}>
): Array<{questionNumber: string, marksAwarded: number, marksPossible: number, explanation: string}> {
  const normalizedExpected = new Set(expected.map(q => normalizeQuestionNumber(q.num)))

  return graded.filter(q => {
    const normalized = normalizeQuestionNumber(q.questionNumber)
    // Check if this question matches any expected question
    if (normalizedExpected.has(normalized)) return true

    // Also check partial matches for complex question numbers
    // e.g., "Section B 1a(i)" should match "1a(i)" if section prefix differs
    for (const exp of expected) {
      const expNorm = normalizeQuestionNumber(exp.num)
      // Check if one contains the other (for section prefix variations)
      if (normalized.includes(expNorm) || expNorm.includes(normalized)) {
        return true
      }
    }

    console.log(`⚠️ Filtering out unexpected question: "${q.questionNumber}" (not in mark scheme summary)`)
    return false
  })
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
  // NOTE: The pattern `\d+[a-z]?\s*[),:]+\s*Mark` requires punctuation (comma, colon, or paren) before "Mark"
  // to avoid false matches on phrases like "Lost 3 marks" which would truncate feedback
  const questionPattern = /(?:Question\s+)?([A-Za-z0-9\s()]+?)[,:\s]+Mark[s]?[:\s]*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*[-–—:]?\s*(.*?)(?=(?:Question\s+\S)|(?:Section\s+[A-Z])|(?:Part\s+[A-Z0-9])|(?:Option\s+[0-9])|(?:\d+[a-z]?\s*[),:]+\s*Mark)|Total[:\s]|Percentage[:\s]|Grade[:\s]|Feedback\s*:|Strengths\s*:|Areas\s*:|$)/gis

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
        const studentUserId = formData.get('studentUserId') as string | null

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

        // Parse the grading response
        let { breakdown, totalMarks, totalPossible, grade } = parseGradingResponse(fullContent)

        // Check for missing questions using the mark scheme summary
        const markSchemeSummary = parseMarkSchemeSummary(fullContent)
        if (markSchemeSummary) {
          // First, filter out any "phantom" questions not in the mark scheme
          const originalCount = breakdown.length
          breakdown = filterToMarkSchemeQuestions(breakdown, markSchemeSummary.questions)
          if (breakdown.length < originalCount) {
            console.log(`🔍 Filtered out ${originalCount - breakdown.length} phantom question(s) not in mark scheme`)
            // Recalculate totals after filtering
            totalMarks = breakdown.reduce((sum, q) => sum + q.marksAwarded, 0)
            totalPossible = breakdown.reduce((sum, q) => sum + q.marksPossible, 0)
          }

          const missingQuestions = findMissingQuestions(markSchemeSummary.questions, breakdown)

          if (missingQuestions.length > 0) {
            console.log(`⚠️ Missing ${missingQuestions.length} questions, making follow-up call...`)
            controller.enqueue(encoder.encode('data: ' + JSON.stringify({
              type: 'progress',
              message: `Grading ${missingQuestions.length} additional question${missingQuestions.length > 1 ? 's' : ''}...`
            }) + '\n\n'))

            // Make follow-up call to grade missing questions
            try {
              const followUpResult = await claudeService.gradeMissingQuestions({
                markSchemeFiles: markSchemeBuffers,
                studentExamFiles: studentExamBuffers,
                missingQuestions: missingQuestions.map(q => `${q.num}(${q.marks})`),
                additionalComments: additionalComments || undefined
              })

              if (followUpResult.content) {
                // Stream the follow-up content
                controller.enqueue(encoder.encode('data: ' + JSON.stringify({
                  type: 'content',
                  chunk: '\n\n--- Additional Questions ---\n\n' + followUpResult.content
                }) + '\n\n'))

                fullContent += '\n\n--- Additional Questions ---\n\n' + followUpResult.content

                // Parse the follow-up response and merge
                const followUpParsed = parseGradingResponse(followUpResult.content)
                if (followUpParsed.breakdown.length > 0) {
                  // Add new questions to breakdown (avoiding duplicates)
                  const existingNormalized = new Set(breakdown.map(q => normalizeQuestionNumber(q.questionNumber)))
                  for (const item of followUpParsed.breakdown) {
                    if (!existingNormalized.has(normalizeQuestionNumber(item.questionNumber))) {
                      breakdown.push(item)
                    }
                  }

                  // Recalculate totals
                  totalMarks = breakdown.reduce((sum, q) => sum + q.marksAwarded, 0)
                  totalPossible = breakdown.reduce((sum, q) => sum + q.marksPossible, 0)
                  const newPercentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0
                  grade = 'F'
                  if (newPercentage >= 90) grade = 'A'
                  else if (newPercentage >= 80) grade = 'B'
                  else if (newPercentage >= 70) grade = 'C'
                  else if (newPercentage >= 60) grade = 'D'

                  console.log(`✅ Added ${followUpParsed.breakdown.length} missing questions. New total: ${totalMarks}/${totalPossible}`)
                }
              }
            } catch (followUpError) {
              console.error('Follow-up grading failed:', followUpError)
              // Continue with what we have
            }
          }
        } else {
          console.log('⚠️ No mark scheme summary found in response - cannot verify completeness')
        }

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'progress',
          message: 'Saving results...'
        }) + '\n\n'))

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
            student_user_id: studentUserId || null,
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
