// Searching the Florida standards (data/standards/fl-cpalms.json: 7,130 benchmarks
// exported from CPALMS on 2026-11-08; code, description, parent standard, subject,
// grade, strand, CPALMS page id). Pure and unit-tested; /api/standards/search
// loads the file and calls searchStandards. Only this official export is ever
// shown: the app never writes a standard's wording from the model's memory.

export interface StandardRow {
  code: string
  /** The benchmark's own wording. */
  text: string
  /** The parent standard's wording ("Idea/Standard" on CPALMS). */
  standard: string
  subject: string
  /** "8", "912", "68", "K", "K12"... as CPALMS writes it. */
  grade: string
  strand: string
  /** CPALMS PreviewStandard id (null when the export had none). */
  cpalms: number | null
}

export interface StandardHit extends StandardRow { url: string | null }

export const cpalmsUrl = (id: number | null) => (id ? `https://www.cpalms.org/PreviewStandard/Preview/${id}` : null)

/** App subject picker values -> CPALMS subject names (a hit in these is boosted, others still show). */
const SUBJECT_MAP: Record<string, string[]> = {
  mathematics: ['Mathematics (B.E.S.T.)'],
  science: ['Science'],
  english: ['English Language Arts (B.E.S.T.)', 'English Language Development'],
  history: ['Social Studies'],
  'computer-science': ['Computer Science'],
  'foreign-language': ['World Languages'],
  health: ['Health Education', 'Physical Education'],
  arts: ['Visual Art', 'Music', 'Theatre', 'Dance'],
}

/** App grade-level values -> CPALMS grade tags the standard may carry. */
export function gradeTags(gradeLevel: string | null | undefined): string[] {
  const g = (gradeLevel ?? '').toLowerCase()
  if (!g || g === 'general') return []
  if (g === '6th-8th') return ['6', '7', '8', '68', 'K12', 'PK12']
  const m = g.match(/^(\d{1,2})(st|nd|rd|th)$/)
  if (m) {
    const n = Number(m[1])
    if (n >= 9) return ['912', String(n), 'K12', 'PK12']
    if (n >= 6) return [String(n), '68', 'K12', 'PK12']
    return [String(n), 'K12', 'PK12']
  }
  if (g === 'kindergarten' || g === 'k') return ['K', 'K12', 'PK12']
  return []
}

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const words = (s: string) => fold(s).split(/[^a-z0-9.]+/).filter((w) => w.length >= 2)

/** Looks like a code or the start of one: "MA.8", "ma.8.ar", "SC.912.L.18.1". */
const CODE_LIKE = /^[a-z]{1,4}(\.[a-z0-9-]*)*$/i

/**
 * Ranks rows for a query. A query that looks like a code matches code prefixes
 * first; otherwise every word must appear in the code, text, parent standard or
 * strand (prefix match). The guide's grade and subject boost rows that fit them,
 * and rows from a different grade band are pushed down, never hidden.
 */
export function searchStandards(rows: StandardRow[], query: string, opts: { grade?: string | null; subject?: string | null; limit?: number } = {}): StandardHit[] {
  const q = query.trim()
  if (q.length < 2) return []
  const limit = opts.limit ?? 20
  const tags = gradeTags(opts.grade)
  const subjects = opts.subject ? SUBJECT_MAP[opts.subject] ?? [] : []
  const codeQuery = CODE_LIKE.test(q) ? fold(q) : null
  const terms = words(q)

  const scored: Array<{ row: StandardRow; score: number }> = []
  for (const row of rows) {
    const code = fold(row.code)
    let score = 0
    if (codeQuery) {
      if (code === codeQuery) score = 100
      else if (code.startsWith(codeQuery)) score = 80 - Math.min(20, code.length - codeQuery.length)
      else if (code.includes(codeQuery)) score = 40
      else continue
    } else {
      const hay = `${code} ${fold(row.text)} ${fold(row.standard)} ${fold(row.strand)}`
      const hayWords = hay.split(/[^a-z0-9.]+/)
      let all = true
      for (const t of terms) {
        const inText = fold(row.text).includes(t)
        const inWord = hayWords.some((w) => w.startsWith(t))
        if (!inText && !inWord) { all = false; break }
        score += inText ? 10 : 5
        if (new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`).test(fold(row.text))) score += 4
      }
      if (!all) continue
      // Shorter benchmarks that match every word are the more specific hits.
      score += Math.max(0, 6 - Math.floor(row.text.length / 120))
    }
    if (subjects.length) score += subjects.includes(row.subject) ? 15 : -10
    if (tags.length) score += tags.includes(row.grade) ? 12 : -8
    scored.push({ row, score })
  }
  scored.sort((a, b) => b.score - a.score || a.row.code.localeCompare(b.row.code, undefined, { numeric: true }))
  return scored.slice(0, limit).map(({ row }) => ({ ...row, url: cpalmsUrl(row.cpalms) }))
}

/** The line added to a guide's standards box for a picked benchmark: the code, then its official wording. */
export function standardLine(row: Pick<StandardRow, 'code' | 'text'>): string {
  return `${row.code}: ${row.text}`
}
