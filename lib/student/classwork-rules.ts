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

export type StripItem<A> = { kind: 'practice'; a: A } | { kind: 'test'; t: MissingTest }

/** The homepage strip: overdue practice, then tests not turned in, then upcoming practice (up to `max`), plus reports from the last week. */
export function homeStrip<A extends StudentAssignment, R extends StudentReport>(assignments: A[], reports: R[], now = new Date(), max = 2, tests: MissingTest[] = []) {
  const open = openWork(assignments)
  const items: StripItem<A>[] = [
    ...open.filter((a) => a.status === 'missing').map((a) => ({ kind: 'practice' as const, a })),
    ...tests.map((t) => ({ kind: 'test' as const, t })),
    ...open.filter((a) => a.status !== 'missing').map((a) => ({ kind: 'practice' as const, a })),
  ]
  const fresh = reports.filter((r) => now.getTime() - Date.parse(r.createdAt) < NEW_REPORT_DAYS * DAY)
  return { next: items.slice(0, max), moreOpen: Math.max(0, items.length - max), openCount: items.length, newReports: fresh }
}

export interface MissingTest { batchId: string; title: string; classId: string; firstGraded: string; status: string | null; /** Set when the set came from a Google Classroom assignment. */ classroomUrl?: string | null }

/**
 * Graded tests in the student's classes they have no paper for. Shown once the
 * set's first paper is 12+ hours old (so a stack still being graded doesn't
 * flag everyone), or straight away when the teacher marked them missing/absent.
 * Exempt never shows; a paper (even late) means it's handed in.
 */
export function missingTests(
  papers: Array<{ batchId: string; classId: string; title: string | null; createdAt: string; rosterId: string | null }>,
  myRosterIds: Set<string>,
  statuses: Array<{ batchId: string; status: string }>,
  now = new Date(),
): MissingTest[] {
  const sets = new Map<string, { title: string | null; classId: string; first: string; mine: boolean }>()
  for (const p of papers) {
    const s = sets.get(p.batchId) ?? { title: p.title, classId: p.classId, first: p.createdAt, mine: false }
    if (p.createdAt < s.first) s.first = p.createdAt
    if (!s.title && p.title) s.title = p.title
    if (p.rosterId && myRosterIds.has(p.rosterId)) s.mine = true
    sets.set(p.batchId, s)
  }
  const statusOf = new Map(statuses.map((s) => [s.batchId, s.status]))
  const out: MissingTest[] = []
  for (const [batchId, s] of sets) {
    const status = statusOf.get(batchId) ?? null
    if (s.mine || status === 'exempt' || status === 'late') continue
    const settled = now.getTime() - Date.parse(s.first) >= 12 * 60 * 60 * 1000
    if (!settled && status !== 'missing' && status !== 'absent') continue
    out.push({ batchId, title: s.title || 'Graded test', classId: s.classId, firstGraded: s.first, status })
  }
  return out.sort((a, b) => b.firstGraded.localeCompare(a.firstGraded))
}
