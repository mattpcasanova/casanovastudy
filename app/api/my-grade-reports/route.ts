import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Get all grade reports linked to the authenticated student
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const supabase = createAdminClient()

    // Verify user is a student
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_type !== 'student') {
      return NextResponse.json(
        { error: 'Only students can access their grade reports' },
        { status: 403 }
      )
    }

    // Get all grade reports linked to this student
    const { data: reports, error: reportsError } = await supabase
      .from('grading_results')
      .select(`
        id,
        created_at,
        user_id,
        exam_title,
        class_name,
        class_period,
        total_marks,
        total_possible_marks,
        percentage,
        grade
      `)
      .eq('student_user_id', user.id)
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('Error fetching grade reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch grade reports' },
        { status: 500 }
      )
    }

    // Get teacher profiles for display
    const teacherIds = [...new Set((reports || []).map(r => r.user_id))]

    let teacherProfiles: Record<string, { first_name?: string; last_name?: string; email: string }> = {}

    if (teacherIds.length > 0) {
      const { data: teachers, error: teachersError } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name, email')
        .in('id', teacherIds)

      if (!teachersError && teachers) {
        teacherProfiles = Object.fromEntries(teachers.map(t => [t.id, t]))
      }
    }

    // Combine reports with teacher info
    const reportsWithTeachers = (reports || []).map(report => ({
      ...report,
      teacher: teacherProfiles[report.user_id] || { email: 'Unknown Teacher' }
    }))

    return NextResponse.json({ reports: reportsWithTeachers })
  } catch (error) {
    console.error('My grade reports fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
