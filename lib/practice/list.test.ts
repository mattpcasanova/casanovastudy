import { describe, expect, it } from 'vitest'
import { matchesSearch, splitPractice, stillOpen, type PracticeListItem } from './list'

const NOW = Date.parse('2026-11-14T15:00:00Z')
const days = (n: number) => new Date(NOW + n * 86400_000).toISOString()
const item = (over: Partial<PracticeListItem>): PracticeListItem => ({
  id: 'a', title: 'Gas laws', classId: 'c', className: 'AP Chem', period: '2', schoolYear: '2026-27',
  assigned: 20, done: 5, average: null, dueAt: null, createdAt: days(-3), ...over,
})

describe('stillOpen', () => {
  it('is open until the due date, even when everyone has turned it in', () => {
    expect(stillOpen(item({ dueAt: days(2) }), NOW)).toBe(true)
    expect(stillOpen(item({ dueAt: days(2), done: 20 }), NOW)).toBe(true)
  })
  it('stays open a week past due while someone is missing', () => {
    expect(stillOpen(item({ dueAt: days(-3) }), NOW)).toBe(true)
    expect(stillOpen(item({ dueAt: days(-3), done: 20 }), NOW)).toBe(false)
    expect(stillOpen(item({ dueAt: days(-8) }), NOW)).toBe(false)
  })
  it('keeps work with no due date until everyone is done, up to 90 days', () => {
    expect(stillOpen(item({ createdAt: days(-70) }), NOW)).toBe(true)
    expect(stillOpen(item({ createdAt: days(-70), done: 20 }), NOW)).toBe(false)
    expect(stillOpen(item({ createdAt: days(-91) }), NOW)).toBe(false)
  })
  it('is never open with nobody assigned', () => {
    expect(stillOpen(item({ assigned: 0, done: 0, dueAt: days(2) }), NOW)).toBe(false)
  })
})

describe('splitPractice', () => {
  it('orders open work by due date with no-due-date last, and past work newest first', () => {
    const list = [
      item({ id: 'nodue', createdAt: days(-1) }),
      item({ id: 'fri', dueAt: days(5) }),
      item({ id: 'overdue', dueAt: days(-2) }),
      item({ id: 'old', dueAt: days(-40) }),
      item({ id: 'older', dueAt: days(-60) }),
      item({ id: 'tomorrow', dueAt: days(1) }),
    ]
    const { open, past } = splitPractice(list, NOW)
    expect(open.map((p) => p.id)).toEqual(['overdue', 'tomorrow', 'fri', 'nodue'])
    expect(past.map((p) => p.id)).toEqual(['old', 'older'])
  })
})

describe('matchesSearch', () => {
  it('matches words in the title or class in any order, ignoring accents', () => {
    const p = item({ title: 'Repaso de química', className: 'AP Chem', period: '2' })
    expect(matchesSearch(p, '')).toBe(true)
    expect(matchesSearch(p, 'quimica chem')).toBe(true)
    expect(matchesSearch(p, 'p2')).toBe(true)
    expect(matchesSearch(p, 'biology')).toBe(false)
  })
})
