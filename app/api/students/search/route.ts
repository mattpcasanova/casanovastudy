import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

// GET - Search students by name or email (for teachers to find students to add)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = parseInt(searchParams.get('limit') || '10')

    if (!query.trim()) {
      return NextResponse.json({ students: [] })
    }

    const supabase = createRouteHandlerClient(request)
    const searchTerm = query.trim()
    const likeTerm = `%${searchTerm}%`

    // Search all students by name or email
    const { data: students, error } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .eq('user_type', 'student')
      .or(`email.ilike.${likeTerm},first_name.ilike.${likeTerm},last_name.ilike.${likeTerm}`)
      .limit(limit)

    if (error) {
      console.error('Error searching students:', error)
      return NextResponse.json(
        { error: 'Failed to search students' },
        { status: 500 }
      )
    }

    return NextResponse.json({ students: students || [] })
  } catch (error) {
    console.error('Search students error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
