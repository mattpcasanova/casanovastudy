import { describe, expect, it } from 'vitest'
import { mergeIntoAsGraded, mergeRegraded, needsMorePages, pagesToSend, targetQuestions } from './regrade'
import { parseGradingOutput, parsePageList, type GradedQuestion } from './parse'

const q = (questionNumber: string, marksAwarded: number, marksPossible: number, extra: Partial<GradedQuestion> = {}): GradedQuestion =>
  ({ questionNumber, marksAwarded, marksPossible, explanation: 'x', ...extra })

describe('page lines', () => {
  it('reads single pages, ranges and lists', () => {
    expect(parsePageList('3')).toEqual([3])
    expect(parsePageList('3-4')).toEqual([3, 4])
    expect(parsePageList('pages 2 and 5')).toEqual([2, 5])
    expect(parsePageList('7, 3')).toEqual([3, 7])
    expect(parsePageList('none')).toEqual([])
  })
  it('lands on the question and stays out of the feedback', () => {
    const { breakdown } = parseGradingOutput('**Question 1**, Mark: 1/1 - Chose C.\nPage: 2\n**Question 2a**, Mark: 0/3 - Wrong method.\nCheck: faint writing\nPage: 2-3\n**Total: 1/4**')
    expect(breakdown[0].pages).toEqual([2])
    expect(breakdown[0].explanation).toBe('Chose C.')
    expect(breakdown[1].pages).toEqual([2, 3])
    expect(breakdown[1].check).toBe('faint writing')
  })
})

describe('targetQuestions', () => {
  it('matches labels loosely and keeps report order', () => {
    const b = [q('1', 1, 1), q('2a', 0, 2), q('8', 0, 1)]
    expect(targetQuestions(b, ['Q8', 'Question 2 a']).map((x) => x.questionNumber)).toEqual(['2a', '8'])
    expect(targetQuestions(b, ['9'])).toEqual([])
  })
})

describe('pagesToSend', () => {
  it('sends the recorded pages', () => {
    expect(pagesToSend([q('8', 0, 1, { pages: [3] }), q('9', 0, 1, { pages: [3, 4] })], 9)).toEqual([3, 4])
  })
  it('sends everything when a page is unknown, out of range, or it is the whole paper', () => {
    expect(pagesToSend([q('8', 0, 1, { pages: [3] }), q('9', 0, 1)], 9)).toBeNull()
    expect(pagesToSend([q('8', 0, 1, { pages: [12] })], 9)).toBeNull()
    expect(pagesToSend([q('8', 0, 1, { pages: [1] }), q('9', 0, 1, { pages: [2] })], 2)).toBeNull()
    expect(pagesToSend([q('8', 0, 1, { pages: [1] })], 1)).toBeNull()
  })
})

describe('needsMorePages', () => {
  it('spots the marker on its own line only', () => {
    expect(needsMorePages('**Question 8**, Mark: 1/1 - ok\nMORE PAGES NEEDED: 9')).toBe(true)
    expect(needsMorePages('**Question 8**, Mark: 1/1 - no more pages needed here')).toBe(false)
  })
})

describe('mergeRegraded', () => {
  const before = [q('1', 1, 1), q('8', 0, 1, { pages: [3], check: 'faint', checked: true }), q('9', 2, 4, { explanation: 'teacher edit' })]
  it('swaps only the regraded questions and reports the changes', () => {
    const targets = targetQuestions(before, ['8'])
    const out = mergeRegraded(before, [q('8 (1 mark)', 1, 1, { explanation: 'Chose C.' })], targets)
    expect(out.breakdown[0]).toBe(before[0])
    expect(out.breakdown[2]).toBe(before[2])
    expect(out.breakdown[1]).toMatchObject({ questionNumber: '8', marksAwarded: 1, explanation: 'Chose C.', pages: [3] })
    expect(out.breakdown[1].checked).toBeUndefined()
    expect(out.changed).toEqual([{ question: '8', before: 0, after: 1 }])
    expect(out.notRegraded).toEqual([])
  })
  it('ignores entries that were not asked for and lists the ones that did not come back', () => {
    const targets = targetQuestions(before, ['8', '9'])
    const out = mergeRegraded(before, [q('1', 0, 1), q('9', 2, 4)], targets)
    expect(out.breakdown[0]).toBe(before[0])
    expect(out.notRegraded).toEqual(['8'])
    expect(out.changed).toEqual([])
  })
  it('updates the as-graded copy for the same questions only', () => {
    const asGraded = [q('1', 1, 1), q('8', 0, 1), q('9', 3, 4)]
    const merged = mergeRegraded(before, [q('8', 1, 1)], targetQuestions(before, ['8'])).breakdown
    const out = mergeIntoAsGraded(asGraded, merged, ['8'])!
    expect(out[1].marksAwarded).toBe(1)
    expect(out[2]).toBe(asGraded[2])
    expect(mergeIntoAsGraded(null, merged, ['8'])).toBeNull()
  })
})
