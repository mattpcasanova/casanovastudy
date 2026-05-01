import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// POST - Student joins a class by enrollment code.
// If a previous (class, student) row exists with status='removed', reactivate it.
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const body = await request.json()
    const rawCode = typeof body?.code === 'string' ? body.code : ''
    const code = rawCode.trim().toUpperCase()

    if (!/^[A-Z2-9]{6}$/.test(code)) {
      return NextResponse.json({ error: 'Enter a valid 6-character class code' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Verify user is a student
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (profile.user_type !== 'student') {
      return NextResponse.json({ error: 'Only students can join classes' }, { status: 403 })
    }

    // Look up class by code
    const { data: cls, error: classError } = await supabase
      .from('classes')
      .select('id, teacher_id, name, period, subject, is_archived')
      .eq('enrollment_code', code)
      .maybeSingle()

    if (classError) {
      console.error('Error fetching class by code:', classError)
      return NextResponse.json({ error: 'Failed to look up class' }, { status: 500 })
    }
    if (!cls) {
      return NextResponse.json({ error: 'No class found for that code' }, { status: 404 })
    }
    if (cls.is_archived) {
      return NextResponse.json({ error: 'This class is archived' }, { status: 400 })
    }
    if (cls.teacher_id === user.id) {
      return NextResponse.json({ error: 'You cannot enroll in your own class' }, { status: 400 })
    }

    // If an enrollment row already exists, either reactivate or report duplicate
    const { data: existing } = await supabase
      .from('class_enrollments')
      .select('id, status')
      .eq('class_id', cls.id)
      .eq('student_id', user.id)
      .maybeSingle()

    if (existing) {
      if (existing.status === 'active') {
        return NextResponse.json({ error: 'You are already enrolled in this class' }, { status: 409 })
      }
      const { error: reactivateError } = await supabase
        .from('class_enrollments')
        .update({ status: 'active', joined_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (reactivateError) {
        console.error('Error reactivating enrollment:', reactivateError)
        return NextResponse.json({ error: 'Failed to rejoin class' }, { status: 500 })
      }
      return NextResponse.json({ class: { id: cls.id, name: cls.name, period: cls.period, subject: cls.subject }, rejoined: true })
    }

    const { error: insertError } = await supabase
      .from('class_enrollments')
      .insert({ class_id: cls.id, student_id: user.id, status: 'active' })

    if (insertError) {
      console.error('Error inserting enrollment:', insertError)
      return NextResponse.json({ error: 'Failed to join class' }, { status: 500 })
    }

    return NextResponse.json({
      class: { id: cls.id, name: cls.name, period: cls.period, subject: cls.subject },
      rejoined: false
    }, { status: 201 })
  } catch (error) {
    console.error('Join class error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
