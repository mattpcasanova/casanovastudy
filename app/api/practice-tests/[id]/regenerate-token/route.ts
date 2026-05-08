import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

function newToken(): string {
  return randomBytes(24).toString('base64url')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const which = body.which
    if (which !== 'share' && which !== 'results') {
      return NextResponse.json({ error: 'which must be "share" or "results"' }, { status: 400 })
    }

    const supabase = createAdminClient()
    const { data: existing } = await supabase
      .from('practice_tests')
      .select('id, teacher_id')
      .eq('id', id)
      .single()
    if (!existing) return NextResponse.json({ error: 'Practice test not found' }, { status: 404 })
    if (existing.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not your practice test' }, { status: 403 })
    }

    const update = which === 'share'
      ? { share_token: newToken() }
      : { results_share_token: newToken() }

    const { data, error } = await supabase
      .from('practice_tests')
      .update(update)
      .eq('id', id)
      .eq('teacher_id', user.id)
      .select('share_token, results_share_token')
      .single()
    if (error || !data) {
      console.error('Error regenerating token:', error)
      return NextResponse.json({ error: 'Failed to regenerate token' }, { status: 500 })
    }
    return NextResponse.json({ share_token: data.share_token, results_share_token: data.results_share_token })
  } catch (error) {
    console.error('Regenerate token error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
