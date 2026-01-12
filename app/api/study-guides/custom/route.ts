import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { CustomGuideContent } from '@/lib/types/custom-guide'

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getAuthenticatedUser(request)

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { title, subject, gradeLevel, customContent } = body as {
      title: string
      subject: string
      gradeLevel: string
      customContent: CustomGuideContent
    }

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!customContent || !customContent.sections) {
      return NextResponse.json(
        { error: 'Custom content is required' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Create the study guide
    const { data: guide, error } = await supabase
      .from('study_guides')
      .insert({
        user_id: user.id,
        title: title.trim(),
        subject: subject || 'other',
        grade_level: gradeLevel || '9th-10th',
        format: 'custom',
        content: `Custom study guide: ${title}`,
        custom_content: customContent,
        file_count: 0
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error creating custom guide:', error)
      return NextResponse.json(
        { error: 'Failed to create study guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      studyGuideId: guide.id,
      studyGuideUrl: `/study-guide/${guide.id}`
    })

  } catch (error) {
    console.error('Create custom guide error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
