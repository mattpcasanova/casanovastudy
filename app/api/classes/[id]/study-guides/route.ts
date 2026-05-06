import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - list study guides assigned to a class (teacher or enrolled student)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: classId } = await params
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const supabase = createAdminClient()

    // Verify user is the class teacher or an actively enrolled student
    const [teacherRes, enrollmentRes] = await Promise.all([
      supabase.from('classes').select('id').eq('id', classId).eq('teacher_id', user.id).single(),
      supabase.from('class_enrollments').select('id').eq('class_id', classId).eq('student_id', user.id).eq('status', 'active').single(),
    ])

    if (!teacherRes.data && !enrollmentRes.data) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('study_guide_assignments')
      .select(`
        id,
        assigned_at,
        study_guides (
          id,
          title,
          subject,
          format,
          grade_level,
          created_at
        )
      `)
      .eq('class_id', classId)
      .order('assigned_at', { ascending: false })

    if (error) {
      console.error('Error fetching assigned study guides:', error)
      return NextResponse.json({ error: 'Failed to fetch study guides' }, { status: 500 })
    }

    const guides = (data ?? []).map(row => ({
      assignmentId: row.id,
      assignedAt: row.assigned_at,
      ...(row.study_guides as Record<string, unknown>),
    }))

    return NextResponse.json({ guides })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
