import { describe, expect, it } from 'vitest'
import { buildGradebook, type GradebookPaper } from './gradebook'
import { resultsCsvTable as practiceCsv } from './gradebook-csv'

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
    expect(sean.cells.b1).toMatchObject({ daysLate: 0 }) // late, but graded the day the set was
    expect(sean.cells.b2).not.toHaveProperty('daysLate')
  })

  it('counts days late from the day the set was first graded', () => {
    const { rows } = buildGradebook(
      [paper('g1', 'b1', 'r2', 'Ava Kim', 80, '2026-09-01T15:00:00Z'), paper('g2', 'b1', 'r1', 'Sean Miller', 70, '2026-09-04T12:00:00Z')],
      [{ id: 'r1', firstName: 'Sean', lastName: 'Miller', studentNumber: null, left: false }, { id: 'r2', firstName: 'Ava', lastName: 'Kim', studentNumber: null, left: false }],
      [{ batchId: 'b1', rosterId: 'r1', status: 'late' }],
    )
    expect(rows.find((r) => r.rosterId === 'r1')!.cells.b1).toMatchObject({ kind: 'paper', daysLate: 3 })
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
    expect(resultsCsvTable(tests, rows)).toBe('"Student ID","Student","Test average","Unit 1 (2026-09-01)"\n"","Ava Kim","","Exempt"\n"1001","Sean Miller","70.0","70.0"')
  })
})

describe('assigned practice in the gradebook', () => {
  it('adds a column per assignment, best score per student, missing when past due, with its own average', () => {
    const roster = [
      { id: 'r1', firstName: 'Ana', lastName: 'B', studentNumber: '1', left: false },
      { id: 'r2', firstName: 'Cal', lastName: 'D', studentNumber: '2', left: false },
    ]
    const papers = [{ id: 'g1', batchId: 'b1', title: 'Test 1', createdAt: '2026-10-01', rosterId: 'r1', studentName: 'Ana B', marks: 6, possible: 10, percentage: 60, grade: 'D' }]
    const { tests, rows } = buildGradebook(papers, roster, [], [
      { assignmentId: 'a1', title: 'Reteach', date: '2026-10-05', rosterId: 'r1', status: 'late', best: { correct: 9, total: 10, pct: 90 } },
      { assignmentId: 'a1', title: 'Reteach', date: '2026-10-05', rosterId: 'r2', status: 'missing', best: null },
    ])
    expect(tests.map((t) => [t.batchId, t.kind ?? 'test', t.papers, t.average])).toEqual([['b1', 'test', 1, 60], ['a1', 'practice', 1, 90]])
    const ana = rows.find((r) => r.rosterId === 'r1')!, cal = rows.find((r) => r.rosterId === 'r2')!
    expect(ana.cells.a1).toEqual({ kind: 'practice', assignmentId: 'a1', marks: 9, possible: 10, pct: 90, late: true })
    expect(ana.average).toBe(60)
    expect(ana.practiceAverage).toBe(90)
    expect(cal.cells.a1).toEqual({ kind: 'status', status: 'missing' })
    expect(practiceCsv(tests, rows).split('\n')[0]).toContain('Reteach [practice]')
  })
})

