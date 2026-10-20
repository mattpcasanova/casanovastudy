// Teacher verification rules (pure, unit-tested). A teacher proves a school
// email by clicking a signed link; a domain on the verified list approves them
// at once, anything else waits for a manual review.

import { createHmac, timingSafeEqual } from 'crypto'

export { domainApproves, domainOf, isFreeEmailDomain, normalizeEmail } from './email-domains'

export type VerificationStatus = 'none' | 'pending' | 'approved' | 'rejected'

// Signed links. Email links expire after 7 days; review links (sent to the
// site owner) don't.

const DAY = 24 * 60 * 60 * 1000
export const EMAIL_LINK_DAYS = 7

function sign(key: string, payload: string): string {
  return createHmac('sha256', key).update(payload).digest('base64url').slice(0, 32)
}

function same(a: string, b: string): boolean {
  const x = Buffer.from(a)
  const y = Buffer.from(b)
  return x.length === y.length && timingSafeEqual(x, y)
}

export function emailLinkToken(key: string, userId: string, email: string, expires: number): string {
  return sign(key, `teacher-email:${userId}:${email.toLowerCase()}:${expires}`)
}

export function checkEmailLink(key: string, p: { userId: string; email: string; expires: number; token: string }, now = Date.now()): 'ok' | 'expired' | 'bad' {
  if (!same(emailLinkToken(key, p.userId, p.email, p.expires), p.token)) return 'bad'
  return p.expires < now ? 'expired' : 'ok'
}

export function emailLinkExpiry(now = Date.now()): number {
  return now + EMAIL_LINK_DAYS * DAY
}

export function reviewToken(key: string, userId: string): string {
  return sign(key, `teacher-review:${userId}`)
}

export function checkReviewToken(key: string, userId: string, token: string): boolean {
  return same(reviewToken(key, userId), token)
}
