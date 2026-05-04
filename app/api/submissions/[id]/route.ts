import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Fetch one submission. Visible to the submitting student or the
// owning assignment's teacher. Includes the linked grading_result (if any).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const supabase = createAdminClient()

    const { data: submission, error } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id, student_id, class_id, file_urls, student_comment, submitted_at, status, is_late, grading_result_id, grading_error, updated_at')
      .eq('id', id)
      .maybeSingle()
    if (error) return NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 })
    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    const isStudent = submission.student_id === user.id

    let isAssignmentOwner = false
    let assignment: { id: string; teacher_id: string; title: string; total_possible_marks: number | null } | null = null
    {
      const { data } = await supabase
        .from('assignments')
        .select('id, teacher_id, title, total_possible_marks')
        .eq('id', submission.assignment_id)
        .maybeSingle()
      if (data) {
        assignment = data
        isAssignmentOwner = data.teacher_id === user.id
      }
    }

    if (!isStudent && !isAssignmentOwner) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Pull linked grading result for the UI
    let gradingResult: Record<string, unknown> | null = null
    if (submission.grading_result_id) {
      const { data: gr } = await supabase
        .from('grading_results')
        .select('id, total_marks, total_possible_marks, percentage, grade, grade_breakdown, content, additional_comments, pdf_url, created_at, updated_at')
        .eq('id', submission.grading_result_id)
        .maybeSingle()
      if (gr) gradingResult = gr
    }

    // Pull student profile for the teacher view
    let studentProfile: { id: string; first_name: string | null; last_name: string | null; email: string } | null = null
    if (isAssignmentOwner) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .eq('id', submission.student_id)
        .maybeSingle()
      if (profile) studentProfile = profile
    }

    return NextResponse.json({
      submission,
      assignment,
      grading_result: gradingResult,
      student: studentProfile,
      viewer: isAssignmentOwner ? 'teacher' : 'student',
    })
  } catch (error) {
    console.error('Get submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Teacher updates submission status. Use to "Return" a graded submission
// (status: pending_review → graded) or to mark as failed/retry-able.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const supabase = createAdminClient()

    const { data: submission } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id')
      .eq('id', id)
      .maybeSingle()
    if (!submission) return NextResponse.json({ error: 'Submission not found' }, { status: 404 })

    const { data: assignment } = await supabase
      .from('assignments').select('teacher_id').eq('id', submission.assignment_id).maybeSingle()
    if (!assignment || assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const updates: Record<string, unknown> = {}
    if ('status' in body) {
      const allowed = ['submitted', 'grading', 'pending_review', 'graded', 'failed']
      if (!allowed.includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
    }
    if ('grading_error' in body) {
      updates.grading_error = body.grading_error ?? null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('assignment_submissions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (error || !updated) {
      return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
    }

    return NextResponse.json({ submission: updated })
  } catch (error) {
    console.error('Update submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
