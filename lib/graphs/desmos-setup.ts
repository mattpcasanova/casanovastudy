// ```desmos blocks in Explain answers ("Solve it in Desmos"): the exact
// expressions to type, one per line, in Desmos LaTeX (y=x^2-2x-3,
// y=\frac{1}{2}x+3, y_1\sim mx_1+b). Optional lines:
//   table: (1, 62) (2, 65) (3, 71)     → x_1 / y_1 data table
//   window: -10, 10, -5, 15            → xmin, xmax, ymin, ymax
// Rendered by components/formats/desmos-steps.tsx with a "Load into Desmos" button.

import { num, pairs, type Pt } from './spec'

export interface ParsedDesmosSetup {
  expressions: string[]
  table?: Pt[]
  bounds?: { left: number; right: number; bottom: number; top: number }
}

export function parseDesmosBlock(text: string): ParsedDesmosSetup {
  const out: ParsedDesmosSetup = { expressions: [] }
  for (const raw of text.split('\n')) {
    const line = raw.trim().replace(/^[-*•]\s+|^\d+[.)]\s+/, '')
    if (!line || line.startsWith('#') || line.startsWith('//')) continue
    const table = line.match(/^table\s*:\s*(.+)$/i)
    if (table) { const ps = pairs(table[1]); if (ps.length) out.table = ps.slice(0, 100); continue }
    const win = line.match(/^window\s*:\s*(.+)$/i)
    if (win) {
      const v = win[1].split(',').map((p) => num(p))
      if (v.length === 4 && v.every((x) => x !== null) && v[0]! < v[1]! && v[2]! < v[3]!) {
        out.bounds = { left: v[0]!, right: v[1]!, bottom: v[2]!, top: v[3]! }
      }
      continue
    }
    // Strip wrapping $$ or backticks the model may add; keep everything else verbatim.
    const expr = line.replace(/^\$\$?|\$\$?$/g, '').replace(/^`|`$/g, '').trim()
    if (expr && out.expressions.length < 20) out.expressions.push(expr)
  }
  return out
}
