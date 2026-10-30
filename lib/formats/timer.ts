// The quiz timer for guides written for a known test (lib/exams): the test's
// own pace (seconds per item) times the number of questions, shown as a
// countdown, with each question's time judged against that pace.

export const TIMER_RULES = {
  /** Over this share of the pace, a question counts as slow. */
  slowAt: 1.5,
  /** Share of the budget left when the clock turns amber, then red. */
  lowAt: 0.2,
  criticalAt: 0.1,
}

/** Total seconds for a run of `count` questions at `pace` seconds each. */
export function timeBudget(count: number, pace: number): number {
  return Math.max(0, Math.round(count * pace))
}

/** "12:05", or "1:02:05" past an hour. Negative numbers are shown as 0:00. */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : `${m}:${String(sec).padStart(2, '0')}`
}

/** "95 s" or "1 min 35 s" for a pace, as in "at the test's pace: 95 s per question". */
export function formatPace(pace: number): string {
  const s = Math.round(pace)
  if (s < 60) return `${s} s`
  const m = Math.floor(s / 60)
  const rest = s % 60
  return rest ? `${m} min ${rest} s` : `${m} min`
}

export type TimeTone = 'ok' | 'low' | 'critical' | 'over'

/** How the countdown should look with `left` seconds of `total` remaining. */
export function timeTone(left: number, total: number): TimeTone {
  if (left <= 0) return 'over'
  if (total <= 0) return 'ok'
  const share = left / total
  if (share <= TIMER_RULES.criticalAt) return 'critical'
  if (share <= TIMER_RULES.lowAt) return 'low'
  return 'ok'
}

/** A question's time against the pace: slow past 1.5 times it. */
export function paceVerdict(spent: number, pace: number): 'ok' | 'slow' {
  return pace > 0 && spent > pace * TIMER_RULES.slowAt ? 'slow' : 'ok'
}

export interface TimingSummary {
  used: number
  budget: number
  /** Positive when the run went past the budget. */
  over: number
  slow: string[]
}

/** The results line: time used, the budget (the test's unless the student set one), and which questions ran slow. */
export function summarizeTiming(elapsed: number, spent: Record<string, number>, ids: string[], pace: number, budget = timeBudget(ids.length, pace)): TimingSummary {
  const used = Math.max(0, Math.round(elapsed))
  return {
    used,
    budget,
    over: Math.max(0, used - budget),
    slow: ids.filter((id) => paceVerdict(spent[id] ?? 0, pace) === 'slow'),
  }
}
