import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { gradeSubmission } from '@/lib/submission-grading'

export const maxDuration = 300

// POST - Teacher manually triggers (or re-triggers) AI grading for a submission.
// Loads files from Cloudinary URLs and internally calls /api/grade-exam, then
// links the resulting grading_result back to the submission.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
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

    try {
      const { gradingResultId } = await gradeSubmission(id)
      return NextResponse.json({ success: true, grading_result_id: gradingResultId })
    } catch (gradingError) {
      console.error('Grading error:', gradingError)
      const message = gradingError instanceof Error ? gradingError.message : 'Grading failed'
      await supabase
        .from('assignment_submissions')
        .update({ status: 'failed', grading_error: message })
        .eq('id', id)
      return NextResponse.json({ error: message }, { status: 500 })
    }
  } catch (error) {
    console.error('Grade submission error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
