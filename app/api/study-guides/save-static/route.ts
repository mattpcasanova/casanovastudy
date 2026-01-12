import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/lib/supabase-server'

// POST - Save a reference to a static guide
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guideId, title, subject, gradeLevel, staticRoute, userId } = body

    if (!guideId || !title || !subject || !gradeLevel || !staticRoute || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createRouteHandlerClient(request)

    // Check if user already has this static guide saved
    const { data: existing } = await supabase
      .from('study_guides')
      .select('id')
      .eq('user_id', userId)
      .eq('custom_content->>static_route', staticRoute)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Guide already saved' },
        { status: 409 }
      )
    }

    // Create a study guide entry that references the static guide
    const { data: guide, error } = await supabase
      .from('study_guides')
      .insert({
        title,
        subject,
        grade_level: gradeLevel,
        format: 'custom',
        content: `Static guide: ${title}`, // Placeholder content
        user_id: userId,
        custom_content: {
          static_route: staticRoute,
          static_guide_id: guideId,
          is_static: true
        },
        is_published: false
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving static guide:', error)
      return NextResponse.json(
        { error: 'Failed to save guide' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, guide })
  } catch (error) {
    console.error('Save static guide error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
