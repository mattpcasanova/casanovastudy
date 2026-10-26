// Batch grading: turn a stack of pages (in upload order) into one paper per
// student. Students write their name on the first page only, so a page with a
// name (or that looks like a first page) starts a new paper and the pages after
// it belong to that student. Teachers fix the result by toggling "starts a new
// student" on any page, so the groups are always derived from split points.
// Pure and unit-tested; page headers come from /api/grade-batch/split (Haiku).

import { sameStudent, type RosterName } from './names'

export interface PageHeader {
  /** Student name written at the top, if any. */
  name: string | null
  /** Looks like the first page of a paper (name field, title, "Question 1"). */
  firstPage: boolean
  /** Exam title printed at the top (first pages), if any. */
  title?: string | null
  /** Class or course name, or the subject the questions are clearly about. */
  course?: string | null
  /** Class period written near the name ("2", "3B"). */
  period?: string | null
  /** A name-stamped copy's QR code (lib/stamped/), resolved to its student. */
  stamp?: PageStamp
  /** Name taken from the file name (one student per file, lib/grading/file-names.ts). */
  fromFile?: boolean
  /** Uploaded by this student to a Google Classroom assignment. */
  fromClassroom?: boolean
}

export interface PageStamp {
  code: string
  page: number
  /** Pages in the test. */
  total: number
  rosterId: string | null
  classId: string | null
  className: string | null
  classPeriod: string | null
}

export interface PaperGroup {
  name: string
  /** Indexes into the page list, in order. */
  pages: number[]
}

/**
 * Where new papers start. Every page is a candidate when it looks like a first
 * page or carries a name (a slightly different read of the current paper's
 * name, "Sean Millr", is the same student and never starts a paper; with a
 * class roster, two reads matching different students split). Candidates are
 * then weighed against the usual paper length: a class set's papers are all
 * about the same length, so a "first page" that would make a 2-page paper in
 * a set of 9-page papers is almost always a misread. Phone photos of a page
 * held up in front of the stack show the next paper's cover underneath, and
 * the header read picks that name up; one real stack of 25 papers came back
 * with 45 candidates. With fewer than 3 confident first pages the length is
 * unknown and every candidate splits.
 */
export function splitPoints(headers: PageHeader[], roster?: RosterName[]): boolean[] {
  const n = headers.length
  if (!n) return []
  const same = (i: number, j: number) => !!headers[i]?.name && !!headers[j]?.name && sameStudent(headers[j].name!, headers[i].name!, roster)
  // Candidate strength: a named first page is a sure thing; a first page with
  // no readable name or a name read on an inside page is weaker.
  const weight = headers.map((h, i) => (i === 0 ? STRONG_START : h.name ? (h.firstPage ? STRONG_START : NAME_ONLY_START) : h.firstPage ? FIRST_PAGE_START : 0))
  const candidates = weight.map((w, i) => (w > 0 ? i : -1)).filter((i) => i >= 0)

  // Sure first pages (a repeat of the current paper's name is not one) tell
  // the usual paper length. With fewer than 4 of them every candidate splits,
  // except a repeat of the current paper's name.
  const strong: number[] = []
  for (const i of candidates) {
    if (i === 0 || (headers[i].name && headers[i].firstPage && !same(strong[strong.length - 1], i))) strong.push(i)
  }
  const gaps = strong.slice(1).map((s, k) => s - strong[k])
  if (gaps.length < 3) {
    let current = 0
    return headers.map((h, i) => {
      if (i === 0) return true
      if (!weight[i] || (h.name && same(current, i))) return false
      current = i
      return true
    })
  }

  // The best set of starts: each candidate's weight (a repeat of the paper's
  // name counts against it) minus a penalty for every paper shorter or longer
  // than the typical one. Short is the sign of a misread (a 2-page paper in a
  // set of 9-page ones); long is softer, since extra sheets happen. The
  // typical length is whichever gap between sure first pages explains the
  // stack best.
  let bestStarts: boolean[] | null = null
  let bestScore = -Infinity
  for (const typical of new Set(gaps)) {
    const penalty = (len: number) => (len < typical ? SHORT_PENALTY * (typical - len) : LONG_PENALTY * (len - typical)) / typical
    const best: number[] = new Array(candidates.length).fill(-Infinity)
    const prev: number[] = new Array(candidates.length).fill(-1)
    best[0] = 0
    for (let j = 1; j < candidates.length; j++) {
      for (let i = 0; i < j; i++) {
        if (best[i] === -Infinity) continue
        const gain = same(candidates[i], candidates[j]) ? -SAME_NAME_PENALTY : weight[candidates[j]]
        const score = best[i] - penalty(candidates[j] - candidates[i]) + gain
        if (score > best[j]) { best[j] = score; prev[j] = i }
      }
    }
    let last = 0
    let top = -Infinity
    for (let i = 0; i < candidates.length; i++) {
      const score = best[i] - penalty(n - candidates[i])
      if (score > top) { top = score; last = i }
    }
    if (top <= bestScore) continue
    bestScore = top
    const starts: boolean[] = new Array(n).fill(false)
    for (let i = last; i >= 0; i = prev[i]) { starts[candidates[i]] = true; if (i === 0) break }
    starts[0] = true
    bestStarts = starts
  }
  return bestStarts!
}

