import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// DELETE - Soft-removes a student from a class (sets status='removed').
// Authorized for either the class's teacher OR the student themselves (leaving).
// Soft delete preserves the enrollment row so future grade reports/history
// can still link back to it.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; studentId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })
    }

    const { id, studentId } = await params
    if (!id || !studentId) {
      return NextResponse.json({ error: 'Class id and student id required' }, { status: 400 })
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

    const isTeacher = cls.teacher_id === user.id
    const isSelf = user.id === studentId
    if (!isTeacher && !isSelf) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { error: updateError } = await supabase
      .from('class_enrollments')
      .update({ status: 'removed' })
      .eq('class_id', id)
      .eq('student_id', studentId)

    if (updateError) {
      console.error('Error removing enrollment:', updateError)
      return NextResponse.json({ error: 'Failed to remove enrollment' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove enrollment error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
