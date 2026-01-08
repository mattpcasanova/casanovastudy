import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

// POST - Publish a study guide
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json(
        { error: 'You must be logged in to publish a study guide' },
        { status: 401 }
      )
    }

    const { id: guideId } = await params

    if (!guideId) {
      return NextResponse.json(
        { error: 'Study guide ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Verify the user owns this guide
    const { data: guide, error: fetchError } = await supabase
      .from('study_guides')
      .select('id, user_id, is_published')
      .eq('id', guideId)
      .single()

    if (fetchError || !guide) {
      return NextResponse.json(
        { error: 'Study guide not found' },
        { status: 404 }
      )
    }

    if (guide.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You can only publish your own study guides' },
        { status: 403 }
      )
    }

    if (guide.is_published) {
      return NextResponse.json(
        { error: 'This study guide is already published' },
        { status: 400 }
      )
    }

    // Update the guide to be published
    const { data: updatedGuide, error: updateError } = await supabase
      .from('study_guides')
      .update({
        is_published: true,
        published_at: new Date().toISOString()
      })
      .eq('id', guideId)
      .select()
      .single()

    if (updateError) {
      console.error('Error publishing guide:', updateError)
      return NextResponse.json(
        { error: 'Failed to publish study guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      guide: updatedGuide
    })
  } catch (error) {
    console.error('Publish guide error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
