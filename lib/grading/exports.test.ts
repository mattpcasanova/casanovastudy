import JSZip from 'jszip'
import { describe, expect, it } from 'vitest'
import { buildExport, presetSteps, PRESET_ORDER, toCsv, toTsv, type ExportRow } from './exports'
import { toXlsx } from './xlsx'

const rows: ExportRow[] = [
  { firstName: 'Sean', lastName: 'Miller', studentNumber: '01001', email: 'sean@school.org', marks: 8.5, possible: 10, pct: 85, status: null },
  { firstName: 'Ava', lastName: 'Kim', studentNumber: null, email: 'ava@school.org', marks: 6, possible: 10, pct: 60, status: 'late' },
  { firstName: 'Zed', lastName: 'Ortiz', studentNumber: '1003', email: null, marks: null, possible: null, pct: null, status: 'missing' },
  { firstName: 'Lia', lastName: 'Fox', studentNumber: '1004', email: null, marks: null, possible: null, pct: null, status: 'exempt' },
]

describe('buildExport', () => {
  it('Focus: ID + points, blanks left out, students with no ID flagged and kept out of the file', () => {
    const out = buildExport(rows, 'focus', { title: 'Unit 3' })
    expect(out.table).toEqual([['Student ID', 'Score'], ['01001', '8.5']])
    expect(out.unmatched).toEqual(['Ava Kim'])
    expect(out.skipped).toBe(2)
  })
  it('Focus can take a percent instead of points', () => {
    const out = buildExport([...rows, { firstName: 'Bo', lastName: 'Li', studentNumber: '1005', email: null, marks: 2, possible: 3, pct: 66.7, status: null }], 'focus', { title: 'Unit 3', scoreAs: 'percent', missingAsZero: true })
    expect(out.table).toEqual([['Student ID', 'Score'], ['01001', '85'], ['1003', '0'], ['1005', '66.7']])
    expect(presetSteps('focus', { title: 'Unit 3', scoreAs: 'percent' }).join(' ')).toContain('Choose Percent')
    expect(presetSteps('focus', { title: 'Unit 3' }).join(' ')).toContain('Choose Points')
  })
  it('Focus adds a Comment column only when someone has extra credit or a deduction', () => {
    const withComment = rows.map((r, i) => (i === 0 ? { ...r, comment: 'Study guide packet (+5%)' } : r))
    expect(buildExport(withComment, 'focus', { title: 'Unit 3' }).table).toEqual([['Student ID', 'Score', 'Comment'], ['01001', '8.5', 'Study guide packet (+5%)']])
    expect(buildExport(withComment, 'generic', { title: 'Unit 3' }).table[0].at(-1)).toBe('Comment')
    expect(buildExport(withComment, 'powerschool', { title: 'Unit 3' }).table[0]).toEqual(['01001', '8.5'])
  })
  it('missing can count as zero', () => {
    const out = buildExport(rows, 'powerschool', { title: 'Unit 3', missingAsZero: true })
    expect(out.table).toEqual([['01001', '8.5'], ['1003', '0']])
  })
  it('Moodle matches on email; Canvas on either', () => {
    expect(buildExport(rows, 'moodle', { title: 'Unit 3' }).unmatched).toEqual([])
    expect(buildExport(rows, 'canvas', { title: 'Unit 3' }).table[0]).toEqual(['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section', 'Unit 3'])
  })
  it('every preset builds', () => {
    for (const p of PRESET_ORDER) expect(buildExport(rows, p, { title: 'T' }).table.length).toBeGreaterThan(0)
  })
  it('CSV quoting, TSV for pasting', () => {
    expect(toCsv([['a', 'b,c']])).toBe('"a","b,c"\r\n')
    expect(toCsv([['01001', '8.5']], { quote: false })).toBe('01001,8.5\r\n')
    expect(toTsv([['Miller, Sean', '8.5']])).toBe('Miller, Sean\t8.5')
  })
})

describe('toXlsx', () => {
  it('writes a readable workbook with leading-zero IDs kept as text', async () => {
    const bytes = await toXlsx([['Student ID', 'Score'], ['01001', '8.5']])
    const zip = await JSZip.loadAsync(bytes)
    const sheet = await zip.file('xl/worksheets/sheet1.xml')!.async('string')
    expect(sheet).toContain('<t xml:space="preserve">01001</t>')
    expect(sheet).toContain('<c r="B2"><v>8.5</v></c>')
  })
})
