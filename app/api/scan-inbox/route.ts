import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { inboxAddress, newInboxToken } from '@/lib/scan-inbox/inbox'

// The teacher's scanner inbox: their copier email address and the last 30
// days of scans. POST { action: 'regenerate' } makes a new address (the old
// one stops working). Address is null until INBOUND_EMAIL_DOMAIN is set.

async function ensureToken(userId: string, fresh = false): Promise<string> {
  const supabase = createAdminClient()
  if (!fresh) {
    const { data } = await supabase.from('grading_inboxes').select('token').eq('user_id', userId).maybeSingle()
    if (data) return data.token
  }
  for (let i = 0; i < 5; i++) {
    const token = newInboxToken()
    const { error } = await supabase.from('grading_inboxes').upsert({ user_id: userId, token, created_at: new Date().toISOString() })
    if (!error) return token
  }
  throw new Error('Could not make an inbox address')
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const domain = process.env.INBOUND_EMAIL_DOMAIN
  const token = domain ? await ensureToken(user.id) : null
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { data } = await createAdminClient()
    .from('scan_inbox_items')
    .select('id, from_address, subject, files, skipped, used_at, received_at')
    .eq('user_id', user.id)
    .gte('received_at', since)
    .order('received_at', { ascending: false })
    .limit(20)
  const items = (data ?? []).map((r) => ({
    id: r.id,
    from: r.from_address,
    subject: r.subject,
    receivedAt: r.received_at,
    usedAt: r.used_at,
    files: (r.files as Array<{ name: string; size: number }>).map((f) => ({ name: f.name, size: f.size })),
    skipped: r.skipped,
  }))
  return NextResponse.json({ address: token && domain ? inboxAddress(token, domain) : null, items }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const domain = process.env.INBOUND_EMAIL_DOMAIN
  if (!domain) return NextResponse.json({ error: 'The scanner inbox is not set up yet' }, { status: 503 })
  const token = await ensureToken(user.id, true)
  return NextResponse.json({ address: inboxAddress(token, domain) })
}
