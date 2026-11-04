import { describe, expect, it } from 'vitest'
import { isAnswerCorrect, isNumberCorrect, parseAdaptive, parseNumber, refillBlock } from './format'

const SAMPLE = `# Linear Equations
*Solve and graph linear equations*

CONCEPT: Solving one-step equations
LESSON: Undo what was done to x by doing the opposite to both sides.
The most common slip is only changing one side.

Q: 1 | mc
Solve x + 3 = 7.
A) 10
B) 4
C) -4
D) 21
ANSWER: B
IF A: You added 3 instead of subtracting it.
IF C: Check the sign: 7 - 3 is positive.
HINT: What undoes adding 3?
EXPLANATION: Subtract 3 from both sides.

Q: 2 | num
Solve 2x = 7.
ANSWER: 3.5 | 7/2
EXPLANATION: Divide both sides by 2.

Q: 3 | tf
If 3x = 0, then x = 0.
ANSWER: True

CONCEPT: Slope
LESSON: Slope is rise over run.

**Q:** 2 | mc
Which line is steeper?
\`\`\`graph
kind: plane
y = 2x
\`\`\`
A) y = 2x
B) y = x
**ANSWER:** A

Q: 3 | explain
In your own words, what does a slope of 0 mean?
ANSWER: The line is flat: y does not change as x changes.
`

describe('parseAdaptive', () => {
  const g = parseAdaptive(SAMPLE)

  it('reads title, concepts and lessons', () => {
    expect(g.title).toBe('Linear Equations')
    expect(g.description).toBe('Solve and graph linear equations')
    expect(g.concepts.map((c) => c.id)).toEqual(['k1', 'k2'])
    expect(g.concepts[0].lesson).toContain('The most common slip')
  })

  it('reads every question type with stable ids', () => {
    expect(g.questions.map((q) => [q.id, q.conceptId, q.level, q.type])).toEqual([
      ['a1', 'k1', 1, 'mc'],
      ['a2', 'k1', 2, 'num'],
      ['a3', 'k1', 3, 'tf'],
      ['a4', 'k2', 2, 'mc'],
      ['a5', 'k2', 3, 'explain'],
    ])
    const [mc, num, tf, fig, explain] = g.questions
    expect(mc.correct).toBe(1)
    expect(mc.hint).toBe('What undoes adding 3?')
    expect(mc.feedback).toEqual({ 0: 'You added 3 instead of subtracting it.', 2: 'Check the sign: 7 - 3 is positive.' })
    expect(num.answers).toEqual(['3.5', '7/2'])
    expect(tf.correct).toBe(0)
    expect(fig.figure).toContain('kind: plane')
    expect(fig.prompt).toBe('Which line is steeper?')
    expect(explain.answers[0]).toContain('flat')
  })

  it('skips broken blocks without shifting later ids', () => {
    const broken = SAMPLE.replace('ANSWER: 3.5 | 7/2', 'ANSWER: about half')
    const ids = parseAdaptive(broken).questions.map((q) => q.id)
    expect(ids).toEqual(['a1', 'a3', 'a4', 'a5'])
  })

  it('appends refills to the right concept and counts them', () => {
    const more = refillBlock('k1', [{ level: 2, type: 'mc', prompt: 'Solve x - 2 = 5.', options: ['3', '7'], correct: 1, answers: [], feedback: { 0: 'Add, don’t subtract.' }, explanation: 'Add 2.' }])
    const g2 = parseAdaptive(SAMPLE + '\n\n' + more)
    expect(g2.refills).toBe(1)
    const added = g2.questions[g2.questions.length - 1]
    expect(added).toMatchObject({ id: 'a6', conceptId: 'k1', correct: 1, feedback: { 0: 'Add, don’t subtract.' } })
    expect(g2.questions.slice(0, 5)).toEqual(g.questions)
  })
})

describe('answer checking', () => {
  it('parses numbers students type', () => {
    expect(parseNumber('7/2')).toBe(3.5)
    expect(parseNumber('x = -4')).toBe(-4)
    expect(parseNumber('1,200')).toBe(1200)
    expect(parseNumber('45%')).toBeCloseTo(0.45)
    expect(parseNumber('4 cm')).toBe(4)
    expect(parseNumber('four')).toBeNull()
  })

  it('accepts equivalent numbers within 1%', () => {
    expect(isNumberCorrect('3.5', ['7/2'])).toBe(true)
    expect(isNumberCorrect('0.333', ['1/3'])).toBe(true)
    expect(isNumberCorrect('0.3', ['1/3'])).toBe(false)
    expect(isNumberCorrect('45', ['45%'])).toBe(true)
    expect(isNumberCorrect('0.45', ['45%'])).toBe(true)
    expect(isNumberCorrect('0', ['0'])).toBe(true)
  })

  it('checks mc/tf by option index', () => {
    const g = parseAdaptive(SAMPLE)
    expect(isAnswerCorrect(g.questions[0], '1')).toBe(true)
    expect(isAnswerCorrect(g.questions[0], '0')).toBe(false)
    expect(isAnswerCorrect(g.questions[2], '0')).toBe(true)
  })
})

