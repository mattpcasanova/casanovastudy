import { describe, expect, it } from 'vitest'
import { acceptAnswerPlan, applyAcceptance, givenAnswer, normalizeAnswerList, sameQuestion } from './accept-answer'

describe('givenAnswer', () => {
  it('reads the chosen option out of the grader feedback', () => {
    expect(givenAnswer('Chose D (N and Cl), a nonmetal pair. Correct answer was C.')).toBe('D')
    expect(givenAnswer('Correct, B (network covalent solid).')).toBe('B')
    expect(givenAnswer('Chose A, where the cations are drawn larger. The question says Li+ is smaller, so C was correct.')).toBe('A')
    expect(givenAnswer("The student circled (C), but the key says B.")).toBe('C')
    expect(givenAnswer('Student answer was b; the correct answer is D.')).toBe('B')
  })
  it('gives null when the feedback does not say, or the answer was not read', () => {
    expect(givenAnswer('No answer is circled for this question. Correct answer was C.')).toBeNull()
    expect(givenAnswer('Predicted linear, which is not accepted.')).toBeNull()
    expect(givenAnswer('')).toBeNull()
  })
})

describe('acceptAnswerPlan + applyAcceptance', () => {
  const papers = [
    { id: 'p1', name: 'Ava', breakdown: [{ questionNumber: '5', marksAwarded: 0, marksPossible: 1, explanation: 'Chose C. Bond length follows bond order, so B was correct.' }, { questionNumber: '6', marksAwarded: 1, marksPossible: 1, explanation: 'Correct, D.' }] },
    { id: 'p2', name: 'Ben', breakdown: [{ questionNumber: '5', marksAwarded: 1, marksPossible: 1, explanation: 'Correct, B.' }] },
    { id: 'p3', name: 'Cara', breakdown: [{ questionNumber: '5', marksAwarded: 0, marksPossible: 1, explanation: 'Chose A.' }] },
    { id: 'p4', name: 'Dan', breakdown: [{ questionNumber: '5', marksAwarded: 0, marksPossible: 1, explanation: 'No answer is marked.' }] },
  ]
  it('also accepting C gives the mark to the students who chose C', () => {
    const plan = acceptAnswerPlan(papers, { question: 'Q5', answers: ['c'], everyone: false })
    expect(plan.map((r) => [r.name, r.given, r.changed])).toEqual([['Ava', 'C', true], ['Ben', 'B', false], ['Cara', 'A', false], ['Dan', null, false]])
    const fixed = applyAcceptance(papers[0].breakdown, { question: '5', answers: ['C'], everyone: false, reason: 'both bonds are defensible' })
    expect(fixed[0]).toMatchObject({ marksAwarded: 1, explanation: 'Chose C. Bond length follows bond order, so B was correct. Teacher also accepted C (both bonds are defensible).' })
    expect(fixed[1]).toBe(papers[0].breakdown[1])
  })
  it('everyone gets full marks, including the unread answer', () => {
    const plan = acceptAnswerPlan(papers, { question: '5', answers: [], everyone: true })
    expect(plan.filter((r) => r.changed).map((r) => r.name)).toEqual(['Ava', 'Cara', 'Dan'])
  })
  it('helpers', () => {
    expect(normalizeAnswerList('b, c d')).toEqual(['B', 'C', 'D'])
    expect(sameQuestion('Question 2a', '2 A')).toBe(true)
  })
})
