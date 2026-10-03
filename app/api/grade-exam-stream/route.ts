import { NextRequest } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { checkGrading, planBlockResponse } from '@/lib/plans'
import { gradePaper } from '@/lib/grading/grade-paper'

// Vercel config for longer timeout and larger body size (for image uploads)
export const maxDuration = 300 // 5 minutes (requires Vercel Pro for >60s)
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const startTime = Date.now()

  // Get authenticated user (try cookie auth first, fall back to FormData userId)
  let userId: string | null = null
  const cookieUser = await getRequestUser(request)

  // Grading is Premium; signed-out callers get the in-stream sign-in error below.
  if (cookieUser) {
    const gradingBlock = await checkGrading(cookieUser.id)
    if (gradingBlock) return planBlockResponse(gradingBlock)
  }

  const stream = new ReadableStream({
    async start(controller) {
      try {
        console.log('🚀 Grade exam streaming started')

        const formData = await request.formData()

        // Authentication check
        // Identity comes only from the session (never a form userId).
        if (cookieUser) userId = cookieUser.id

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

        if (!isTeacher) {
          // Students use /api/grade-exam (non-streaming).
          controller.enqueue(encoder.encode('data: ' + JSON.stringify({
            type: 'error',
            message: 'Streaming not available for student grading'
          }) + '\n\n'))
          controller.close()
          return
        }

        // Shared engine (lib/grading/grade-paper.ts): marks, completeness check, follow-up, totals.
        const graded = await gradePaper({
          markScheme: markSchemeBuffers,
          student: studentExamBuffers,
          additionalComments: additionalComments || undefined,
          onChunk: (chunk) => controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'content', chunk }) + '\n\n')),
          onProgress: (message) => controller.enqueue(encoder.encode('data: ' + JSON.stringify({ type: 'progress', message }) + '\n\n')),
        })
        const { breakdown, totalMarks, totalPossible, grade, usage } = graded
        const fullContent = graded.content

        controller.enqueue(encoder.encode('data: ' + JSON.stringify({
          type: 'progress',
          message: 'Saving results...'
        }) + '\n\n'))

        const percentage = graded.percentage

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
            exam_title: examTitle || null,
            token_usage: usage ? { ...usage, model: 'claude-sonnet-5', pages: studentExamFiles.length + markSchemeFiles.length } : null
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
