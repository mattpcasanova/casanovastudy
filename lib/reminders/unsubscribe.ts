// Signed one-tap unsubscribe links for reminder emails: /reminders/off?u=<id>&t=<sig>.
// The signature is an HMAC of the user id, so nobody can switch off someone
// else's reminders, and no token has to be stored.

import { createHmac, timingSafeEqual } from 'crypto'

function key(): string {
  const k = process.env.REMINDER_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!k) throw new Error('No signing key for reminder links')
  return k
}

export function unsubscribeToken(userId: string): string {
  return createHmac('sha256', key()).update(`reminders-off:${userId}`).digest('base64url').slice(0, 32)
}

export function verifyUnsubscribe(userId: string, token: string): boolean {
  const want = Buffer.from(unsubscribeToken(userId))
  const got = Buffer.from(token)
  return want.length === got.length && timingSafeEqual(want, got)
}

export function unsubscribeUrl(siteUrl: string, userId: string): string {
  return `${siteUrl.replace(/\/$/, '')}/reminders/off?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`
}

/** One-click unsubscribe target for the List-Unsubscribe header (RFC 8058, POST). */
export function oneClickUrl(siteUrl: string, userId: string): string {
  return `${siteUrl.replace(/\/$/, '')}/api/reminders/unsubscribe?u=${encodeURIComponent(userId)}&t=${unsubscribeToken(userId)}`
}
