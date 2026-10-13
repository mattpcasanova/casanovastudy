// A class's gradebook: students × graded sets (tests), from grading_results
// linked to the class plus the "no paper" statuses. Pure; unit-tested.

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
  batchId: string
  title: string
  date: string
  papers: number
  average: number
}

export type GradebookCell =
  | { kind: 'paper'; gradingId: string; marks: number; possible: number; pct: number; grade: string }
  | { kind: 'status'; status: string }

export interface GradebookRow {
  key: string
  rosterId: string | null
  name: string
  studentNumber: string | null
  left: boolean
  cells: Record<string, GradebookCell>
  /** Average percent over the tests this student has a paper for (exempt/absent don't count). */
  average: number | null
}

export function buildGradebook(
  papers: GradebookPaper[],
  roster: Array<{ id: string; firstName: string; lastName: string; studentNumber: string | null; left: boolean }>,
  statuses: Array<{ batchId: string; rosterId: string; status: string }>,
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
    rows.set(r.id, { key: r.id, rosterId: r.id, name: `${r.firstName} ${r.lastName}`.trim(), studentNumber: r.studentNumber, left: r.left, cells: {}, average: null })
  }
  for (const p of papers) {
    const key = p.rosterId && rows.has(p.rosterId) ? p.rosterId : `name:${p.studentName.trim().toLowerCase()}`
    const row = rows.get(key) ?? { key, rosterId: null, name: p.studentName, studentNumber: null, left: false, cells: {}, average: null }
    row.cells[p.batchId] = { kind: 'paper', gradingId: p.id, marks: p.marks, possible: p.possible, pct: p.percentage, grade: p.grade }
    rows.set(key, row)
  }
  for (const s of statuses) {
    const row = rows.get(s.rosterId)
    if (row && !row.cells[s.batchId] && tests.has(s.batchId)) row.cells[s.batchId] = { kind: 'status', status: s.status }
  }
  for (const row of rows.values()) {
    const pcts = Object.values(row.cells).flatMap((c) => (c.kind === 'paper' ? [c.pct] : []))
    row.average = pcts.length ? pcts.reduce((a, b) => a + b, 0) / pcts.length : null
  }

  return {
    tests: [...tests.values()].map(({ total, ...t }) => ({ ...t, average: t.papers ? total / t.papers : 0 })).sort((a, b) => a.date.localeCompare(b.date)),
    rows: [...rows.values()].sort((a, b) => a.name.localeCompare(b.name)),
  }
}
