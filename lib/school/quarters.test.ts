import { describe, expect, it } from 'vitest'
import { currentQuarter, quarterDates, quarterWindow, startedQuarters } from './quarters'

const at = (d: string) => Date.parse(`${d}T15:00:00Z`)

describe('quarters', () => {
  it('lists the quarters that have started', () => {
    expect(startedQuarters('2026-27', at('2026-08-01'))).toEqual([])
    expect(startedQuarters('2026-27', at('2026-11-01')).map((q) => q.key)).toEqual(['q1', 'q2'])
    expect(startedQuarters('2026-27', at('2027-06-01')).map((q) => q.key)).toEqual(['q1', 'q2', 'q3', 'q4'])
    expect(startedQuarters('2031-32', at('2031-11-01'))).toEqual([])
  })

  it('finds the current quarter, with no gap between quarters', () => {
    expect(currentQuarter('2026-27', at('2026-10-10'))?.key).toBe('q1') // the weekend after Q1's last day still counts to Q1
    expect(currentQuarter('2026-27', at('2026-12-28'))?.key).toBe('q2') // winter break counts to Q2
    expect(currentQuarter('2026-27', at('2026-07-15'))).toBeNull()
  })

  it('a running quarter ends now, a finished one at the next start', () => {
    const [q1, q2] = startedQuarters('2026-27', at('2026-11-01'))
    expect(quarterWindow(q1, at('2026-11-01'))).toEqual({ from: Date.parse('2026-08-10T04:00:00Z'), to: Date.parse('2026-10-13T04:00:00Z') })
    expect(quarterWindow(q2, at('2026-11-01')).to).toBe(at('2026-11-01'))
    expect(quarterDates(q1)).toBe('Aug 10 to Oct 9')
  })
})
