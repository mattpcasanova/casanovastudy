import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Get teacher profile and their published guides
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: teacherId } = await params

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Get teacher profile
    const { data: teacher, error: teacherError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, display_name, bio, is_profile_public, user_type, created_at')
      .eq('id', teacherId)
      .single()

    if (teacherError || !teacher) {
      return NextResponse.json(
        { error: 'Teacher not found' },
        { status: 404 }
      )
    }

    // Check if profile is public or if the requester is the teacher themselves
    const user = await getAuthenticatedUser(request)
    const isSelf = user?.id === teacherId

    if (!teacher.is_profile_public && !isSelf) {
      return NextResponse.json(
        { error: 'This teacher has not made their profile public' },
        { status: 403 }
      )
    }

    if (teacher.user_type !== 'teacher') {
      return NextResponse.json(
        { error: 'This user is not a teacher' },
        { status: 400 }
      )
    }

    // Get published guides count
    const { count: guideCount } = await supabase
      .from('study_guides')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', teacherId)
      .eq('is_published', true)

    // Get follower count
    const { count: followerCount } = await supabase
      .from('teacher_follows')
      .select('id', { count: 'exact', head: true })
      .eq('teacher_id', teacherId)

    // Check if current user is following this teacher
    let isFollowing = false
    if (user && user.id !== teacherId) {
      const { data: followData } = await supabase
        .from('teacher_follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('teacher_id', teacherId)
        .maybeSingle()
      isFollowing = !!followData
    }

    // Get published guides
    const { data: guides, error: guidesError } = await supabase
      .from('study_guides')
      .select('id, title, subject, grade_level, format, topic_focus, difficulty_level, file_count, is_published, published_at, created_at')
      .eq('user_id', teacherId)
      .eq('is_published', true)
      .order('published_at', { ascending: false })

    if (guidesError) {
      console.error('Error fetching guides:', guidesError)
    }

    return NextResponse.json({
      teacher: {
        ...teacher,
        guideCount: guideCount || 0,
        followerCount: followerCount || 0
      },
      guides: guides || [],
      isFollowing,
      isSelf
    })
  } catch (error) {
    console.error('Get teacher profile error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
