import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Teacher fetches a gradebook matrix for a class: active roster,
// published assignments, and one submission row per (student, assignment) pair.
// Returns normalized arrays; the client composes cells.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Class id required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const { data: cls, error: clsError } = await supabase
      .from('classes')
      .select('id, teacher_id, name, color, period, subject')
      .eq('id', id)
      .maybeSingle()

    if (clsError) {
      return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 })
    }
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }
    if (cls.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Roster: active enrollments + profiles
    const { data: enrollments, error: enrError } = await supabase
      .from('class_enrollments')
      .select('student_id, joined_at')
      .eq('class_id', id)
      .eq('status', 'active')

    if (enrError) {
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
    }

    const studentIds = (enrollments ?? []).map(e => e.student_id)
    let students: Array<{ id: string; email: string; first_name: string | null; last_name: string | null }> = []
    if (studentIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabase
        .from('user_profiles')
        .select('id, email, first_name, last_name')
        .in('id', studentIds)
      if (profilesError) {
        return NextResponse.json({ error: 'Failed to fetch student profiles' }, { status: 500 })
      }
      students = profiles ?? []
    }

    // Assignments linked to this class (published only — drafts don't belong in a gradebook)
    const { data: links, error: linksError } = await supabase
      .from('assignment_class_links')
      .select('assignment_id')
      .eq('class_id', id)

    if (linksError) {
      return NextResponse.json({ error: 'Failed to fetch assignment links' }, { status: 500 })
    }

    const assignmentIds = (links ?? []).map(l => l.assignment_id)
    let assignments: Array<{
      id: string
      title: string
      due_at: string | null
      total_possible_marks: number | null
      is_published: boolean
    }> = []
    if (assignmentIds.length > 0) {
      const { data: aRows, error: aErr } = await supabase
        .from('assignments')
        .select('id, title, due_at, total_possible_marks, is_published')
        .in('id', assignmentIds)
        .eq('is_published', true)
        .order('due_at', { ascending: true, nullsFirst: false })
      if (aErr) {
        return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 })
      }
      assignments = aRows ?? []
    }

    const visibleAssignmentIds = assignments.map(a => a.id)

    // Submissions for those assignments, scoped to this class
    let submissionRows: Array<{
      id: string
      assignment_id: string
      student_id: string
      status: string
      is_late: boolean
      grading_result_id: string | null
    }> = []
    if (visibleAssignmentIds.length > 0 && studentIds.length > 0) {
      const { data: subs, error: subsErr } = await supabase
        .from('assignment_submissions')
        .select('id, assignment_id, student_id, status, is_late, grading_result_id')
        .eq('class_id', id)
        .in('assignment_id', visibleAssignmentIds)
        .in('student_id', studentIds)
      if (subsErr) {
        return NextResponse.json({ error: 'Failed to fetch submissions' }, { status: 500 })
      }
      submissionRows = subs ?? []
    }

    // Pull grading results for the graded subset
    const gradedResultIds = submissionRows
      .map(s => s.grading_result_id)
      .filter((rid): rid is string => !!rid)

    const gradingMap = new Map<string, { total_marks: number | null; total_possible_marks: number | null; percentage: number | null }>()
    if (gradedResultIds.length > 0) {
      const { data: results, error: gErr } = await supabase
        .from('grading_results')
        .select('id, total_marks, total_possible_marks, percentage')
        .in('id', gradedResultIds)
      if (gErr) {
        return NextResponse.json({ error: 'Failed to fetch grading results' }, { status: 500 })
      }
      for (const r of results ?? []) {
        gradingMap.set(r.id, {
          total_marks: r.total_marks,
          total_possible_marks: r.total_possible_marks,
          percentage: r.percentage,
        })
      }
    }

    const submissions = submissionRows.map(s => {
      const grading = s.grading_result_id ? gradingMap.get(s.grading_result_id) ?? null : null
      return {
        submission_id: s.id,
        assignment_id: s.assignment_id,
        student_id: s.student_id,
        status: s.status,
        is_late: s.is_late,
        score: grading?.total_marks ?? null,
        possible: grading?.total_possible_marks ?? null,
        percentage: grading?.percentage ?? null,
      }
    })

    return NextResponse.json({
      class: { id: cls.id, name: cls.name, color: cls.color, period: cls.period, subject: cls.subject },
      students,
      assignments,
      submissions,
    })
  } catch (error) {
    console.error('Gradebook error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
