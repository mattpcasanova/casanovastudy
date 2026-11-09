import { describe, expect, it } from 'vitest'
import { dueSoon, dueWord, formatDue, studentReminder, teacherSummary } from './reminders'

// 4:30 pm Eastern (EST) on a Thursday.
const now = new Date('2026-11-12T21:30:00Z')

describe('dueSoon', () => {
  it('is true inside the 36-hour window and false outside it', () => {
    expect(dueSoon('2026-11-13T04:59:00Z', now)).toBe(true) // Thu 11:59 pm Eastern
    expect(dueSoon('2026-11-14T04:59:00Z', now)).toBe(true) // Fri 11:59 pm Eastern (31.5 h)
    expect(dueSoon('2026-11-14T13:00:00Z', now)).toBe(false) // Sat 8 am Eastern (39.5 h)
    expect(dueSoon('2026-11-12T20:00:00Z', now)).toBe(false) // already past
    expect(dueSoon(null, now)).toBe(false)
    expect(dueSoon('garbage', now)).toBe(false)
  })
})

describe('studentReminder', () => {
  const base = { status: 'not_started', linked: true, remindedAt: null, inProgress: null }
  it('reminds a linked student who has nothing turned in, once', () => {
    expect(studentReminder(base)).toEqual({ send: true, kind: 'not-started' })
    expect(studentReminder({ ...base, inProgress: { answered: 7, total: 20 } })).toEqual({ send: true, kind: 'in-progress' })
    expect(studentReminder({ ...base, inProgress: { answered: 0, total: 20 } })).toEqual({ send: true, kind: 'not-started' })
    expect(studentReminder({ ...base, remindedAt: '2026-11-11T21:30:00Z' })).toEqual({ send: false, reason: 'already-reminded' })
  })
  it('skips students who finished or have no account', () => {
    expect(studentReminder({ ...base, status: 'done' })).toEqual({ send: false, reason: 'done' })
    expect(studentReminder({ ...base, status: 'late' })).toEqual({ send: false, reason: 'done' })
    expect(studentReminder({ ...base, linked: false })).toEqual({ send: false, reason: 'not-linked' })
  })
})

describe('teacherSummary', () => {
  it('counts done, in progress and not started, listing the behind students not-started first', () => {
    const s = teacherSummary([
      { name: 'Ava Kim', status: 'done', inProgress: null },
      { name: 'Sean Miller', status: 'not_started', inProgress: { answered: 3 } },
      { name: 'Mary Lee', status: 'not_started', inProgress: null },
      { name: 'Brandon Okafor', status: 'not_started', inProgress: { answered: 0 } },
    ])
    expect(s).toEqual({ total: 4, done: 1, inProgress: 1, notStarted: 2, names: ['Mary Lee', 'Brandon Okafor', 'Sean Miller'] })
  })
})

describe('formatDue / dueWord', () => {
  it('shows the due date in Eastern time', () => {
    expect(formatDue('2026-11-14T04:59:00Z')).toBe('Friday, Nov 13 at 11:59 PM')
    expect(dueWord('2026-11-14T04:59:00Z', now)).toBe('tomorrow')
    expect(dueWord('2026-11-13T04:59:00Z', now)).toBe('today')
    expect(dueWord('2026-11-15T04:59:00Z', now)).toBe('on Saturday')
  })
})