const STRONG_START = 3
const FIRST_PAGE_START = 1.5
const NAME_ONLY_START = 1
// Per typical length of shortfall / excess: a split that leaves a 2-page paper
// in a set of 9-page ones costs more than a strong start is worth.
const SHORT_PENALTY = 4.5
const LONG_PENALTY = 3
const SAME_NAME_PENALTY = 4.5

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** The usual number of pages per paper in a set (median), or null for an empty set. */
export function typicalPageCount(counts: number[]): number | null {
  return counts.length ? median(counts) : null
}

/** A paper with clearly more or fewer pages than the others: a split to check. */
export function pageCountLooksOff(count: number, typical: number | null): boolean {
  if (typical === null) return false
  if (typical < 3) return count >= typical + 2
  return Math.abs(count - typical) >= 2
}

/** Papers from split points; names come from the first named page in each paper. */
export function groupPages(starts: boolean[], headers: PageHeader[], removed: Set<number> = new Set()): PaperGroup[] {
  const groups: PaperGroup[] = []
  starts.forEach((start, i) => {
    if (removed.has(i)) return
    if (start || !groups.length) groups.push({ name: '', pages: [] })
    groups[groups.length - 1].pages.push(i)
  })
  let unnamed = 0
  for (const g of groups) {
    g.name = g.pages.map((i) => headers[i]?.name).find(Boolean) ?? `Student ${++unnamed}`
  }
  return groups.filter((g) => g.pages.length > 0)
}

/** Natural order for photo names (IMG_998 before IMG_1001), so camera-roll order survives. */
export function naturalCompare(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
}

/** Class results as CSV (Excel-safe quoting). */
export interface CsvRow {
  name: string
  marks: number | null
  possible: number | null
  percentage: number | null
  grade: string
  /** Absent / Missing / Exempt / Late, for roster students with no graded paper (or a late one). */
  status?: string
  studentNumber?: string | null
  /** Extra credit / deductions ("Study guide packet (+5%)"); marks and percent already include them. */
  adjustments?: string
}

/** Class results as CSV. Student ID and Status columns appear only when some row has them. */
export function resultsCsv(rows: CsvRow[]): string {
  const q = (v: string | number | null) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const withId = rows.some((r) => r.studentNumber)
  const withStatus = rows.some((r) => r.status)
  const withAdjustments = rows.some((r) => r.adjustments)
  const head = [...(withId ? ['Student ID'] : []), 'Student', 'Marks', 'Out of', 'Percent', 'Grade', ...(withStatus ? ['Status'] : []), ...(withAdjustments ? ['Extra credit / deductions'] : [])]
  const body = rows.map((r) => [
    ...(withId ? [r.studentNumber ?? ''] : []),
    r.name, r.marks, r.possible, r.percentage == null ? '' : r.percentage.toFixed(1), r.grade,
    ...(withStatus ? [r.status ?? ''] : []),
    ...(withAdjustments ? [r.adjustments ?? ''] : []),
  ])
  return [head, ...body].map((row) => row.map(q).join(',')).join('\n')
}

