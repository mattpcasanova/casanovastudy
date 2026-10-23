// Student names on graded papers: splitting a written name into first/last,
// matching a handwriting read against a class roster, and deciding whether two
// reads are the same student (so "Sean Millr" on page 2 doesn't start a new
// paper). Pure; unit-tested in names.test.ts.

import { levenshtein } from '@/lib/text/levenshtein'

export interface RosterName {
  id: string
  firstName: string
  lastName: string
}

export type MatchConfidence = 'sure' | 'check' | 'none'

export interface RosterMatch {
  rosterId: string | null
  score: number
  confidence: MatchConfidence
}

export function normalizeName(raw: string): string {
  return raw
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z' -]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** "Miller, Sean" → Sean / Miller; "Mary Ann Lee" → Mary Ann / Lee; "Sean" → Sean / "". */
export function parseName(raw: string): { firstName: string; lastName: string } {
  const clean = raw.replace(/\s+/g, ' ').trim()
  if (!clean) return { firstName: '', lastName: '' }
  const comma = clean.match(/^([^,]+),\s*(.+)$/)
  if (comma) return { firstName: comma[2].trim(), lastName: comma[1].trim() }
  const parts = clean.split(' ')
  if (parts.length === 1) return { firstName: parts[0], lastName: '' }
  return { firstName: parts.slice(0, -1).join(' '), lastName: parts[parts.length - 1] }
}

export const fullName = (n: { firstName: string; lastName: string }) => `${n.firstName} ${n.lastName}`.trim()

/** How lists of students are put in order (and shown): by last name ("Lee, Mary Ann") or first name ("Mary Ann Lee"). */
export type NameOrder = 'last' | 'first'

/** Compares two students by last or first name, the other name breaking ties; a missing last name sorts as the first name. */
export function compareNames(a: { firstName: string; lastName: string }, b: { firstName: string; lastName: string }, order: NameOrder): number {
  const key = (n: { firstName: string; lastName: string }) => {
    const first = n.firstName.trim(), last = n.lastName.trim() || first
    return order === 'last' ? [last, first] : [first, last]
  }
  const [a1, a2] = key(a), [b1, b2] = key(b)
  const opts = { sensitivity: 'base' } as const
  return a1.localeCompare(b1, undefined, opts) || a2.localeCompare(b2, undefined, opts)
}

/** The name as shown for that order: "Lee, Mary Ann" or "Mary Ann Lee". */
export function displayName(n: { firstName: string; lastName: string }, order: NameOrder): string {
  return order === 'last' && n.lastName.trim() && n.firstName.trim() ? `${n.lastName.trim()}, ${n.firstName.trim()}` : fullName(n)
}

// Letter shapes handwriting reads mix up ("Kirn" for "Kim"); applied to both
// sides, so real names that contain them still match themselves exactly.
const lookAlikes = (t: string) => t.replace(/rn/g, 'm').replace(/vv/g, 'w').replace(/cl/g, 'd')

const tokens = (raw: string) => normalizeName(raw.includes(',') ? fullName(parseName(raw)) : raw).replace(/[.']/g, '').split(' ').filter(Boolean).map(lookAlikes)

function similarity(a: string, b: string): number {
  if (!a || !b) return 0
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length)
}

/** One token against another: an initial ("R" / "R.") matches any token starting with it. */
function tokenScore(a: string, b: string): number {
  if (a === b) return 1
  if (a.length === 1 || b.length === 1) return a[0] === b[0] ? 0.9 : 0
  return similarity(a, b)
}

/**
 * 0-1 likeness of two written names, order-insensitive ("Miller Sean" = "Sean
 * Miller"). Every token of the shorter name must line up with a token of the
 * longer one; a missing middle name costs a little, not everything.
 */
export function nameScore(a: string, b: string): number {
  const ta = tokens(a)
  const tb = tokens(b)
  if (!ta.length || !tb.length) return 0
  const [short, long] = ta.length <= tb.length ? [ta, tb] : [tb, ta]
  const used = new Set<number>()
  let total = 0
  for (const t of short) {
    let best = 0
    let bestIdx = -1
    long.forEach((u, i) => {
      if (used.has(i)) return
      const s = tokenScore(t, u)
      if (s > best) { best = s; bestIdx = i }
    })
    if (bestIdx >= 0) used.add(bestIdx)
    total += best
  }
  const tokenAvg = total / short.length
  const whole = similarity([...ta].sort().join(' '), [...tb].sort().join(' '))
  // Fewer tokens than the roster name (first name only, no middle name) is a weaker match.
  const coverage = short.length === long.length ? 1 : short.length === 1 ? 0.85 : 0.95
  return Math.max(whole, tokenAvg * coverage)
}

export function matchRoster(read: string | null | undefined, roster: RosterName[]): RosterMatch {
  if (!read?.trim() || !roster.length) return { rosterId: null, score: 0, confidence: 'none' }
  const scored = roster
    .map((r) => ({ id: r.id, score: nameScore(read, fullName(r)) }))
    .sort((x, y) => y.score - x.score)
  const [best, second] = scored
  const gap = best.score - (second?.score ?? 0)
  if (best.score >= 0.85 && gap >= 0.08) return { rosterId: best.id, score: best.score, confidence: 'sure' }
  if (best.score >= 0.6) return { rosterId: best.id, score: best.score, confidence: 'check' }
  return { rosterId: null, score: best.score, confidence: 'none' }
}

/**
 * Two header reads of the same student (the name written on several pages,
 * read slightly differently). With a roster, two reads that confidently match
 * different students are never the same.
 */
export function sameStudent(a: string, b: string, roster?: RosterName[]): boolean {
  if (normalizeName(a) === normalizeName(b)) return true
  if (roster?.length) {
    const ma = matchRoster(a, roster)
    const mb = matchRoster(b, roster)
    if (ma.confidence === 'sure' && mb.confidence === 'sure') return ma.rosterId === mb.rosterId
  }
  return nameScore(a, b) >= 0.85
}
