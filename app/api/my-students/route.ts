import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

// GET - List students who have this teacher (teacher_follows where teacher_id = current user)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Get all students who have added this teacher (or been added by this teacher)
    const { data: follows, error } = await supabase
      .from('teacher_follows')
      .select(`
        id,
        created_at,
        follower_id,
        student:user_profiles!teacher_follows_follower_id_fkey (
          id,
          email,
          first_name,
          last_name
        )
      `)
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching students:', error)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    return NextResponse.json({ students: follows || [] })
  } catch (error) {
    console.error('List students error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Teacher adds a student (creates teacher_follows entry)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { teacherId, studentId } = body

    if (!teacherId || !studentId) {
      return NextResponse.json(
        { error: 'Teacher ID and Student ID required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Verify the teacher exists and is a teacher
    const { data: teacher, error: teacherError } = await supabase
      .from('user_profiles')
      .select('id, user_type')
      .eq('id', teacherId)
      .single()

    if (teacherError || !teacher || teacher.user_type !== 'teacher') {
      return NextResponse.json(
        { error: 'Invalid teacher' },
        { status: 400 }
      )
    }

    // Verify the student exists and is a student
    const { data: student, error: studentError } = await supabase
      .from('user_profiles')
      .select('id, user_type')
      .eq('id', studentId)
      .single()

    if (studentError || !student || student.user_type !== 'student') {
      return NextResponse.json(
        { error: 'Invalid student' },
        { status: 400 }
      )
    }

    // Check if relationship already exists
    const { data: existing } = await supabase
      .from('teacher_follows')
      .select('id')
      .eq('follower_id', studentId)
      .eq('teacher_id', teacherId)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Student already added' },
        { status: 409 }
      )
    }

    // Create the relationship (student follows teacher)
    const { data: follow, error: followError } = await supabase
      .from('teacher_follows')
      .insert({
        follower_id: studentId,
        teacher_id: teacherId
      })
      .select()
      .single()

    if (followError) {
      console.error('Error adding student:', followError)
      return NextResponse.json(
        { error: 'Failed to add student' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, follow })
  } catch (error) {
    console.error('Add student error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
