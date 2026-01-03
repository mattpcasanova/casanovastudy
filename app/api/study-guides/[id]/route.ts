import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get userId from request body or fall back to cookie auth
    let userId: string | null = null
    try {
      const body = await request.json()
      userId = body.userId
    } catch {
      // No body provided, try cookie auth
    }

    if (!userId) {
      const cookieUser = await getAuthenticatedUser(request)
      userId = cookieUser?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // First verify the user owns this study guide
    const { data: guide, error: fetchError } = await supabase
      .from('study_guides')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !guide) {
      return NextResponse.json(
        { error: 'Study guide not found' },
        { status: 404 }
      )
    }

    if (guide.user_id !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this study guide' },
        { status: 403 }
      )
    }

    // Delete the study guide
    const { error: deleteError } = await supabase
      .from('study_guides')
      .delete()
      .eq('id', id)

    if (deleteError) {
      console.error('Error deleting study guide:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete study guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Delete study guide error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
