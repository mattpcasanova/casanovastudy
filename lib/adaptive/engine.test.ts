import { describe, expect, it } from 'vitest'
import { ADAPTIVE_RULES, conceptProgress, conceptsNeedingRefill, gradedRules, masteryRuleText, neededRight, nextStep, normalizeMasteryPct, normalizePerConcept, openTrap, refillTarget, sessionSummary, withOutOfQuestions, type AdaptiveAnswer } from './engine'
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
    concepts: Object.keys(perConcept).map((id) => ({ id, name: id.toUpperCase(), lesson: '', traps: [] })),
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

describe('hints', () => {
  it("hinted right answers don't raise difficulty or count toward mastery", () => {
    const g = guide({ k1: [2, 2, 2, 2, 2, 2] })
    const hinted = (q: string): AdaptiveAnswer => ({ q, correct: true, hinted: true })
    const p = conceptProgress(g, [hinted('a1'), hinted('a2'), hinted('a3')])[0]
    expect(p).toMatchObject({ status: 'in_progress', level: 2, correct: 3, answered: 3 })
    const p2 = conceptProgress(g, [hinted('a1'), ans('a2', true), ans('a3', true), ans('a4', true)])[0]
    expect(p2.status).toBe('mastered')
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

describe('graded sessions (no second tries)', () => {
  it('never brings a missed question back and credits 3 of 4 when questions run out', async () => {
    const { parseAdaptive } = await import('./format')
    const { nextStep: next, conceptProgress: cp, withOutOfQuestions: wo } = await import('./engine')
    const md = `# T\n\nCONCEPT: One\nLESSON: l\n\n${[1, 2, 2, 3].map((l, i) => `Q: ${l} | tf\nStatement ${i}\nANSWER: True\nEXPLANATION: e`).join('\n\n')}`
    const g = parseAdaptive(md)
    const ids = g.questions.map((q) => q.id)
    const answers = ids.map((q, i) => ({ q, correct: i !== 1, given: i !== 1 ? '0' : '1' }))
    const step = next(g, answers, { reviews: false })
    expect(step.kind).toBe('empty')
    const graded = wo(cp(g, answers), step.kind === 'empty' ? step.conceptIds : [], gradedRules())
    expect(graded[0].status).toBe('mastered')
    expect(next(g, answers).kind).toBe('question') // ungraded sessions still review the miss
  })
})

describe("the teacher's settings on assigned work", () => {
  /** Plays a graded session on the given rules. */
  function playGraded(g: AdaptiveGuide, rules: ReturnType<typeof gradedRules>, answerFor: (q: AdaptiveQuestion, i: number) => boolean) {
    const log: AdaptiveAnswer[] = []
    for (let i = 0; i < 100; i++) {
      const step = nextStep(g, log, { reviews: false, rules })
      if (step.kind !== 'question') break
      log.push(ans(step.question.id, answerFor(step.question, i)))
    }
    return log
  }

  it('reads settings, keeping the defaults for anything empty or out of range', () => {
    expect(gradedRules()).toMatchObject({ threshold: 0.8, maxPerConcept: 15, creditAtEnd: true, explain: true })
    expect(gradedRules({ masteryPct: 60, perConcept: 6, explain: false })).toMatchObject({ threshold: 0.6, maxPerConcept: 6, explain: false })
    expect(normalizeMasteryPct(30)).toBeNull()
    expect(normalizeMasteryPct('100')).toBe(100)
    expect(normalizeMasteryPct(null)).toBeNull()
    expect(normalizePerConcept(2)).toBeNull()
    expect(normalizePerConcept(40)).toBeNull()
    expect(normalizePerConcept(8)).toBe(8)
  })

  it('says the rule in plain numbers', () => {
    expect(neededRight(0.8, 4)).toBe(3)
    expect(neededRight(0.8, 5)).toBe(4)
    expect(neededRight(0.6, 5)).toBe(3)
    expect(neededRight(1, 4)).toBe(4)
    expect(masteryRuleText(80)).toBe('4 of the last 5 right')
    expect(masteryRuleText(100)).toBe('5 of the last 5 right')
  })

  it('stops a topic at the questions per topic, even when the bank has more', () => {
    const g = guide({ k1: Array(10).fill(2) })
    const log = playGraded(g, gradedRules({ perConcept: 6 }), () => false)
    expect(log).toHaveLength(6)
    expect(conceptProgress(g, log, gradedRules({ perConcept: 6 }))[0].status).toBe('max_reached')
  })

  it('credits the last question: 3 of 4 masters at 80% but not at 100%', () => {
    const g = guide({ k1: Array(8).fill(2) })
    const missSecond = (_q: AdaptiveQuestion, i: number) => i !== 1
    const at80 = gradedRules({ perConcept: 4 })
    const log = playGraded(g, at80, missSecond)
    expect(log).toHaveLength(4)
    expect(conceptProgress(g, log, at80)[0].status).toBe('mastered')
    const at100 = gradedRules({ perConcept: 4, masteryPct: 100 })
    const strict = playGraded(g, at100, missSecond)
    expect(strict).toHaveLength(4)
    expect(conceptProgress(g, strict, at100)[0].status).toBe('max_reached')
  })

  it('masters sooner at 60% and needs a clean run at 100%', () => {
    const g = guide({ k1: Array(10).fill(2) })
    // Right, wrong, right: 2 of 3.
    const twoOfThree = (_q: AdaptiveQuestion, i: number) => i !== 1
    expect(playGraded(g, gradedRules({ masteryPct: 60, perConcept: 8 }), twoOfThree)).toHaveLength(3)
    expect(playGraded(g, gradedRules({ masteryPct: 80, perConcept: 8 }), twoOfThree)).toHaveLength(5) // 4 of the last 5
    const firstWrong = (_q: AdaptiveQuestion, i: number) => i !== 0
    const clean = playGraded(g, gradedRules({ masteryPct: 100, perConcept: 8 }), firstWrong)
    expect(clean).toHaveLength(6) // the miss has to leave the last 5
    expect(conceptProgress(g, clean, gradedRules({ masteryPct: 100, perConcept: 8 }))[0].status).toBe('mastered')
  })

  it('leaves the explain question out when the teacher turns it off', () => {
    const explain: AdaptiveQuestion = { ...q('x1', 'k1', 3, 'explain'), answers: ['model'] }
    const g = guide({ k1: [2, 2, 2, 2] }, [explain])
    const on = playGraded(g, gradedRules({ perConcept: 4 }), () => true)
    expect(on.map((a) => a.q)).toContain('x1')
    const off = playGraded(g, gradedRules({ perConcept: 4, explain: false }), () => true)
    expect(off.map((a) => a.q)).not.toContain('x1')
    expect(off).toHaveLength(3)
  })

  it('keeps sessions without settings as they were: the bank runs out and 3 of 4 counts', () => {
    const g = guide({ k1: [1, 2, 2, 3] })
    const rules = gradedRules(null)
    const log = playGraded(g, rules, (_q, i) => i !== 0)
    const step = nextStep(g, log, { reviews: false, rules })
    expect(step.kind).toBe('empty')
    expect(withOutOfQuestions(conceptProgress(g, log, rules), ['k1'], rules)[0].status).toBe('mastered')
    expect(sessionSummary(g, log, rules).answered).toBe(4)
  })
})

describe('following a miss with the same trap', () => {
  const mc = (id: string, level: AdaptiveLevel, traps: Record<number, string>): AdaptiveQuestion =>
    ({ id, conceptId: 'k1', level, type: 'mc', prompt: id, options: ['right', 'w1', 'w2', 'w3'], correct: 0, answers: [], feedback: {}, traps, probes: [...new Set(Object.values(traps))] })
  const bank = (): AdaptiveGuide => ({
    title: 't', description: '', refills: 0,
    concepts: [{ id: 'k1', name: 'K1', lesson: '', traps: [{ id: 't1', name: 'Adds the denominators' }, { id: 't2', name: 'Forgets to simplify' }] }],
    questions: [mc('a1', 2, { 1: 't1', 2: 't2' }), mc('a2', 1, { 1: 't2' }), mc('a3', 2, { 1: 't2' }), mc('a4', 3, { 1: 't1' }), mc('a5', 2, {})],
  })

  it('picks a question that sets the trap they fell into, over the nearest level', () => {
    const g = bank()
    // Missed a1 by choosing the t1 option: level drops to 1, where a2 (t2 only) is the nearest, but a4 rechecks t1.
    const step = nextStep(g, [{ q: 'a1', correct: false, given: '1' }])
    expect(step).toMatchObject({ kind: 'question', question: { id: 'a4' }, trap: 't1' })
    expect(openTrap(g, 'k1', [{ q: 'a1', correct: false, given: '1' }])).toBe('t1')
  })

  it('lets go of the trap once a question that sets it is answered right', () => {
    const g = bank()
    const log: AdaptiveAnswer[] = [{ q: 'a1', correct: false, given: '1' }, { q: 'a4', correct: true, given: '0' }]
    expect(openTrap(g, 'k1', log)).toBeNull()
    const step = nextStep(g, log)
    expect(step.kind === 'question' && step.trap).toBeFalsy()
  })

  it('follows the newest mistake, and falls back to level when nothing rechecks it', () => {
    const g = bank()
    const log: AdaptiveAnswer[] = [{ q: 'a1', correct: false, given: '1' }, { q: 'a4', correct: false, given: '1' }]
    // t1 is still open but no unanswered question sets it.
    expect(openTrap(g, 'k1', log)).toBe('t1')
    const step = nextStep(g, log)
    expect(step).toMatchObject({ kind: 'question', question: { id: 'a2' } })
    expect(step.kind === 'question' && step.trap).toBeFalsy()
    // An untagged wrong option keeps the earlier trap open.
    expect(openTrap(g, 'k1', [{ q: 'a1', correct: false, given: '2' }, { q: 'a5', correct: false, given: '3' }])).toBe('t2')
  })

  it('changes nothing for banks without trap tags', () => {
    const g = guide({ k1: [1, 2, 2, 3] })
    expect(openTrap(g, 'k1', [ans('a2', false)])).toBeNull()
    expect(nextStep(g, [ans('a2', false)])).toMatchObject({ kind: 'question', question: { level: 1 } })
  })
})
