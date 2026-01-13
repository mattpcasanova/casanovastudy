import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

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

    const supabase = createAdminClient()

    // Get all follow records for this user
    const { data: followRecords, error: followsError } = await supabase
      .from('teacher_follows')
      .select('id, created_at, teacher_id')
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false })

    if (followsError) {
      console.error('Error fetching follows:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch followed teachers' },
        { status: 500 }
      )
    }

    if (!followRecords || followRecords.length === 0) {
      return NextResponse.json({ follows: [] })
    }

    // Get the teacher profiles for these teacher IDs
    const teacherIds = followRecords.map(f => f.teacher_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, display_name, bio, is_profile_public')
      .in('id', teacherIds)

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError)
      return NextResponse.json(
        { error: 'Failed to fetch teacher profiles' },
        { status: 500 }
      )
    }

    // Create a map of profiles by ID for easy lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || [])

    // Combine follows with teacher profiles
    const follows = followRecords.map(follow => ({
      id: follow.id,
      created_at: follow.created_at,
      teacher: profileMap.get(follow.teacher_id) || null
    })).filter(f => f.teacher !== null)

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

    const supabase = createAdminClient()

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
