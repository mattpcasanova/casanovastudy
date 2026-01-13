import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

// DELETE - Remove a student from teacher's list (delete teacher_follows entry)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in' },
        { status: 401 }
      )
    }

    const { studentId } = await params
    const { searchParams } = new URL(request.url)
    const teacherId = searchParams.get('teacherId')

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID required' },
        { status: 400 }
      )
    }

    // Verify the authenticated user is the teacher
    if (user.id !== teacherId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      )
    }

    const supabase = createAdminClient()

    // Delete the relationship
    const { error } = await supabase
      .from('teacher_follows')
      .delete()
      .eq('follower_id', studentId)
      .eq('teacher_id', teacherId)

    if (error) {
      console.error('Error removing student:', error)
      return NextResponse.json(
        { error: 'Failed to remove student' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Remove student error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
