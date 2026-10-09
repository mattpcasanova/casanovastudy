import { describe, expect, it } from 'vitest'
import { baseTitle, missedQuestions, nextStudyRequest, nextTitle, recommendNext } from './next'
import type { AdaptiveGuide, AdaptiveQuestion } from './format'
import type { AdaptiveAnswer, ConceptProgress } from './engine'

const q = (id: string, conceptId: string, type: AdaptiveQuestion['type'] = 'mc'): AdaptiveQuestion =>
  ({ id, conceptId, level: 2, type, prompt: `Question ${id}`, options: ['a', 'b'], correct: 0, answers: [], feedback: {} })

const guide: AdaptiveGuide = {
  title: 'Stats', description: '', refills: 0,
  concepts: ['k1', 'k2', 'k3', 'k4'].map((id) => ({ id, name: id.toUpperCase(), lesson: '' })),
  questions: [q('a1', 'k1'), q('a2', 'k2'), q('a3', 'k3'), q('a4', 'k4'), q('a5', 'k3'), q('a6', 'k3', 'explain')],
}

function cp(id: string, status: ConceptProgress['status'], correct: number, answered: number): ConceptProgress {
  return { id, name: id.toUpperCase(), answered, correct, recent: [], accuracy: 0, status, level: 2, missStreak: 0, remaining: 0, explainDone: false }
}

describe('recommendNext', () => {
  it('goes harder when every concept was mastered cleanly', () => {
    const r = recommendNext(guide, [], ['k1', 'k2', 'k3', 'k4'].map((k) => cp(k, 'mastered', 3, 3)))
    expect(r.recommended).toMatchObject({ kind: 'harder', difficulty: 'hard', concepts: ['K1', 'K2', 'K3', 'K4'] })
    expect(r.others).toEqual([]) // nothing weak to focus on
  })

  it('focuses on the concepts that were not mastered, with the missed questions', () => {
    const answers: AdaptiveAnswer[] = [{ q: 'a3', correct: false }, { q: 'a5', correct: false }, { q: 'a5', correct: true }, { q: 'a6', correct: false }]
    const r = recommendNext(guide, answers, [cp('k1', 'mastered', 3, 3), cp('k2', 'mastered', 3, 3), cp('k3', 'max_reached', 5, 15), cp('k4', 'mastered', 3, 3)])
    expect(r.recommended).toMatchObject({ kind: 'focus', concepts: ['K3'], difficulty: 'standard', missed: ['Question a3'] })
    expect(r.others.map((o) => o.kind)).toEqual(['harder', 'foundations'])
  })

  it('rebuilds foundations when most concepts were not mastered', () => {
    const r = recommendNext(guide, [], [cp('k1', 'mastered', 3, 4), cp('k2', 'max_reached', 4, 15), cp('k3', 'out_of_questions', 2, 9), cp('k4', 'max_reached', 5, 15)])
    expect(r.recommended).toMatchObject({ kind: 'foundations', difficulty: 'easier', concepts: ['K2', 'K3', 'K4'] })
  })

  it('focuses on shaky concepts when everything was mastered but some barely', () => {
    const r = recommendNext(guide, [], [cp('k1', 'mastered', 3, 3), cp('k2', 'mastered', 3, 3), cp('k3', 'mastered', 6, 10), cp('k4', 'mastered', 7, 11)])
    expect(r.recommended).toMatchObject({ kind: 'focus', concepts: ['K3', 'K4'] })
  })
})

describe('next session text', () => {
  it('lists missed questions, skipping ones answered right later and explain questions', () => {
    expect(missedQuestions(guide, [{ q: 'a1', correct: false }, { q: 'a1', correct: true }, { q: 'a2', correct: false }, { q: 'a6', correct: false }], ['k1', 'k2', 'k3'])).toEqual(['Question a2'])
  })

  it("doesn't chain title suffixes", () => {
    expect(baseTitle('AP Stats Unit 5: Focus on 2 concepts')).toBe('AP Stats Unit 5')
    expect(nextTitle({ kind: 'harder', concepts: [], difficulty: 'hard', missed: [] }, 'AP Stats Unit 5: Foundations')).toBe('AP Stats Unit 5: Level up')
    expect(nextStudyRequest({ kind: 'focus', concepts: ['CLT'], difficulty: 'standard', missed: ['What is x?'] }, 'Stats')).toContain('- What is x?')
  })
})
