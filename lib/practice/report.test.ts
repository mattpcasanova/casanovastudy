import { describe, expect, it } from 'vitest'
import { answersFromLog, givenText, guideTopics, practiceInsightsInput, practicePapers, questionResults, reportAttempt, reportQuestions, sanitizeAnswers, type StudentRun } from './report'
import { reteachGroups } from '@/lib/grading/reteach'
import { questionStats } from '@/lib/grading/insights'

const QUIZ = `# Stoichiometry Quiz

## Mole Conversions

MC_QUESTION: How many moles are in 18 g of water?
A) 0.5
B) 1
C) 2
D) 18
Correct Answer: B
Explanation: 18 g ÷ 18 g/mol.

TF_QUESTION: One mole of any gas at STP is 22.4 L.
Correct Answer: True

## Limiting Reagent

MC_QUESTION: Which reactant runs out first?
A) The one with the smaller mass
B) The one that makes less product
C) The one with more moles
D) Neither
Correct Answer: B
`

const qs = reportQuestions('quiz', QUIZ)

describe('reportQuestions', () => {
  it('lists quiz questions in order with topics and answers', () => {
    expect(qs.map((q) => [q.label, q.itemId, q.topic, q.answer])).toEqual([
      ['1', 'q:q-0', 'Mole Conversions', '1'],
      ['2', 'q:q-1', 'Mole Conversions', 'True'],
      ['3', 'q:q-2', 'Limiting Reagent', 'The one that makes less product'],
    ])
    expect(qs[0].options).toEqual(['0.5', '1', '2', '18'])
  })

  it('leaves adaptive explain questions out and names concepts', () => {
    const adaptive = `# Ratios

CONCEPT: Unit rates
LESSON: A unit rate is per one.
Q: 1 | mc
What is 10 miles in 2 hours per hour?
A) 2
B) 5
C) 10
D) 20
ANSWER: B
Q: 1 | explain
Explain what a unit rate is.
ANSWER: An amount per one unit.
`
    const a = reportQuestions('adaptive', adaptive)
    expect(a.every((q) => q.kind !== 'explain')).toBe(true)
    expect(a).toHaveLength(1)
    expect(a[0]).toMatchObject({ topic: 'Unit rates', answer: '5' })
  })
})

describe('givenText', () => {
  it('turns adaptive option indexes into the option', () => {
    const q = { itemId: 'a:a1', label: '1', text: '', answer: '5', topic: '', kind: 'mc', options: ['2', '5', '10'] }
    expect(givenText(q, '2')).toBe('10')
    expect(givenText({ ...q, kind: 'tf', options: undefined }, '1')).toBe('False')
    expect(givenText(qs[1], 'false')).toBe('False')
    expect(givenText(qs[0], '')).toBeNull()
  })
})

describe('sanitizeAnswers', () => {
  it('keeps well-formed answers once each', () => {
    expect(sanitizeAnswers([{ id: 'q:q-0', correct: true }, { id: 'q:q-0', correct: false }, { id: 'x', correct: true }, { id: 'p:3', correct: false, given: '  B ' }])).toEqual([
      { id: 'q:q-0', correct: true },
      { id: 'p:3', correct: false, given: 'B' },
    ])
    expect(sanitizeAnswers([{ id: 'p:4', correct: false, score: 0.8333, given: '5 of 6 pairs on the first try' }, { id: 'p:5', correct: true, score: 0.5 }, { id: 'p:6', correct: false, score: 7 }])).toEqual([
      { id: 'p:4', correct: false, given: '5 of 6 pairs on the first try', score: 0.83 },
      { id: 'p:5', correct: true },
      { id: 'p:6', correct: false },
    ])
    expect(sanitizeAnswers('nope')).toBeNull()
    expect(sanitizeAnswers([])).toBeNull()
  })
})

const runs: StudentRun[] = [
  { rosterId: 'r1', name: 'Ava Diaz', complete: true, answers: [{ id: 'q:q-0', correct: true, given: '1' }, { id: 'q:q-1', correct: true, given: 'true' }, { id: 'q:q-2', correct: false, given: 'The one with the smaller mass' }] },
  { rosterId: 'r2', name: 'Ben Ito', complete: true, answers: [{ id: 'q:q-0', correct: false, given: '18' }, { id: 'q:q-1', correct: true }] },
  { rosterId: 'r3', name: 'Cara Moss', complete: true, answers: [{ id: 'q:q-0', correct: false, given: '18' }, { id: 'q:q-1', correct: false, given: 'false' }, { id: 'q:q-2', correct: false, given: 'The one with the smaller mass' }] },
]

