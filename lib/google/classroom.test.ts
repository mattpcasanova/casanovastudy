import { describe, expect, it } from 'vitest'
import { periodFromSection, signState, studentToRoster, verifyState } from './classroom'

describe('OAuth state', () => {
  const user = '5e51e47f-d060-493d-b346-40d89595bc96'
  it('round-trips and expires', () => {
    process.env.GOOGLE_STATE_SECRET = 'test-secret'
    const state = signState(user, 1_000)
    expect(verifyState(state, 2_000)).toBe(user)
    expect(verifyState(state, 1_000 + 16 * 60 * 1000)).toBeNull()
  })
  it('rejects tampering', () => {
    process.env.GOOGLE_STATE_SECRET = 'test-secret'
    const [body, sig] = signState(user).split('.')
    const forged = Buffer.from(Buffer.from(body, 'base64url').toString().replace(user, '00000000-0000-0000-0000-000000000000')).toString('base64url')
    expect(verifyState(`${forged}.${sig}`)).toBeNull()
    expect(verifyState(null)).toBeNull()
  })
})

describe('mapping', () => {
  it('reads periods from course sections', () => {
    expect(periodFromSection('Period 2')).toBe('2')
    expect(periodFromSection('P3')).toBe('3')
    expect(periodFromSection('4B')).toBe('4B')
    expect(periodFromSection('Honors')).toBe('Honors')
    expect(periodFromSection(undefined)).toBeNull()
  })
  it('turns Classroom students into roster names', () => {
    expect(studentToRoster({ profile: { name: { givenName: 'Sean', familyName: 'Miller' }, emailAddress: 'Sean.Miller@School.org' } })).toEqual({ firstName: 'Sean', lastName: 'Miller', email: 'sean.miller@school.org' })
    expect(studentToRoster({ profile: { name: { fullName: 'Mary Ann Lee' } } })).toEqual({ firstName: 'Mary Ann', lastName: 'Lee', email: null })
    expect(studentToRoster({ profile: {} })).toBeNull()
  })
})
