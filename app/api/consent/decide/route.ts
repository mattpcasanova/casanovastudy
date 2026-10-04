import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { hashToken } from '@/lib/consent'
import { deleteAccount } from '@/lib/account'

// The parent's side (/parent-consent?token=...). The emailed token is the only
// credential: GET shows whose account it is, POST approves or declines.
// Declining deletes the account and everything in it.

async function findByToken(token: string | null) {
  if (!token || token.length < 20) return null
  const supabase = createAdminClient()
  const { data } = await supabase.from('parental_consents').select('user_id, status, parent_email').eq('token_hash', hashToken(token)).maybeSingle()
  if (!data) return null
  const { data: profile } = await supabase.from('user_profiles').select('first_name, last_name, email').eq('id', data.user_id).maybeSingle()
  return { ...data, childName: [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Your child', childEmail: profile?.email ?? '' }
}

export async function GET(request: NextRequest) {
  const found = await findByToken(request.nextUrl.searchParams.get('token'))
  if (!found) return NextResponse.json({ error: 'This link is no longer valid. It may have been used already, or a newer one was sent.' }, { status: 404 })
  return NextResponse.json({ childName: found.childName, childEmail: found.childEmail, status: found.status })
}

export async function POST(request: NextRequest) {
  let body: { token?: string; decision?: string }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const found = await findByToken(body.token ?? null)
  if (!found) return NextResponse.json({ error: 'This link is no longer valid.' }, { status: 404 })

  if (body.decision === 'approve') {
    await createAdminClient().from('parental_consents')
      .update({ status: 'granted', token_hash: null, decided_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('user_id', found.user_id)
    return NextResponse.json({ status: 'granted', childName: found.childName })
  }
  if (body.decision === 'decline') {
    await deleteAccount(found.user_id)
    return NextResponse.json({ status: 'deleted', childName: found.childName })
  }
  return NextResponse.json({ error: 'Choose approve or decline.' }, { status: 400 })
}
