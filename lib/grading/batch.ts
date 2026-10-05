// Batch grading: turn a stack of pages (in upload order) into one paper per
// student. Students write their name on the first page only, so a page with a
// name (or that looks like a first page) starts a new paper and the pages after
// it belong to that student. Teachers fix the result by toggling "starts a new
// student" on any page, so the groups are always derived from split points.
// Pure and unit-tested; page headers come from /api/grade-batch/split (Haiku).

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
}

export interface PaperGroup {
  name: string
  /** Indexes into the page list, in order. */
  pages: number[]
}

const sameName = (a: string, b: string) => a.trim().toLowerCase().replace(/\s+/g, ' ') === b.trim().toLowerCase().replace(/\s+/g, ' ')

/** Where new papers start: a new name, or a first-looking page with no name. */
export function splitPoints(headers: PageHeader[]): boolean[] {
  let current: string | null = null
  return headers.map((h, i) => {
    if (i === 0) { current = h.name; return true }
    if (h.name) {
      // A name repeated on every page of the same paper doesn't start a new one.
      if (current && sameName(h.name, current)) return false
      current = h.name
      return true
    }
    if (h.firstPage) { current = null; return true }
    return false
  })
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
export function resultsCsv(rows: Array<{ name: string; marks: number; possible: number; percentage: number; grade: string }>): string {
  const q = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`
  return [['Student', 'Marks', 'Out of', 'Percent', 'Grade'], ...rows.map((r) => [r.name, r.marks, r.possible, r.percentage.toFixed(1), r.grade])]
    .map((row) => row.map(q).join(','))
    .join('\n')
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
