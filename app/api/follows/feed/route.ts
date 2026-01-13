import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Get guides from teachers the student has a relationship with
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to view your feed' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '12')
    const offset = (page - 1) * limit

    const supabase = createAdminClient()

    // First, get the list of teacher IDs the user follows
    const { data: follows, error: followsError } = await supabase
      .from('teacher_follows')
      .select('teacher_id')
      .eq('follower_id', user.id)

    if (followsError) {
      console.error('Error fetching follows:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch followed teachers' },
        { status: 500 }
      )
    }

    const teacherIds = follows?.map(f => f.teacher_id) || []

    if (teacherIds.length === 0) {
      return NextResponse.json({
        guides: [],
        page,
        limit,
        total: 0,
        hasMore: false
      })
    }

    // Get guides from teachers the student has a relationship with
    const { data: guides, error: guidesError, count } = await supabase
      .from('study_guides')
      .select(`
        id,
        title,
        subject,
        grade_level,
        format,
        topic_focus,
        difficulty_level,
        file_count,
        created_at,
        user_id,
        user_profiles!study_guides_user_id_fkey (
          id,
          first_name,
          last_name,
          display_name
        )
      `, { count: 'exact' })
      .in('user_id', teacherIds)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (guidesError) {
      console.error('Error fetching guides:', guidesError)
      return NextResponse.json(
        { error: 'Failed to fetch guides' },
        { status: 500 }
      )
    }

    const total = count || 0
    const hasMore = offset + limit < total

    return NextResponse.json({
      guides: guides || [],
      page,
      limit,
      total,
      hasMore
    })
  } catch (error) {
    console.error('Feed error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
