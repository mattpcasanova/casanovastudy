import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { PHONE_LIMITS } from '@/lib/scan-inbox/phone'
import { hashPhoneToken, newPhoneToken } from '@/lib/scan-inbox/phone-server'

// Send from your phone, laptop side (teacher only).
// POST: a new 2-hour link for the QR code (the token is only ever returned here).
// GET ?session=<id>: whether the phone opened it, and what it has sent so far.

export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const token = newPhoneToken()
  const expiresAt = new Date(Date.now() + PHONE_LIMITS.sessionMinutes * 60_000).toISOString()
  const { data, error: insertError } = await createAdminClient()
    .from('phone_upload_sessions')
    .insert({ user_id: user.id, token_hash: hashPhoneToken(token), expires_at: expiresAt })
    .select('id')
    .single()
  if (insertError || !data) return NextResponse.json({ error: 'Could not make a link' }, { status: 500 })
  const origin = request.headers.get('origin') || new URL(request.url).origin
  return NextResponse.json({ sessionId: data.id, url: `${origin}/phone/${token}`, expiresAt }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const id = request.nextUrl.searchParams.get('session') ?? ''
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = createAdminClient()
  const { data: session } = await supabase.from('phone_upload_sessions').select('id, user_id, opened_at, expires_at').eq('id', id).maybeSingle()
  if (!session || session.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data: items } = await supabase
    .from('scan_inbox_items')
    .select('id, files, used_at, received_at')
    .eq('phone_session_id', id)
    .order('received_at', { ascending: true })
  return NextResponse.json({
    opened: !!session.opened_at,
    expiresAt: session.expires_at,
    items: (items ?? []).map((r) => ({ id: r.id, pages: (r.files as unknown[]).length, usedAt: r.used_at, receivedAt: r.received_at })),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
