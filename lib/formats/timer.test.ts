import { describe, expect, it } from 'vitest'
import { formatClock, formatPace, paceVerdict, summarizeTiming, timeBudget, timeTone } from './timer'

describe('quiz timer', () => {
  it('budgets the test pace times the question count', () => {
    expect(timeBudget(16, 95)).toBe(1520)
    expect(timeBudget(0, 95)).toBe(0)
  })
  it('formats clocks', () => {
    expect(formatClock(0)).toBe('0:00')
    expect(formatClock(65)).toBe('1:05')
    expect(formatClock(1520)).toBe('25:20')
    expect(formatClock(3725)).toBe('1:02:05')
    expect(formatClock(-4)).toBe('0:00')
  })
  it('formats paces', () => {
    expect(formatPace(42)).toBe('42 s')
    expect(formatPace(60)).toBe('1 min')
    expect(formatPace(95)).toBe('1 min 35 s')
  })
  it('turns amber at a fifth left, red at a tenth, over at zero', () => {
    expect(timeTone(1000, 1520)).toBe('ok')
    expect(timeTone(300, 1520)).toBe('low')
    expect(timeTone(150, 1520)).toBe('critical')
    expect(timeTone(0, 1520)).toBe('over')
    expect(timeTone(5, 0)).toBe('ok')
  })
  it('calls a question slow past one and a half times the pace', () => {
    expect(paceVerdict(140, 95)).toBe('ok')
    expect(paceVerdict(150, 95)).toBe('slow')
    expect(paceVerdict(500, 0)).toBe('ok')
  })
  it('summarizes a run', () => {
    const s = summarizeTiming(1600.4, { q1: 30, q2: 200 }, ['q1', 'q2', 'q3'], 95)
    expect(s).toEqual({ used: 1600, budget: 285, over: 1315, slow: ['q2'] })
    expect(summarizeTiming(90, {}, ['q1'], 95).over).toBe(0)
    expect(summarizeTiming(90, {}, ['q1'], 95, 60)).toMatchObject({ budget: 60, over: 30 })
  })
})
