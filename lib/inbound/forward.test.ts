import { describe, expect, it } from 'vitest'
import { forwardSubject, forwardedAliases, pickAttachments, safeForwardTarget } from './forward'

describe('forwardedAliases', () => {
  it('finds our aliases in to/cc, names and case included', () => {
    expect(forwardedAliases(['Matt <Hello@CasanovaStudy.com>', 'privacy@casanovastudy.com', 'hello@casanovastudy.com'], 'casanovastudy.com')).toEqual(['hello', 'privacy'])
  })
  it('ignores other names, other domains and the scanner inbox', () => {
    expect(forwardedAliases(['admin@casanovastudy.com', 'hello@other.com', 'grade-abc123@naroblo.resend.app'], 'casanovastudy.com')).toEqual([])
  })
})

describe('safeForwardTarget', () => {
  it('refuses loops and junk', () => {
    expect(safeForwardTarget('hello@casanovastudy.com', 'casanovastudy.com')).toBeNull()
    expect(safeForwardTarget('', 'casanovastudy.com')).toBeNull()
    expect(safeForwardTarget('not-an-email', 'casanovastudy.com')).toBeNull()
    expect(safeForwardTarget(' Me@Gmail.com ', 'casanovastudy.com')).toBe('me@gmail.com')
  })
})

describe('forwardSubject and attachments', () => {
  it('tags the subject', () => {
    expect(forwardSubject(['privacy'], 'Data request')).toBe('[privacy@] Data request')
    expect(forwardSubject(['hello', 'privacy'], '  ')).toBe('[hello@, privacy@] (no subject)')
  })
  it('keeps attachments under the limits', () => {
    const mb = 1024 * 1024
    const r = pickAttachments([{ filename: 'a.pdf', size: 20 * mb }, { filename: 'b.pdf', size: 15 * mb }, { filename: 'c.jpg', size: 1 * mb }])
    expect(r.keep.map((a) => a.filename)).toEqual(['a.pdf', 'c.jpg'])
    expect(r.dropped).toEqual(['b.pdf'])
  })
})
