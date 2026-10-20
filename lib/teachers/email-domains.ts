// School vs personal email domains (pure; safe to import in the browser).

/** Personal mail providers: never a school domain, so never auto-approved. */
const FREE_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com', 'outlook.com', 'live.com', 'msn.com',
  'icloud.com', 'me.com', 'mac.com', 'aol.com', 'proton.me', 'protonmail.com', 'gmx.com', 'mail.com', 'zoho.com',
  'yandex.com', 'hey.com', 'fastmail.com', 'example.com',
])

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function normalizeEmail(email: string | null | undefined): string | null {
  const e = String(email ?? '').trim().toLowerCase()
  return EMAIL.test(e) ? e : null
}

export function domainOf(email: string | null | undefined): string | null {
  const e = normalizeEmail(email)
  return e ? e.slice(e.indexOf('@') + 1) : null
}

export function isFreeEmailDomain(domain: string | null | undefined): boolean {
  return !!domain && FREE_DOMAINS.has(domain.toLowerCase())
}

/** A confirmed school email on (or under) a verified domain: approve straight away. */
export function domainApproves(email: string, verifiedDomains: string[]): boolean {
  const d = domainOf(email)
  if (!d || isFreeEmailDomain(d)) return false
  return verifiedDomains.some((v) => d === v || d.endsWith(`.${v}`))
}
