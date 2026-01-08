import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - List teachers the current user follows
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to view followed teachers' },
        { status: 401 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Get list of teachers the user follows with their profile info
    const { data: follows, error } = await supabase
      .from('teacher_follows')
      .select(`
        id,
        created_at,
        teacher:user_profiles!teacher_follows_teacher_id_fkey (
          id,
          email,
          first_name,
          last_name,
          display_name,
          bio,
          is_profile_public
        )
      `)
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching follows:', error)
      return NextResponse.json(
        { error: 'Failed to fetch followed teachers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ follows })
  } catch (error) {
    console.error('Get follows error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Follow a teacher
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to follow a teacher' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { teacherId } = body

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    // Cannot follow yourself
    if (teacherId === user.id) {
      return NextResponse.json(
        { error: 'You cannot follow yourself' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Verify the teacher exists and is a teacher with a public profile
    const { data: teacher, error: teacherError } = await supabase
      .from('user_profiles')
      .select('id, user_type, is_profile_public')
      .eq('id', teacherId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    if (teacher.user_type !== 'teacher') {
      return NextResponse.json(
        { error: 'You can only follow teachers' },
        { status: 400 }
      )
    }

    if (!teacher.is_profile_public) {
      return NextResponse.json(
        { error: 'This teacher has not made their profile public' },
        { status: 403 }
      )
    }

    // Create the follow relationship
    const { data: follow, error: insertError } = await supabase
      .from('teacher_follows')
      .insert({
        follower_id: user.id,
        teacher_id: teacherId
      })
      .select()
      .single()

    if (insertError) {
      // Check if it's a unique constraint violation (already following)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You are already following this teacher' },
          { status: 400 }
        )
      }
      console.error('Error creating follow:', insertError)
      return NextResponse.json(
        { error: 'Failed to follow teacher' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, follow })
  } catch (error) {
    console.error('Follow teacher error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
