import { describe, expect, it } from 'vitest'
import { classAreas, knownAreaNames, type AreaBatch } from './areas'

const q = (questionNumber: string, marksAwarded: number, marksPossible: number) => ({ questionNumber, marksAwarded, marksPossible, explanation: '' })

const unit1: AreaBatch = {
  batchId: 'b1', title: 'Unit 1 test', createdAt: '2026-09-01T00:00:00Z',
  topics: [{ name: 'Stoichiometry', questions: ['1', '2a'] }, { name: 'Gas laws', questions: ['3'] }],
  papers: [
    { rosterId: 'r1', name: 'Sean Miller', breakdown: [q('1', 1, 4), q('2a', 0, 2), q('3', 3, 3)] },
    { rosterId: 'r2', name: 'Ava Kim', breakdown: [q('Question 1', 4, 4), q('2A', 2, 2), q('3', 1, 3)] },
  ],
}
const unit2: AreaBatch = {
  batchId: 'b2', title: 'Unit 2 quiz', createdAt: '2026-10-01T00:00:00Z',
  topics: [{ name: 'stoichiometry ', questions: ['5'] }],
  papers: [
    { rosterId: 'r1', name: 'Sean Miller', breakdown: [q('5', 4, 4)] },
    { rosterId: 'r2', name: 'Ava Kim', breakdown: [q('5', 4, 4)] },
  ],
}

describe('classAreas', () => {
  it('adds an area up across sets, per student, weakest first', () => {
    const areas = classAreas([unit2, unit1])
    expect(areas.map((a) => a.name)).toEqual(['Gas laws', 'Stoichiometry'])
    const stoich = areas[1]
    expect(stoich).toMatchObject({ earned: 15, possible: 20, sets: 2 })
    expect(stoich.pct).toBeCloseTo(75)
    // Unit 1: 7/12 = 58.3%, Unit 2: 8/8 = 100% -> improving.
    expect(stoich.trend).toBeCloseTo(100 - 58.333, 1)
    expect(stoich.students.map((s) => [s.name, Math.round(s.pct)])).toEqual([['Sean Miller', 50], ['Ava Kim', 100]])
    expect(stoich.questions[0]).toMatchObject({ set: 'Unit 1 test', label: '2a' })
    expect(areas[0].trend).toBeNull()
  })
})

describe('knownAreaNames', () => {
  it('lists each area once, most-used first', () => {
    expect(knownAreaNames([unit1.topics, unit2.topics])).toEqual(['Stoichiometry', 'Gas laws'])
  })
})
