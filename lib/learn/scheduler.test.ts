import { describe, it, expect } from 'vitest'
import { gradeItem, buildSession, summarize, INTERVAL_DAYS, MAX_BOX, type LearnState } from './scheduler'

const now = new Date('2026-09-28T15:00:00Z')
const days = (n: number) => new Date(now.getTime() + n * 86_400_000)

describe('gradeItem', () => {
  it('moves up a box and schedules further out when correct', () => {
    let s: LearnState = {}
    s = gradeItem(s, 'a', true, now)
    expect(s.a.box).toBe(1)
    expect(new Date(s.a.due) > now).toBe(true)
    s = gradeItem(s, 'a', true, days(1))
    expect(s.a.box).toBe(2)
    expect(s.a.reps).toBe(2)
  })

  it('resets to box 0, due now, and counts a lapse on a miss', () => {
    let s: LearnState = { a: { box: 3, due: now.toISOString(), reps: 3, lapses: 0 } }
    s = gradeItem(s, 'a', false, now)
    expect(s.a).toMatchObject({ box: 0, reps: 4, lapses: 1 })
    expect(new Date(s.a.due).getTime()).toBe(now.getTime())
    s = gradeItem(s, 'a', false, now) // missed again while relearning
    expect(s.a.lapses).toBe(1)
    s = gradeItem(s, 'a', true, now) // relearned → box 1, due tomorrow
    expect(s.a.box).toBe(1)
  })

  it('caps at the top box', () => {
    let s: LearnState = { a: { box: MAX_BOX, due: now.toISOString(), reps: 9, lapses: 0 } }
    s = gradeItem(s, 'a', true, now)
    expect(s.a.box).toBe(MAX_BOX)
    expect(INTERVAL_DAYS[MAX_BOX]).toBe(30)
  })
})

describe('buildSession', () => {
  const state: LearnState = {
    overdueLow: { box: 1, due: days(-3).toISOString(), reps: 2, lapses: 0 },
    dueHigh: { box: 4, due: days(-1).toISOString(), reps: 5, lapses: 0 },
    later: { box: 2, due: days(2).toISOString(), reps: 2, lapses: 0 },
  }
  const ids = ['n1', 'overdueLow', 'n2', 'later', 'dueHigh', 'n3']

  it('puts due items first (lowest box first), then new items, skipping not-yet-due', () => {
    expect(buildSession(ids, state, now)).toEqual(['overdueLow', 'dueHigh', 'n1', 'n2', 'n3'])
  })

  it('respects the new-item and session caps', () => {
    expect(buildSession(ids, state, now, { newLimit: 1 })).toEqual(['overdueLow', 'dueHigh', 'n1'])
    expect(buildSession(ids, state, now, { max: 2 })).toEqual(['overdueLow', 'dueHigh'])
  })

  it('summarizes due / new / learning / mastered and the next review', () => {
    const s = summarize(ids, { ...state, m: { box: 5, due: days(10).toISOString(), reps: 6, lapses: 0 } }, now)
    expect(s).toMatchObject({ total: 6, due: 2, fresh: 3, learning: 3, mastered: 0 })
    expect(s.nextDue).toBe(state.later.due)
  })
})
