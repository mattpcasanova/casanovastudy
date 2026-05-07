import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { isPendingForStudent, type SubmissionStatus } from '@/lib/student-assignments'
import { resolveClassColor } from '@/lib/class-colors'

// GET - Student's actively-enrolled classes (joined to class + teacher info)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const supabase = createAdminClient()

    const { data: enrollments, error: enrollmentsError } = await supabase
      .from('class_enrollments')
      .select('id, class_id, joined_at, student_color')
      .eq('student_id', user.id)
      .eq('status', 'active')
      .order('joined_at', { ascending: false })

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    const classIds = enrollments.map(e => e.class_id)

    const { data: classes, error: classesError } = await supabase
      .from('classes')
      .select('id, teacher_id, name, period, subject, color, is_archived, created_at')
      .in('id', classIds)
      .eq('is_archived', false)

    if (classesError) {
      console.error('Error fetching classes:', classesError)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    if (!classes || classes.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    const teacherIds = Array.from(new Set(classes.map(c => c.teacher_id)))
    const visibleClassIds = classes.map(c => c.id)

    const [teachersRes, linksRes, mySubsRes] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id, first_name, last_name, display_name, email')
        .in('id', teacherIds),
      supabase
        .from('assignment_class_links')
        .select('assignment_id, class_id')
        .in('class_id', visibleClassIds),
      supabase
        .from('assignment_submissions')
        .select('assignment_id, status')
        .eq('student_id', user.id),
    ])

    const teacherMap = new Map((teachersRes.data ?? []).map(t => [t.id, t]))
    const enrollmentMap = new Map(enrollments.map(e => [e.class_id, e]))

    // Build pending-assignment count per class:
    // an assignment counts as "pending" when the student has NO submission OR
    // their submission is in the 'failed' state (needs to be redone).
    const links = linksRes.data ?? []
    const submissions = mySubsRes.data ?? []

    const submittedByAssignment = new Map<string, SubmissionStatus>()
    for (const s of submissions) submittedByAssignment.set(s.assignment_id, s.status as SubmissionStatus)

    // Need each linked assignment_id to verify it's published before counting.
    const linkedAssignmentIds = Array.from(new Set(links.map(l => l.assignment_id)))
    const { data: assignmentsMeta } = linkedAssignmentIds.length
      ? await supabase
          .from('assignments')
          .select('id, is_published')
          .in('id', linkedAssignmentIds)
      : { data: [] as Array<{ id: string; is_published: boolean }> }
    const publishedSet = new Set((assignmentsMeta ?? []).filter(a => a.is_published).map(a => a.id))

    const pendingByClass = new Map<string, number>()
    for (const l of links) {
      if (!publishedSet.has(l.assignment_id)) continue
      if (isPendingForStudent(submittedByAssignment.get(l.assignment_id))) {
        pendingByClass.set(l.class_id, (pendingByClass.get(l.class_id) ?? 0) + 1)
      }
    }

    const result = classes.map(c => {
      const enr = enrollmentMap.get(c.id)
      const studentColor = enr?.student_color ?? null
      return {
        ...c,
        teacher: teacherMap.get(c.teacher_id) ?? null,
        enrollment_id: enr?.id,
        joined_at: enr?.joined_at,
        pending_assignments_count: pendingByClass.get(c.id) ?? 0,
        student_color: studentColor,
        effective_color: resolveClassColor(c.color, studentColor),
      }
    })

    return NextResponse.json({ classes: result })
  } catch (error) {
    console.error('List my classes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
