import { describe, it, expect } from 'vitest'
import { scheduleUnits, studyDates, toISODate } from './schedule'

// Monday, Oct 5 2026 (local time)
const today = new Date(2026, 9, 5)

describe('studyDates', () => {
  it('lists study days before the test day, following the weekly pattern', () => {
    expect(studyDates(today, '2026-10-12', 7)).toHaveLength(7) // Oct 5-11
    expect(studyDates(today, '2026-10-12', 5)).toEqual(['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09'])
    expect(studyDates(today, '2026-10-12', 3)).toEqual(['2026-10-05', '2026-10-07', '2026-10-09'])
    expect(studyDates(today, '2026-10-05', 7)).toEqual([]) // test is today
  })
})

describe('scheduleUnits', () => {
  it('spreads units evenly and keeps a review day when there is room', () => {
    const r = scheduleUnits(['u1', 'u2', 'u3'], { testDate: '2026-10-12', daysPerWeek: 7 }, today)
    expect(r.reviewDate).toBe('2026-10-11')
    expect(Object.values(r.byUnit)).toEqual(['2026-10-05', '2026-10-07', '2026-10-09'])
    expect(r.finishDate).toBe('2026-10-09')
    expect(r.daysLeft).toBe(7)
  })

  it('doubles up when there are more units than days, in plan order', () => {
    const r = scheduleUnits(['a', 'b', 'c', 'd'], { testDate: '2026-10-07', daysPerWeek: 7 }, today)
    expect(r.reviewDate).toBeNull()
    expect(r.byUnit).toEqual({ a: '2026-10-05', b: '2026-10-05', c: '2026-10-06', d: '2026-10-06' })
  })

  it('reports pace per week and handles a past date', () => {
    const r = scheduleUnits(['u1', 'u2', 'u3', 'u4', 'u5', 'u6'], { testDate: '2026-10-19', daysPerWeek: 3 }, today)
    expect(r.perWeek).toBe(3)
    const past = scheduleUnits(['u1'], { testDate: '2026-10-01', daysPerWeek: 7 }, today)
    expect(past.studyDays).toBe(0)
    expect(past.byUnit).toEqual({})
  })

  it('formats local dates', () => {
    expect(toISODate(new Date(2026, 0, 3))).toBe('2026-01-03')
  })
})
