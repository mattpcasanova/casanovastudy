// Grading quarters for the school overview's time ranges (pure, unit-tested).
// Dates follow the Broward County Public Schools calendar, which the pilot
// school (a Broward charter) runs on (2026-27: Q1 Aug 10 to Oct 9, Q2 Oct 13
// to Dec 18, Q3 Jan 5 to Mar 18, Q4 Mar 29 to May 28; Oct 12 and Jan 4 are
// teacher planning days and count to the quarter before). A quarter's window runs from its first
// day to the next quarter's first day, so no school day falls between two
// quarters; the label shows the official last day. Add a year here when the
// district publishes its calendar; a school on another calendar needs its own
// table (verified_school_domains could carry it later).

export interface Quarter {
  key: 'q1' | 'q2' | 'q3' | 'q4'
  label: string
  /** First school day (YYYY-MM-DD, Eastern). */
  start: string
  /** Last school day of the quarter, for display. */
  end: string
  /** First day after the quarter's window (the next quarter's start, or the day after the school year). */
  until: string
}

export const QUARTERS: Record<string, Quarter[]> = {
  '2026-27': [
    { key: 'q1', label: 'Quarter 1', start: '2026-08-10', end: '2026-10-09', until: '2026-10-13' },
    { key: 'q2', label: 'Quarter 2', start: '2026-10-13', end: '2026-12-18', until: '2027-01-05' },
    { key: 'q3', label: 'Quarter 3', start: '2027-01-05', end: '2027-03-18', until: '2027-03-29' },
    { key: 'q4', label: 'Quarter 4', start: '2027-03-29', end: '2027-05-28', until: '2027-06-30' },
  ],
}

/** Midnight Eastern (approximated as 04:00 UTC, like schoolYearStart) of a calendar day. */
export function easternMidnight(day: string): number {
  return Date.parse(`${day}T04:00:00Z`)
}

/** The quarters of a school year that have started by `now`, oldest first. */
export function startedQuarters(year: string, now: number): Quarter[] {
  return (QUARTERS[year] ?? []).filter((q) => easternMidnight(q.start) <= now)
}

/** The quarter holding `now`, if the year has one. */
export function currentQuarter(year: string, now: number): Quarter | null {
  return (QUARTERS[year] ?? []).find((q) => easternMidnight(q.start) <= now && now < easternMidnight(q.until)) ?? null
}

/** The window to count for a quarter: its start up to the next quarter's start, or up to now while it's running. */
export function quarterWindow(q: Quarter, now: number): { from: number; to: number } {
  return { from: easternMidnight(q.start), to: Math.min(easternMidnight(q.until), now) }
}

/** "Aug 10 to Oct 9" for a chip or a note. */
export function quarterDates(q: Quarter): string {
  const f = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })
  return `${f(q.start)} to ${f(q.end)}`
}
