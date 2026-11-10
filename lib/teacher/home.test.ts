import { describe, expect, it } from 'vitest'
import { attentionItems, setName, type HomePractice, type HomeSet } from './home'

const NOW = Date.parse('2026-11-09T15:00:00Z')
const days = (n: number) => new Date(NOW - n * 86400_000).toISOString()
const set = (over: Partial<HomeSet>): HomeSet => ({ batchId: 'b1', title: 'Unit 2 Exam', className: 'AP Chem', period: '7', classId: 'c1', papers: 25, average: 71, date: days(1), released: true, toMark: 0, toCheck: 0, ...over })
const practice = (over: Partial<HomePractice>): HomePractice => ({ id: 'p1', title: 'Gas laws practice', className: 'AP Chem', period: '7', assigned: 20, done: 4, dueAt: new Date(NOW + 20 * 3600_000).toISOString(), ...over })

describe('attentionItems', () => {
  it('is empty when nothing needs the teacher', () => {
    expect(attentionItems({ scansWaiting: 0, sets: [set({})], practice: [practice({ done: 15 })], now: NOW })).toEqual({ items: [], more: 0 })
  })

  it('orders scans, marking, flags, release, then practice running behind', () => {
    const { items } = attentionItems({
      scansWaiting: 2,
      sets: [set({ batchId: 'r', released: false }), set({ batchId: 'c', toCheck: 3 }), set({ batchId: 'm', toMark: 4, released: false })],
      practice: [practice({})],
      now: NOW,
    })
    expect(items.map((i) => i.kind)).toEqual(['scans', 'mark', 'check', 'release', 'practice'])
    expect(items[1].detail).toBe('4 of 25 papers still to mark')
    expect(items[4].detail).toBe('Due within a day: 4 of 20 done')
  })

  it('does not nag about old sets, sets without a class, or sets still being marked', () => {
    const { items } = attentionItems({ scansWaiting: 0, sets: [set({ released: false, date: days(20) }), set({ released: false, classId: null }), set({ toCheck: 2, date: days(40) })], practice: [], now: NOW })
    expect(items).toEqual([])
    expect(attentionItems({ scansWaiting: 0, sets: [set({ toMark: 1, toCheck: 5, released: false })], practice: [], now: NOW }).items.map((i) => i.kind)).toEqual(['mark'])
  })

  it('leaves out practice with no due date, already past, far off, or mostly done', () => {
    const list = [practice({ dueAt: null }), practice({ dueAt: days(1) }), practice({ dueAt: new Date(NOW + 5 * 86400_000).toISOString() }), practice({ done: 10 }), practice({ assigned: 0, done: 0 })]
    expect(attentionItems({ scansWaiting: 0, sets: [], practice: list, now: NOW }).items).toEqual([])
  })

  it('caps the list and counts the rest', () => {
    const sets = Array.from({ length: 9 }, (_, i) => set({ batchId: `b${i}`, released: false }))
    const { items, more } = attentionItems({ scansWaiting: 0, sets, practice: [], now: NOW })
    expect(items).toHaveLength(6)
    expect(more).toBe(3)
  })

  it('names a set by title and class', () => {
    expect(setName({ title: ' Quiz ', className: 'AP Stats', period: '2' })).toBe('Quiz · AP Stats P2')
    expect(setName({ title: null, className: null, period: null })).toBe('Untitled')
  })
})
