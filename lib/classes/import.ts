// Importing class lists from a gradebook export (CSV/TSV, or columns pasted
// from a spreadsheet). One file can hold every class: rows are grouped by the
// course and period columns when there are any. Pure; unit-tested.

import { fullName, normalizeName, parseName } from '@/lib/grading/names'

export interface ImportedStudent {
  firstName: string
  lastName: string
  studentNumber?: string
}

export interface ImportedClass {
  name: string
  period: string | null
  students: ImportedStudent[]
}

/** RFC 4180-ish CSV: quoted fields, "" escapes, commas/newlines inside quotes. Tabs work as the separator too. */
export function parseDelimited(text: string): string[][] {
  const src = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n')
  const firstLine = src.split('\n', 1)[0] ?? ''
  const sep = firstLine.includes('\t') ? '\t' : firstLine.includes(';') && !firstLine.includes(',') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let quoted = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') quoted = false
      else field += c
    } else if (c === '"' && field === '') quoted = true
    else if (c === sep) { row.push(field.trim()); field = '' }
    else if (c === '\n') { row.push(field.trim()); rows.push(row); row = []; field = '' }
    else field += c
  }
  if (field || row.length) { row.push(field.trim()); rows.push(row) }
  return rows.filter((r) => r.some((c) => c))
}

type Column = 'first' | 'last' | 'name' | 'id' | 'period' | 'course'

function columnKind(header: string): Column | null {
  const h = header.toLowerCase().replace(/[^a-z0-9 #]/g, ' ').replace(/\s+/g, ' ').trim()
  if (/^(student )?first( name)?$|^given name$|^first$/.test(h)) return 'first'
  if (/^(student )?(last|sur|family)( ?name)?$/.test(h)) return 'last'
  if (/^(student )?(full )?name$|^student$|^name last first$|^last first$/.test(h)) return 'name'
  if (/^(student )?(id|number|no|#|id number|student number|local id|sis id)$|^student id$/.test(h)) return 'id'
  if (/^(period|per|pd|block|hour|class period)$/.test(h)) return 'period'
  if (/^(course|course name|class|class name|section|course title|subject)$/.test(h)) return 'course'
  return null
}

/**
 * A class-list file → classes. With course/period columns, one class per
 * (course, period); otherwise everything is one class named `fallbackName`.
 * Rows without a name are skipped, and duplicate names within a class too.
 */
export function parseClassImport(text: string, fallbackName = 'My class'): { classes: ImportedClass[]; columns: Column[] } {
  let rows = parseDelimited(text)
  if (!rows.length) return { classes: [], columns: [] }
  // A one-column list ("Student Name" then names): commas are "Last, First", not columns.
  if (rows[0].length === 1) rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).map((l) => [l.trim().replace(/^"|"$/g, '')]).filter((r) => r[0])

  const header = rows[0].map(columnKind)
  const hasHeader = header.filter(Boolean).length > 0 && (header.includes('first') || header.includes('last') || header.includes('name'))
  const idx = (k: Column) => (hasHeader ? header.indexOf(k) : -1)
  const cols = { first: idx('first'), last: idx('last'), name: idx('name'), id: idx('id'), period: idx('period'), course: idx('course') }
  const body = hasHeader ? rows.slice(1) : rows

  const byClass = new Map<string, ImportedClass & { seen: Set<string> }>()
  for (const r of body) {
    let student: ImportedStudent
    if (cols.first >= 0 || cols.last >= 0) {
      student = { firstName: r[cols.first] ?? '', lastName: r[cols.last] ?? '' }
    } else if (cols.name >= 0) {
      student = parseName((r[cols.name] ?? '').replace(/^\s*(?:\d+[.)]|[-*•])\s*/, ''))
    } else if (!hasHeader && r.length === 2 && r.every((c) => /^[\p{L}' .-]+$/u.test(c))) {
      // Two name columns without a header: Last, First is how gradebooks export.
      student = { firstName: r[1], lastName: r[0] }
    } else {
      student = parseName((r[0] ?? '').replace(/^\s*(?:\d+[.)]|[-*•])\s*/, ''))
    }
    student = { firstName: student.firstName.trim().slice(0, 60), lastName: student.lastName.trim().slice(0, 60) }
    if (!/\p{L}/u.test(fullName(student))) continue
    if (!hasHeader && /^(student\s*)?names?:?$|^roster:?$/i.test(fullName(student))) continue
    const id = cols.id >= 0 ? (r[cols.id] ?? '').trim().slice(0, 40) : ''
    if (id) student.studentNumber = id

    const course = cols.course >= 0 ? (r[cols.course] ?? '').trim().slice(0, 100) : ''
    const period = cols.period >= 0 ? (r[cols.period] ?? '').replace(/^(period|per|pd|p)\.?\s*/i, '').trim().slice(0, 20) : ''
    const key = `${course.toLowerCase()}|${period.toLowerCase()}`
    const cls = byClass.get(key) ?? { name: course || fallbackName, period: period || null, students: [], seen: new Set<string>() }
    const nameKey = normalizeName(fullName(student))
    if (cls.seen.has(nameKey)) continue
    cls.seen.add(nameKey)
    cls.students.push(student)
    byClass.set(key, cls)
  }

  const classes = [...byClass.values()]
    .map((c) => ({ name: c.name, period: c.period, students: c.students.slice(0, 200) }))
    .sort((a, b) => a.name.localeCompare(b.name) || (a.period ?? '').localeCompare(b.period ?? '', undefined, { numeric: true }))
  return { classes: classes.slice(0, 20), columns: header.filter((c): c is Column => !!c) }
}
