// Which saved page a question is probably on. The grader doesn't say where a
// question sits, so the report's "Show the page" button guesses from the
// question's place in the breakdown: question 3 of 12 on a 4-page paper is
// most likely on page 1 (the first quarter). The viewer's arrows fix a miss.
// Pure; unit-tested.

export interface PaperPage {
  url: string
  name: string
}

/** 0-based page for question `index` of `count` on a paper of `pageCount` pages. */
export function pageForQuestion(index: number, count: number, pageCount: number): number {
  if (pageCount <= 0) return 0
  if (count <= 0 || index < 0) return 0
  const share = Math.min(index, count - 1) / count
  return Math.min(pageCount - 1, Math.max(0, Math.floor(share * pageCount)))
}

/** Keeps `{ url, name }` items only (the API's signed list), at most `max`. */
export function pickPaperPages(list: unknown, max = 60): PaperPage[] {
  if (!Array.isArray(list)) return []
  const out: PaperPage[] = []
  for (const item of list) {
    if (out.length >= max) break
    const url = (item as { url?: unknown })?.url
    if (typeof url !== 'string' || !/^https?:\/\//.test(url)) continue
    out.push({ url, name: String((item as { name?: unknown })?.name ?? '') || `Page ${out.length + 1}` })
  }
  return out
}
