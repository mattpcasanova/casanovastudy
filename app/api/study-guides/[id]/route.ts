import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createRouteHandlerClient } from '@/lib/supabase-server'

// Deletes a study guide the caller owns. Identity comes ONLY from the caller's
// session (Bearer access token, or Supabase auth cookies) — never from the
// request body. The delete runs as that user, so the owner-only RLS policy on
// study_guides applies too.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')
    const supabase = token
      ? createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
        })
      : createRouteHandlerClient(request)

    const { data: { user } } = await supabase.auth.getUser(token || undefined)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: guide, error: fetchError } = await supabase
      .from('study_guides')
      .select('user_id')
      .eq('id', id)
      .single()

    if (fetchError || !guide) {
      return NextResponse.json({ error: 'Study guide not found' }, { status: 404 })
    }

    if (guide.user_id !== user.id) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this study guide' },
        { status: 403 }
      )
    }

    // .select() so a delete blocked by RLS (0 rows) is reported, not silently "successful".
    const { data: deleted, error: deleteError } = await supabase
      .from('study_guides')
      .delete()
      .eq('id', id)
      .select('id')

    if (deleteError || !deleted || deleted.length === 0) {
      console.error('Error deleting study guide:', deleteError ?? 'no rows deleted')
      return NextResponse.json({ error: 'Failed to delete study guide' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete study guide error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
