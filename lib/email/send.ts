// Transactional email through Resend (RESEND_API_KEY, sending from a verified
// casanovastudy.com address).

export class EmailNotConfiguredError extends Error {
  constructor() { super('Email sending is not set up yet.') }
}

export interface OutgoingEmail {
  to: string
  subject: string
  html: string
  text: string
  replyTo?: string
  /** Extra headers, e.g. List-Unsubscribe on reminders. */
  headers?: Record<string, string>
  /** Sender override (must be on our verified domain), e.g. the forwarded-mail sender. */
  from?: string
  /** Files fetched by Resend from these URLs (Resend only). */
  attachments?: Array<{ filename: string; path: string }>
  /** Resend drops a repeat send with the same key for 24 h (webhook retries). */
  idempotencyKey?: string
}

const DEFAULT_FROM = 'Casanova Study <hello@casanovastudy.com>'

export async function sendEmail(mail: OutgoingEmail): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
        ...(mail.idempotencyKey ? { 'Idempotency-Key': mail.idempotencyKey } : {}),
      },
      body: JSON.stringify({
        from: mail.from || process.env.EMAIL_FROM || DEFAULT_FROM,
        attachments: mail.attachments?.length ? mail.attachments : undefined,
        to: [mail.to],
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
        reply_to: mail.replyTo,
        headers: mail.headers,
      }),
    })
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      throw new Error(`Resend ${res.status}: ${detail.slice(0, 300)}`)
    }
    return
  }

  throw new EmailNotConfiguredError()
}
