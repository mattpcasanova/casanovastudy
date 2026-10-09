import { describe, expect, it } from 'vitest'
import { ADAPTIVE_RULES, conceptProgress, conceptsNeedingRefill, nextStep, refillTarget, sessionSummary, type AdaptiveAnswer } from './engine'
import type { AdaptiveGuide, AdaptiveLevel, AdaptiveQuestion } from './format'

function q(id: string, conceptId: string, level: AdaptiveLevel, type: AdaptiveQuestion['type'] = 'mc'): AdaptiveQuestion {
  return { id, conceptId, level, type, prompt: id, options: ['a', 'b'], correct: 0, answers: [], feedback: {} }
}

function guide(perConcept: Record<string, AdaptiveLevel[]>, extra: AdaptiveQuestion[] = []): AdaptiveGuide {
  let n = 0
  const questions: AdaptiveQuestion[] = []
  for (const [c, levels] of Object.entries(perConcept)) for (const l of levels) questions.push(q(`a${++n}`, c, l))
  return {
    title: 't', description: '', refills: 0,
    concepts: Object.keys(perConcept).map((id) => ({ id, name: id.toUpperCase(), lesson: '' })),
    questions: [...questions, ...extra],
  }
}

const ans = (qid: string, correct: boolean): AdaptiveAnswer => ({ q: qid, correct })

/** Plays the session, answering with `answerFor`, until it stops; returns the answer log. */
function play(g: AdaptiveGuide, answerFor: (q: AdaptiveQuestion) => boolean, max = 100): AdaptiveAnswer[] {
  const log: AdaptiveAnswer[] = []
  for (let i = 0; i < max; i++) {
    const step = nextStep(g, log)
    if (step.kind !== 'question') break
    log.push(ans(step.question.id, answerFor(step.question)))
  }
  return log
}

describe('nextStep', () => {
  it('starts at medium difficulty on the first concept', () => {
    const g = guide({ k1: [1, 2, 3], k2: [1, 2, 3] })
    const step = nextStep(g, [])
    expect(step).toMatchObject({ kind: 'question', question: { conceptId: 'k1', level: 2 } })
  })

  it('alternates concepts and moves difficulty with the student', () => {
    const g = guide({ k1: [1, 1, 2, 2, 3, 3], k2: [1, 1, 2, 2, 3, 3] })
    const log = [ans('a3', true)] // k1 medium, right
    let step = nextStep(g, log)
    expect(step).toMatchObject({ question: { conceptId: 'k2' } })
    log.push(ans((step as { question: AdaptiveQuestion }).question.id, false)) // k2 wrong → easier next time
    step = nextStep(g, log)
    expect(step).toMatchObject({ question: { conceptId: 'k1' } })
    log.push(ans((step as { question: AdaptiveQuestion }).question.id, true)) // k1 two right → harder
    expect(conceptProgress(g, log).map((p) => p.level)).toEqual([3, 1])
  })

  it('gives the weaker concept more turns', () => {
    const g = guide({ k1: Array(10).fill(2), k2: Array(10).fill(2), k3: Array(10).fill(2) })
    const log = play(g, (x) => x.conceptId !== 'k2', 12)
    const counts = ['k1', 'k2', 'k3'].map((c) => log.filter((a) => g.questions.find((x) => x.id === a.q)!.conceptId === c).length)
    expect(counts[1]).toBeGreaterThan(counts[0])
    expect(counts[1]).toBeGreaterThan(counts[2])
  })

  it('finishes once every concept is mastered', () => {
    const g = guide({ k1: [1, 2, 3, 2, 2], k2: [1, 2, 3, 2, 2] })
    const log = play(g, () => true)
    expect(log).toHaveLength(6) // 3 right each = mastered
    expect(nextStep(g, log)).toEqual({ kind: 'done' })
    expect(sessionSummary(g, log)).toMatchObject({ mastered: 2, total: 2, done: true })
  })

  it('brings back a missed question for review once new ones run out', () => {
    const g = guide({ k1: [2, 2, 2] })
    const log = [ans('a1', false), ans('a2', true), ans('a3', true)]
    expect(nextStep(g, log)).toMatchObject({ kind: 'question', review: true, question: { id: 'a1' } })
  })

  it('reports empty when a concept has nothing new or to review', () => {
    const g = guide({ k1: [2, 2] })
    expect(nextStep(g, [ans('a1', false), ans('a2', true)])).toEqual({ kind: 'empty', conceptIds: ['k1'] })
  })

  it('serves the explain question once, after a correct answer when the concept is going well', () => {
    const g = guide({ k1: [2, 2, 2, 2], k2: [2, 2, 2, 2] }, [q('x1', 'k1', 3, 'explain')])
    const log = play(g, () => true)
    const ids = log.map((a) => a.q)
    expect(ids.filter((id) => id === 'x1')).toHaveLength(1)
    // It doesn't count toward mastery.
    expect(conceptProgress(g, log)[0].answered).toBe(3)
  })
})

describe('refills', () => {
  it('asks for more questions when a concept runs low', () => {
    const g = guide({ k1: [2, 2, 2, 2], k2: Array(8).fill(2) })
    expect(conceptsNeedingRefill(g, [])).toEqual([])
    expect(conceptsNeedingRefill(g, [ans('a1', false), ans('a2', false)])).toEqual([])
    expect(conceptsNeedingRefill(g, [ans('a1', false), ans('a2', false), ans('a3', true)])).toEqual(['k1'])
  })

  it('stops after the session cap and for finished concepts', () => {
    const g = { ...guide({ k1: [2, 2] }), refills: ADAPTIVE_RULES.maxRefills }
    expect(conceptsNeedingRefill(g, [])).toEqual([])
    const g2 = guide({ k1: [2, 2, 2] })
    expect(conceptsNeedingRefill(g2, [ans('a1', true), ans('a2', true), ans('a3', true)])).toEqual([])
  })

  it('targets the current level and the latest misses', () => {
    const g = guide({ k1: [2, 2, 2, 2] })
    const t = refillTarget(g, [ans('a1', false), ans('a2', false), ans('a3', true)], 'k1')
    expect(t.level).toBe(1)
    expect(t.missed.map((a) => a.q)).toEqual(['a2', 'a1'])
  })
})
