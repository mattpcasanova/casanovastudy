import { describe, expect, it } from 'vitest'
import { courseAreas, focusSuggestions, scoreTrend, setSummaries, studentTrends, type ScoreRow } from './progress'
import type { AreaBatch } from '@/lib/classes/areas'

const row = (batchId: string, classId: string, title: string, createdAt: string, name: string, pct: number, rosterId: string | null = name): ScoreRow =>
  ({ batchId, classId, title, createdAt, rosterId, name, pct })

const rows: ScoreRow[] = [
  row('b1', 'p2', 'Unit 1 test', '2026-09-10T00:00:00Z', 'Ava', 90),
  row('b1', 'p2', 'Unit 1 test', '2026-09-10T01:00:00Z', 'Ben', 70),
  row('b2', 'p2', 'Unit 2 test', '2026-10-01T00:00:00Z', 'Ava', 60),
  row('b2', 'p2', 'Unit 2 test', '2026-10-01T00:00:00Z', 'Ben', 50),
  row('b3', 'p5', 'Unit 2 test', '2026-10-01T00:00:00Z', 'Cal', 95),
  row('b3', 'p5', 'Unit 2 test', '2026-10-01T00:00:00Z', 'Dee', 85),
]

describe('setSummaries + scoreTrend', () => {
  it('groups papers into sets, oldest first, with the first grading time', () => {
    const sets = setSummaries(rows)
    expect(sets.map((s) => s.batchId)).toEqual(['b1', 'b2', 'b3'])
    expect(sets[0]).toMatchObject({ classId: 'p2', papers: 2, average: 80, date: '2026-09-10T00:00:00Z' })
  })
  it('trend is the latest set against the mean of the earlier ones', () => {
    const t = scoreTrend(setSummaries(rows).filter((s) => s.classId === 'p2'))
    expect(t.average).toBe(67.5)
    expect(t.latest?.batchId).toBe('b2')
    expect(t.trend).toBe(-25)
    expect(scoreTrend([]).trend).toBeNull()
    expect(scoreTrend(setSummaries(rows).filter((s) => s.classId === 'p5')).trend).toBeNull()
  })
})

describe('studentTrends', () => {
  it('flags slipping and struggling students, weakest first, with 2+ papers', () => {
    const s = studentTrends(rows)
    expect(s.map((x) => x.name)).toEqual(['Ben', 'Ava', 'Dee', 'Cal'])
    expect(s.find((x) => x.name === 'Ava')).toMatchObject({ papers: 2, average: 75, trend: -30, why: 'slipping' })
    expect(s.find((x) => x.name === 'Ben')).toMatchObject({ average: 60, why: 'slipping' })
    expect(s.find((x) => x.name === 'Cal')).toMatchObject({ papers: 1, trend: null, why: null })
  })
  it('calls an average under 60 struggling even when the latest paper went up', () => {
    const s = studentTrends([row('b1', 'c', 't1', '2026-09-01', 'Ed', 40), row('b2', 'c', 't2', '2026-10-01', 'Ed', 55)])
    expect(s[0]).toMatchObject({ why: 'struggling', trend: 15 })
  })
  it('one low paper is enough to watch a student, and a good second paper clears it', () => {
    expect(studentTrends([row('b1', 'c', 't1', '2026-09-01', 'Fay', 45)])[0]).toMatchObject({ papers: 1, why: 'struggling' })
    expect(studentTrends([row('b1', 'c', 't1', '2026-09-01', 'Fay', 45), row('b2', 'c', 't2', '2026-10-01', 'Fay', 80)])[0]).toMatchObject({ average: 62.5, why: null })
    expect(studentTrends([row('b1', 'c', 't1', '2026-09-01', 'Gus', 70)])[0].why).toBeNull() // one paper can't be slipping
  })
  it('keeps unmatched papers apart by name and class', () => {
    const s = studentTrends([row('b1', 'c', 't', '2026-09-01', 'Sam Lee', 80, null), row('b2', 'c', 't2', '2026-10-01', 'sam lee', 60, null), row('b3', 'd', 't', '2026-10-01', 'Sam Lee', 20, null)])
    expect(s.map((x) => [x.classId, x.key, x.papers])).toEqual([['d', 'name:sam lee', 1], ['c', 'name:sam lee', 2]])
  })
})

const q = (questionNumber: string, marksAwarded: number, marksPossible: number) => ({ questionNumber, marksAwarded, marksPossible, explanation: '' })
const batches: AreaBatch[] = [
  { batchId: 'b1', classId: 'p2', title: 'Unit 1', createdAt: '2026-09-01T00:00:00Z', topics: [{ name: 'Gas laws', questions: ['1'] }], papers: [{ rosterId: 'a', name: 'Ava', breakdown: [q('1', 2, 4)] }] },
  { batchId: 'b2', classId: 'p5', title: 'Unit 1', createdAt: '2026-09-02T00:00:00Z', topics: [{ name: 'gas laws', questions: ['1'] }], papers: [{ rosterId: 'c', name: 'Cal', breakdown: [q('1', 4, 4)] }] },
]

