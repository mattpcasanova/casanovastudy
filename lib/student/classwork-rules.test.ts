import { describe, expect, it } from 'vitest'
import { dueLabel, homeStrip, openWork } from './classwork-rules'

const now = new Date(2026, 9, 21, 10, 0) // Wed Oct 21, 10am local
const at = (d: number, h = 23, m = 59) => new Date(2026, 9, d, h, m).toISOString()
const a = (id: string, status: string, dueAt: string | null) => ({ id, title: id, status, dueAt })

describe('openWork', () => {
  it('keeps to-do and missing, missing first, then by due date', () => {
    const list = [a('done', 'done', at(20)), a('later', 'not_started', at(30)), a('soon', 'not_started', at(22)), a('none', 'not_started', null), a('miss', 'missing', at(19)), a('late', 'late', at(18))]
    expect(openWork(list).map((x) => x.id)).toEqual(['miss', 'soon', 'later', 'none'])
  })
})

describe('dueLabel', () => {
  it('says when in plain words', () => {
    expect(dueLabel(at(21), now)).toBe('Due today')
    expect(dueLabel(at(22), now)).toBe('Due tomorrow')
    expect(dueLabel(at(23), now)).toBe('Due Fri')
    expect(dueLabel(at(30), now)).toBe('Due Oct 30')
    expect(dueLabel(at(21, 8, 0), now)).toBe('Was due today')
    expect(dueLabel(at(19), now)).toBe('2 days overdue')
    expect(dueLabel(at(20), now)).toBe('1 day overdue')
    expect(dueLabel(null, now)).toBe('No due date')
  })
})

describe('homeStrip', () => {
  it('shows the next two and counts the rest, plus reports from the last week', () => {
    const list = [a('x', 'not_started', at(22)), a('y', 'not_started', at(23)), a('z', 'not_started', at(24)), a('d', 'done', at(20))]
    const reports = [{ id: 'r1', title: 'Unit 3', createdAt: new Date(2026, 9, 18).toISOString() }, { id: 'r2', title: 'Unit 1', createdAt: new Date(2026, 8, 30).toISOString() }]
    const s = homeStrip(list, reports, now)
    expect(s.next.map((x) => x.id)).toEqual(['x', 'y'])
    expect(s.moreOpen).toBe(1)
    expect(s.openCount).toBe(3)
    expect(s.newReports.map((r) => r.id)).toEqual(['r1'])
  })
})
