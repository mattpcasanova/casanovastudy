import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

// GET - List teachers with public profiles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    const supabase = createRouteHandlerClient(request)

    const { data: teachers, error, count } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, display_name, bio, is_profile_public, created_at', { count: 'exact' })
      .eq('user_type', 'teacher')
      .eq('is_profile_public', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching teachers:', error)
      return NextResponse.json(
        { error: 'Failed to fetch teachers' },
        { status: 500 }
      )
    }

    const total = count || 0
    const hasMore = offset + limit < total

    return NextResponse.json({
      teachers: teachers || [],
      page,
      limit,
      total,
      hasMore
    })
  } catch (error) {
    console.error('List teachers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
