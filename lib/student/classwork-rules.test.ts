import { describe, expect, it } from 'vitest'
import { dueLabel, missingTests, openWork, stripCards } from './classwork-rules'

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

describe('stripCards', () => {
  const id = (c: ReturnType<typeof stripCards>['cards'][number]) => c.kind === 'practice' ? c.a.id : c.kind === 'test' ? c.t.batchId : c.kind === 'report' ? c.r.id : c.kind === 'material' ? c.m.id : c.g.id
  const days = (n: number) => new Date(now.getTime() - n * 86400000).toISOString()
  const r = (rid: string, ago: number) => ({ id: rid, title: rid, createdAt: days(ago) })
  it('shows two things to do, then unopened reports and this week\'s materials and shared guides', () => {
    const list = [a('x', 'not_started', at(22)), a('y', 'not_started', at(23)), a('z', 'not_started', at(24)), a('d', 'done', at(20))]
    const s = stripCards({ assignments: list, reports: [r('r-old', 40), r('r-seen', 2), r('r-late-release', 20)], seenReports: ['r-seen'], materials: [r('m-new', 1), r('m-old', 9)], shared: [r('g-new', 3)], now })
    expect(s.cards.map(id)).toEqual(['x', 'y', 'r-late-release', 'm-new'])
    expect(s.openCount).toBe(3)
    expect(s.more).toEqual({ open: 1, reports: 0, fromTeacher: 1 })
  })
  it('puts overdue work first, then tests not turned in, then upcoming, and uses spare room for more to do', () => {
    const list = [a('up', 'not_started', at(22)), a('late', 'missing', at(19))]
    const tests = [{ batchId: 't1', title: 'Unit 2', classId: 'c', firstGraded: at(18), status: null }]
    const s = stripCards({ assignments: list, reports: [r('r1', 1)], tests, now })
    expect(s.cards.map(id)).toEqual(['late', 't1', 'up', 'r1'])
    expect(s.more).toEqual({ open: 0, reports: 0, fromTeacher: 0 })
  })
  it('is empty when nothing is new', () => {
    expect(stripCards({ assignments: [a('d', 'done', at(20))], reports: [r('old', 60)], now }).cards).toEqual([])
  })
})

describe('missingTests', () => {
  const p = (batchId: string, rosterId: string | null, hoursAgo: number, title = 'Unit test') => ({ batchId, classId: 'c', title, createdAt: new Date(now.getTime() - hoursAgo * 3600000).toISOString(), rosterId })
  const me = new Set(['me'])
  it('lists settled sets with no paper from me, newest first', () => {
    const papers = [p('old', 'x', 72, 'Old'), p('new', 'x', 24, 'New'), p('mine', 'me', 48), p('mine', 'x', 50), p('fresh', 'x', 1)]
    expect(missingTests(papers, me, [], now).map((t) => t.batchId)).toEqual(['new', 'old'])
  })
  it('shows a fresh set right away when marked missing or absent, never when exempt', () => {
    const papers = [p('fresh', 'x', 1), p('ex', 'x', 48)]
    const out = missingTests(papers, me, [{ batchId: 'fresh', status: 'missing' }, { batchId: 'ex', status: 'exempt' }], now)
    expect(out.map((t) => [t.batchId, t.status])).toEqual([['fresh', 'missing']])
  })
})
