// What a student in a class sees (pure, unit-tested): which assigned work is
// open, what the homepage strip shows, and friendly due labels.

export interface StudentAssignment {
  id: string
  title: string
  status: string // done | late | missing | not_started | incomplete
  dueAt: string | null
  daysLate?: number
}

export interface StudentReport { id: string; title: string; createdAt: string }

const DAY = 24 * 60 * 60 * 1000
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()

/** Still open for the student: not started, missing, or sent unfinished at the due date (finishing still counts). */
export const isOpenWork = (status: string) => status === 'not_started' || status === 'missing' || status === 'incomplete'
const overdue = (status: string) => status === 'missing' || status === 'incomplete'

/** Still to do: overdue first (missing, then sent unfinished), then by due date, undated last. */
export function openWork<T extends StudentAssignment>(list: T[]): T[] {
  return list
    .filter((a) => isOpenWork(a.status))
    .sort((a, b) => (overdue(a.status) ? 0 : 1) - (overdue(b.status) ? 0 : 1) || (a.dueAt ?? '9').localeCompare(b.dueAt ?? '9'))
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

interface Dated { id: string; createdAt: string }

export const STRIP_RULES = { cards: 4, todo: 2, newDays: 7, reportDays: 30 }

export type StripCard<A, R, S, M> =
  | { kind: 'practice'; a: A }
  | { kind: 'test'; t: MissingTest }
  | { kind: 'report'; r: R }
  | { kind: 'material'; m: M }
  | { kind: 'shared'; g: S }

/**
 * The homepage strip, up to four cards: what to do next (overdue practice,
 * tests not turned in, upcoming practice; two of them, more when there is
 * room), then reports the student hasn't opened yet (graded in the last 30
 * days: a teacher may release a set well after grading it), then class
 * materials and shared guides from the last week, newest first.
 */
export function stripCards<A extends StudentAssignment, R extends StudentReport, S extends Dated, M extends Dated>(input: {
  assignments: A[]; reports: R[]; tests?: MissingTest[]; shared?: S[]; materials?: M[]; seenReports?: string[]; now?: Date
}) {
  const now = (input.now ?? new Date()).getTime()
  const within = (iso: string, days: number) => now - Date.parse(iso) < days * DAY
  const newest = <T extends Dated>(list: T[]) => [...list].sort((x, y) => y.createdAt.localeCompare(x.createdAt))
  const open = openWork(input.assignments)
  const todo: StripCard<A, R, S, M>[] = [
    ...open.filter((a) => a.status === 'missing').map((a) => ({ kind: 'practice' as const, a })),
    ...(input.tests ?? []).map((t) => ({ kind: 'test' as const, t })),
    ...open.filter((a) => a.status !== 'missing').map((a) => ({ kind: 'practice' as const, a })),
  ]
  const seen = new Set(input.seenReports ?? [])
  const reports = newest(input.reports.filter((r) => !seen.has(r.id) && within(r.createdAt, STRIP_RULES.reportDays))).map((r) => ({ kind: 'report' as const, r }))
  const fromTeacher = [
    ...(input.materials ?? []).filter((m) => within(m.createdAt, STRIP_RULES.newDays)).map((m) => ({ kind: 'material' as const, m, at: m.createdAt })),
    ...(input.shared ?? []).filter((g) => within(g.createdAt, STRIP_RULES.newDays)).map((g) => ({ kind: 'shared' as const, g, at: g.createdAt })),
  ].sort((x, y) => y.at.localeCompare(x.at)).map((c): StripCard<A, R, S, M> => (c.kind === 'material' ? { kind: c.kind, m: c.m } : { kind: c.kind, g: c.g }))
  const rest = [...reports, ...fromTeacher]
  const restShown = Math.min(rest.length, STRIP_RULES.cards - Math.min(todo.length, STRIP_RULES.todo))
  const todoShown = Math.min(todo.length, STRIP_RULES.cards - restShown)
  const reportsShown = Math.min(reports.length, restShown)
  return {
    cards: [...todo.slice(0, todoShown), ...rest.slice(0, restShown)],
    openCount: todo.length,
    more: { open: todo.length - todoShown, reports: reports.length - reportsShown, fromTeacher: fromTeacher.length - (restShown - reportsShown) },
  }
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
