// Gradebook as CSV: Student ID, Student, then each test's percent (and
// status words where there's no paper). Pure; unit-tested.

import type { GradebookRow, GradebookTest } from './gradebook'

export function resultsCsvTable(tests: GradebookTest[], rows: GradebookRow[]): string {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  const practice = tests.some((t) => t.kind === 'practice')
  const head = ['Student ID', 'Student', 'Test average', ...(practice ? ['Practice average'] : []), ...tests.map((t) => `${t.title}${t.kind === 'practice' ? ' [practice]' : ''} (${t.date.slice(0, 10)})`)]
  const body = rows.map((r) => [
    r.studentNumber ?? '',
    r.name,
    r.average === null ? '' : r.average.toFixed(1),
    ...(practice ? [r.practiceAverage === null ? '' : r.practiceAverage.toFixed(1)] : []),
    ...tests.map((t) => {
      const c = r.cells[t.batchId]
      if (!c) return ''
      return c.kind === 'status' ? c.status[0].toUpperCase() + c.status.slice(1) : c.pct.toFixed(1)
    }),
  ])
  return [head, ...body].map((row) => row.map(q).join(',')).join('\n')
}
