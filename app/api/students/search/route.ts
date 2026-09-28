import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/api-auth'

// GET - Search students by name or email (for teachers to find students to add)
export async function GET(request: NextRequest) {
  try {
    // Teachers only — this returns student names and emails.
    const { error: authError } = await requireTeacher(request)
    if (authError) return authError

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '10') || 10, 1), 25)

    if (!query.trim()) {
      return NextResponse.json({ students: [] })
    }

    const supabase = createAdminClient()
    // Strip characters that have meaning in PostgREST filter syntax (the term is
    // interpolated into .or(...)) and LIKE wildcards.
    const searchTerm = query.trim().replace(/[,()*%_\\:."']/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 60)
    if (!searchTerm) return NextResponse.json({ students: [] })
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