describe('questionResults', () => {
  it('counts right, groups wrong answers by what they picked, and counts blanks in a full run', () => {
    const r = questionResults(qs, runs)
    expect(r[0]).toMatchObject({ n: 3, right: [{ name: 'Ava Diaz' }] })
    expect(r[0].wrong).toEqual([{ given: '18', students: [{ rosterId: 'r2', name: 'Ben Ito' }, { rosterId: 'r3', name: 'Cara Moss' }] }])
    expect(r[2].skipped.map((s) => s.name)).toEqual(['Ben Ito'])
    expect(Math.round(r[2].pct)).toBe(0)
  })

  it('only counts answered questions for adaptive runs', () => {
    const r = questionResults(qs, [{ ...runs[1], complete: false }])
    expect(r.map((x) => x.question.label)).toEqual(['1', '2'])
  })
})

describe('practicePapers', () => {
  it('scores each question 1 or 0 so graded-set tools work on it', () => {
    const papers = practicePapers(qs, runs)
    expect(papers[1].breakdown.map((q) => q.marksAwarded)).toEqual([0, 1, 0])
    expect(papers[1].breakdown[2].explanation).toBe('Not answered.')
    expect(papers[0].breakdown[2].explanation).toContain('Answered "The one with the smaller mass"')
    const stats = questionStats(papers)
    expect(stats.map((s) => Math.round(s.avgPct))).toEqual([33, 67, 0])
    const { groups } = reteachGroups(papers, guideTopics(qs))
    // Everyone is under 60% on Limiting Reagent, the weakest topic.
    expect(groups.find((g) => g.kind === 'reteach')?.topic).toBe('Limiting Reagent')
    expect(groups.flatMap((g) => g.students).every((s) => s.rosterId)).toBe(true)
  })
})

describe('practicePapers partial credit', () => {
  it('gives a multi-part activity its share of the mark', () => {
    const [paper] = practicePapers(qs, [{ rosterId: 'r9', name: 'Dee', complete: true, answers: [{ id: 'q:q-0', correct: false, score: 0.83, given: '5 of 6 pairs on the first try' }] }])
    expect(paper.breakdown[0].marksAwarded).toBe(0.83)
    expect(paper.breakdown[0].explanation).toBe('Partly right (5 of 6 pairs on the first try).')
  })
})

describe('guideTopics', () => {
  it('groups labels by the guide topic, only when there are 2+', () => {
    expect(guideTopics(qs)).toEqual([{ name: 'Mole Conversions', questions: ['1', '2'] }, { name: 'Limiting Reagent', questions: ['3'] }])
    expect(guideTopics(qs.map((q) => ({ ...q, topic: 'Same' })))).toEqual([])
  })
})

describe('practiceInsightsInput', () => {
  it('describes each question without naming students', () => {
    const text = practiceInsightsInput(questionResults(qs, runs), 3)
    expect(text).toContain('Question 1 (topic: Mole Conversions)')
    expect(text).toContain('Wrong answers given: "18" (2)')
    expect(text).not.toMatch(/Ava|Ben|Cara/)
  })
})

describe('reportAttempt', () => {
  it('uses the best counted attempt, else the latest', () => {
    const a = [{ pct: 50, counted: true, finishedAt: '2026-10-01' }, { pct: 80, counted: true, finishedAt: '2026-10-02' }, { pct: 100, counted: false, finishedAt: '2026-10-03' }]
    expect(reportAttempt(a)?.pct).toBe(80)
    expect(reportAttempt([{ pct: 10, counted: false, finishedAt: '2026-10-01' }, { pct: 5, counted: false, finishedAt: '2026-10-04' }])?.pct).toBe(5)
    expect(reportAttempt([])).toBeNull()
  })
})

describe('answersFromLog', () => {
  it('takes the last answer per item between the previous attempt and this one', () => {
    const rows = [
      { item_id: 'q:q-0', correct: false, answered_at: '2026-10-01T10:00:00Z' },
      { item_id: 'q:q-0', correct: true, answered_at: '2026-10-02T10:00:00Z' },
      { item_id: 'q:q-1', correct: true, answered_at: '2026-10-02T10:01:00Z' },
      { item_id: 'q:q-2', correct: true, answered_at: '2026-10-02T11:00:00Z' },
      { item_id: 'learn-1', correct: true, answered_at: '2026-10-02T10:00:00Z' },
    ]
    expect(answersFromLog(rows, '2026-10-01T12:00:00Z', '2026-10-02T10:02:00Z')).toEqual([{ id: 'q:q-0', correct: true }, { id: 'q:q-1', correct: true }])
  })
})
