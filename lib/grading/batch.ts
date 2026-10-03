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
