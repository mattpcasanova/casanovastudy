import { describe, expect, it } from 'vitest'
import { markingProgress } from './grade-paper'

describe('markingProgress', () => {
  it('counts nothing before the summary is written', () => {
    expect(markingProgress('')).toEqual({ graded: 0, total: null })
    expect(markingProgress('[MARK SCHEME SUMMARY]\n1a(2), 1b(3)')).toEqual({ graded: 0, total: null })
  })
  it('counts marked questions against the summary', () => {
    const text = '[MARK SCHEME SUMMARY]\n1a(2), 1b(3), 2(5)\nTotal: 10 marks\n[END SUMMARY]\n\n**Question 1a**, Mark: 2/2 - Correct.\n**Question 1b**, Mark: 1/3 - Missed'
    expect(markingProgress(text)).toEqual({ graded: 2, total: 3 })
  })
})

import { parseMarkSchemeSummary } from './grade-paper'

describe('parseMarkSchemeSummary', () => {
  const wrap = (body: string) => `[MARK SCHEME SUMMARY]\n${body}\n[END SUMMARY]`
  it('keeps hyphens, dots and brackets in labels', () => {
    const s = parseMarkSchemeSummary(wrap('L1-1a(1), L1-1b(1), L2-1(5), 3.1(4), 1(a)(3), Section A 2b(5), Q4 (2)\nTotal: 21 marks'))
    expect(s?.questions).toEqual([
      { num: 'L1-1a', marks: 1 }, { num: 'L1-1b', marks: 1 }, { num: 'L2-1', marks: 5 }, { num: '3.1', marks: 4 },
      { num: '1(a)', marks: 3 }, { num: 'Section A 2b', marks: 5 }, { num: 'Q4', marks: 2 },
    ])
    expect(s?.total).toBe(21)
  })
  it('reads one-per-line lists and half marks', () => {
    const s = parseMarkSchemeSummary(wrap('- 1a (2)\n- 1b (1.5 marks)\n- 2 (3)\nTotal: 6.5'))
    expect(s?.questions.map((q) => q.num)).toEqual(['1a', '1b', '2'])
    expect(s?.total).toBe(6.5)
  })
  it('returns null without a summary block', () => {
    expect(parseMarkSchemeSummary('no summary here')).toBeNull()
  })
})
