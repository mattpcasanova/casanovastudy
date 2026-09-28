// Pacing a study plan toward a test date. Pure functions: the schedule is
// recomputed from today and the units still left, so it re-flows as units are
// checked off and never goes "overdue".

export type DaysPerWeek = 3 | 5 | 7

export interface PlanSchedule {
  testDate: string // YYYY-MM-DD (local)
  daysPerWeek: DaysPerWeek
}

export interface ScheduleResult {
  byUnit: Record<string, string> // unit key → YYYY-MM-DD
  reviewDate: string | null // spare last study day before the test, if any
  studyDays: number // study days available before the test
  daysLeft: number // calendar days until the test (0 = today)
  perWeek: number // units per week at this pace
  finishDate: string | null // date of the last scheduled unit
}

// Mon/Wed/Fri, weekdays, or every day (0 = Sunday).
const PATTERN: Record<DaysPerWeek, number[]> = {
  3: [1, 3, 5],
  5: [1, 2, 3, 4, 5],
  7: [0, 1, 2, 3, 4, 5, 6],
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

export function fromISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, (m || 1) - 1, d || 1)
}

/** Study days from today up to (not including) the test day. */
export function studyDates(today: Date, testDate: string, daysPerWeek: DaysPerWeek): string[] {
  const days: string[] = []
  const end = fromISODate(testDate)
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const allowed = PATTERN[daysPerWeek]
  for (let i = 0; d < end && i < 400; i++) {
    if (allowed.includes(d.getDay())) days.push(toISODate(d))
    d.setDate(d.getDate() + 1)
  }
  return days
}

/** Spread the remaining units (in plan order) evenly across the study days. */
export function scheduleUnits(unitKeys: string[], schedule: PlanSchedule, today = new Date()): ScheduleResult {
  const dates = studyDates(today, schedule.testDate, schedule.daysPerWeek)
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const daysLeft = Math.round((fromISODate(schedule.testDate).getTime() - start.getTime()) / 86_400_000)
  const result: ScheduleResult = { byUnit: {}, reviewDate: null, studyDays: dates.length, daysLeft, perWeek: 0, finishDate: null }
  if (dates.length === 0 || unitKeys.length === 0) return result

  // Keep the last study day free for review when there's room.
  const usable = unitKeys.length < dates.length ? dates.slice(0, -1) : dates
  if (usable.length < dates.length) result.reviewDate = dates[dates.length - 1]

  unitKeys.forEach((key, i) => {
    result.byUnit[key] = usable[Math.floor((i * usable.length) / unitKeys.length)]
  })
  result.finishDate = result.byUnit[unitKeys[unitKeys.length - 1]]
  const weeks = Math.max(daysLeft, 1) / 7
  result.perWeek = Math.round((unitKeys.length / Math.max(weeks, 1)) * 10) / 10
  return result
}
