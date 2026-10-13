import { describe, expect, it } from 'vitest'
import { buildGradebook, type GradebookPaper } from './gradebook'

const paper = (id: string, batchId: string, rosterId: string | null, studentName: string, pct: number, createdAt: string): GradebookPaper =>
  ({ id, batchId, title: batchId === 'b1' ? 'Unit 1' : 'Unit 2', createdAt, rosterId, studentName, marks: pct / 10, possible: 10, percentage: pct, grade: '' })

describe('buildGradebook', () => {
  it('lays out students × tests with statuses, unmatched papers and averages', () => {
    const roster = [
      { id: 'r1', firstName: 'Sean', lastName: 'Miller', studentNumber: '1001', left: false },
      { id: 'r2', firstName: 'Ava', lastName: 'Kim', studentNumber: null, left: true },
    ]
    const { tests, rows } = buildGradebook(
      [paper('g1', 'b2', 'r1', 'Sean Miller', 90, '2026-10-01'), paper('g2', 'b1', 'r1', 'Sean Miller', 70, '2026-09-01'), paper('g3', 'b1', null, 'Zed Ortiz', 50, '2026-09-01')],
      roster,
      [{ batchId: 'b2', rosterId: 'r2', status: 'absent' }, { batchId: 'b1', rosterId: 'r1', status: 'late' }],
    )
    expect(tests.map((t) => [t.title, t.papers, t.average])).toEqual([['Unit 1', 2, 60], ['Unit 2', 1, 90]])
    expect(rows.map((r) => r.name)).toEqual(['Ava Kim', 'Sean Miller', 'Zed Ortiz'])
    const sean = rows[1]
    expect(sean.average).toBe(80)
    expect(sean.cells.b1).toMatchObject({ kind: 'paper', pct: 70 }) // a paper wins over its "late" status
    expect(rows[0]).toMatchObject({ left: true, average: null, cells: { b2: { kind: 'status', status: 'absent' } } })
    expect(rows[2]).toMatchObject({ rosterId: null, average: 50 })
  })
})

describe('resultsCsvTable', () => {
  it('writes IDs, averages, percents and statuses', async () => {
    const { resultsCsvTable } = await import('./gradebook-csv')
    const { tests, rows } = buildGradebook(
      [paper('g1', 'b1', 'r1', 'Sean Miller', 70, '2026-09-01T10:00:00Z')],
      [{ id: 'r1', firstName: 'Sean', lastName: 'Miller', studentNumber: '1001', left: false }, { id: 'r2', firstName: 'Ava', lastName: 'Kim', studentNumber: null, left: false }],
      [{ batchId: 'b1', rosterId: 'r2', status: 'exempt' }],
    )
    expect(resultsCsvTable(tests, rows)).toBe('"Student ID","Student","Average","Unit 1 (2026-09-01)"\n"","Ava Kim","","Exempt"\n"1001","Sean Miller","70.0","70.0"')
  })
})
