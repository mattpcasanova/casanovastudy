// Scanner inbox helpers (migration 053). Pure; unit-tested.
//  - inbox addresses: grade-<token>@<domain>
//  - Resend webhook signatures (Svix scheme): HMAC-SHA256 over
//    "<svix-id>.<svix-timestamp>.<raw body>" with the base64 secret after
//    "whsec_"; the svix-signature header holds space-separated "v1,<base64>".
//  - which attachments the grader can use

import { createHmac, randomBytes, timingSafeEqual } from 'crypto'

const TOKEN_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'

export function newInboxToken(): string {
  const bytes = randomBytes(10)
  return Array.from(bytes, (b) => TOKEN_ALPHABET[b % TOKEN_ALPHABET.length]).join('')
}

export function inboxAddress(token: string, domain: string): string {
  return `grade-${token}@${domain}`
}

/** The inbox token from any recipient address on our inbound domain ("Name <grade-abc@x>" works too). */
export function tokenFromRecipients(recipients: string[], domain: string): string | null {
  const d = domain.toLowerCase()
  for (const raw of recipients) {
    const addr = (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim().toLowerCase()
    const m = addr.match(/^grade-([a-z0-9]{6,32})@(.+)$/)
    if (m && m[2] === d) return m[1]
  }
  return null
}

export function verifyWebhook(
  rawBody: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): boolean {
  const { id, timestamp, signature } = headers
  if (!id || !timestamp || !signature || !secret) return false
  const ts = Number(timestamp)
  if (!Number.isFinite(ts) || Math.abs(nowSeconds - ts) > 5 * 60) return false
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64')
  const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()
  return signature.split(' ').some((part) => {
    const [version, sig] = part.split(',')
    if (version !== 'v1' || !sig) return false
    const given = Buffer.from(sig, 'base64')
    return given.length === expected.length && timingSafeEqual(given, expected)
  })
}

export const INBOX_LIMITS = { maxFiles: 20, maxFileBytes: 100 * 1024 * 1024 }

/** Scans the grader can read: PDFs and photos (HEIC too). Word files etc. are skipped with a note. */
export function usableAttachment(filename: string, contentType: string | null | undefined): boolean {
  const type = (contentType ?? '').toLowerCase()
  if (type === 'application/pdf' || type.startsWith('image/')) return true
  return /\.(pdf|jpe?g|png|heic|heif|webp|tiff?)$/i.test(filename)
}
