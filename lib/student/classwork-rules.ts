// What a student in a class sees (pure, unit-tested): which assigned work is
// open, what the homepage strip shows, and friendly due labels.

export interface StudentAssignment {
  id: string
  title: string
  status: string // done | late | missing | not_started
  dueAt: string | null
  daysLate?: number
}

export interface StudentReport { id: string; title: string; createdAt: string }

const DAY = 24 * 60 * 60 * 1000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Still to do: missing first (most overdue first), then by due date, undated last. */
export function openWork<T extends StudentAssignment>(list: T[]): T[] {
  return list
    .filter((a) => a.status === 'not_started' || a.status === 'missing')
    .sort((a, b) => (a.status === 'missing' ? 0 : 1) - (b.status === 'missing' ? 0 : 1) || (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9'))
}

/** "Due today", "Due tomorrow", "Due Fri", "Due Oct 30", "2 days overdue". */
export function dueLabel(dueAt: string | null, now = new Date()): string {
  if (!dueAt) return 'No due date'
  const due = new Date(dueAt)
  const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY)
  if (due.getTime() < now.getTime()) {
    const over = Math.max(1, Math.round((startOfDay(now) - startOfDay(due)) / DAY))
    return days === 0 ? 'Was due today' : `${over} day${over === 1 ? '' : 's'} overdue`
  }
  if (days === 0) return 'Due today'
  if (days === 1) return 'Due tomorrow'
  if (days < 7) return `Due ${due.toLocaleDateString('en-US', { weekday: 'short' })}`
  return `Due ${due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
}

export const NEW_REPORT_DAYS = 7

/** The homepage strip: the next open work (up to `max`) and reports from the last week. */
export function homeStrip<A extends StudentAssignment, R extends StudentReport>(assignments: A[], reports: R[], now = new Date(), max = 2) {
  const open = openWork(assignments)
  const fresh = reports.filter((r) => now.getTime() - Date.parse(r.createdAt) < NEW_REPORT_DAYS * DAY)
  return { next: open.slice(0, max), moreOpen: Math.max(0, open.length - max), openCount: open.length, newReports: fresh }
}
