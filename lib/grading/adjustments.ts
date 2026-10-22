// Extra credit and deductions on graded papers (migration 069): "+5% for the
// study guide packet", "-10% per day late", accommodations. Stored per paper
// in grading_results.adjustments; one applied to several students shares an
// id, so the class results page can edit or remove it for all of them.
// The question marks (grade_breakdown) stay as graded; total_marks /
// percentage / grade include the adjustments, so the gradebook, exports, My
// Reports and the student see the final score. Pure; unit-tested.

import { gradeFor, percentOf, type GradeScale } from './scale'

export interface GradeAdjustment {
  id: string
  kind: 'extra' | 'deduct'
  /** Always positive; `kind` gives the direction. */
  amount: number
  /** percent = percentage points of the whole test (5% of a 40-mark test = 2 marks). */
  unit: 'percent' | 'marks'
  /** Why, in the teacher's words. Students see it; it goes in the gradebook comment. */
  reason: string
  /** Set for late penalties made with the per-day helper. */
  late?: { days: number; perDay: number }
}

export const MAX_ADJUSTMENTS = 10

const round2 = (n: number) => Math.round(n * 100) / 100

export function normalizeAdjustments(input: unknown): GradeAdjustment[] {
  if (!Array.isArray(input)) return []
  const out: GradeAdjustment[] = []
  for (const raw of input.slice(0, MAX_ADJUSTMENTS)) {
    if (!raw || typeof raw !== 'object') continue
    const a = raw as Record<string, unknown>
    const id = String(a.id ?? '').trim().slice(0, 40)
    const amount = Number(a.amount)
    if (!/^[\w-]{4,40}$/.test(id) || !Number.isFinite(amount) || amount <= 0 || amount > 1000) continue
    const adj: GradeAdjustment = {
      id,
      kind: a.kind === 'deduct' ? 'deduct' : 'extra',
      amount: round2(amount),
      unit: a.unit === 'marks' ? 'marks' : 'percent',
      reason: String(a.reason ?? '').trim().slice(0, 300),
    }
    const late = a.late as { days?: unknown; perDay?: unknown } | undefined
    if (late && Number.isInteger(Number(late.days)) && Number(late.days) > 0 && Number(late.perDay) > 0) {
      adj.late = { days: Number(late.days), perDay: round2(Number(late.perDay)) }
    }
    out.push(adj)
  }
  return out
}

/** Signed marks this adjustment adds (+) or takes off (-) on a test out of `possible`. */
export function adjustmentMarks(a: GradeAdjustment, possible: number): number {
  const size = a.unit === 'marks' ? a.amount : (a.amount / 100) * possible
  return round2(a.kind === 'deduct' ? -size : size)
}

/**
 * The final score: the graded marks plus every adjustment, never below 0
 * (extra credit may go above the total, like in a gradebook).
 */
export function adjustedTotals(rawMarks: number, possible: number, adjustments: GradeAdjustment[], scale?: GradeScale | null) {
  const change = round2(adjustments.reduce((s, a) => s + adjustmentMarks(a, possible), 0))
  const marks = Math.max(0, round2(rawMarks + change))
  return { rawMarks, marks, possible, change, percentage: percentOf(marks, possible), grade: gradeFor(scale ?? null, marks, possible) }
}

const num = (n: number) => (Number.isInteger(n) ? String(n) : String(round2(n)))

/** "+5%", "-2 marks" */
export function adjustmentAmountText(a: Pick<GradeAdjustment, 'kind' | 'amount' | 'unit'>): string {
  const sign = a.kind === 'deduct' ? '-' : '+'
  return a.unit === 'percent' ? `${sign}${num(a.amount)}%` : `${sign}${num(a.amount)} mark${a.amount === 1 ? '' : 's'}`
}

/** One line per adjustment, as the student and the gradebook see it: "Study guide packet (+5%)". */
export function adjustmentLine(a: GradeAdjustment): string {
  const reason = a.reason || (a.kind === 'extra' ? 'Extra credit' : 'Points taken off')
  return `${reason} (${adjustmentAmountText(a)})`
}

/** The gradebook comment for a student: every adjustment's line, or '' when there are none. */
export function gradebookComment(adjustments: GradeAdjustment[]): string {
  return adjustments.map(adjustmentLine).join('; ')
}

/** A late penalty from the per-day helper: 2 days at 10% a day = -20%. */
export function lateAdjustment(id: string, days: number, perDay: number, reason?: string): GradeAdjustment {
  return {
    id,
    kind: 'deduct',
    amount: round2(days * perDay),
    unit: 'percent',
    reason: reason?.trim() || `Late: ${days} day${days === 1 ? '' : 's'}`,
    late: { days, perDay },
  }
}

/** What stays on a paper when `adjustment` goes on it: a paper is only late once, so a new late penalty replaces the old one. */
export function keptWith(existing: GradeAdjustment[], adjustment: GradeAdjustment): GradeAdjustment[] {
  return existing.filter((a) => a.id !== adjustment.id && !(adjustment.late && a.late))
}

/** Put one adjustment on exactly these papers: added or updated where chosen, removed elsewhere. */
export function withAdjustment<T extends { id: string; adjustments: GradeAdjustment[] }>(papers: T[], adjustment: GradeAdjustment, chosen: Set<string>): Array<{ id: string; adjustments: GradeAdjustment[]; changed: boolean }> {
  return papers.map((p) => {
    const had = p.adjustments.some((a) => a.id === adjustment.id)
    if (chosen.has(p.id)) {
      const kept = keptWith(p.adjustments, adjustment)
      const at = p.adjustments.findIndex((a) => a.id === adjustment.id)
      const next = at >= 0 ? [...kept.slice(0, at), adjustment, ...kept.slice(at)] : [...kept, adjustment]
      return { id: p.id, adjustments: next.slice(0, MAX_ADJUSTMENTS), changed: true }
    }
    const rest = p.adjustments.filter((a) => a.id !== adjustment.id)
    return { id: p.id, adjustments: rest, changed: had }
  })
}

/** Each distinct adjustment across a class set, with the papers that have it (for the results page). */
export function adjustmentGroups<T extends { id: string; adjustments: GradeAdjustment[] }>(papers: T[]): Array<{ adjustment: GradeAdjustment; paperIds: string[] }> {
  const groups = new Map<string, { adjustment: GradeAdjustment; paperIds: string[] }>()
  for (const p of papers) {
    for (const a of p.adjustments) {
      const g = groups.get(a.id) ?? { adjustment: a, paperIds: [] }
      g.paperIds.push(p.id)
      groups.set(a.id, g)
    }
  }
  return [...groups.values()]
}
