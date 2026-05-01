import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

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
      .select('id, class_id, joined_at')
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
      .select('id, teacher_id, name, period, subject, is_archived, created_at')
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
    const { data: teachers } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, display_name, email')
      .in('id', teacherIds)

    const teacherMap = new Map(teachers?.map(t => [t.id, t]) ?? [])
    const enrollmentMap = new Map(enrollments.map(e => [e.class_id, e]))

    const result = classes.map(c => ({
      ...c,
      teacher: teacherMap.get(c.teacher_id) ?? null,
      enrollment_id: enrollmentMap.get(c.id)?.id,
      joined_at: enrollmentMap.get(c.id)?.joined_at
    }))

    return NextResponse.json({ classes: result })
  } catch (error) {
    console.error('List my classes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
