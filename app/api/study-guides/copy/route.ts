import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'

interface CopyRequest {
  studyGuideId: string
  userId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: CopyRequest = await request.json()

    // Get userId from request body or fall back to cookie auth
    let userId: string | null = body.userId || null

    if (!userId) {
      const cookieUser = await getAuthenticatedUser(request)
      userId = cookieUser?.id || null
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'You must be logged in to save a study guide' },
        { status: 401 }
      )
    }

    if (!body.studyGuideId) {
      return NextResponse.json(
        { error: 'Study guide ID is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Fetch the original study guide
    const { data: originalGuide, error: fetchError } = await supabase
      .from('study_guides')
      .select('*')
      .eq('id', body.studyGuideId)
      .single()

    if (fetchError || !originalGuide) {
      return NextResponse.json(
        { error: 'Study guide not found' },
        { status: 404 }
      )
    }

    // Check if user already owns this guide
    if (originalGuide.user_id === userId) {
      return NextResponse.json(
        { error: 'You already own this study guide' },
        { status: 400 }
      )
    }

    // Create a copy with the new user's ID
    const { data: newGuide, error: insertError } = await supabase
      .from('study_guides')
      .insert({
        title: originalGuide.title,
        subject: originalGuide.subject,
        grade_level: originalGuide.grade_level,
        format: originalGuide.format,
        content: originalGuide.content,
        topic_focus: originalGuide.topic_focus,
        difficulty_level: originalGuide.difficulty_level,
        additional_instructions: originalGuide.additional_instructions,
        file_count: originalGuide.file_count,
        user_id: userId,
      })
      .select()
      .single()

    if (insertError || !newGuide) {
      console.error('Error copying study guide:', insertError)
      return NextResponse.json(
        { error: 'Failed to save study guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      studyGuide: newGuide,
      studyGuideUrl: `/study-guide/${newGuide.id}`
    })

  } catch (error) {
    console.error('Copy study guide error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
