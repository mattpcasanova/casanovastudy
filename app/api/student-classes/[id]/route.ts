import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// DELETE - Remove a class assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const { id } = await params
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

    // Verify the class assignment belongs to this teacher
    const { data: classAssignment, error: fetchError } = await supabase
      .from('student_classes')
      .select('teacher_id')
      .eq('id', id)
      .single()

    if (fetchError || !classAssignment) {
      return NextResponse.json(
        { error: 'Class assignment not found' },
        { status: 404 }
      )
    }

    if (classAssignment.teacher_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to remove this class assignment' },
        { status: 403 }
      )
    }

    // Delete the class assignment
    const { error: deleteError } = await supabase
      .from('student_classes')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting class assignment:', deleteError)
      return NextResponse.json(
        { error: 'Failed to remove class assignment' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Student class deletion error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
