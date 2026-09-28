import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { CustomGuideContent } from '@/lib/types/custom-guide'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { title, subject, gradeLevel, className, customContent } = body as {
      title: string
      subject: string
      gradeLevel: string
      className?: string
      customContent: CustomGuideContent
      userId?: string
    }

    // Identity comes only from the caller's session (never a body/query userId).
    const userId: string | null = (await getRequestUser(request))?.id ?? null

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
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

    const supabase = createAdminClient()

    // Create the study guide
    const { data: guide, error } = await supabase
      .from('study_guides')
      .insert({
        user_id: userId,
        title: title.trim(),
        subject: subject || 'other',
        grade_level: gradeLevel || '9th-10th',
        format: 'custom',
        content: `Custom study guide: ${title}`,
        custom_content: customContent,
        class_name: className || null,
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
