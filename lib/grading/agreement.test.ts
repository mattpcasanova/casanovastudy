import { describe, expect, it } from 'vitest'
import { agreement, comparePaper, share } from './agreement'

const q = (questionNumber: string, marksAwarded: number, marksPossible = 5) => ({ questionNumber, marksAwarded, marksPossible })

describe('comparePaper', () => {
  it('counts kept, within 1 and deleted questions', () => {
    const c = comparePaper({
      ai: [q('1', 3), q('2a', 4), q('2b', 1), q('3', 5)],
      final: [q('1', 3), q('Question 2a', 3), q('2b', 4)], // 2a -1, 2b +3, 3 deleted
    })
    expect(c).toMatchObject({ questions: 4, kept: 1, within1: 2, aiTotal: 13, finalTotal: 10 })
  })

  it('handles half marks', () => {
    expect(comparePaper({ ai: [q('1', 2.5)], final: [q('1', 3)] })).toMatchObject({ kept: 0, within1: 1 })
  })
})

describe('agreement', () => {
  it('adds up papers and skips repeat group copies and papers with no AI marks', () => {
    const a = agreement([
      { ai: [q('1', 3), q('2', 4)], final: [q('1', 3), q('2', 4)] },
      { ai: [q('1', 2), q('2', 5)], final: [q('1', 3), q('2', 5)], groupId: 'g' },
      { ai: [q('1', 2), q('2', 5)], final: [q('1', 3), q('2', 5)], groupId: 'g' },
      { ai: [], final: [q('1', 1)] },
    ])
    expect(a).toMatchObject({ papers: 2, questions: 4, questionsKept: 3, questionsWithin1: 4, papersUnchanged: 1 })
    expect(a.meanTotalShift).toBeCloseTo(5) // second paper moved 1 of 10 marks = 10 points; mean of 0 and 10
    expect(a.netShift).toBeCloseTo(5) // +1 mark of 20 possible
  })

  it('is empty for no papers', () => {
    expect(agreement([])).toMatchObject({ papers: 0, questions: 0, meanTotalShift: 0, netShift: 0 })
    expect(share(0, 0)).toBeNull()
    expect(share(47, 50)).toBe(94)
  })
})
