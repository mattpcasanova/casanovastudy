import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'

// POST - Save a reference to a static guide
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { guideId, title, subject, gradeLevel, staticRoute } = body

    // Identity comes only from the caller's session (never a body userId).
    const userId = (await getRequestUser(request))?.id
    if (!userId) {
      return NextResponse.json({ error: 'Please sign in to save this guide' }, { status: 401 })
    }

    if (!guideId || !title || !subject || !gradeLevel || !staticRoute) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

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
