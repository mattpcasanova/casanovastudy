// What the teacher home (/teach) puts under "Waiting on you". Pure: the route
// loads the rows, this decides what is worth a line and in what order.

export interface HomeSet {
  batchId: string
  title: string | null
  className: string | null
  period: string | null
  classId: string | null
  papers: number
  average: number
  date: string
  released: boolean
  /** Papers the teacher is marking herself and hasn't finished. */
  toMark: number
  /** Answers the grader flagged that she hasn't confirmed. */
  toCheck: number
}

export interface HomePractice {
  id: string
  title: string
  className: string | null
  period: string | null
  assigned: number
  done: number
  dueAt: string | null
}

export interface Attention {
  kind: 'scans' | 'mark' | 'check' | 'release' | 'practice'
  key: string
  title: string
  detail: string
  href: string
  action: string
}

export const HOME_RULES = {
  /** A graded set nobody released is only worth a nudge while it is fresh. */
  releaseDays: 14,
  checkDays: 30,
  /** Practice due within this many hours with under `behind` of the class done. */
  practiceHours: 48,
  behind: 0.5,
  max: 6,
}

const DAY = 86400_000
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`

export function setName(s: { title: string | null; className: string | null; period: string | null }): string {
  const cls = s.className ? `${s.className}${s.period ? ` P${s.period}` : ''}` : ''
  return [s.title?.trim() || 'Untitled', cls].filter(Boolean).join(' · ')
}

/** Everything that needs the teacher, most pressing first; `more` counts what didn't fit. */
export function attentionItems(input: { scansWaiting: number; sets: HomeSet[]; practice: HomePractice[]; now?: number }, rules = HOME_RULES): { items: Attention[]; more: number } {
  const now = input.now ?? Date.now()
  const age = (s: HomeSet) => (now - Date.parse(s.date)) / DAY
  const all: Attention[] = []

  if (input.scansWaiting > 0) {
    all.push({ kind: 'scans', key: 'scans', title: `${plural(input.scansWaiting, 'scan')} waiting in your scanner inbox`, detail: 'Sent from the copier or your phone, ready to sort into papers.', href: '/grade-exam/batch', action: input.scansWaiting === 1 ? 'Grade it' : 'Grade them' })
  }
  for (const s of input.sets.filter((x) => x.toMark > 0)) {
    all.push({ kind: 'mark', key: `mark:${s.batchId}`, title: setName(s), detail: `${s.toMark} of ${plural(s.papers, 'paper')} still to mark`, href: `/grade-exam/batch/${s.batchId}`, action: 'Keep marking' })
  }
  for (const s of input.sets.filter((x) => x.toMark === 0 && x.toCheck > 0 && age(x) <= rules.checkDays)) {
    all.push({ kind: 'check', key: `check:${s.batchId}`, title: setName(s), detail: `${plural(s.toCheck, 'answer')} the grader wasn't sure it read right`, href: `/grade-exam/batch/${s.batchId}`, action: 'Check them' })
  }
  for (const s of input.sets.filter((x) => x.toMark === 0 && !x.released && x.classId && age(x) <= rules.releaseDays)) {
    all.push({ kind: 'release', key: `release:${s.batchId}`, title: setName(s), detail: `Graded, but students can't see their reports yet`, href: `/grade-exam/batch/${s.batchId}`, action: 'Release' })
  }
  for (const p of input.practice) {
    if (!p.dueAt || !p.assigned) continue
    const hours = (Date.parse(p.dueAt) - now) / 3600_000
    if (hours < 0 || hours > rules.practiceHours || p.done / p.assigned >= rules.behind) continue
    all.push({ kind: 'practice', key: `practice:${p.id}`, title: setName({ title: p.title, className: p.className, period: p.period }), detail: `Due ${hours <= 24 ? 'within a day' : 'in 2 days'}: ${p.done} of ${p.assigned} done`, href: `/teacher/practice/${p.id}`, action: "See who's left" })
  }
  return { items: all.slice(0, rules.max), more: Math.max(0, all.length - rules.max) }
}
