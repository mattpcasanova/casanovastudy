import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Assignments for a specific class. Visible to the class's teacher OR
// any actively-enrolled student. For students, includes their own submission
// status per assignment.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const supabase = createAdminClient()

    const { data: cls } = await supabase
      .from('classes').select('id, teacher_id').eq('id', id).maybeSingle()
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

    const isTeacher = cls.teacher_id === user.id
    let isEnrolled = false
    if (!isTeacher) {
      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('class_id', id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      isEnrolled = !!enrollment
    }

    if (!isTeacher && !isEnrolled) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Fetch links → assignment ids → assignments
    const { data: links } = await supabase
      .from('assignment_class_links')
      .select('assignment_id')
      .eq('class_id', id)
    const assignmentIds = (links ?? []).map(l => l.assignment_id)
    if (assignmentIds.length === 0) return NextResponse.json({ assignments: [] })

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('id, title, description, due_at, total_possible_marks, is_published, created_at, mark_scheme_url, mark_scheme_text')
      .in('id', assignmentIds)
      .order('due_at', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error fetching class assignments:', error)
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
    }

    if (!assignments) return NextResponse.json({ assignments: [] })

    // Hide unpublished from students
    const visible = isTeacher ? assignments : assignments.filter(a => a.is_published)

    if (isTeacher) {
      // Add submission counts per assignment
      const { data: subs } = await supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .in('assignment_id', visible.map(a => a.id))
      const stats = new Map<string, { total: number; pending: number; graded: number }>()
      for (const s of subs ?? []) {
        const cur = stats.get(s.assignment_id) ?? { total: 0, pending: 0, graded: 0 }
        cur.total++
        if (s.status === 'pending_review' || s.status === 'submitted' || s.status === 'grading') cur.pending++
        if (s.status === 'graded') cur.graded++
        stats.set(s.assignment_id, cur)
      }
      const result = visible.map(a => {
        const hasMarkScheme = !!(a.mark_scheme_url || a.mark_scheme_text)
        const { mark_scheme_url, mark_scheme_text, ...rest } = a
        return {
          ...rest,
          has_mark_scheme: hasMarkScheme,
          submission_stats: stats.get(a.id) ?? { total: 0, pending: 0, graded: 0 },
        }
      })
      return NextResponse.json({ assignments: result, viewer: 'teacher' })
    }

    // Student path: include their own submission
    const { data: mySubs } = await supabase
      .from('assignment_submissions')
      .select('id, assignment_id, status, is_late, submitted_at, grading_result_id')
      .eq('student_id', user.id)
      .in('assignment_id', visible.map(a => a.id))
    const subMap = new Map((mySubs ?? []).map(s => [s.assignment_id, s]))

    const result = visible.map(a => {
      // Strip mark scheme details from student response
      const { mark_scheme_url, mark_scheme_text, ...studentSafe } = a
      return {
        ...studentSafe,
        my_submission: subMap.get(a.id) ?? null,
      }
    })

    return NextResponse.json({ assignments: result, viewer: 'student' })
  } catch (error) {
    console.error('List class assignments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
