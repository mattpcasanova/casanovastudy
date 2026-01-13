import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// GET - List all class assignments for a teacher
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
    const studentId = searchParams.get('studentId')

    const supabase = createAdminClient()

    // Verify user is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_type !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can manage class assignments' },
        { status: 403 }
      )
    }

    let query = supabase
      .from('student_classes')
      .select('id, student_id, class_name, class_period, created_at')
      .eq('teacher_id', user.id)

    if (studentId) {
      query = query.eq('student_id', studentId)
    }

    const { data: classes, error: classesError } = await query.order('class_name')

    if (classesError) {
      console.error('Error fetching classes:', classesError)
      return NextResponse.json(
        { error: 'Failed to fetch class assignments' },
        { status: 500 }
      )
    }

    return NextResponse.json({ classes: classes || [] })
  } catch (error) {
    console.error('Student classes fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// POST - Assign a student to a class
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { studentId, className, classPeriod } = body

    if (!studentId || !className) {
      return NextResponse.json(
        { error: 'Student ID and class name are required' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Verify user is a teacher
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('user_type')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || profile.user_type !== 'teacher') {
      return NextResponse.json(
        { error: 'Only teachers can manage class assignments' },
        { status: 403 }
      )
    }

    // Verify student is in teacher's list
    const { data: follow, error: followError } = await supabase
      .from('teacher_follows')
      .select('id')
      .eq('teacher_id', user.id)
      .eq('follower_id', studentId)
      .single()

    if (followError || !follow) {
      return NextResponse.json(
        { error: 'Student not found in your list' },
        { status: 404 }
      )
    }

    // Create class assignment
    const { data: newClass, error: insertError } = await supabase
      .from('student_classes')
      .insert({
        student_id: studentId,
        teacher_id: user.id,
        class_name: className.trim(),
        class_period: classPeriod?.trim() || null
      })
      .select()
      .single()

    if (insertError) {
      if (insertError.code === '23505') { // Unique violation
        return NextResponse.json(
          { error: 'Student is already assigned to this class' },
          { status: 409 }
        )
      }
      console.error('Error creating class assignment:', insertError)
      return NextResponse.json(
        { error: 'Failed to create class assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ class: newClass }, { status: 201 })
  } catch (error) {
    console.error('Student class creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
