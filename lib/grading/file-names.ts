// "Each file is one student's paper, named after them" (Mya.pdf, Sean Miller.pdf,
// Miller_Sean_P2.pdf): read the student's name from a file name, and decide
// whether a stack looks like it follows that convention. Camera, scanner and
// generic names (IMG_1234, Scan 2026-10-13, Document, Unit 3 test) are not
// names. Pure; unit-tested.

import { splitNameAndPeriod } from './batch'
import { fullName, matchRoster, parseName, type RosterName } from './names'

const NOT_A_NAME = /\b(img|image|photo|pic|picture|scan|scanned|scans|dsc|dcim|pxl|screenshot|screen shot|document|doc|untitled|page|pages|file|copy|test|quiz|exam|unit|chapter|ch|homework|hw|worksheet|lab|final|midterm|period|class|stack|batch|answers?|key|mark scheme|rubric|whatsapp|camscanner|adobe|notes)\b/i

/** The student name a file is named after, or null if the name isn't a person's name. */
export function nameFromFileName(fileName: string): string | null {
  let base = fileName.replace(/\.[a-z0-9]{2,5}$/i, '') // extension
  base = base.replace(/\s*\(\d+\)$/, '') // "Mya (1)"
  base = base.replace(/[_.]+/g, ' ').replace(/\s*-\s*/g, ' ').replace(/\s+/g, ' ').trim()
  base = splitNameAndPeriod(base).name // "Sean Miller P2"
  if (!base || NOT_A_NAME.test(base)) return null
  if (/\d/.test(base)) return null // dates, counters, IDs
  if ((base.match(/,/g) ?? []).length > 1) return null
  base = base.replace(/\s*,\s*/, ', ') // "Miller, Sean": parseName turns it around later
  const words = base.replace(',', '').split(' ')
  if (words.length > 4 || words.some((w) => !/^[\p{L}][\p{L}'’-]*$/u.test(w))) return null
  if (base.length < 2) return null
  // "miller sean" stays as written; "Miller, Sean" is handled by parseName later.
  return base
}

/**
 * Should a stack be treated as one student per file? Yes when there are 2+
 * files and most of them are named like people (or match the class roster).
 */
export function looksLikeOnePerFile(fileNames: string[], roster: RosterName[] = []): boolean {
  if (fileNames.length < 2) return false
  const named = fileNames.filter((f) => {
    const n = nameFromFileName(f)
    if (!n) return false
    return !roster.length || matchRoster(n, roster).confidence !== 'none' || n.split(' ').length <= 3
  })
  return named.length / fileNames.length >= 0.6
}

/** The name to use for a file: the roster's spelling when it confidently matches. */
export function studentNameForFile(fileName: string, roster: RosterName[] = []): string | null {
  const n = nameFromFileName(fileName)
  if (!n) return null
  const m = matchRoster(n, roster)
  const row = m.confidence === 'sure' ? roster.find((r) => r.id === m.rosterId) : undefined
  return row ? fullName(row) : fullName(parseName(n))
}