describe('passage fences', () => {
  it('parse onto the question and survive serialization', async () => {
    const { parseAdaptive, serializeQuestion } = await import('./format')
    const g = parseAdaptive(`# T\n\nCONCEPT: Transitions\nLESSON: Pick the logical relation.\n\nQ: 2 | mc\nWhich choice completes the text with the most logical transition?\n\`\`\`passage\nEarly broadcasters assumed listeners wanted music. ______ news became the most popular.\n\`\`\`\nA) Likewise,\nB) However,\nC) For example,\nD) In other words,\nANSWER: B\nIF A: You chose addition where the sentences contrast.\n`)
    const q = g.questions[0]
    expect(q.passage).toContain('Early broadcasters')
    expect(q.prompt).toBe('Which choice completes the text with the most logical transition?')
    expect(q.options).toHaveLength(4)
    const again = parseAdaptive(`CONCEPT: Transitions\n\n${serializeQuestion(q)}`).questions[0]
    expect(again.passage).toBe(q.passage)
  })
})

describe('trap tags and teacher top-ups', () => {
  const md = `# T
*d*

CONCEPT: Adding fractions
LESSON: Find a common denominator first.
It never changes the value.
TRAP: t1 | Adds the denominators
TRAP: t2 | Forgets to simplify

Q: 2 | mc
What is 1/2 + 1/3?
A) 2/5
B) 5/6
C) 10/12
D) 1/6
ANSWER: B
IF A: [t1] You added the tops and the bottoms.
IF C: [T2] Right value, but simplify it.
IF D: You multiplied instead.
HINT: What do the bottoms need to be?
EXPLANATION: 3/6 + 2/6 = 5/6.

Q: 2 | num
What is 1/4 + 1/4? Give a fraction or decimal.
ANSWER: 1/2 | 0.5
PROBES: t2
EXPLANATION: 2/4 = 1/2.

MORE: k1

Q: 1 | tf
1/2 + 1/2 = 2/4.
ANSWER: False
PROBES: t1
EXPLANATION: It is 1.
`

  it('reads the concept traps, the tag on each wrong option and PROBES lines', () => {
    const g = parseAdaptive(md)
    expect(g.concepts[0].traps).toEqual([{ id: 't1', name: 'Adds the denominators' }, { id: 't2', name: 'Forgets to simplify' }])
    expect(g.concepts[0].lesson).toBe('Find a common denominator first. It never changes the value.')
    const [mc, num, tf] = g.questions
    expect(mc.traps).toEqual({ 0: 't1', 2: 't2' })
    expect(mc.probes).toEqual(['t1', 't2'])
    expect(mc.feedback[0]).toBe('You added the tops and the bottoms.')
    expect(mc.feedback[3]).toBe('You multiplied instead.')
    expect(num.probes).toEqual(['t2'])
    expect(tf.probes).toEqual(['t1'])
  })

  it('adds MORE blocks to the concept without counting them as refills', () => {
    const g = parseAdaptive(md)
    expect(g.refills).toBe(0)
    expect(g.questions.map((q) => q.conceptId)).toEqual(['k1', 'k1', 'k1'])
    expect(g.questions.map((q) => q.id)).toEqual(['a1', 'a2', 'a3'])
  })

  it('writes tags back so a refilled question keeps them', () => {
    const g = parseAdaptive(md)
    const block = refillBlock('k1', g.questions.map(({ id: _i, conceptId: _c, ...q }) => q), 'MORE')
    expect(block.startsWith('MORE: k1')).toBe(true)
    const again = parseAdaptive(`CONCEPT: Adding fractions\n\n${block}`)
    expect(again.questions[0].traps).toEqual({ 0: 't1', 2: 't2' })
    expect(again.questions[1].probes).toEqual(['t2'])
    expect(again.questions[2].probes).toEqual(['t1'])
  })

  it('keeps question text that happens to start with More: or Trap:', () => {
    const g = parseAdaptive(`# T\n\nCONCEPT: One\nLESSON: l\n\nQ: 2 | tf\nMore: heat always means a faster reaction.\nANSWER: False\n\nQ: 2 | tf\nSecond\nANSWER: True`)
    expect(g.questions).toHaveLength(2)
    expect(g.questions[0].prompt).toBe('More: heat always means a faster reaction.')
  })
})
