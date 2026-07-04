import { describe, expect, it } from 'vitest'
import {
  allocateRoundSlots,
  applyAnswer,
  computeFinalScore,
  evaluateConceptStatus,
  isAttemptComplete,
  selectConceptQuestions,
  windowAccuracy,
  type CandidateQuestion,
  type ConceptRollup,
  type MasteryConfig,
} from './engine'

const config: MasteryConfig = {
  mastery_threshold: 0.8,
  window_size: 5,
  min_questions: 3,
  max_questions_per_concept: 15,
  questions_per_round: 5,
  allowed_types: ['multiple_choice', 'true_false', 'short_answer'],
  allow_ai_fallback: true,
}

function rollup(overrides: Partial<ConceptRollup> = {}): ConceptRollup {
  return {
    concept_id: 'c1',
    answered_count: 0,
    correct_count: 0,
    recent_results: [],
    status: 'in_progress',
    ...overrides,
  }
}

function answerSequence(start: ConceptRollup, answers: boolean[]): ConceptRollup {
  return answers.reduce((r, correct) => applyAnswer(r, correct, config), start)
}

describe('windowAccuracy', () => {
  it('is 0 with no answers', () => {
    expect(windowAccuracy(rollup())).toBe(0)
  })

  it('is correct fraction of the window', () => {
    expect(windowAccuracy(rollup({ recent_results: [true, false, true, true] }))).toBe(0.75)
  })
})

describe('evaluateConceptStatus / applyAnswer', () => {
  it('masters after min_questions straight correct', () => {
    const r = answerSequence(rollup(), [true, true, true])
    expect(r.status).toBe('mastered')
    expect(r.answered_count).toBe(3)
  })

  it('does not master before min_questions even at 100%', () => {
    const r = answerSequence(rollup(), [true, true])
    expect(r.status).toBe('in_progress')
  })

  it('requires 4 of last 5 with defaults after a miss', () => {
    // miss, then three correct: window [f,t,t,t] = 0.75 < 0.8 → not yet
    let r = answerSequence(rollup(), [false, true, true, true])
    expect(r.status).toBe('in_progress')
    // one more correct: window [f,t,t,t,t] = 0.8 → mastered
    r = applyAnswer(r, true, config)
    expect(r.status).toBe('mastered')
  })

  it('lets early misses age out of the window', () => {
    // 3 misses then 5 straight correct: window is all-true → mastered
    const r = answerSequence(rollup(), [false, false, false, true, true, true, true, true])
    expect(r.status).toBe('mastered')
    expect(r.recent_results).toEqual([true, true, true, true, true])
    expect(r.correct_count).toBe(5)
    expect(r.answered_count).toBe(8)
  })

  it('caps the window at window_size', () => {
    const r = answerSequence(rollup(), [true, false, true, false, true, false, true])
    expect(r.recent_results).toHaveLength(5)
  })

  it('hits max_reached at the question cap without mastery', () => {
    const alternating = Array.from({ length: 15 }, (_, i) => i % 2 === 0)
    const r = answerSequence(rollup(), alternating)
    expect(r.status).toBe('max_reached')
    expect(r.answered_count).toBe(15)
  })

  it('mastery wins if achieved exactly at the cap', () => {
    const answers = [...Array.from({ length: 10 }, () => false), ...Array.from({ length: 5 }, () => true)]
    const r = answerSequence(rollup(), answers)
    expect(r.answered_count).toBe(15)
    expect(r.status).toBe('mastered')
  })
})

describe('allocateRoundSlots', () => {
  it('spreads slots round-robin across concepts', () => {
    const rollups = [
      rollup({ concept_id: 'a' }),
      rollup({ concept_id: 'b' }),
      rollup({ concept_id: 'c' }),
    ]
    const slots = allocateRoundSlots(rollups, 5)
    expect([...slots.values()].reduce((s, n) => s + n, 0)).toBe(5)
    // 5 slots over 3 concepts: 2/2/1
    expect([...slots.values()].sort()).toEqual([1, 2, 2])
  })

  it('prioritizes the struggling concept for the extra slot', () => {
    const rollups = [
      rollup({ concept_id: 'strong', answered_count: 4, recent_results: [true, true, true, false] }),
      rollup({ concept_id: 'weak', answered_count: 4, recent_results: [false, false, true, false] }),
    ]
    const slots = allocateRoundSlots(rollups, 5)
    expect(slots.get('weak')).toBe(3)
    expect(slots.get('strong')).toBe(2)
  })

  it('excludes mastered and max_reached concepts', () => {
    const rollups = [
      rollup({ concept_id: 'done', status: 'mastered' }),
      rollup({ concept_id: 'capped', status: 'max_reached' }),
      rollup({ concept_id: 'open' }),
    ]
    const slots = allocateRoundSlots(rollups, 5)
    expect(slots.has('done')).toBe(false)
    expect(slots.has('capped')).toBe(false)
    expect(slots.get('open')).toBe(5)
  })

  it('returns empty when nothing is in progress', () => {
    expect(allocateRoundSlots([rollup({ status: 'mastered' })], 5).size).toBe(0)
  })
})

describe('selectConceptQuestions', () => {
  const q = (id: string, difficulty: number, timesServed: number): CandidateQuestion => ({
    id,
    concept_id: 'c1',
    type: 'multiple_choice',
    difficulty,
    times_served: timesServed,
  })

  it('prefers least-served questions', () => {
    const picked = selectConceptQuestions([q('worn', 2, 9), q('fresh', 2, 0), q('used', 2, 3)], 2, rollup())
    expect(picked.map(p => p.id)).toEqual(['fresh', 'used'])
  })

  it('prefers easier questions when the student is struggling', () => {
    const struggling = rollup({ answered_count: 4, recent_results: [false, false, false, true] })
    const picked = selectConceptQuestions([q('hard', 3, 0), q('easy', 1, 5)], 1, struggling)
    expect(picked[0].id).toBe('easy')
  })

  it('ignores difficulty when performing well', () => {
    const strong = rollup({ answered_count: 4, recent_results: [true, true, true, true] })
    const picked = selectConceptQuestions([q('hard', 3, 0), q('easy', 1, 5)], 1, strong)
    expect(picked[0].id).toBe('hard')
  })
})

describe('computeFinalScore / isAttemptComplete', () => {
  it('scores mastered over total', () => {
    const rollups = [
      rollup({ concept_id: 'a', status: 'mastered' }),
      rollup({ concept_id: 'b', status: 'mastered' }),
      rollup({ concept_id: 'c', status: 'max_reached' }),
    ]
    expect(computeFinalScore(rollups)).toEqual({ mastered: 2, total: 3, percentage: 66.7 })
  })

  it('attempt completes only when nothing is in progress', () => {
    expect(isAttemptComplete([rollup({ status: 'mastered' }), rollup({ status: 'in_progress' })])).toBe(false)
    expect(isAttemptComplete([rollup({ status: 'mastered' }), rollup({ status: 'max_reached' })])).toBe(true)
    expect(isAttemptComplete([])).toBe(false)
  })
})
