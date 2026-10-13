import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { INBOX_LIMITS, tokenFromRecipients, usableAttachment, verifyWebhook } from '@/lib/scan-inbox/inbox'
import { sendEmail } from '@/lib/email/send'
import { scanArrivedEmail } from '@/lib/email/templates'

// Resend inbound webhook (event email.received) for the scanner inbox: a
// teacher's copier emails a scan to grade-<token>@INBOUND_EMAIL_DOMAIN; we
// save the PDF/photo attachments to the private scan-inbox bucket and email
// the teacher a link. Needs RESEND_INBOUND_SECRET (the webhook's signing
// secret), INBOUND_EMAIL_DOMAIN and RESEND_RECEIVING_API_KEY (a full-access
// key: Resend's send-only keys can't read received mail). Always answers 200 for mail
// we won't take, so Resend doesn't retry it.

export const maxDuration = 300

interface ReceivedEvent {
  type?: string
  data?: { email_id?: string; from?: string; to?: string[]; cc?: string[]; received_for?: string[]; subject?: string }
}

interface Attachment { id: string; filename: string; size?: number; content_type?: string; download_url: string }

const ok = (note: string) => NextResponse.json({ ok: true, note })

export async function POST(request: NextRequest) {
  const secret = process.env.RESEND_INBOUND_SECRET
  const domain = process.env.INBOUND_EMAIL_DOMAIN
  // Reading received mail needs a full-access Resend key; RESEND_API_KEY is send-only.
  const apiKey = process.env.RESEND_RECEIVING_API_KEY || process.env.RESEND_API_KEY
  if (!secret || !domain || !apiKey) return NextResponse.json({ error: 'Scanner inbox is not set up' }, { status: 503 })

  const raw = await request.text()
  const valid = verifyWebhook(raw, {
    id: request.headers.get('svix-id'),
    timestamp: request.headers.get('svix-timestamp'),
    signature: request.headers.get('svix-signature'),
  }, secret)
  if (!valid) return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })

  let event: ReceivedEvent
  try { event = JSON.parse(raw) } catch { return ok('not json') }
  if (event.type !== 'email.received' || !event.data?.email_id) return ok('ignored event')
  const { email_id: emailId, from, subject } = event.data

  const token = tokenFromRecipients([...(event.data.to ?? []), ...(event.data.cc ?? []), ...(event.data.received_for ?? [])], domain)
  if (!token) return ok('no inbox address')
  const supabase = createAdminClient()
  const { data: inbox } = await supabase.from('grading_inboxes').select('user_id').eq('token', token).maybeSingle()
  if (!inbox) return ok('unknown inbox')

  // Resend retries deliveries; one row per email.
  const { data: seen } = await supabase.from('scan_inbox_items').select('id').eq('email_id', emailId).maybeSingle()
  if (seen) return ok('already saved')

  const listRes = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  if (!listRes.ok) {
    console.error('Scan inbox: listing attachments failed', listRes.status, await listRes.text().catch(() => ''))
    return NextResponse.json({ error: 'Could not read attachments' }, { status: 502 }) // let Resend retry
  }
  const attachments: Attachment[] = ((await listRes.json()) as { data?: Attachment[] }).data ?? []

  const files: Array<{ name: string; path: string; size: number; contentType: string }> = []
  const skipped: Array<{ name: string; reason: string }> = []
  for (const [i, a] of attachments.entries()) {
    const name = (a.filename || `scan-${i + 1}`).replace(/[^\w.\- ]+/g, '_').slice(0, 120)
    if (!usableAttachment(name, a.content_type)) { skipped.push({ name, reason: 'Not a PDF or photo' }); continue }
    if (files.length >= INBOX_LIMITS.maxFiles) { skipped.push({ name, reason: `Only the first ${INBOX_LIMITS.maxFiles} files are kept` }); continue }
    if ((a.size ?? 0) > INBOX_LIMITS.maxFileBytes) { skipped.push({ name, reason: 'Over 100 MB' }); continue }
    const res = await fetch(a.download_url)
    if (!res.ok) { skipped.push({ name, reason: 'Could not download' }); continue }
    const buffer = Buffer.from(await res.arrayBuffer())
    const contentType = a.content_type || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream')
    const path = `${inbox.user_id}/${emailId}/${i + 1}-${name}`
    const { error: uploadError } = await supabase.storage.from('scan-inbox').upload(path, buffer, { contentType, upsert: true })
    if (uploadError) { console.error('Scan inbox upload failed:', uploadError); skipped.push({ name, reason: 'Could not save (file too large?)' }); continue }
    files.push({ name, path, size: buffer.byteLength, contentType })
  }

  // Gmail turns attachments over 25 MB into Google Drive links: say so instead of showing nothing.
  if (!files.length) {
    const linkNote = await driveLinkNote(emailId, apiKey)
    if (linkNote) skipped.push({ name: 'Google Drive links', reason: linkNote })
  }

  const { data: item, error: insertError } = await supabase
    .from('scan_inbox_items')
    .insert({ user_id: inbox.user_id, email_id: emailId, from_address: (from ?? '').slice(0, 200), subject: (subject ?? '').slice(0, 200), files, skipped })
    .select('id')
    .single()
  if (insertError) {
    if (insertError.code === '23505') return ok('already saved')
    console.error('Scan inbox insert failed:', insertError)
    return NextResponse.json({ error: 'Could not save' }, { status: 500 })
  }

  // Tell the teacher it's there (best effort).
  try {
    const { data: profile } = await supabase.from('user_profiles').select('email, first_name').eq('id', inbox.user_id).single()
    const siteUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://casanovastudy.com'
    if (profile?.email && (files.length || skipped.length)) {
      const mail = scanArrivedEmail({ firstName: profile.first_name, files: files.map((f) => f.name), skipped: skipped.map((s) => `${s.name} (${s.reason})`), link: `${siteUrl}/grade-exam/batch?inbox=${item.id}`, siteUrl })
      await sendEmail({ to: profile.email, ...mail })
    }
  } catch (e) {
    console.warn('Scan inbox notification failed:', e)
  }

  return ok(`saved ${files.length} file(s)`)
}

/** Reads the email body (Resend Receiving API) and explains Drive/OneDrive/Dropbox links, which can't be fetched. */
async function driveLinkNote(emailId: string, apiKey: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!res.ok) return null
    const body = (await res.json()) as { html?: string | null; text?: string | null }
    const content = `${body.html ?? ''} ${body.text ?? ''}`
    if (/drive\.google\.com|docs\.google\.com/i.test(content)) return 'Gmail sent the files as Google Drive links (over 25 MB), which can\'t be opened from here. Send smaller files (under 25 MB per email, several emails are fine) or scan on the copier.'
    if (/1drv\.ms|onedrive\.live\.com|sharepoint\.com|dropbox\.com/i.test(content)) return 'The files came as cloud links, which can\'t be opened from here. Attach the files instead (under 25 MB per email).'
    return null
  } catch {
    return null
  }
}
