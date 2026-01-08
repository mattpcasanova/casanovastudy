import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

// GET - Search teachers by name
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query.trim()) {
      return NextResponse.json({ teachers: [] })
    }

    const supabase = createRouteHandlerClient(request)

    // Search in display_name, first_name, and last_name
    const searchTerm = `%${query.trim()}%`

    const { data: teachers, error } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, display_name, bio, is_profile_public')
      .eq('user_type', 'teacher')
      .eq('is_profile_public', true)
      .or(`display_name.ilike.${searchTerm},first_name.ilike.${searchTerm},last_name.ilike.${searchTerm}`)
      .limit(limit)

    if (error) {
      console.error('Error searching teachers:', error)
      return NextResponse.json(
        { error: 'Failed to search teachers' },
        { status: 500 }
      )
    }

    return NextResponse.json({ teachers: teachers || [] })
  } catch (error) {
    console.error('Search teachers error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
