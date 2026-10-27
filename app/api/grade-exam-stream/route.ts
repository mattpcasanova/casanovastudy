import { NextRequest } from 'next/server'
import { GRADING_MODEL } from '@/lib/claude-api'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { checkGrading, planBlockResponse } from '@/lib/plans'
import { gradePaper } from '@/lib/grading/grade-paper'
import { gradingChoices, settingsFromRow } from '@/lib/grading/report-settings'
import { loadRoster, ownedClass } from '@/lib/classes/server'
import { matchRoster, parseName } from '@/lib/grading/names'
import { groupMembersFrom, type GroupMember } from '@/lib/grading/group'
import { randomUUID } from 'crypto'
import { UPLOAD_BUCKET, uploadPath, type UploadRef } from '@/lib/uploads/refs'

/** Stores the paper's image pages in the teacher's uploads folder; returns refs in page order (pages that fail to upload are skipped). */
async function savePages(files: Array<{ buffer: Buffer; name: string; type: string }>, userId: string): Promise<UploadRef[]> {
  const images = files.filter((f) => f.type.startsWith('image/')).slice(0, 60)
  if (!images.length) return []
  const bucket = createAdminClient().storage.from(UPLOAD_BUCKET)
  const saved = await Promise.all(images.map(async (f): Promise<UploadRef | null> => {
    const path = uploadPath(userId, 'grading-pages', f.name || 'page.jpg')
    const { error } = await bucket.upload(path, f.buffer, { contentType: f.type, upsert: false })
    if (error) { console.error('Page not kept:', f.name, error.message); return null }
    return { path, name: f.name }
  }))
  return saved.filter((r): r is UploadRef => !!r)
}

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

        // Get form data - answer key can be multiple files (if PDF was converted to images)
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

        // Process answer key files (may be multiple images from PDF conversion)
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
        const { data: settingsRow } = await supabase.from('teacher_report_settings').select('*').eq('user_id', userId).maybeSingle()
        const jsonField = (key: string) => { try { return JSON.parse(String(formData.get(key) ?? 'null')) } catch { return null } }
        const { scale, markingStyle } = gradingChoices(settingsFromRow(settingsRow), jsonField('gradeScale'), jsonField('markingStyle'))
        const graded = await gradePaper({
          markScheme: markSchemeBuffers,
          student: studentExamBuffers,
          additionalComments: additionalComments || undefined,
          scale,
          markingStyle,
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

        // Keep the pages (the teacher's folder of the private uploads bucket) so
        // the report can show the paper beside the marks. Only after a successful
        // grading, so a failed one leaves nothing behind; a failed upload only
        // loses the page from the viewer, never the grading.
        const pageUrls = await savePages(studentExamBuffers, userId!)

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

        // A class picked on the page: link the report to the roster name (picked, or a confident match).
        // Roster-linked reports start unreleased; the teacher shares them from the report page.
        let classLink: Record<string, unknown> = {}
        const classIdField = formData.get('classId')
        if (isTeacher && typeof classIdField === 'string' && classIdField) {
          const cls = await ownedClass(supabase, userId!, classIdField)
          if (cls) {
            const roster = await loadRoster(supabase, cls.id)
            const picked = roster.find((r) => r.id === formData.get('rosterId'))
            const m = picked ? null : matchRoster(studentName, roster)
            const row = picked ?? (m?.confidence === 'sure' ? roster.find((r) => r.id === m.rosterId) : undefined)
            classLink = { class_id: cls.id, roster_id: row?.id ?? null }
            if (!studentUserId && row?.studentUserId) classLink = { ...classLink, student_user_id: row.studentUserId, released: false }
          }
        }

        // Save to database
        // Group work: the same grading saved for each other member (their own names and roster links).
        let others: GroupMember[] = []
        try { others = groupMembersFrom(JSON.parse(String(formData.get('groupMembers') ?? '[]')), { name: studentName }).slice(1) } catch { others = [] }
        const groupId = others.length ? randomUUID() : null
        const groupMembers = groupId ? [{ name: studentName, rosterId: (classLink.roster_id as string | null) ?? null }, ...others] : null

        const { data: savedGrading, error: saveError } = await supabase
          .from('grading_results')
          .insert({
            user_id: userId,
            group_id: groupId,
            group_members: groupMembers,
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
            grade_scale: scale,
            marking_style: markingStyle,
            content: fullContent,
            grade_breakdown: breakdown,
            ai_breakdown: breakdown, // the AI's marks as graded, kept to measure teacher agreement
            additional_comments: additionalComments || null,
            class_name: className || null,
            class_period: classPeriod || null,
            exam_title: examTitle || null,
            ...classLink,
            token_usage: usage ? { ...usage, model: GRADING_MODEL, pages: studentExamFiles.length + markSchemeFiles.length } : null,
            page_urls: pageUrls.length ? pageUrls : null,
          })
          .select()
          .single()

        if (saveError) {
          console.error('Failed to save grading result:', saveError)
          // Still send the result even if save failed
        }
        if (savedGrading && others.length) {
          const classIdForGroup = (classLink.class_id as string | undefined) ?? null
          const roster = classIdForGroup ? await loadRoster(supabase, classIdForGroup) : []
          const copies = others.map((m) => {
            const mm = matchRoster(m.name, roster)
            const r = mm.confidence === 'sure' ? roster.find((x) => x.id === mm.rosterId) : undefined
            const parts = parseName(m.name)
            // The member's own copy of the saved row (no id, timestamps or cost).
            const base: Record<string, unknown> = { ...(savedGrading as Record<string, unknown>) }
            for (const k of ['id', 'created_at', 'updated_at', 'token_usage']) delete base[k]
            return { ...base, student_name: m.name, student_first_name: parts.firstName || null, student_last_name: parts.lastName || null, roster_id: r?.id ?? null, student_user_id: r?.studentUserId ?? null, released: r?.studentUserId ? false : true }
          })
          const { error: copyError } = await supabase.from('grading_results').insert(copies)
          if (copyError) console.error('Saving group members failed:', copyError)
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
