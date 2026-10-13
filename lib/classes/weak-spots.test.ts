import { describe, expect, it } from 'vitest'
import { buildProfile, type AnswerRow } from '@/lib/learner/profile'
import { classWeakSpots } from './weak-spots'

const answers = (topic: string, results: boolean[]): AnswerRow[] =>
  results.map((correct, i) => ({ subject: 'chemistry', topic, correct, answered_at: new Date(2026, 9, 1, 10, i).toISOString() }))

describe('classWeakSpots', () => {
  it('ranks topics by how many students are weak in them', () => {
    const a = buildProfile([...answers('Stoichiometry', [false, false, true]), ...answers('Gas laws', [false, false, false])])
    const b = buildProfile([...answers('Stoichiometry', [false, true, false]), ...answers('Bonding', [true, true, true])])
    const spots = classWeakSpots([a, b])
    expect(spots[0]).toMatchObject({ topic: 'Stoichiometry', students: 2 })
    expect(spots[0].accuracy).toBeCloseTo(1 / 3)
    expect(spots.map((s) => s.topic)).toEqual(['Stoichiometry', 'Gas laws'])
  })
})
