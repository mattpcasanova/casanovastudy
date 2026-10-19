import { describe, expect, it } from 'vitest'
import { attemptsLeft, bestAttempt, gradingFor, makeCode, pickerName, practiceStatus, sameStudentId } from './assignments'

const at = (pct: number, finishedAt: string, counted = true) => ({ pct, correct: pct, total: 100, counted, finishedAt })

describe('assigned practice', () => {
  it('grades adaptive by mastery, the rest by percent', () => {
    expect(gradingFor('adaptive')).toBe('mastery')
    expect(gradingFor('quiz')).toBe('percent')
  })
  it('makes readable codes', () => {
    const c = makeCode()
    expect(c).toMatch(/^[a-z2-9]{8}$/)
    expect(c).not.toMatch(/[01ilo]/)
  })
  it('best counted attempt and attempts left', () => {
    const list = [at(60, '2026-10-20T10:00:00Z'), at(90, '2026-10-21T10:00:00Z', false), at(75, '2026-10-21T11:00:00Z')]
    expect(bestAttempt(list)?.pct).toBe(75)
    expect(attemptsLeft(2, list)).toBe(0)
    expect(attemptsLeft(null, list)).toBeNull()
  })
  it('statuses around the due date', () => {
    const due = '2026-10-22T03:59:00Z'
    expect(practiceStatus([at(80, '2026-10-21T20:00:00Z')], due)).toBe('done')
    expect(practiceStatus([at(80, '2026-10-23T20:00:00Z')], due)).toBe('late')
    expect(practiceStatus([], due, Date.parse('2026-10-23T00:00:00Z'))).toBe('missing')
    expect(practiceStatus([], due, Date.parse('2026-10-21T00:00:00Z'))).toBe('not_started')
    expect(practiceStatus([], null)).toBe('not_started')
  })
  it('matches student IDs loosely', () => {
    expect(sameStudentId(' 0616-137-944 ', '616137944')).toBe(true)
    expect(sameStudentId('616137945', '616137944')).toBe(false)
    expect(sameStudentId('AB12', 'ab-12')).toBe(true)
    expect(sameStudentId('123', null)).toBe(false)
  })
  it('picker names show first name and last initial', () => {
    expect(pickerName('Lianna Christine', 'Wysocki')).toBe('Lianna W.')
    expect(pickerName('Mya', '')).toBe('Mya')
  })
})
