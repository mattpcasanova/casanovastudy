import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Get all grade reports for a student (teacher view)
// Teachers can only view reports for their own students
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const { studentId } = await params
    const supabase = createAdminClient()

    // Verify teacher has this student
    const { data: follow, error: followError } = await supabase
      .from('teacher_follows')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('follower_id', studentId)
      .single()

    if (followError || !follow) {
      return NextResponse.json(
        { error: 'Student not found in your list' },
        { status: 404 }
      )
    }

    // Get grade reports for this student created by this teacher
    const { data: reports, error: reportsError } = await supabase
      .from('grading_results')
      .select('id, created_at, student_name, student_first_name, student_last_name, exam_title, class_name, class_period, total_marks, total_possible_marks, percentage, grade')
      .eq('user_id', user.id)
      .eq('student_user_id', studentId)
      .order('created_at', { ascending: false })

    if (reportsError) {
      console.error('Error fetching reports:', reportsError)
      return NextResponse.json(
        { error: 'Failed to fetch grade reports' },
        { status: 500 }
      )
    }

    // Get student profile info
    const { data: studentProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .eq('id', studentId)
      .single()

    if (profileError) {
      console.error('Error fetching student profile:', profileError)
    }

    return NextResponse.json({
      student: studentProfile || { id: studentId },
      reports: reports || []
    })
  } catch (error) {
    console.error('Grade reports fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
