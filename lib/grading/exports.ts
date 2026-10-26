// Score files for school gradebooks: one graded set → the file each gradebook
// imports (researched 2026-10-13; layouts follow vendor and district guides,
// and districts can differ, so the steps say what to check). Pure;
// unit-tested in exports.test.ts. Every gradebook matches students on the
// school's student ID (Moodle: email), so roster student numbers matter.

export type ExportPreset =
  | 'focus' | 'powerschool' | 'skyward-qmlativ' | 'skyward-sms' | 'infinite-campus' | 'aeries' | 'synergy'
  | 'eschool' | 'canvas' | 'schoology' | 'brightspace' | 'moodle' | 'generic'

export interface ExportRow {
  firstName: string
  lastName: string
  studentNumber: string | null
  email: string | null
  /** null when there's no paper (absent / missing / exempt). */
  marks: number | null
  possible: number | null
  pct: number | null
  status: string | null
  /** Extra credit / deductions as one line ("Study guide packet (+5%)"); gradebooks that take comments get it. */
  comment?: string | null
}

export interface ExportOptions {
  title: string
  /** Score students with a "missing" status as 0 instead of leaving them out. */
  missingAsZero?: boolean
  /** Points (default) or percent, for gradebooks that take either (`percent` on the preset). */
  scoreAs?: 'points' | 'percent'
}

interface PresetInfo {
  label: string
  /** What students are matched on. */
  needs: 'studentNumber' | 'email' | 'either'
  file: 'csv' | 'xlsx' | 'copy'
  /** The gradebook can import a percent instead of points. */
  percent?: boolean
  steps: string[] | ((opts: ExportOptions) => string[])
  build: (rows: ScoredRow[], opts: ExportOptions) => string[][]
}

interface ScoredRow extends ExportRow { score: number; percent: number; name: string; lastFirst: string }

const pts = (n: number) => (Math.round(n * 100) / 100).toString()
const pct1 = (n: number) => (Math.round(n * 10) / 10).toString()
const asPercent = (o: ExportOptions) => o.scoreAs === 'percent'
/** A Comment column only when someone has extra credit or a deduction. */
const withComments = (rows: ScoredRow[], table: string[][]): string[][] =>
  rows.some((r) => r.comment) ? [[...table[0], 'Comment'], ...table.slice(1).map((line, i) => [...line, rows[i].comment ?? ''])] : table

