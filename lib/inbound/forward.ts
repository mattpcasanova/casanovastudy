// Forwarding mail sent to our own addresses (hello@, privacy@ …) on the main
// domain to the site owner's inbox. Pure; unit-tested. Mail arrives through
// Resend receiving (MX on casanovastudy.com) and the email.received webhook
// at /api/inbound/scan, which also serves the scanner inbox.

/** Addresses on the main domain that are forwarded. Anything else is dropped (spam to made-up names). */
export const FORWARDED_ALIASES = ['hello', 'privacy', 'support', 'schools'] as const

const addressOf = (raw: string) => (raw.match(/<([^>]+)>/)?.[1] ?? raw).trim().toLowerCase()

/** Which of our aliases this email was sent to (deduped, in alias order). */
export function forwardedAliases(recipients: string[], domain: string): string[] {
  const d = domain.toLowerCase()
  const hit = new Set<string>()
  for (const r of recipients) {
    const [local, host] = addressOf(r).split('@')
    if (host === d && (FORWARDED_ALIASES as readonly string[]).includes(local)) hit.add(local)
  }
  return FORWARDED_ALIASES.filter((a) => hit.has(a))
}

/** Never forward into a loop: the destination must not be one of our own forwarded addresses. */
export function safeForwardTarget(target: string | null | undefined, domain: string): string | null {
  const t = target?.trim().toLowerCase()
  if (!t || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return null
  return t.endsWith(`@${domain.toLowerCase()}`) ? null : t
}

/** "[privacy@] Question about my child's data" */
export function forwardSubject(aliases: string[], subject: string | null | undefined): string {
  const tag = `[${aliases.map((a) => `${a}@`).join(', ')}]`
  return `${tag} ${(subject ?? '').trim() || '(no subject)'}`.slice(0, 250)
}

export const FORWARD_LIMITS = { maxAttachments: 10, maxTotalBytes: 30 * 1024 * 1024 }

/** Attachments that fit in one forwarded email; the rest are named in the note. */
export function pickAttachments<T extends { filename: string; size?: number }>(list: T[]): { keep: T[]; dropped: string[] } {
  const keep: T[] = []
  const dropped: string[] = []
  let total = 0
  for (const a of list) {
    const size = a.size ?? 0
    if (keep.length >= FORWARD_LIMITS.maxAttachments || total + size > FORWARD_LIMITS.maxTotalBytes) { dropped.push(a.filename); continue }
    keep.push(a)
    total += size
  }
  return { keep, dropped }
}
