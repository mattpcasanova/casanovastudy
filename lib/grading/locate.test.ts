import { describe, expect, it } from 'vitest'
import type { GradedQuestion } from './parse'
import { marginPlaces, parsePositions, placeAtPositions } from './locate'
import { stampsOf } from './mark-points'

const q = (patch: Partial<GradedQuestion>): GradedQuestion => ({ questionNumber: '1', marksAwarded: 0, marksPossible: 2, explanation: '', ...patch })

describe('answer positions', () => {
  it('reads the reply and drops what is off the page', () => {
    expect(parsePositions('Here: {"positions":[{"q":"Question 1(a)","page":1,"y":0.31},{"q":"2","page":3,"y":0.5},{"q":"3","page":2,"y":1.2}]}', 2))
      .toEqual([{ question: 'Question 1(a)', page: 1, y: 0.31 }])
    expect(parsePositions('no', 2)).toEqual([])
  })

  it('lines marks up in the right margin', () => {
    expect(marginPlaces(1, 2, 0.4)).toEqual([{ page: 2, x: 0.93, y: 0.4 }])
    expect(marginPlaces(3, 1, 0.2).map((p) => p.x)).toEqual([0.78, 0.855, 0.93])
  })

  it('places every marked question, keeps what the teacher placed, reports the rest', () => {
    const b = [
      q({ questionNumber: '1(a)', marksAwarded: 1, points: [{ code: 'M1', marks: 1, earned: true, at: { page: 1, x: 0.5, y: 0.5 } }, { code: 'A1', marks: 1, earned: false }] }),
      q({ questionNumber: '2', marksAwarded: 2 }),
      q({ questionNumber: '3', unmarked: true }),
      q({ questionNumber: '4', marksAwarded: 1 }),
    ]
    const r = placeAtPositions(b, [{ question: '1a', page: 1, y: 0.3 }, { question: '2', page: 2, y: 0.6 }])
    expect(r.placed).toBe(2)
    expect(r.missing).toEqual(['4'])
    const stamps = stampsOf(r.breakdown)
    expect(stamps.map((s) => `${s.text}@${s.page}:${s.x},${s.y}`)).toEqual(['M1@1:0.5,0.5', 'A0@1:0.93,0.3', '2/2@2:0.93,0.6'])
  })
})
