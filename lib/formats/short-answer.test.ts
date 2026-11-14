import { describe, it, expect } from 'vitest'
import { scoreFromParts, shortAnswerPoints, shortAnswerVerdict, SA_CORRECT_AT } from './short-answer'

describe('short-answer scoring', () => {
  it('turns credit per part into a score', () => {
    expect(scoreFromParts([{ asks: 'why', credit: 1 }])?.score).toBe(100)
    expect(scoreFromParts([{ asks: 'a', credit: 1 }, { asks: 'b', credit: 0.5 }])?.score).toBe(75)
    expect(scoreFromParts([{ asks: 'a', credit: 1 }, { asks: 'b', credit: 0 }])?.score).toBe(50)
    expect(scoreFromParts([{ asks: 'a', credit: 1 }, { asks: 'b', credit: 1 }, { asks: 'c', credit: 0.5 }])?.score).toBe(83)
  })
  it('snaps odd credits and ignores junk', () => {
    expect(scoreFromParts([{ asks: 'a', credit: 0.8 }, { asks: 'b', credit: '0.5' }, { asks: 'c' }])?.score).toBe(75)
    expect(scoreFromParts([])).toBeNull()
    expect(scoreFromParts('nope')).toBeNull()
  })
  it('one part and a half of two is correct; half is partly right', () => {
    expect(shortAnswerVerdict(75)).toBe('correct')
    expect(shortAnswerVerdict(SA_CORRECT_AT)).toBe('correct')
    expect(shortAnswerVerdict(50)).toBe('partly')
    expect(shortAnswerVerdict(25)).toBe('not_yet')
  })
  it('gives partly-right answers their share of the point', () => {
    expect(shortAnswerPoints(100)).toBe(1)
    expect(shortAnswerPoints(75)).toBe(0.75)
    expect(shortAnswerPoints(50)).toBe(0.5)
    expect(shortAnswerPoints(25)).toBe(0)
    expect(shortAnswerPoints(undefined)).toBe(0)
  })
})