export const EXPORT_PRESETS: Record<ExportPreset, PresetInfo> = {
  focus: {
    label: 'Focus',
    needs: 'studentNumber',
    file: 'csv',
    percent: true,
    steps: (o) => [
      'In Focus Gradebook, create the assignment (or open it).',
      'Click the assignment\'s info icon, then Import Grades (Focus 7.4+; "Import CSV File").',
      asPercent(o)
        ? 'Choose Percent, pick the Student ID column and the Score column (it holds the percents), and import.'
        : 'Choose Points, pick the Student ID column and the Score column, and import.',
      'Student IDs must match Focus exactly. Students with no score are left out (Focus doesn\'t allow blanks).',
      'Extra credit or deductions? Scores already include them. If the import lets you pick a comment column, pick Comment; if not, copy each comment from the list below into the score\'s comment in Focus.',
    ],
    build: (rows, o) => withComments(rows, asPercent(o)
      // Header stays "Score": Focus fills its score column from that name and asks when it's "Percent".
      ? [['Student ID', 'Score'], ...rows.map((r) => [r.studentNumber ?? '', pct1(r.percent)])]
      : [['Student ID', 'Score'], ...rows.map((r) => [r.studentNumber ?? '', pts(r.score)])]),
  },
  powerschool: {
    label: 'PowerSchool (PowerTeacher Pro)',
    needs: 'studentNumber',
    file: 'csv',
    steps: [
      'In PowerTeacher Pro, create the assignment with the same points possible.',
      'Right-click the assignment header (or open it) and choose Import Scores.',
      'Format: CSV. Student ID column: 1. Score column: 2. Untick "Include First Row" and "Validate Student Names".',
      'Scores are points, not percents.',
    ],
    build: (rows) => rows.map((r) => [r.studentNumber ?? '', pts(r.score)]),
  },
  'skyward-qmlativ': {
    label: 'Skyward Qmlativ',
    needs: 'studentNumber',
    file: 'csv',
    steps: [
      'In Gradebook, open Assignment Import (your district may need to turn it on).',
      'Upload this file and match the Student ID and Score columns to your district\'s template.',
      'It can create the assignment if it doesn\'t exist yet.',
    ],
    build: (rows, o) => [['Student ID', 'Student Name', 'Assignment', 'Score', 'Max Points'], ...rows.map((r) => [r.studentNumber ?? '', r.lastFirst, o.title, pts(r.score), pts(r.possible ?? 0)])],
  },
  'skyward-sms': {
    label: 'Skyward SMS 2.0',
    needs: 'studentNumber',
    file: 'csv',
    steps: [
      'In Gradebook, open the assignment and choose Import Assignment Scores.',
      'Upload this file: Last Name, First Name, Student ID, Score.',
    ],
    build: (rows) => [['Last Name', 'First Name', 'Student ID', 'Score'], ...rows.map((r) => [r.lastName, r.firstName, r.studentNumber ?? '', pts(r.score)])],
  },
  'infinite-campus': {
    label: 'Infinite Campus',
    needs: 'studentNumber',
    file: 'copy',
    steps: [
      'Infinite Campus has no teacher file import for the classroom gradebook.',
      'Copy the scores below and paste them into the assignment\'s score column in Grade Book (students in the same order as Campus, sorted by last name).',
      'Automatic score sync (OneRoster) is something your district turns on; ask us if they want it.',
    ],
    build: (rows) => [['Student', 'Student ID', 'Score'], ...[...rows].sort((a, b) => a.lastFirst.localeCompare(b.lastFirst)).map((r) => [r.lastFirst, r.studentNumber ?? '', pts(r.score)])],
  },
  aeries: {
    label: 'Aeries',
    needs: 'studentNumber',
    file: 'csv',
    steps: [
      'In the Gradebook, open Scores by Assignment and choose Import Scores from File.',
      'Tick "Include Header?", then map Student ID and # Correct.',
    ],
    build: (rows) => [['Student ID', '# Correct'], ...rows.map((r) => [r.studentNumber ?? '', pts(r.score)])],
  },
  synergy: {
    label: 'Synergy (TeacherVUE)',
    needs: 'studentNumber',
    file: 'xlsx',
    steps: [
      'In TeacherVUE, open Gradebook, then Gradebook Import.',
      'Choose this Excel file (Synergy needs .xlsx, not CSV). Tick "Add Assignments Not Found" to create it.',
    ],
    build: (rows, o) => [['Student ID', 'Student Name', o.title], ...rows.map((r) => [r.studentNumber ?? '', r.lastFirst, pts(r.score)])],
  },
  eschool: {
    label: 'eSchoolPLUS',
    needs: 'studentNumber',
    file: 'csv',
    steps: [
      'In Teacher Access Center, open the assignment and choose Import Scores From File.',
      'Format: comma separated. Student ID is column 1, score is column 2, no header row.',
    ],
    build: (rows) => rows.map((r) => [r.studentNumber ?? '', pts(r.score)]),
  },
  canvas: {
    label: 'Canvas',
    needs: 'either',
    file: 'csv',
    steps: [
      'In Canvas Grades, choose Import and upload this file.',
      'Students are matched on SIS User ID (student ID) or SIS Login ID (email). Canvas makes the assignment if it doesn\'t exist; check the points possible after.',
    ],
    build: (rows, o) => [['Student', 'ID', 'SIS User ID', 'SIS Login ID', 'Section', o.title], ...rows.map((r) => [r.lastFirst, '', r.studentNumber ?? '', r.email ?? '', '', pts(r.score)])],
  },
  schoology: {
    label: 'Schoology',
    needs: 'studentNumber',
    file: 'csv',
    steps: [
      'In the course Gradebook, open the more menu and choose Import.',
      'Upload this file and map Unique User ID to students and the score column to the assignment.',
    ],
    build: (rows, o) => [['Unique User ID', 'Name', o.title], ...rows.map((r) => [r.studentNumber ?? '', r.lastFirst, pts(r.score)])],
  },
  brightspace: {
    label: 'Brightspace (D2L)',
    needs: 'studentNumber',
    file: 'csv',
    steps: [
      'Create the grade item in Brightspace with the same name and maximum points.',
      'In Grades, choose Import and upload this file.',
    ],
    build: (rows, o) => [['OrgDefinedId', `${o.title} Points Grade`, 'End-of-Line Indicator'], ...rows.map((r) => [r.studentNumber ? `#${r.studentNumber}` : '', pts(r.score), '#'])],
  },
  moodle: {
    label: 'Moodle',
    needs: 'email',
    file: 'csv',
    steps: [
      'Create the grade item in Moodle first.',
      'In Grades, choose Import, CSV file, and map "Email address" to the user and the score column to your grade item.',
    ],
    build: (rows, o) => [['Email address', 'ID number', o.title], ...rows.map((r) => [r.email ?? '', r.studentNumber ?? '', pts(r.score)])],
  },
  generic: {
    label: 'Other gradebook (generic)',
    needs: 'either',
    file: 'csv',
    steps: ['Most gradebooks import a file with a student ID column and a score column. Points and percent are both included.'],
    build: (rows) => withComments(rows, [['Student ID', 'Last Name', 'First Name', 'Email', 'Points', 'Out of', 'Percent'], ...rows.map((r) => [r.studentNumber ?? '', r.lastName, r.firstName, r.email ?? '', pts(r.score), pts(r.possible ?? 0), r.possible ? pts((r.score / r.possible) * 100) : ''])]),
  },
}

