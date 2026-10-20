import { describe, expect, it } from 'vitest'
import { checkEmailLink, checkReviewToken, domainApproves, domainOf, emailLinkExpiry, emailLinkToken, isFreeEmailDomain, normalizeEmail, reviewToken } from './verification-rules'

describe('emails and domains', () => {
  it('normalizes and rejects junk', () => {
    expect(normalizeEmail('  Ms.Smith@School.ORG ')).toBe('ms.smith@school.org')
    expect(normalizeEmail('not an email')).toBeNull()
    expect(domainOf('a@b.k12.fl.us')).toBe('b.k12.fl.us')
  })

  it('never auto-approves personal mail', () => {
    expect(isFreeEmailDomain('gmail.com')).toBe(true)
    expect(domainApproves('teacher@gmail.com', ['gmail.com'])).toBe(false)
  })

  it('approves a verified domain and its subdomains only', () => {
    expect(domainApproves('t@somersetacademy.com', ['somersetacademy.com'])).toBe(true)
    expect(domainApproves('t@staff.somersetacademy.com', ['somersetacademy.com'])).toBe(true)
    expect(domainApproves('t@notsomersetacademy.com', ['somersetacademy.com'])).toBe(false)
    expect(domainApproves('t@other.org', ['somersetacademy.com'])).toBe(false)
  })
})

describe('signed links', () => {
  const key = 'k'
  it('checks the email link and its expiry', () => {
    const now = 1_000_000
    const expires = emailLinkExpiry(now)
    const token = emailLinkToken(key, 'u1', 'T@School.org', expires)
    expect(checkEmailLink(key, { userId: 'u1', email: 't@school.org', expires, token }, now)).toBe('ok')
    expect(checkEmailLink(key, { userId: 'u2', email: 't@school.org', expires, token }, now)).toBe('bad')
    expect(checkEmailLink(key, { userId: 'u1', email: 'x@school.org', expires, token }, now)).toBe('bad')
    expect(checkEmailLink(key, { userId: 'u1', email: 't@school.org', expires: expires + 1, token }, now)).toBe('bad')
    expect(checkEmailLink(key, { userId: 'u1', email: 't@school.org', expires, token }, expires + 1)).toBe('expired')
  })

  it('checks review tokens per user', () => {
    expect(checkReviewToken(key, 'u1', reviewToken(key, 'u1'))).toBe(true)
    expect(checkReviewToken(key, 'u2', reviewToken(key, 'u1'))).toBe(false)
    expect(checkReviewToken(key, 'u1', 'short')).toBe(false)
  })
})
