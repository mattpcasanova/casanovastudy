// A class's gradebook: students × graded sets (tests), from grading_results
// linked to the class plus the "no paper" statuses. Pure; unit-tested.

import { paperDaysLate } from '@/lib/grading/late'
import { compareNames, parseName } from '@/lib/grading/names'

export interface GradebookPaper {
  id: string
  batchId: string
  title: string | null
  createdAt: string
  rosterId: string | null
  studentName: string
  marks: number
  possible: number
  percentage: number
  grade: string
}

export interface GradebookTest {
  /** The graded set's batch id, or the assignment id for assigned practice. */
  batchId: string
  title: string
  date: string
  papers: number
  average: number
  /** Assigned practice (scores from practice_attempts) rather than a graded test. */
  kind?: 'practice'
}

/** One student's standing on one assigned practice (lib/practice). */
export interface GradebookPractice {
  assignmentId: string
  title: string
  date: string
  rosterId: string
  status: string
  best: { correct: number; total: number; pct: number } | null
  /** Days past the due date (late or missing); 0 otherwise. */
  daysLate?: number
}

export type GradebookCell =
  | { kind: 'paper'; gradingId: string; marks: number; possible: number; pct: number; grade: string; /** Set when the paper came in late (0 = same day as the set). */ daysLate?: number }
  | { kind: 'status'; status: string; daysLate?: number }
  | { kind: 'practice'; assignmentId: string; marks: number; possible: number; pct: number; late: boolean; daysLate?: number; /** Never finished: what they had answered was sent at the due date. */ incomplete?: boolean }

export interface GradebookRow {
  key: string
  rosterId: string | null
  name: string
  firstName: string
  lastName: string
  studentNumber: string | null
  left: boolean
  cells: Record<string, GradebookCell>
  /** Average percent over the tests this student has a paper for (exempt/absent don't count). Tests only. */
  average: number | null
  /** Average of their best scores on assigned practice, kept apart from tests. */
  practiceAverage: number | null
}

export function buildGradebook(
  papers: GradebookPaper[],
  roster: Array<{ id: string; firstName: string; lastName: string; studentNumber: string | null; left: boolean }>,
  statuses: Array<{ batchId: string; rosterId: string; status: string }>,
  practice: GradebookPractice[] = [],
): { tests: GradebookTest[]; rows: GradebookRow[] } {
  const tests = new Map<string, GradebookTest & { total: number }>()
  for (const p of papers) {
    const t = tests.get(p.batchId) ?? { batchId: p.batchId, title: p.title || 'Untitled', date: p.createdAt, papers: 0, average: 0, total: 0 }
    t.papers += 1
    t.total += p.percentage
    if (p.createdAt < t.date) t.date = p.createdAt
    tests.set(p.batchId, t)
  }

  const rows = new Map<string, GradebookRow>()
  for (const r of roster) {
    rows.set(r.id, { key: r.id, rosterId: r.id, name: `${r.firstName} ${r.lastName}`.trim(), firstName: r.firstName, lastName: r.lastName, studentNumber: r.studentNumber, left: r.left, cells: {}, average: null, practiceAverage: null })
  }
  // A late paper (the student was marked absent/missing first): days after the set was first graded.
  const lateKeys = new Set(statuses.filter((s) => s.status === 'late').map((s) => `${s.batchId}|${s.rosterId}`))
  for (const p of papers) {
    const key = p.rosterId && rows.has(p.rosterId) ? p.rosterId : `name:${p.studentName.trim().toLowerCase()}`
    const row = rows.get(key) ?? { key, rosterId: null, name: p.studentName, ...parseName(p.studentName), studentNumber: null, left: false, cells: {}, average: null, practiceAverage: null }
    const isLate = !!p.rosterId && lateKeys.has(`${p.batchId}|${p.rosterId}`)
    // daysLate present = late; 0 = graded the same day as the set.
    row.cells[p.batchId] = { kind: 'paper', gradingId: p.id, marks: p.marks, possible: p.possible, pct: p.percentage, grade: p.grade, ...(isLate ? { daysLate: paperDaysLate(tests.get(p.batchId)?.date, p.createdAt) } : {}) }
    rows.set(key, row)
  }
  for (const s of statuses) {
    const row = rows.get(s.rosterId)
    if (row && !row.cells[s.batchId] && tests.has(s.batchId)) row.cells[s.batchId] = { kind: 'status', status: s.status }
  }
  // Assigned practice: a column per assignment, best counted attempt per student.
  for (const p of practice) {
    const t = tests.get(p.assignmentId) ?? { batchId: p.assignmentId, title: p.title || 'Practice', date: p.date, papers: 0, average: 0, total: 0, kind: 'practice' as const }
    tests.set(p.assignmentId, t)
    const row = rows.get(p.rosterId)
    if (!row) continue
    if (p.best) {
      t.papers += 1
      t.total += p.best.pct
      row.cells[p.assignmentId] = { kind: 'practice', assignmentId: p.assignmentId, marks: p.best.correct, possible: p.best.total, pct: p.best.pct, late: p.status === 'late', ...(p.daysLate ? { daysLate: p.daysLate } : {}), ...(p.status === 'incomplete' ? { incomplete: true } : {}) }
    } else if (p.status === 'missing') {
      row.cells[p.assignmentId] = { kind: 'status', status: 'missing', ...(p.daysLate ? { daysLate: p.daysLate } : {}) }
    } else if (p.status === 'not_started') {
      // Assigned, nothing turned in, not due yet (or no due date).
      row.cells[p.assignmentId] = { kind: 'status', status: 'not_started' }
    }
  }
  for (const row of rows.values()) {
    const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)
    row.average = mean(Object.values(row.cells).flatMap((c) => (c.kind === 'paper' ? [c.pct] : [])))
    row.practiceAverage = mean(Object.values(row.cells).flatMap((c) => (c.kind === 'practice' ? [c.pct] : [])))
  }

  return {
    tests: [...tests.values()].map(({ total, ...t }) => ({ ...t, average: t.papers ? total / t.papers : 0 })).sort((a, b) => a.date.localeCompare(b.date)),
    rows: [...rows.values()].sort((a, b) => compareNames(a, b, 'last')),
  }
}
