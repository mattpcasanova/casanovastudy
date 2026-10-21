import { describe, expect, it } from 'vitest'
import { firstGradedBySet, lateDaysByPaper, lateLabel, paperDaysLate } from './late'

const paper = (id: string, batch: string | null, roster: string | null, at: string) => ({ id, batch_id: batch, roster_id: roster, created_at: at })

describe('late papers', () => {
  const papers = [
    paper('a', 'b1', 'r1', '2026-10-01T15:00:00Z'),
    paper('b', 'b1', 'r2', '2026-10-01T14:00:00Z'),
    paper('c', 'b1', 'r3', '2026-10-04T13:00:00Z'),
    paper('d', 'b1', 'r4', '2026-10-01T18:00:00Z'),
    paper('e', null, null, '2026-10-09T00:00:00Z'),
  ]
  const statuses = [
    { batch_id: 'b1', roster_id: 'r3', status: 'late' },
    { batch_id: 'b1', roster_id: 'r4', status: 'late' },
    { batch_id: 'b1', roster_id: 'r1', status: 'absent' },
  ]
  it('finds the first graded date per set', () => {
    expect(firstGradedBySet(papers).get('b1')).toBe('2026-10-01T14:00:00Z')
  })
  it('counts days from the first paper, only for late statuses', () => {
    const late = lateDaysByPaper(papers, statuses)
    expect(late.get('c')).toBe(3)
    expect(late.get('d')).toBe(0) // same calendar day
    expect(late.has('a')).toBe(false)
    expect(late.has('e')).toBe(false)
  })
  it('uses a given first date (a single report)', () => {
    expect(lateDaysByPaper([papers[2]], statuses, new Map([['b1', '2026-10-01T14:00:00Z']])).get('c')).toBe(3)
  })
  it('counts Eastern calendar days', () => {
    // 11pm Eastern Oct 1 → 1am Eastern Oct 2 is the next day.
    expect(paperDaysLate('2026-10-02T03:00:00Z', '2026-10-02T05:00:00Z')).toBe(1)
    expect(paperDaysLate('2026-10-02T03:00:00Z', '2026-10-02T03:30:00Z')).toBe(0)
    expect(paperDaysLate(null, '2026-10-02T03:30:00Z')).toBe(0)
  })
  it('labels', () => {
    expect(lateLabel(0)).toBe('Late')
    expect(lateLabel(1)).toBe('Late · 1 day')
    expect(lateLabel(4)).toBe('Late · 4 days')
  })
})
