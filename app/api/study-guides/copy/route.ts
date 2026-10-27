import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'

interface CopyRequest {
  studyGuideId: string
  userId?: string
}

/** The caller's existing copy of a guide, if any (same title, format and content). */
async function existingCopy(supabase: ReturnType<typeof createAdminClient>, userId: string, original: { title: string; format: string; content: string | null; custom_content: unknown }) {
  const { data: mine } = await supabase
    .from('study_guides')
    .select('id, content, custom_content')
    .eq('user_id', userId)
    .eq('title', original.title)
    .eq('format', original.format)
    .limit(20)
  return (mine ?? []).find((g) => g.content === original.content && JSON.stringify(g.custom_content ?? null) === JSON.stringify(original.custom_content ?? null)) ?? null
}

// GET ?studyGuideId= : { savedId } when the caller already saved this guide (the viewer hides Save then).
export async function GET(request: NextRequest) {
  const userId = (await getRequestUser(request))?.id
  const id = request.nextUrl.searchParams.get('studyGuideId')
  if (!userId || !id) return NextResponse.json({ savedId: null })
  const supabase = createAdminClient()
  const { data: original } = await supabase.from('study_guides').select('title, format, content, custom_content, user_id').eq('id', id).maybeSingle()
  if (!original || original.user_id === userId) return NextResponse.json({ savedId: null })
  const existing = await existingCopy(supabase, userId, original)
  return NextResponse.json({ savedId: existing?.id ?? null }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  try {
    const body: CopyRequest = await request.json()

    // Identity comes only from the caller's session (never a body/query userId).
    const userId: string | null = (await getRequestUser(request))?.id ?? null

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

    const supabase = createAdminClient()

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

    // Already saved? Open that copy instead of making another (7th graders
    // pressed Save 6-8 times on one shared guide; nothing told them it was done).
    const existing = await existingCopy(supabase, userId, originalGuide)
    if (existing) {
      return NextResponse.json({ success: true, alreadySaved: true, studyGuide: existing, studyGuideUrl: `/study-guide/${existing.id}` })
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
        custom_content: originalGuide.custom_content,
        language: originalGuide.language,
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