describe('courseAreas', () => {
  it('merges areas across periods and keeps each period\'s percent and the latest set', () => {
    const areas = courseAreas(batches)
    expect(areas).toHaveLength(1)
    expect(areas[0]).toMatchObject({ name: 'Gas laws', pct: 75, byClass: { p2: 50, p5: 100 }, latestBatchId: 'b2' })
  })
})

describe('focusSuggestions', () => {
  const classes = [{ id: 'p2', name: 'AP Chem P2', period: '2' }, { id: 'p5', name: 'AP Chem P5', period: '5' }]
  const base = { classes, sets: setSummaries(rows), areas: [], students: studentTrends(rows), practice: [], weakSpots: [], now: Date.parse('2026-10-05T00:00:00Z') }

  it('finds a period behind the others on the same test, and slipping students', () => {
    const s = focusSuggestions(base)
    const behind = s.find((x) => x.kind === 'class-behind')
    expect(behind?.title).toBe('Period 2 scored 35 points below your other periods on Unit 2 test')
    expect(behind?.action).toEqual({ kind: 'class', classId: 'p2', batchId: 'b2' })
    const slipping = s.find((x) => x.id === 'students:slipping')
    expect(slipping?.title).toBe('2 students dropped 10+ points on the latest test')
    expect(slipping?.detail).toContain('Ben, Ava')
  })

  it('suggests practice on a weak area in the lowest period and notes a fall', () => {
    const s = focusSuggestions({ ...base, areas: [{ name: 'Gas laws', pct: 55, earned: 11, possible: 20, sets: 2, trend: -15, students: [], questions: [], byClass: { p2: 40, p5: 70 }, latestBatchId: 'b2' }] })
    const area = s.find((x) => x.kind === 'area')
    expect(area?.title).toBe('Gas laws: 55% across 2 graded sets')
    expect(area?.detail).toContain('Down 15 points')
    expect(area?.detail).toContain('Period 2 lowest at 40%')
    expect(area?.action).toEqual({ kind: 'practice', area: 'Gas laws', classId: 'p2', batchId: 'b2' })
    expect(s[0].kind).toBe('students') // students to watch always lead, then the rest by weight
    expect(s.indexOf(area!)).toBeGreaterThan(0)
  })

  it('a strong area that fell is "slipping", not weak', () => {
    const s = focusSuggestions({ ...base, areas: [{ name: 'Kinetics', pct: 82, earned: 0, possible: 1, sets: 3, trend: -12, students: [], questions: [] }] })
    expect(s.find((x) => x.kind === 'falling')?.title).toBe('Kinetics is slipping: down 12 points on the latest set')
    expect(s.find((x) => x.kind === 'area')).toBeUndefined()
  })

  it('practice mostly missing, own-studying weak spots, and stale classes', () => {
    const s = focusSuggestions({
      ...base,
      sets: base.sets.filter((x) => x.classId === 'p2'),
      students: [],
      practice: [{ id: 'pa', title: 'Gas laws practice', classId: 'p2', dueAt: '2026-10-01', assigned: 10, done: 3, missing: 7 }, { id: 'pb', title: 'Fine', classId: 'p2', dueAt: null, assigned: 10, done: 9, missing: 1 }],
      weakSpots: [{ key: 'k', subject: 'chemistry', topic: 'Moles', students: 4, accuracy: 0.4 }, { key: 'k2', subject: null, topic: 'pH', students: 1, accuracy: 0.2 }],
      now: Date.parse('2026-11-01T00:00:00Z'),
    })
    expect(s.map((x) => x.kind)).toEqual(['practice', 'own-studying', 'stale', 'stale'])
    expect(s[0].title).toBe('7 of 10 haven\'t done Gas laws practice')
    expect(s[1].title).toBe('4 students keep missing Moles on the practice you assigned')
    expect(s[1].action).toEqual({ kind: 'quiz', topic: 'Moles', subject: 'chemistry' })
    expect(s[2].title).toBe('Nothing graded for Period 2 in over 3 weeks')
    expect(s[3].title).toBe('No graded sets yet for Period 5')
  })

  it('caps the list and says nothing about a class with no sets at all', () => {
    expect(focusSuggestions({ ...base, sets: [], students: [] })).toEqual([])
    const areas = Array.from({ length: 8 }, (_, i) => ({ name: `Area ${i}`, pct: 30 + i, earned: 0, possible: 1, sets: 1, trend: null, students: [], questions: [] }))
    const s = focusSuggestions({ ...base, areas })
    expect(s.filter((x) => x.kind === 'area')).toHaveLength(3)
    expect(s.length).toBeLessThanOrEqual(6)
  })
})
