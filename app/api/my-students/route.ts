import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - List students who have this teacher (teacher_follows where teacher_id = current user)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID required' },
        { status: 400 }
      )
    }

    // Verify the authenticated user is the teacher
    if (user.id !== teacherId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Get all follow records for this teacher
    const { data: follows, error: followsError } = await supabase
      .from('teacher_follows')
      .select('id, created_at, follower_id')
      .eq('teacher_id', teacherId)
      .order('created_at', { ascending: false })

    if (followsError) {
      console.error('Error fetching follows:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    if (!follows || follows.length === 0) {
      return NextResponse.json({ students: [] })
    }

    // Get the student profiles for these follower IDs
    const followerIds = follows.map(f => f.follower_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .in('id', followerIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch student profiles' },
        { status: 500 }
      )
    }

    // Create a map of profiles by ID for easy lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Combine follows with student profiles
    const students = follows.map(follow => ({
      id: follow.id,
      created_at: follow.created_at,
      follower_id: follow.follower_id,
      student: profileMap.get(follow.follower_id) || null
    })).filter(s => s.student !== null)

    return NextResponse.json({ students })
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
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { teacherId, studentId } = body

    if (!teacherId || !studentId) {
      return NextResponse.json(
        { error: 'Teacher ID and Student ID required' },
        { status: 400 }
      )
    }

    // Verify the authenticated user is the teacher
    if (user.id !== teacherId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

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
