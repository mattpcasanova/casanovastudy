import nodemailer from 'nodemailer'

// Transactional email. Prefers Resend (RESEND_API_KEY, sending from a verified
// casanovastudy.com address); falls back to the Gmail app password if that's
// all that is configured.

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
}

const DEFAULT_FROM = 'Casanova Study <hello@casanovastudy.com>'

export async function sendEmail(mail: OutgoingEmail): Promise<void> {
  if (process.env.RESEND_API_KEY) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM || DEFAULT_FROM,
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

  if (process.env.GMAIL_APP_PASSWORD) {
    const user = process.env.GMAIL_USER || 'mattpcasanova@gmail.com'
    const transporter = nodemailer.createTransport({ service: 'gmail', auth: { user, pass: process.env.GMAIL_APP_PASSWORD } })
    await transporter.sendMail({ from: `"Casanova Study" <${user}>`, to: mail.to, subject: mail.subject, html: mail.html, text: mail.text, replyTo: mail.replyTo, headers: mail.headers })
    return
  }

  throw new EmailNotConfiguredError()
}