export const PRESET_ORDER: ExportPreset[] = ['focus', 'powerschool', 'skyward-qmlativ', 'skyward-sms', 'infinite-campus', 'aeries', 'synergy', 'eschool', 'canvas', 'schoology', 'brightspace', 'moodle', 'generic']

/**
 * Rows a gradebook gets: graded papers, plus "missing" as 0 when asked.
 * Absent and exempt students are left out (gradebooks treat blanks differently;
 * the teacher marks those there). Also counts students who can't be matched.
 */
export function exportRows(rows: ExportRow[], preset: ExportPreset, opts: ExportOptions): { rows: ScoredRow[]; unmatched: string[]; skipped: number } {
  const info = EXPORT_PRESETS[preset]
  const possible = rows.find((r) => r.possible)?.possible ?? null
  const scored: ScoredRow[] = []
  let skipped = 0
  for (const r of rows) {
    const name = `${r.firstName} ${r.lastName}`.trim()
    const lastFirst = r.lastName ? `${r.lastName}, ${r.firstName}` : r.firstName
    if (r.marks != null) scored.push({ ...r, score: r.marks, percent: r.possible ? (r.marks / r.possible) * 100 : (r.pct ?? 0), name, lastFirst })
    else if (opts.missingAsZero && r.status === 'missing') scored.push({ ...r, score: 0, percent: 0, possible: r.possible ?? possible, name, lastFirst })
    else skipped++
  }
  const has = (r: ScoredRow) => (info.needs === 'email' ? !!r.email : info.needs === 'either' ? !!(r.studentNumber || r.email) : !!r.studentNumber)
  return { rows: scored, unmatched: scored.filter((r) => !has(r)).map((r) => r.name), skipped }
}

/** The import steps for a preset (some depend on points vs percent). */
export function presetSteps(preset: ExportPreset, opts: ExportOptions): string[] {
  const steps = EXPORT_PRESETS[preset].steps
  return typeof steps === 'function' ? steps(opts) : steps
}

export function buildExport(rows: ExportRow[], preset: ExportPreset, opts: ExportOptions): { table: string[][]; unmatched: string[]; skipped: number } {
  const { rows: scored, unmatched, skipped } = exportRows(rows, preset, opts)
  return { table: EXPORT_PRESETS[preset].build(scored, opts), unmatched, skipped }
}

export function toCsv(table: string[][], { quote = true }: { quote?: boolean } = {}): string {
  return table.map((row) => row.map((v) => (quote || /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v)).join(',')).join('\r\n') + '\r\n'
}

/** Tab-separated, for pasting into a gradebook column. */
export const toTsv = (table: string[][]) => table.map((row) => row.join('\t')).join('\n')
