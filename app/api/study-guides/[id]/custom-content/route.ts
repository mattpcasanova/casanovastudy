import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { CustomGuideContent } from '@/lib/types/custom-guide'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const body = await request.json()
    const { title, subject, gradeLevel, customContent, userId: bodyUserId } = body as {
      title?: string
      subject?: string
      gradeLevel?: string
      customContent: CustomGuideContent
      userId?: string
    }

    // Get userId from request body or fall back to cookie auth
    let userId: string | null = bodyUserId || null

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

    // Validate custom content
    if (!customContent || !customContent.sections) {
      return NextResponse.json(
        { error: 'Custom content is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // First verify the user owns this study guide
    const { data: guide, error: fetchError } = await supabase
      .from('study_guides')
      .select('user_id, format')
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
        { error: 'You do not have permission to edit this study guide' },
        { status: 403 }
      )
    }

    // Build update object
    const updates: Record<string, unknown> = {
      custom_content: customContent,
      format: 'custom'
    }

    if (title?.trim()) {
      updates.title = title.trim()
    }

    if (subject) {
      updates.subject = subject
    }

    if (gradeLevel) {
      updates.grade_level = gradeLevel
    }

    // Update the study guide
    const { error: updateError } = await supabase
      .from('study_guides')
      .update(updates)
      .eq('id', id)

    if (updateError) {
      console.error('Error updating custom guide:', updateError)
      return NextResponse.json(
        { error: 'Failed to update study guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      studyGuideId: id,
      studyGuideUrl: `/study-guide/${id}`
    })

  } catch (error) {
    console.error('Update custom guide error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Also support GET to fetch a guide for editing
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Get userId from query param or fall back to cookie auth
    const { searchParams } = new URL(request.url)
    let userId: string | null = searchParams.get('userId')

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

    // Fetch the study guide
    const { data: guide, error } = await supabase
      .from('study_guides')
      .select('id, title, subject, grade_level, format, custom_content, user_id')
      .eq('id', id)
      .single()

    if (error || !guide) {
      return NextResponse.json(
        { error: 'Study guide not found' },
        { status: 404 }
      )
    }

    // Verify ownership
    if (guide.user_id !== userId) {
      return NextResponse.json(
        { error: 'You do not have permission to edit this study guide' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      id: guide.id,
      title: guide.title,
      subject: guide.subject,
      gradeLevel: guide.grade_level,
      format: guide.format,
      customContent: guide.custom_content
    })

  } catch (error) {
    console.error('Get custom guide error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
