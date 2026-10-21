// Late test papers (pure, unit-tested): a paper is late when the teacher marked
// that student absent/missing on the set and it was graded afterwards (the
// status flips to 'late'). Days count from the set's first graded paper, so 0
// means it came in the same day (calendar days, Eastern time).

const easternDay = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' })

/** Calendar days (Eastern) from the set's first graded paper to this one; 0 = same day. */
export function paperDaysLate(first: string | null | undefined, at: string | null | undefined): number {
  if (!first || !at) return 0
  const a = Date.parse(easternDay.format(new Date(first)))
  const b = Date.parse(easternDay.format(new Date(at)))
  return Number.isFinite(a) && Number.isFinite(b) && b > a ? Math.round((b - a) / 86400000) : 0
}

export interface LatePaper { id: string; batch_id: string | null; roster_id: string | null; created_at: string }
export interface LateStatus { batch_id: string; roster_id: string; status: string }

/** Earliest graded date per set. */
export function firstGradedBySet(papers: Array<{ batch_id: string | null; created_at: string }>): Map<string, string> {
  const first = new Map<string, string>()
  for (const p of papers) {
    if (!p.batch_id) continue
    const cur = first.get(p.batch_id)
    if (!cur || p.created_at < cur) first.set(p.batch_id, p.created_at)
  }
  return first
}

/** Result id → days late, for late papers only. `first` defaults to the sets' earliest paper among `papers`. */
export function lateDaysByPaper(papers: LatePaper[], statuses: LateStatus[], first = firstGradedBySet(papers)): Map<string, number> {
  const late = new Set(statuses.filter((s) => s.status === 'late').map((s) => `${s.batch_id}|${s.roster_id}`))
  const out = new Map<string, number>()
  for (const p of papers) {
    if (!p.batch_id || !p.roster_id || !late.has(`${p.batch_id}|${p.roster_id}`)) continue
    out.set(p.id, paperDaysLate(first.get(p.batch_id), p.created_at))
  }
  return out
}

/** "Late", "Late · 1 day", "Late · 3 days". */
export function lateLabel(days: number): string {
  return days > 0 ? `Late · ${days} day${days === 1 ? '' : 's'}` : 'Late'
}
