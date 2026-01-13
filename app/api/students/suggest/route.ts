import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Auto-suggest students by name match
// Used when grading exams to link reports to student accounts
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
    const firstName = searchParams.get('firstName')?.trim() || ''
    const lastName = searchParams.get('lastName')?.trim() || ''

    if (!firstName && !lastName) {
      return NextResponse.json({ suggestions: [] })
    }

    const supabase = createAdminClient()

    // Get the teacher's students (from teacher_follows)
    const { data: follows, error: followsError } = await supabase
      .from('teacher_follows')
      .select('follower_id')
      .eq('teacher_id', user.id)

    if (followsError) {
      console.error('Error fetching follows:', followsError)
      return NextResponse.json(
        { error: 'Failed to fetch students' },
        { status: 500 }
      )
    }

    if (!follows || follows.length === 0) {
      return NextResponse.json({ suggestions: [] })
    }

    const studentIds = follows.map(f => f.follower_id)

    // Build the query to find matching students
    let query = supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .in('id', studentIds)
      .eq('user_type', 'student')

    // Add name filters - case insensitive partial match
    if (firstName && lastName) {
      // If both names provided, try to match both
      query = query
        .ilike('first_name', `%${firstName}%`)
        .ilike('last_name', `%${lastName}%`)
    } else if (firstName) {
      // Match first name OR last name if only first name provided
      query = query.or(`first_name.ilike.%${firstName}%,last_name.ilike.%${firstName}%`)
    } else if (lastName) {
      // Match first name OR last name if only last name provided
      query = query.or(`first_name.ilike.%${lastName}%,last_name.ilike.%${lastName}%`)
    }

    const { data: students, error: studentsError } = await query.limit(5)

    if (studentsError) {
      console.error('Error fetching students:', studentsError)
      return NextResponse.json(
        { error: 'Failed to search students' },
        { status: 500 }
      )
    }

    // Calculate match score for sorting
    const suggestions = (students || []).map(student => {
      let score = 0
      const fn = (student.first_name || '').toLowerCase()
      const ln = (student.last_name || '').toLowerCase()
      const searchFirst = firstName.toLowerCase()
      const searchLast = lastName.toLowerCase()

      // Exact match gets highest score
      if (searchFirst && fn === searchFirst) score += 10
      if (searchLast && ln === searchLast) score += 10

      // Partial match gets lower score
      if (searchFirst && fn.includes(searchFirst)) score += 5
      if (searchLast && ln.includes(searchLast)) score += 5

      return { ...student, score }
    }).sort((a, b) => b.score - a.score)

    return NextResponse.json({ suggestions })
  } catch (error) {
    console.error('Student suggest error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
