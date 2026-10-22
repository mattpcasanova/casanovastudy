import { describe, expect, it } from 'vitest'
import { adjustedTotals, adjustmentGroups, adjustmentLine, adjustmentMarks, gradebookComment, lateAdjustment, normalizeAdjustments, withAdjustment, type GradeAdjustment } from './adjustments'
import { DEFAULT_SCALE } from './scale'

const packet: GradeAdjustment = { id: 'adj-packet', kind: 'extra', amount: 5, unit: 'percent', reason: 'Extra credit: study guide packet' }

describe('adjusted totals', () => {
  it('turns percent into marks of the whole test', () => {
    expect(adjustmentMarks(packet, 40)).toBe(2)
    expect(adjustmentMarks({ ...packet, unit: 'marks', amount: 3 }, 40)).toBe(3)
    expect(adjustmentMarks(lateAdjustment('adj-late', 2, 10), 50)).toBe(-10)
  })

  it('adds extra credit and takes off late days on top of the graded marks', () => {
    const t = adjustedTotals(30, 40, [packet, lateAdjustment('adj-late', 1, 10)], DEFAULT_SCALE)
    expect(t.change).toBe(-2)
    expect(t.marks).toBe(28)
    expect(t.percentage).toBe(70)
    expect(t.grade).toBe('C')
  })

  it('lets extra credit go above the total but never below 0', () => {
    expect(adjustedTotals(39, 40, [packet]).percentage).toBe(102.5)
    expect(adjustedTotals(3, 40, [lateAdjustment('adj-late', 5, 10)]).marks).toBe(0)
  })

  it('leaves totals alone with no adjustments', () => {
    expect(adjustedTotals(17.5, 20, [])).toMatchObject({ marks: 17.5, change: 0, percentage: 87.5 })
  })
})

describe('comments', () => {
  it('writes one line per adjustment for the report and the gradebook', () => {
    expect(adjustmentLine(packet)).toBe('Extra credit: study guide packet (+5%)')
    expect(adjustmentLine(lateAdjustment('adj-late', 2, 10))).toBe('Late: 2 days (-20%)')
    expect(adjustmentLine({ id: 'adj-x', kind: 'deduct', amount: 1, unit: 'marks', reason: '' })).toBe('Points taken off (-1 mark)')
    expect(gradebookComment([packet, lateAdjustment('adj-late', 1, 10)])).toBe('Extra credit: study guide packet (+5%); Late: 1 day (-10%)')
    expect(gradebookComment([])).toBe('')
  })
})

describe('normalizeAdjustments', () => {
  it('keeps valid ones and drops junk', () => {
    const out = normalizeAdjustments([packet, { id: 'x', amount: 5 }, { id: 'adj-neg', amount: -3 }, { id: 'adj-ok', amount: '2', unit: 'marks', kind: 'deduct', reason: ' Talking ', late: { days: 0, perDay: 5 } }, 'nope'])
    expect(out.map((a) => a.id)).toEqual(['adj-packet', 'adj-ok'])
    expect(out[1]).toEqual({ id: 'adj-ok', kind: 'deduct', amount: 2, unit: 'marks', reason: 'Talking' })
    expect(normalizeAdjustments(null)).toEqual([])
  })
})

describe('applying to a class set', () => {
  const papers = [
    { id: 'p1', adjustments: [] as GradeAdjustment[] },
    { id: 'p2', adjustments: [packet] },
    { id: 'p3', adjustments: [] as GradeAdjustment[] },
  ]
  it('puts it on exactly the chosen papers', () => {
    const out = withAdjustment(papers, { ...packet, amount: 10 }, new Set(['p1']))
    expect(out).toEqual([
      { id: 'p1', adjustments: [{ ...packet, amount: 10 }], changed: true },
      { id: 'p2', adjustments: [], changed: true },
      { id: 'p3', adjustments: [], changed: false },
    ])
  })
  it('groups shared adjustments', () => {
    expect(adjustmentGroups([...papers, { id: 'p4', adjustments: [packet] }])).toEqual([{ adjustment: packet, paperIds: ['p2', 'p4'] }])
  })
})
