import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

// GET - Search teachers by name or email
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query.trim()) {
      return NextResponse.json({ teachers: [] })
    }

    const supabase = createRouteHandlerClient(request)
    // Strip PostgREST filter syntax and LIKE wildcards (the term is interpolated into .or(...)).
    const searchTerm = query.trim().replace(/[,()*%_\\:."']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!searchTerm) return NextResponse.json({ teachers: [] })
    const likeTerm = `%${searchTerm}%`

    // Search all teachers by name or email
    const { data: teachers, error } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name, display_name, bio')
      .eq('user_type', 'teacher')
      .or(`email.ilike.${likeTerm},display_name.ilike.${likeTerm},first_name.ilike.${likeTerm},last_name.ilike.${likeTerm}`)
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
