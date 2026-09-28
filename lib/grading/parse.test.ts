import { describe, it, expect } from 'vitest'
import { parseGradingOutput } from './parse'

const OUTPUT = `[MARK SCHEME SUMMARY]
Q1(2), Q2(3), Q3(2), Q4(3)
Total: 10 marks
[END SUMMARY]

**Question 1**, Mark: 2/2 - Correctly identified molar mass of H2O as 18 g/mol.

**Question 2**, Mark: 3/3 - All coefficients correct.

**Question 3a**, Mark: 1/2 - Right method, but the final answer
was off by a factor of two. Lost 1 mark for the final value.

**Question 4**, Mark: 2/3 - Correct division, but failed to multiply by 100 to convert to a percentage, giving 0.82% instead of 82%. Lost the final mark for not completing the percentage conversion. Total yield reasoning was otherwise fine.

**Total: 8/10**
**Percentage: 80%**
**Grade: B**

**Feedback:** Strong work overall.
`

describe('parseGradingOutput', () => {
  const r = parseGradingOutput(OUTPUT)

  it('parses every question with bare, consistent labels', () => {
    expect(r.breakdown.map((q) => q.questionNumber)).toEqual(['1', '2', '3a', '4'])
    expect(r.breakdown.map((q) => q.marksAwarded)).toEqual([2, 3, 1, 2])
  })

  it('keeps feedback that mentions "percentage" or "total", and joins wrapped lines', () => {
    expect(r.breakdown[3].explanation).toContain('not completing the percentage conversion. Total yield reasoning was otherwise fine.')
    expect(r.breakdown[2].explanation).toBe('Right method, but the final answer was off by a factor of two. Lost 1 mark for the final value.')
  })

  it('stops the last question at closing sections and computes totals', () => {
    expect(r.breakdown[3].explanation).not.toContain('Strong work')
    expect(r).toMatchObject({ totalMarks: 8, totalPossible: 10, grade: 'B' })
  })

  it('handles bare labels, sections and decimal marks', () => {
    const b = parseGradingOutput(`2b, Mark: 1.5/3 - Half credit.
**Question Section C 2a**, Mark: 6/8 - Good.
- Question 5(a)(i): Marks 1/1 — Correct.`).breakdown
    expect(b.map((q) => [q.questionNumber, q.marksAwarded, q.marksPossible])).toEqual([
      ['2b', 1.5, 3],
      ['Section C 2a', 6, 8],
      ['5(a)(i)', 1, 1],
    ])
  })

  it('does not treat prose like "Lost 3 marks" as a question', () => {
    const b = parseGradingOutput(`**Question 1**, Mark: 2/5 - Weak.
Lost 3 marks: 3/5 of the steps were missing.`).breakdown
    expect(b).toHaveLength(1)
    expect(b[0].explanation).toContain('Lost 3 marks')
  })
})
