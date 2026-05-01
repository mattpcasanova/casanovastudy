import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - Teacher fetches the roster (active enrollments + student profiles)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Class id required' }, { status: 400 })
    }

    const { searchParams } = new URL(request.url)
    const includeRemoved = searchParams.get('includeRemoved') === 'true'

    const supabase = createAdminClient()

    const { data: cls, error: lookupError } = await supabase
      .from('classes')
      .select('id, teacher_id')
      .eq('id', id)
      .maybeSingle()

    if (lookupError) {
      return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 })
    }
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }
    if (cls.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    let enrollmentsQuery = supabase
      .from('class_enrollments')
      .select('id, student_id, status, joined_at')
      .eq('class_id', id)
      .order('joined_at', { ascending: true })

    if (!includeRemoved) {
      enrollmentsQuery = enrollmentsQuery.eq('status', 'active')
    }

    const { data: enrollments, error: enrollmentsError } = await enrollmentsQuery

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError)
      return NextResponse.json({ error: 'Failed to fetch enrollments' }, { status: 500 })
    }

    if (!enrollments || enrollments.length === 0) {
      return NextResponse.json({ enrollments: [] })
    }

    const studentIds = enrollments.map(e => e.student_id)
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, first_name, last_name')
      .in('id', studentIds)

    if (profilesError) {
      console.error('Error fetching student profiles:', profilesError)
      return NextResponse.json({ error: 'Failed to fetch student profiles' }, { status: 500 })
    }

    const profileMap = new Map(profiles?.map(p => [p.id, p]) ?? [])

    const result = enrollments.map(e => ({
      id: e.id,
      student_id: e.student_id,
      status: e.status,
      joined_at: e.joined_at,
      student: profileMap.get(e.student_id) ?? null
    }))

    return NextResponse.json({ enrollments: result })
  } catch (error) {
    console.error('List enrollments error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
