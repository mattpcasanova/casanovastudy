import { describe, expect, it } from 'vitest'
import { insightsInput, insightsSignature, markedConsistently, parseClassInsights, questionStats, topicStats, type PaperForInsights } from './insights'

const q = (questionNumber: string, marksAwarded: number, marksPossible: number, explanation = '') => ({ questionNumber, marksAwarded, marksPossible, explanation })

const papers: PaperForInsights[] = [
  { id: 'a', name: 'Ava', breakdown: [q('1a', 2, 2), q('1b', 0, 3, 'Forgot to convert grams to moles.'), q('2', 4, 4)] },
  { id: 'b', name: 'Ben', breakdown: [q('1a', 1, 2), q('1b', 3, 3), q('2', 2, 4, 'Wrong limiting reagent.')] },
  { id: 'c', name: 'Cara', breakdown: [q('Question 1a', 2, 2), q('1b', 0, 3, 'No working shown.'), q('2', 4, 4)] },
]

describe('questionStats', () => {
  it('averages each question across papers, matching labels loosely', () => {
    const stats = questionStats(papers)
    expect(stats.map((s) => s.key)).toEqual(['1a', '1b', '2'])
    const b = stats[1]
    expect(b).toMatchObject({ label: '1b', possible: 3, n: 3, zeroCount: 2, fullCount: 1 })
    expect(Math.round(b.avgPct)).toBe(33)
    expect(stats[0].n).toBe(3)
  })
})

describe('markedConsistently', () => {
  it('is true when every paper has the same questions and total', () => {
    expect(markedConsistently(papers)).toBe(true)
  })
  it('spots papers marked on different questions', () => {
    expect(markedConsistently([...papers, { id: 'd', name: 'Dan', breakdown: [q('1', 3, 5)] }])).toBe(false)
  })
})

describe('topicStats', () => {
  it('weights topic averages by marks and puts the weakest first', () => {
    const topics = topicStats(questionStats(papers), [
      { name: 'Moles', questions: ['1a', '1b'] },
      { name: 'Limiting reagent', questions: ['Q2'] },
      { name: 'Nothing', questions: ['9'] },
    ])
    expect(topics.map((t) => t.name)).toEqual(['Moles', 'Limiting reagent'])
    expect(Math.round(topics[0].avgPct)).toBe(53) // (5/3 + 1) / 5
  })
})

describe('insightsSignature', () => {
  it('changes when a mark changes', () => {
    const changed = papers.map((p, i) => (i === 0 ? { ...p, breakdown: [q('1a', 1, 2), ...p.breakdown.slice(1)] } : p))
    expect(insightsSignature(papers)).not.toBe(insightsSignature(changed))
    expect(insightsSignature(papers)).toBe(insightsSignature([...papers].reverse()))
  })
})

describe('insightsInput', () => {
  it('lists stats and the feedback of students who lost marks first, without names', () => {
    const text = insightsInput(papers, questionStats(papers))
    expect(text).toContain('Question 1b (3 marks): class average 1.0/3 (33%), 2 scored 0, 1 full marks.')
    expect(text).toContain('Student 1 (0/3): Forgot to convert grams to moles.')
    expect(text).not.toContain('Ava')
  })
})

describe('parseClassInsights', () => {
  it('reads the JSON and drops malformed parts', () => {
    const parsed = parseClassInsights('Here: {"summary":"Moles were weak.","topics":[{"name":"Moles","questions":["1a","1b"]},{"name":""}],"struggles":[{"question":"1b","issue":"Skipped the mole conversion."}],"reteach":["Mole conversions"]}')
    expect(parsed).toEqual({ summary: 'Moles were weak.', topics: [{ name: 'Moles', questions: ['1a', '1b'] }], struggles: [{ question: '1b', issue: 'Skipped the mole conversion.' }], reteach: ['Mole conversions'] })
    expect(parseClassInsights('not json')).toBeNull()
  })
})
