// Forwards one received email (Resend Receiving API) to the site owner.
// See lib/inbound/forward.ts for the rules.

import { sendEmail } from '@/lib/email/send'
import { escapeHtml } from '@/lib/email/layout'
import { forwardSubject, pickAttachments, safeForwardTarget } from './forward'

export const MAIN_DOMAIN = (process.env.FORWARD_DOMAIN || 'casanovastudy.com').toLowerCase()

interface ReceivedEmail { from?: string; to?: string[]; cc?: string[]; subject?: string; html?: string | null; text?: string | null; created_at?: string }
interface Attachment { filename: string; size?: number; content_type?: string; download_url: string }

export type ForwardResult = { status: 'sent' | 'no_target' } | { status: 'retry'; error: string }

export async function forwardReceivedEmail(emailId: string, aliases: string[], apiKey: string): Promise<ForwardResult> {
  const target = safeForwardTarget(process.env.FORWARD_TO || process.env.ADMIN_EMAIL, MAIN_DOMAIN)
  if (!target) return { status: 'no_target' }

  const headers = { Authorization: `Bearer ${apiKey}` }
  const res = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers })
  if (!res.ok) return { status: 'retry', error: `read ${res.status}` }
  const email = (await res.json()) as ReceivedEmail

  const listRes = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}/attachments`, { headers })
  const all: Attachment[] = listRes.ok ? (((await listRes.json()) as { data?: Attachment[] }).data ?? []) : []
  const { keep, dropped } = pickAttachments(all)

  const sender = (email.from ?? '').trim()
  const senderName = (sender.match(/^"?([^"<]+?)"?\s*</)?.[1] ?? sender.split('@')[0] ?? 'Someone').replace(/["<>]/g, '').trim().slice(0, 60)
  const sentTo = [...(email.to ?? []), ...(email.cc ?? [])].join(', ')
  const note = [
    `<strong>From:</strong> ${escapeHtml(sender)}`,
    `<strong>To:</strong> ${escapeHtml(sentTo)}`,
    dropped.length ? `<strong>Not attached (too large or too many):</strong> ${escapeHtml(dropped.join(', '))}` : '',
    'Reply to this email to answer the sender directly.',
  ].filter(Boolean).join('<br>')
  const banner = `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:13px;line-height:20px;color:#334155;background:#f1f5f9;border-radius:8px;padding:10px 12px;margin:0 0 16px 0;">${note}</div>`
  const body = email.html?.trim() ? email.html : `<pre style="white-space:pre-wrap;font-family:inherit;">${escapeHtml(email.text ?? '')}</pre>`

  try {
    await sendEmail({
      to: target,
      from: `${senderName || 'Someone'} via Casanova Study <hello@${MAIN_DOMAIN}>`,
      replyTo: sender || undefined,
      subject: forwardSubject(aliases, email.subject),
      html: `${banner}${body}`,
      text: [`From: ${sender}`, `To: ${sentTo}`, dropped.length ? `Not attached: ${dropped.join(', ')}` : '', '', email.text ?? '(HTML only, see the formatted version)'].filter((l) => l !== '').join('\n'),
      attachments: keep.map((a) => ({ filename: a.filename, path: a.download_url })),
      idempotencyKey: `forward-${emailId}`,
    })
    return { status: 'sent' }
  } catch (e) {
    return { status: 'retry', error: e instanceof Error ? e.message : String(e) }
  }
}
