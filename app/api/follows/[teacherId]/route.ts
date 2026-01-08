import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

// DELETE - Unfollow a teacher
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to unfollow a teacher' },
        { status: 401 }
      )
    }

    const { teacherId } = await params

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Delete the follow relationship
    const { error } = await supabase
      .from('teacher_follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('teacher_id', teacherId)

    if (error) {
      console.error('Error unfollowing:', error)
      return NextResponse.json(
        { error: 'Failed to unfollow teacher' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Unfollow teacher error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET - Check if user follows a specific teacher
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ teacherId: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ isFollowing: false })
    }

    const { teacherId } = await params

    if (!teacherId) {
      return NextResponse.json(
        { error: 'Teacher ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    const { data, error } = await supabase
      .from('teacher_follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('teacher_id', teacherId)
      .maybeSingle()

    if (error) {
      console.error('Error checking follow status:', error)
      return NextResponse.json(
        { error: 'Failed to check follow status' },
        { status: 500 }
      )
    }

    return NextResponse.json({ isFollowing: !!data })
  } catch (error) {
    console.error('Check follow status error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
