import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

const MAX_NAME_LEN = 100
const MAX_PERIOD_LEN = 50
const MAX_SUBJECT_LEN = 100

// GET - List classes owned by the authenticated teacher (with student counts)
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const includeArchived = searchParams.get('includeArchived') === 'true'

    const supabase = createAdminClient()

    let query = supabase
      .from('classes')
      .select('id, name, period, subject, enrollment_code, is_archived, created_at, updated_at')
      .eq('teacher_id', user.id)
      .order('is_archived', { ascending: true })
      .order('created_at', { ascending: false })

    if (!includeArchived) {
      query = query.eq('is_archived', false)
    }

    const { data: classes, error } = await query

    if (error) {
      console.error('Error fetching classes:', error)
      return NextResponse.json({ error: 'Failed to fetch classes' }, { status: 500 })
    }

    if (!classes || classes.length === 0) {
      return NextResponse.json({ classes: [] })
    }

    const classIds = classes.map(c => c.id)
    const { data: enrollmentRows } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('status', 'active')
      .in('class_id', classIds)

    const counts = new Map<string, number>()
    for (const row of enrollmentRows ?? []) {
      counts.set(row.class_id, (counts.get(row.class_id) ?? 0) + 1)
    }

    const result = classes.map(c => ({
      ...c,
      student_count: counts.get(c.id) ?? 0
    }))

    return NextResponse.json({ classes: result })
  } catch (error) {
    console.error('List classes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Teacher creates a new class
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json()
    const name = typeof body?.name === 'string' ? body.name.trim() : ''
    const period = typeof body?.period === 'string' ? body.period.trim() : null
    const subject = typeof body?.subject === 'string' ? body.subject.trim() : null

    if (!name) {
      return NextResponse.json({ error: 'Class name is required' }, { status: 400 })
    }
    if (name.length > MAX_NAME_LEN) {
      return NextResponse.json({ error: `Class name must be ${MAX_NAME_LEN} chars or fewer` }, { status: 400 })
    }
    if (period && period.length > MAX_PERIOD_LEN) {
      return NextResponse.json({ error: `Period must be ${MAX_PERIOD_LEN} chars or fewer` }, { status: 400 })
    }
    if (subject && subject.length > MAX_SUBJECT_LEN) {
      return NextResponse.json({ error: `Subject must be ${MAX_SUBJECT_LEN} chars or fewer` }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify user is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.user_type !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create classes' }, { status: 403 })
    }

    // Generate a unique enrollment code via the SQL function
    const { data: codeData, error: codeError } = await supabase.rpc('generate_class_code')
    if (codeError || typeof codeData !== 'string') {
      console.error('Error generating class code:', codeError)
      return NextResponse.json({ error: 'Failed to generate enrollment code' }, { status: 500 })
    }

    const { data: created, error: insertError } = await supabase
      .from('classes')
      .insert({
        teacher_id: user.id,
        name,
        period: period || null,
        subject: subject || null,
        enrollment_code: codeData
      })
      .select('id, name, period, subject, enrollment_code, is_archived, created_at, updated_at')
      .single()

    if (insertError) {
      console.error('Error creating class:', insertError)
      return NextResponse.json({ error: 'Failed to create class' }, { status: 500 })
    }

    return NextResponse.json({ class: { ...created, student_count: 0 } }, { status: 201 })
  } catch (error) {
    console.error('Create class error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
