import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Teacher fetches all submissions for one of their assignments,
// joined with the student profile.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const supabase = createAdminClient()

    const { data: assignment } = await supabase
      .from('assignments').select('id, teacher_id').eq('id', id).maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    if (assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: submissions, error } = await supabase
      .from('assignment_submissions')
      .select('id, student_id, class_id, status, is_late, file_urls, submitted_at, grading_result_id, updated_at')
      .eq('assignment_id', id)
      .order('submitted_at', { ascending: false })

    if (error) {
      console.error('Error fetching submissions:', error)
      return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
    }

    if (!submissions || submissions.length === 0) {
      return NextResponse.json({ submissions: [] })
    }

    const studentIds = Array.from(new Set(submissions.map(s => s.student_id)))
    const gradingIds = submissions.map(s => s.grading_result_id).filter(Boolean) as string[]
    const classIds = Array.from(new Set(submissions.map(s => s.class_id)))

    const [profilesRes, gradingRes, classesRes] = await Promise.all([
      supabase.from('user_profiles').select('id, email, first_name, last_name').in('id', studentIds),
      gradingIds.length
        ? supabase.from('grading_results').select('id, total_marks, total_possible_marks, percentage, grade').in('id', gradingIds)
        : Promise.resolve({ data: [] as Array<{ id: string; total_marks: number; total_possible_marks: number; percentage: number; grade: string }> }),
      classIds.length
        ? supabase.from('classes').select('id, name, period').in('id', classIds)
        : Promise.resolve({ data: [] as Array<{ id: string; name: string; period: string | null }> }),
    ])

    const profileMap = new Map((profilesRes.data ?? []).map(p => [p.id, p]))
    const gradingMap = new Map((gradingRes.data ?? []).map(g => [g.id, g]))
    const classMap = new Map((classesRes.data ?? []).map(c => [c.id, c]))

    const result = submissions.map(s => ({
      ...s,
      student: profileMap.get(s.student_id) ?? null,
      grading_result: s.grading_result_id ? (gradingMap.get(s.grading_result_id) ?? null) : null,
      class: classMap.get(s.class_id) ?? null,
    }))

    return NextResponse.json({ submissions: result })
  } catch (error) {
    console.error('List submissions error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
