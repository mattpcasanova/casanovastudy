// Name-stamped tests (migration 054): QR payloads and putting scanned pages
// back in order. The QR on every page says "CS1:<copy code>:<page>"; a copy
// code is one student's copy of one test. Pure; unit-tested.

const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

/** 8-character copy code (QR alphanumeric mode, so the code stays small). */
export function newCopyCode(random: () => number = Math.random): string {
  return Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join('')
}

export const qrPayload = (code: string, page: number) => `CS1:${code}:${page}`

export function parseQrPayload(text: string | null | undefined): { code: string; page: number } | null {
  const m = (text ?? '').trim().toUpperCase().match(/^CS1:([A-Z2-9]{8}):(\d{1,2})$/)
  return m ? { code: m[1], page: Number(m[2]) } : null
}

export interface StampRead {
  code: string
  page: number
}

/**
 * Scanned pages (in scan order) → reading order: each stamped copy's pages
 * together and in page order, copies in the order they first appear, then
 * any unstamped pages in their original order. `starts` marks the first page
 * of each stamped copy; unstamped pages are left for the usual name-based
 * split. A page scanned twice (same code and page) is kept once.
 */
export function arrangeStamped(stamps: Array<StampRead | null>): {
  order: number[]
  /** Parallel to `order`: true where a stamped copy starts, false otherwise, null for unstamped pages. */
  starts: Array<boolean | null>
  duplicates: number[]
} {
  const byCode = new Map<string, Array<{ index: number; page: number }>>()
  const unstamped: number[] = []
  const duplicates: number[] = []
  stamps.forEach((s, index) => {
    if (!s) { unstamped.push(index); return }
    const list = byCode.get(s.code) ?? []
    if (list.some((p) => p.page === s.page)) { duplicates.push(index); return }
    list.push({ index, page: s.page })
    byCode.set(s.code, list)
  })
  const order: number[] = []
  const starts: Array<boolean | null> = []
  for (const list of byCode.values()) {
    list.sort((a, b) => a.page - b.page).forEach((p, i) => { order.push(p.index); starts.push(i === 0) })
  }
  for (const i of unstamped) { order.push(i); starts.push(null) }
  return { order, starts, duplicates }
}

/** Page numbers missing from a stamped copy (e.g. a page that didn't go through the feeder). */
export function missingPages(pagesSeen: number[], total: number): number[] {
  const seen = new Set(pagesSeen)
  return Array.from({ length: total }, (_, i) => i + 1).filter((p) => !seen.has(p))
}
