import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { PHONE_LIMITS, isSessionPath, looksLikePhoneToken, phonePageName, phoneUploadPath } from '@/lib/scan-inbox/phone'
import { hashPhoneToken } from '@/lib/scan-inbox/phone-server'

// Send from your phone, phone side. No sign-in: the link's token is the key,
// and it can only add files to that teacher's scanner inbox, for 2 hours.
// GET: is the link still good (and marks it opened, so the laptop can say so).
// POST { action: 'sign', send, files: [{ contentType, size }] }: signed upload
//   links straight to storage (pages never pass through this function).
// POST { action: 'done', send, files: [{ path, contentType, size }] }: the
//   send is complete; it becomes one scan_inbox_items row the laptop picks up.

type Session = { id: string; user_id: string; expires_at: string; opened_at: string | null; files_signed: number; sends: number }

async function sessionFor(token: string): Promise<Session | null> {
  if (!looksLikePhoneToken(token)) return null
  const { data } = await createAdminClient()
    .from('phone_upload_sessions')
    .select('id, user_id, expires_at, opened_at, files_signed, sends')
    .eq('token_hash', hashPhoneToken(token))
    .maybeSingle()
  return data as Session | null
}

const expired = (s: Session) => new Date(s.expires_at).getTime() < Date.now()
const gone = () => NextResponse.json({ error: 'This link has expired. Make a new QR code on your laptop.', code: 'expired' }, { status: 410 })

export async function GET(_request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await sessionFor(token)
  if (!session || expired(session)) return gone()
  const supabase = createAdminClient()
  if (!session.opened_at) await supabase.from('phone_upload_sessions').update({ opened_at: new Date().toISOString() }).eq('id', session.id)
  const { data: profile } = await supabase.from('user_profiles').select('first_name').eq('id', session.user_id).maybeSingle()
  return NextResponse.json({ firstName: profile?.first_name ?? null, expiresAt: session.expires_at, sends: session.sends }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const session = await sessionFor(token)
  if (!session || expired(session)) return gone()
  const body = await request.json().catch(() => null)
  const send = Number(body?.send)
  const files = Array.isArray(body?.files) ? body.files : null
  if (!Number.isInteger(send) || send < 1 || send > 100 || !files?.length || files.length > PHONE_LIMITS.maxFilesPerSend) {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
  const supabase = createAdminClient()

  if (body.action === 'sign') {
    const start = Number(body.start) || 0
    if (session.files_signed + files.length > PHONE_LIMITS.maxFiles) {
      return NextResponse.json({ error: `One QR code can send up to ${PHONE_LIMITS.maxFiles} pages. Make a new code on your laptop for the rest.` }, { status: 413 })
    }
    const out: Array<{ path: string; token: string }> = []
    for (const [i, f] of (files as Array<{ contentType?: string; size?: number }>).entries()) {
      const size = Number(f.size)
      const path = phoneUploadPath(session.user_id, session.id, send, start + i, String(f.contentType ?? ''))
      if (!path || !Number.isFinite(size) || size <= 0) return NextResponse.json({ error: 'Only photos and PDFs can be sent' }, { status: 400 })
      if (size > PHONE_LIMITS.maxFileBytes) return NextResponse.json({ error: 'That file is too big to send. Take photos of the pages instead.' }, { status: 413 })
      const { data, error } = await supabase.storage.from('scan-inbox').createSignedUploadUrl(path, { upsert: true })
      if (error || !data) return NextResponse.json({ error: 'Could not get ready to send. Try again.' }, { status: 500 })
      out.push({ path, token: data.token })
    }
    await supabase.from('phone_upload_sessions').update({ files_signed: session.files_signed + files.length }).eq('id', session.id)
    return NextResponse.json({ uploads: out })
  }

  if (body.action === 'done') {
    const list = files as Array<{ path?: string; contentType?: string }>
    if (!list.every((f) => typeof f.path === 'string' && isSessionPath(f.path, session.user_id, session.id, send))) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }
    // Only files that really arrived, with their real sizes.
    const { data: stored } = await supabase.storage.from('scan-inbox').list(`${session.user_id}/phone/${session.id}`, { limit: 1000, search: `${send}-` })
    const sizes = new Map((stored ?? []).map((o) => [`${session.user_id}/phone/${session.id}/${o.name}`, Number((o.metadata as { size?: number } | null)?.size ?? 0)]))
    const saved = list
      .filter((f) => sizes.has(f.path!))
      .sort((a, b) => a.path!.localeCompare(b.path!))
      .map((f, i) => ({ name: phonePageName(send, i, String(f.contentType)), path: f.path!, size: sizes.get(f.path!) ?? 0, contentType: String(f.contentType) }))
    if (!saved.length) return NextResponse.json({ error: 'Nothing arrived. Try sending again.' }, { status: 400 })
    const { error } = await supabase.from('scan_inbox_items').upsert({
      user_id: session.user_id,
      email_id: `phone:${session.id}:${send}`,
      from_address: null,
      subject: 'From your phone',
      source: 'phone',
      phone_session_id: session.id,
      files: saved,
      skipped: [],
    }, { onConflict: 'email_id' })
    if (error) return NextResponse.json({ error: 'Could not finish sending. Try again.' }, { status: 500 })
    await supabase.from('phone_upload_sessions').update({ sends: Math.max(session.sends, send) }).eq('id', session.id)
    return NextResponse.json({ ok: true, pages: saved.length, missing: list.length - saved.length })
  }

  return NextResponse.json({ error: 'Bad request' }, { status: 400 })
}
