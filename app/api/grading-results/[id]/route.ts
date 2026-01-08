import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAdminClient } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get authenticated user from cookies
    let userId: string | null = null
    const cookieUser = await getAuthenticatedUser(request)

    if (cookieUser) {
      userId = cookieUser.id
    } else {
      // Fall back to body userId for backwards compatibility
      try {
        const body = await request.json()
        userId = body.userId
      } catch {
        // No body provided
      }
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Use admin client for deletion (bypasses RLS)
    const supabase = createAdminClient()

    // Verify the user owns this grading result
    const { data: result, error: fetchError } = await supabase
      .from('grading_results')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !result) {
      return NextResponse.json(
        { error: 'Grading result not found' },
        { status: 404 }
      )
    }

    if (result.user_id !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this grading result' },
        { status: 403 }
      )
    }

    // Delete the grading result
    const { error: deleteError } = await supabase
      .from('grading_results')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting grading result:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete grading result' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/grading-results/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