// "Period 2", "Per. 3", "Pd 4", "P2", "(P3)", "2nd period", "Period: 5B" at the end of a name.
const PERIOD_SUFFIX = /[\s,\-–(]*(?:(?:period|per\.?|pd\.?)\s*:?\s*([0-9]{1,2}[a-z]?)|p\s?([0-9]{1,2}[a-z]?)|([0-9]{1,2})(?:st|nd|rd|th)\s+period)\)?\s*$/i

/** Students often write their period next to their name: "Sean Miller P2" -> name + period. */
export function splitNameAndPeriod(raw: string): { name: string; period: string | null } {
  const m = raw.match(PERIOD_SUFFIX)
  if (!m || m.index === undefined || m.index === 0) return { name: raw.trim(), period: null }
  const name = raw.slice(0, m.index).replace(/[\s,\-–(]+$/, '').trim()
  if (!name) return { name: raw.trim(), period: null }
  return { name, period: (m[1] ?? m[2] ?? m[3]).toUpperCase() }
}

/** The value that appears most often (case-insensitive), first spelling wins; null when none. */
export function mostCommon(values: Array<string | null | undefined>): string | null {
  const counts = new Map<string, { value: string; n: number }>()
  for (const v of values) {
    const t = v?.trim()
    if (!t) continue
    const key = t.toLowerCase()
    const hit = counts.get(key)
    if (hit) hit.n++
    else counts.set(key, { value: t, n: 1 })
  }
  let best: { value: string; n: number } | null = null
  for (const c of counts.values()) if (!best || c.n > best.n) best = c
  return best?.value ?? null
}

// Sonnet 5.5 (2026-10-05 eval): ~55 s for a 9-page handwritten paper, ~35 s for 4 pages.
const PAPER_BASE_SECONDS = 15
const DEFAULT_SECONDS_PER_PAGE = 5

const paperSeconds = (pages: number, perPage: number) => PAPER_BASE_SECONDS + perPage * Math.max(1, pages)

/** A rough grading time: the first paper runs alone, then `concurrency` at a time, ~15 s + 5 s per page each. */
export function estimateGradingSeconds(pagesPerPaper: number[], concurrency: number, secondsPerPage = DEFAULT_SECONDS_PER_PAGE): number {
  if (!pagesPerPaper.length) return 0
  const [first, ...rest] = pagesPerPaper
  const restSeconds = rest.reduce((s, n) => s + paperSeconds(n, secondsPerPage), 0) / Math.max(1, concurrency)
  return Math.round(paperSeconds(first, secondsPerPage) + restSeconds)
}

/** Seconds per page measured from finished papers (each paper also has a fixed ~15 s), or undefined before any finish. */
export function measuredSecondsPerPage(finished: Array<{ pages: number; seconds: number }>): number | undefined {
  if (!finished.length) return undefined
  const rate = finished.reduce((s, f) => s + Math.max(0, f.seconds - PAPER_BASE_SECONDS) / Math.max(1, f.pages), 0) / finished.length
  return Math.max(2, rate)
}

/** Time left mid-batch: papers in progress count what's left of them, waiting papers their full time, shared across the workers. */
export function remainingSeconds(papers: Array<{ pages: number; elapsed?: number }>, concurrency: number, secondsPerPage = DEFAULT_SECONDS_PER_PAGE): number {
  if (!papers.length) return 0
  const work = papers.map((p) => Math.max(10, paperSeconds(p.pages, secondsPerPage) - (p.elapsed ?? 0)))
  const inParallel = Math.max(1, Math.min(concurrency, papers.length))
  // Never less than the longest single paper still to finish.
  return Math.round(Math.max(Math.max(...work), work.reduce((s, w) => s + w, 0) / inParallel))
}
