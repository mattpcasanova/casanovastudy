// Reminders for assigned practice: who gets one and what it says. Pure and
// unit-tested; lib/practice/reminders-server.ts loads the data and sends.
//
// The daily job runs late afternoon Eastern. An assignment "due soon" is one
// whose due date is still ahead but within the window (36 h), so work due
// tomorrow is caught the evening before. Each student who hasn't turned it in
// gets one email (not started, or started with N of M answered), and the
// teacher gets one summary. Both are sent once per assignment.

export const PRACTICE_REMINDER_RULES = {
  /** Remind when the due date is this close (hours ahead of now). */
  windowHours: 36,
  /** Due dates are shown in this zone (the pilot school's). */
  timeZone: 'America/New_York',
  /** Names listed in the teacher's email before "and N more". */
  maxNamesListed: 12,
}

/** Due later than now and within the window. */
export function dueSoon(dueAt: string | null | undefined, now = new Date()): boolean {
  if (!dueAt) return false
  const due = Date.parse(dueAt)
  if (Number.isNaN(due)) return false
  const ahead = due - now.getTime()
  return ahead > 0 && ahead <= PRACTICE_REMINDER_RULES.windowHours * 3_600_000
}

export type StudentReminderSkip = 'done' | 'not-linked' | 'already-reminded'
export type StudentReminderKind = 'not-started' | 'in-progress'

/**
 * Whether one student on a due-soon assignment should be reminded. `status` is
 * the teacher-page status (lib/practice/assignments.ts); `inProgress` their saved run.
 */
export function studentReminder(s: {
  status: string
  linked: boolean
  remindedAt: string | null
  inProgress: { answered: number; total: number } | null
}): { send: true; kind: StudentReminderKind } | { send: false; reason: StudentReminderSkip } {
  if (s.status === 'done' || s.status === 'late') return { send: false, reason: 'done' }
  if (!s.linked) return { send: false, reason: 'not-linked' }
  if (s.remindedAt) return { send: false, reason: 'already-reminded' }
  return { send: true, kind: s.inProgress && s.inProgress.answered > 0 ? 'in-progress' : 'not-started' }
}

export interface TeacherSummary {
  total: number
  done: number
  inProgress: number
  notStarted: number
  /** Students with nothing turned in, not started first, for the email. */
  names: string[]
}

/** Counts for the teacher's "due tomorrow" email. Students not linked to an account still count (they can't be emailed, but they're behind). */
export function teacherSummary(students: Array<{ name: string; status: string; inProgress: { answered: number } | null }>): TeacherSummary {
  const done = students.filter((s) => s.status === 'done' || s.status === 'late')
  const rest = students.filter((s) => !done.includes(s))
  const started = rest.filter((s) => s.inProgress && s.inProgress.answered > 0)
  const notStarted = rest.filter((s) => !started.includes(s))
  return {
    total: students.length,
    done: done.length,
    inProgress: started.length,
    notStarted: notStarted.length,
    names: [...notStarted, ...started].map((s) => s.name).filter(Boolean),
  }
}

/** "Friday, Nov 13 at 11:59 PM" in the school's time zone. */
export function formatDue(dueAt: string, timeZone = PRACTICE_REMINDER_RULES.timeZone): string {
  const d = new Date(dueAt)
  const day = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long', month: 'short', day: 'numeric' }).format(d)
  const time = new Intl.DateTimeFormat('en-US', { timeZone, hour: 'numeric', minute: '2-digit' }).format(d)
  return `${day} at ${time}`
}

/** "tomorrow" / "today" / "on Friday", relative to now in the school's time zone. */
export function dueWord(dueAt: string, now = new Date(), timeZone = PRACTICE_REMINDER_RULES.timeZone): string {
  const key = (d: Date) => {
    const [y, m, day] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-').map(Number)
    return Date.UTC(y, m - 1, day) / 86_400_000
  }
  const days = key(new Date(dueAt)) - key(now)
  if (days <= 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `on ${new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(new Date(dueAt))}`
}
