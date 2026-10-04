import { describe, expect, it } from 'vitest'
import { ageOn, consentStep, isEmail } from './consent-rules'

const now = new Date('2026-10-04T12:00:00')

describe('ageOn', () => {
  it('counts whole years, birthday-aware', () => {
    expect(ageOn('2013-10-04', now)).toBe(13)
    expect(ageOn('2013-10-05', now)).toBe(12)
    expect(ageOn('2014-01-01', now)).toBe(12)
  })
  it('rejects missing or nonsense dates', () => {
    expect(ageOn(null, now)).toBeNull()
    expect(ageOn('hello', now)).toBeNull()
    expect(ageOn('2030-01-01', now)).toBeNull()
  })
})

describe('consentStep', () => {
  it('asks under-13 students for a parent, once asked waits for approval', () => {
    expect(consentStep({ userType: 'student', birthDate: '2015-03-01', now })).toBe('parent')
    expect(consentStep({ userType: 'student', birthDate: '2015-03-01', status: 'pending', now })).toBe('pending')
    expect(consentStep({ userType: 'student', birthDate: '2015-03-01', status: 'granted', now })).toBe('ok')
  })
  it('keeps waiting even if the birth date is changed after asking', () => {
    expect(consentStep({ userType: 'student', birthDate: '1990-01-01', status: 'pending', now })).toBe('pending')
  })
  it('lets teachers, school sign-ins and older students through', () => {
    expect(consentStep({ userType: 'teacher', birthDate: '2015-03-01', now })).toBe('ok')
    expect(consentStep({ userType: 'student', birthDate: '2015-03-01', viaSchool: true, now })).toBe('ok')
    expect(consentStep({ userType: 'student', birthDate: '2008-03-01', now })).toBe('ok')
  })
  it('asks students without a birth date for one', () => {
    expect(consentStep({ userType: 'student', birthDate: null, now })).toBe('birthdate')
  })
  it('treats an impossible age (a date-picker typo like this year) as missing, not as a child', () => {
    expect(consentStep({ userType: 'student', birthDate: '2026-05-01', now })).toBe('birthdate')
    expect(consentStep({ userType: 'student', birthDate: '2017-05-01', now })).toBe('parent')
  })
})

describe('isEmail', () => {
  it('accepts normal addresses only', () => {
    expect(isEmail('parent@gmail.com')).toBe(true)
    expect(isEmail('nope')).toBe(false)
    expect(isEmail('a@b')).toBe(false)
  })
})
