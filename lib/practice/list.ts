// The teacher's list of everything she assigned (/teacher/practice) and the
// "Assigned practice" card on her home page. Pure: the loader fills the rows,
// this decides which are still open and in what order.

export interface PracticeListItem {
  id: string
  title: string
  classId: string
  className: string | null
  period: string | null
  schoolYear: string | null
  /** Students it was given to, and how many turned in a run themselves. */
  assigned: number
  done: number
  /** Mean of each student's best counted score; null until someone has one. */
  average: number | null
  dueAt: string | null
  createdAt: string
}

export const LIST_RULES = {
  /** Late work still counts, so an assignment stays open this long after its due date while someone is missing. */
  lateDays: 7,
  /** With no due date it stays open until everyone turned it in, up to this many days. */
  noDueDays: 90,
}

const DAY = 86400_000

/**
 * Open = students can still do it for a grade and the teacher may be waiting on it:
 * the due date hasn't passed; or it passed under a week ago and someone hasn't
 * turned it in; or there is no due date and someone hasn't turned it in yet.
 */
export function stillOpen(p: Pick<PracticeListItem, 'dueAt' | 'createdAt' | 'assigned' | 'done'>, now = Date.now(), rules = LIST_RULES): boolean {
  if (p.assigned <= 0) return false
  const everyone = p.done >= p.assigned
  if (p.dueAt) {
    const due = Date.parse(p.dueAt)
    if (now <= due) return true
    return !everyone && now <= due + rules.lateDays * DAY
  }
  return !everyone && now <= Date.parse(p.createdAt) + rules.noDueDays * DAY
}

/** Open work: soonest due first (overdue leads), then the ones with no due date, newest first. */
export function sortOpen<T extends Pick<PracticeListItem, 'dueAt' | 'createdAt'>>(list: T[]): T[] {
  return [...list].sort((a, b) => {
    if (a.dueAt && b.dueAt) return Date.parse(a.dueAt) - Date.parse(b.dueAt)
    if (a.dueAt || b.dueAt) return a.dueAt ? -1 : 1
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}

/** Past work: most recent first, by due date when there was one. */
export function sortPast<T extends Pick<PracticeListItem, 'dueAt' | 'createdAt'>>(list: T[]): T[] {
  const at = (p: Pick<PracticeListItem, 'dueAt' | 'createdAt'>) => Date.parse(p.dueAt ?? p.createdAt)
  return [...list].sort((a, b) => at(b) - at(a))
}

export function splitPractice<T extends PracticeListItem>(list: T[], now = Date.now()): { open: T[]; past: T[] } {
  const open: T[] = [], past: T[] = []
  for (const p of list) (stillOpen(p, now) ? open : past).push(p)
  return { open: sortOpen(open), past: sortPast(past) }
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

/** Every typed word must appear in the title or the class name (any order, accents ignored). */
export function matchesSearch(p: Pick<PracticeListItem, 'title' | 'className' | 'period'>, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = fold([p.title, p.className ?? '', p.period ? `p${p.period} period ${p.period}` : ''].join(' '))
  return words.every((w) => hay.includes(w))
}
