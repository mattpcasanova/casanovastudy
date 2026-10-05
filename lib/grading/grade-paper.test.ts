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
