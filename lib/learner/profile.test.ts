import { describe, expect, it } from 'vitest'
import { buildProfile, learnerHistoryNote, weakSpotsRequest, type AnswerRow } from './profile'
import { missedQuestionsFromGuide } from './missed'

const now = new Date('2026-10-04T15:00:00')
const at = (daysAgo: number, minute = 0) => { const d = new Date(now); d.setDate(d.getDate() - daysAgo); d.setMinutes(minute); return d.toISOString() }
const rows = (subject: string, topic: string, results: boolean[], daysAgo = 0, guide = 'g1'): AnswerRow[] =>
  results.map((correct, i) => ({ subject, topic, correct, answered_at: at(daysAgo, i), study_guide_id: guide }))

describe('buildProfile', () => {
  const data = [
    ...rows('science', 'VSEPR and Hybridization', [false, false, true, false, false]),
    ...rows('science', 'Types of Chemical Bonds', [true, true, true, true, false], 1),
    ...rows('mathematics', 'Linear Equations', [true, false], 2), // only 2 answers: not judged yet
  ]
  const p = buildProfile(data, now)

  it('totals, accuracy and the day streak', () => {
    expect(p.answered).toBe(12)
    expect(p.accuracy).toBeCloseTo(6 / 12)
    expect(p.streak).toBe(3)
    expect(p.last14.slice(-3)).toEqual([2, 5, 5])
  })
  it('finds weak and strong topics from recent answers, and needs enough evidence', () => {
    expect(p.weak.map((t) => t.topic)).toEqual(['VSEPR and Hybridization'])
    expect(p.weak[0].recentAccuracy).toBeCloseTo(0.2)
    expect(p.strong.map((t) => t.topic)).toEqual(['Types of Chemical Bonds'])
    expect(p.topics.find((t) => t.topic === 'Linear Equations')?.answered).toBe(2)
  })
  it('judges a topic on its most recent answers, so improvement shows', () => {
    const improving = [
      ...rows('science', 'Moles', Array(10).fill(true), 0),
      ...rows('science', 'Moles', Array(10).fill(false), 5),
    ]
    const q = buildProfile(improving, now)
    expect(q.strong.map((t) => t.topic)).toEqual(['Moles'])
    expect(q.weak).toEqual([])
  })
  it('keeps a streak alive through yesterday but not across a gap', () => {
    expect(buildProfile(rows('science', 'X', [true], 1), now).streak).toBe(1)
    expect(buildProfile(rows('science', 'X', [true], 2), now).streak).toBe(0)
  })
})

describe('two wrong out of two', () => {
  it('counts as a weak spot, but one wrong answer does not', () => {
    const p = buildProfile([...rows('science', 'Moles', [false, false]), ...rows('science', 'Ions', [false])], now)
    expect(p.weak.map((t) => t.topic)).toEqual(['Moles'])
  })
  it('two answers with one right is still not judged yet', () => {
    expect(buildProfile(rows('science', 'Moles', [true, false]), now).weak).toEqual([])
  })
})

describe('weakSpotsRequest', () => {
  it('builds a quiz request naming the topics and their source guides', () => {
    const p = buildProfile(rows('science', 'VSEPR and Hybridization', [false, false, true]), now)
    const r = weakSpotsRequest(p.weak, { g1: 'AP Chem Unit 2' })
    expect(r.studyRequest).toContain('- VSEPR and Hybridization (from "AP Chem Unit 2"): 33% correct on my last 3')
    expect(r.studyGuideName).toBe('VSEPR and Hybridization: Weak Spot Quiz')
    expect(r.subject).toBe('science')
  })
  it('includes the questions the student missed and asks for fresh ones', () => {
    const p = buildProfile(rows('science', 'VSEPR and Hybridization', [false, false, true]), now)
    const r = weakSpotsRequest(p.weak, {}, { [p.weak[0].key]: [{ question: 'What is the shape of SF4?', answer: 'Seesaw' }] })
    expect(r.studyRequest).toContain('  1. What is the shape of SF4? (Correct answer: Seesaw)')
    expect(r.studyRequest).toContain("don't copy them word for word")
  })
})

describe('learnerHistoryNote', () => {
  const p = buildProfile([
    ...rows('science', 'VSEPR and Hybridization', [false, false, false]),
    ...rows('science', 'Types of Chemical Bonds', [true, true, true]),
    ...rows('mathematics', 'Quadratics', [false, false, false]),
  ], now)
  it('includes only history relevant to the new guide', () => {
    const note = learnerHistoryNote(p, { subject: 'science', text: 'AP Chemistry Unit 2' })
    expect(note).toContain('VSEPR and Hybridization (0% of last 3)')
    expect(note).toContain('Already strong at: Types of Chemical Bonds')
    expect(note).not.toContain('Quadratics')
  })
  it('matches by topic words when the subject is blank', () => {
    expect(learnerHistoryNote(p, { subject: 'general', text: 'quadratics and parabolas' })).toContain('Quadratics')
  })
  it('is empty when nothing is relevant', () => {
    expect(learnerHistoryNote(p, { subject: 'history', text: 'The Civil War' })).toBe('')
  })
})

describe('missedQuestionsFromGuide', () => {
  const quiz = `# Quiz\n\n## Bonding\n\nMC_QUESTION: What is the shape of SF4?\nA) Tetrahedral\nB) Seesaw\nC) Square planar\nD) Linear\nCorrect Answer: B\nExplanation: x\n\nTF_QUESTION: Ionic bonds share electrons.\nAnswer: False\nExplanation: y\n`
  it('finds quiz questions by their logged ids', () => {
    expect(missedQuestionsFromGuide(quiz, ['q:q-0', 'q:q-1'])).toEqual([
      { question: 'What is the shape of SF4?', answer: 'Seesaw' },
      { question: 'Ionic bonds share electrons.', answer: 'False' },
    ])
  })
  it('ignores ids it does not know', () => {
    expect(missedQuestionsFromGuide(quiz, ['q:q-9', 'l:abc'])).toEqual([])
  })
})
