import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

const MAX_NAME_LEN = 100
const MAX_PERIOD_LEN = 50
const MAX_SUBJECT_LEN = 100

// GET - Fetch a single class. Available to the teacher who owns it or any
// actively-enrolled student. Response shape varies by viewer role.
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

    const supabase = createAdminClient()

    const { data: cls, error } = await supabase
      .from('classes')
      .select('id, teacher_id, name, period, subject, enrollment_code, is_archived, created_at, updated_at')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching class:', error)
      return NextResponse.json({ error: 'Failed to fetch class' }, { status: 500 })
    }
    if (!cls) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const isTeacher = cls.teacher_id === user.id

    let isEnrolled = false
    if (!isTeacher) {
      const { data: enrollment } = await supabase
        .from('class_enrollments')
        .select('id')
        .eq('class_id', id)
        .eq('student_id', user.id)
        .eq('status', 'active')
        .maybeSingle()
      isEnrolled = !!enrollment
    }

    if (!isTeacher && !isEnrolled) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    // Hide enrollment_code from students — they don't need it
    const payload = isTeacher
      ? cls
      : { id: cls.id, teacher_id: cls.teacher_id, name: cls.name, period: cls.period, subject: cls.subject, is_archived: cls.is_archived, created_at: cls.created_at }

    return NextResponse.json({ class: payload, viewer: isTeacher ? 'teacher' : 'student' })
  } catch (error) {
    console.error('Get class error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH - Teacher updates class fields
export async function PATCH(
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

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if ('name' in body) {
      const name = typeof body.name === 'string' ? body.name.trim() : ''
      if (!name) return NextResponse.json({ error: 'Class name cannot be empty' }, { status: 400 })
      if (name.length > MAX_NAME_LEN) return NextResponse.json({ error: 'Class name too long' }, { status: 400 })
      updates.name = name
    }
    if ('period' in body) {
      const period = typeof body.period === 'string' ? body.period.trim() : null
      if (period && period.length > MAX_PERIOD_LEN) return NextResponse.json({ error: 'Period too long' }, { status: 400 })
      updates.period = period || null
    }
    if ('subject' in body) {
      const subject = typeof body.subject === 'string' ? body.subject.trim() : null
      if (subject && subject.length > MAX_SUBJECT_LEN) return NextResponse.json({ error: 'Subject too long' }, { status: 400 })
      updates.subject = subject || null
    }
    if ('is_archived' in body) {
      if (typeof body.is_archived !== 'boolean') {
        return NextResponse.json({ error: 'is_archived must be boolean' }, { status: 400 })
      }
      updates.is_archived = body.is_archived
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
    }

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

    const { data: updated, error: updateError } = await supabase
      .from('classes')
      .update(updates)
      .eq('id', id)
      .select('id, name, period, subject, enrollment_code, is_archived, created_at, updated_at')
      .single()

    if (updateError) {
      console.error('Error updating class:', updateError)
      return NextResponse.json({ error: 'Failed to update class' }, { status: 500 })
    }

    return NextResponse.json({ class: updated })
  } catch (error) {
    console.error('Update class error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Teacher hard-deletes a class. Cascades to class_enrollments.
export async function DELETE(
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

    const { error: deleteError } = await supabase
      .from('classes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting class:', deleteError)
      return NextResponse.json({ error: 'Failed to delete class' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete class error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
