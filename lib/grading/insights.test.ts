import { describe, expect, it } from 'vitest'
import { applyTopicMap, topicMapCoverage, insightsInput, insightsSignature, markedConsistently, staleReason, parseClassInsights, questionStats, topicStats, type PaperForInsights } from './insights'

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
  it('changes when the set\'s standards change, and says which changed', () => {
    const plain = insightsSignature(papers)
    const withStd = insightsSignature(papers, 'MA.8.AR.2.1\nMA.8.AR.3.2')
    expect(withStd).not.toBe(plain)
    expect(insightsSignature(papers, '  ')).toBe(plain)
    expect(staleReason(plain, plain)).toBeNull()
    expect(staleReason(plain, withStd)).toBe('standards')
    expect(staleReason(withStd, plain)).toBe('standards')
    const changed = papers.map((p, i) => (i === 0 ? { ...p, breakdown: [q('1a', 1, 2), ...p.breakdown.slice(1)] } : p))
    expect(staleReason(withStd, insightsSignature(changed, 'MA.8.AR.2.1\nMA.8.AR.3.2'))).toBe('marks')
    expect(staleReason(withStd, insightsSignature(changed))).toBe('marks')
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

describe('applyTopicMap', () => {
  const shared = [{ name: 'Gas laws and partial pressures', questions: ['1', '2', '3'] }, { name: 'Intermolecular forces', questions: ['4', '5'] }]

  it('keeps the first period\'s names and question placement', () => {
    const own = [{ name: 'Ideal gas law', questions: ['1', '2'] }, { name: 'Maxwell-Boltzmann', questions: ['3'] }, { name: 'IMFs and boiling point', questions: ['4', '5'] }]
    expect(applyTopicMap(own, shared, ['1', '2', '3', '4', '5'])).toEqual(shared)
  })

  it('reads labels the way the grader wrote them and keeps this set\'s own spelling', () => {
    const own = [{ name: 'Anything', questions: ['Question 1', 'Q2'] }]
    expect(applyTopicMap(own, shared, ['Question 1', 'Q2'])).toEqual([{ name: 'Gas laws and partial pressures', questions: ['Question 1', 'Q2'] }])
  })

  it('puts a question the shared map lacks under the same-named shared topic, else a topic of its own', () => {
    const own = [{ name: 'intermolecular  forces', questions: ['4', '6'] }, { name: 'Solids', questions: ['7'] }]
    expect(applyTopicMap(own, shared, ['4', '6', '7'])).toEqual([{ name: 'Intermolecular forces', questions: ['4', '6'] }, { name: 'Solids', questions: ['7'] }])
  })

  it('drops shared topics with no question in this set and never places a question twice', () => {
    expect(applyTopicMap([], shared, ['4', '4', '5'])).toEqual([{ name: 'Intermolecular forces', questions: ['4', '5'] }])
  })

  it('measures how much of a set a map covers', () => {
    expect(topicMapCoverage(['1', '2', '3', '9'], shared)).toBe(0.75)
    expect(topicMapCoverage(['Question 4'], shared)).toBe(1)
    expect(topicMapCoverage([], shared)).toBe(0)
  })
})
