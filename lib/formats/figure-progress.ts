// Live generation preview helper (components/study-guide-generating.tsx).

const FIGURE_OPEN = /^\s*(`{3,}|~{3,})\s*(graph|plot|chart|figure|molecule|lewis|model|diagram)\s*$/i

/**
 * Finished figures so far, and whether one is being written right now. While a
 * figure fence is still open its half-written spec is cut from the preview
 * (it can't be drawn yet) and replaced by a 'Drawing a visual' note.
 */
export function figureProgress(raw: string): { done: number; drawing: boolean; text: string } {
  const lines = raw.split('\n')
  let done = 0
  let open: { marker: string; at: number } | null = null
  let inOther: string | null = null
  lines.forEach((line, i) => {
    const t = line.trim()
    if (open) { if (t.startsWith(open.marker)) { done++; open = null } return }
    if (inOther) { if (t.startsWith(inOther)) inOther = null; return }
    const m = t.match(FIGURE_OPEN)
    if (m) { open = { marker: m[1], at: i }; return }
    const other = t.match(/^(`{3,}|~{3,})/)
    if (other) inOther = other[1]
  })
  if (!open) return { done, drawing: false, text: raw }
  const cut = lines.slice(0, (open as { at: number }).at).join('\n')
  return { done, drawing: true, text: `${cut}\n\n*Drawing a visual…*\n` }
}
