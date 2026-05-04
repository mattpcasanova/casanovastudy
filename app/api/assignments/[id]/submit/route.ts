import { NextRequest, NextResponse, after } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { gradeSubmission } from '@/lib/submission-grading'

interface SubmitBody {
  files?: Array<{ url: string; name?: string; type?: string }>
  class_id?: string
  student_comment?: string | null
}

const MAX_COMMENT_LEN = 2000

// POST - Student submits files for an assignment.
// Files must already be uploaded (e.g. to Cloudinary via /api/upload-to-cloudinary).
// Resubmissions overwrite the previous file_urls; status resets to 'submitted'.
// If the assignment has a mark_scheme_url, auto-grading fires after the response.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id: assignmentId } = await params
    const body = (await request.json()) as SubmitBody

    const files = (body.files ?? []).filter(f => f && typeof f.url === 'string' && f.url.length > 0)
    if (files.length === 0) {
      return NextResponse.json({ error: 'At least one file is required' }, { status: 400 })
    }

    const studentComment = typeof body.student_comment === 'string'
      ? body.student_comment.trim().slice(0, MAX_COMMENT_LEN) || null
      : null

    const supabase = createAdminClient()

    // Verify assignment exists + is published; fetch mark_scheme_url for auto-grade check
    const { data: assignment } = await supabase
      .from('assignments')
      .select('id, due_at, is_published, mark_scheme_url')
      .eq('id', assignmentId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    if (!assignment.is_published) {
      return NextResponse.json({ error: 'Assignment is not yet published' }, { status: 403 })
    }

    // Find a class context: must be a class the student is actively enrolled in
    // AND linked to this assignment. Prefer the body's class_id when valid.
    const { data: linkedClassIds } = await supabase
      .from('assignment_class_links')
      .select('class_id')
      .eq('assignment_id', assignmentId)
    const linkedIds = (linkedClassIds ?? []).map(l => l.class_id)
    if (linkedIds.length === 0) {
      return NextResponse.json({ error: 'Assignment is not linked to any class' }, { status: 500 })
    }

    const { data: enrollments } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .in('class_id', linkedIds)
    const enrolledIds = new Set((enrollments ?? []).map(e => e.class_id))
    if (enrolledIds.size === 0) {
      return NextResponse.json({ error: 'Not authorized to submit to this assignment' }, { status: 403 })
    }

    let chosenClassId: string | null = null
    if (body.class_id && enrolledIds.has(body.class_id)) chosenClassId = body.class_id
    else chosenClassId = enrolledIds.values().next().value ?? null
    if (!chosenClassId) {
      return NextResponse.json({ error: 'Could not resolve class context' }, { status: 500 })
    }

    const isLate = !!(assignment.due_at && new Date() > new Date(assignment.due_at))

    // Upsert the submission. ON CONFLICT triggers when (assignment_id, student_id)
    // already exists; we overwrite file_urls + status, and clear any prior grading.
    const { data: existing } = await supabase
      .from('assignment_submissions')
      .select('id, grading_result_id')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()

    const fileUrls = files.map(f => ({
      url: f.url,
      name: f.name ?? null,
      type: f.type ?? null,
    }))

    let submissionId: string
    let resubmitted: boolean
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let submissionData: any

    if (existing) {
      const { data: updated, error } = await supabase
        .from('assignment_submissions')
        .update({
          file_urls: fileUrls,
          status: 'submitted',
          is_late: isLate,
          submitted_at: new Date().toISOString(),
          class_id: chosenClassId,
          grading_result_id: null,
          grading_error: null,
          student_comment: studentComment,
        })
        .eq('id', existing.id)
        .select()
        .single()
      if (error || !updated) {
        console.error('Error updating submission:', error)
        return NextResponse.json({ error: 'Failed to resubmit' }, { status: 500 })
      }
      submissionId = existing.id
      resubmitted = true
      submissionData = updated
    } else {
      const { data: created, error } = await supabase
        .from('assignment_submissions')
        .insert({
          assignment_id: assignmentId,
          student_id: user.id,
          class_id: chosenClassId,
          file_urls: fileUrls,
          is_late: isLate,
          status: 'submitted',
          student_comment: studentComment,
        })
        .select()
        .single()
      if (error || !created) {
        console.error('Error creating submission:', error)
        return NextResponse.json({ error: 'Failed to submit' }, { status: 500 })
      }
      submissionId = created.id
      resubmitted = false
      submissionData = created
    }

    // Auto-grade when a mark scheme is present: set status to 'grading' immediately
    // so the student sees progress right away, then kick off grading after response.
    if (assignment.mark_scheme_url) {
      await supabase
        .from('assignment_submissions')
        .update({ status: 'grading' })
        .eq('id', submissionId)
      submissionData = { ...submissionData, status: 'grading' }

      const baseUrl = new URL(request.url).origin
      after(async () => {
        try {
          await gradeSubmission(submissionId, baseUrl)
        } catch (err) {
          console.error('Auto-grade failed for submission', submissionId, err)
          await createAdminClient()
            .from('assignment_submissions')
            .update({
              status: 'failed',
              grading_error: err instanceof Error ? err.message : 'Unknown error',
            })
            .eq('id', submissionId)
        }
      })
    }

    return NextResponse.json(
      { submission: submissionData, resubmitted },
      { status: resubmitted ? 200 : 201 }
    )
  } catch (error) {
    console.error('Submit assignment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
