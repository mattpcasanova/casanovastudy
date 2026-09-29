// Plain-text exponents and subscripts → real superscripts/subscripts.
//
// Generated math often falls back to calculator notation when Unicode has no
// superscript for it: x^x, e^(x²), x^(n-1), 2^-x, a_n, x_{n+1}. splitScripts()
// turns those into sup/sub segments, and remarkScripts renders them as
// <sup>/<sub> in every markdown renderer. Only mdast text nodes are touched, so
// code, inline code, $$math$$ and ```graph fences keep their carets.
// Display-only: stored guide text (and answer matching) never changes.

export type ScriptPart = string | { kind: 'sup' | 'sub'; parts: ScriptPart[] }

const BASE_BEFORE_CARET = /[A-Za-z0-9)\]}²³¹⁰-⁹'πθ]/
const OPEN: Record<string, string> = { '(': ')', '{': '}' }

/** Index just past the group that opens at `i` (balanced), or -1. */
function groupEnd(s: string, i: number): number {
  const open = s[i]
  const close = OPEN[open]
  let depth = 0
  for (let j = i; j < s.length; j++) {
    if (s[j] === open) depth++
    else if (s[j] === close && --depth === 0) return j + 1
  }
  return -1
}

/** The exponent starting at `i` (just after ^): [raw inner text, end index] or null. */
function readExponent(s: string, i: number): [string, number] | null {
  const c = s[i]
  if (c === '(' || c === '{') {
    const end = groupEnd(s, i)
    if (end < 0 || end - i <= 2) return null
    return [s.slice(i + 1, end - 1), end]
  }
  const m = s.slice(i).match(/^[-+−]?(\d+(?:\.\d+)?|[A-Za-zπθ]+)/)
  if (!m) return null
  return [m[0], i + m[0].length]
}

export function splitScripts(s: string): ScriptPart[] {
  if (!s.includes('^') && !s.includes('_')) return [s]
  const out: ScriptPart[] = []
  let buf = ''
  let i = 0
  const flush = () => { if (buf) { out.push(buf); buf = '' } }
  while (i < s.length) {
    const c = s[i]
    if (c === '^' && i > 0 && BASE_BEFORE_CARET.test(s[i - 1]) && s[i - 1] !== '-') {
      const exp = readExponent(s, i + 1)
      if (exp) {
        flush()
        out.push({ kind: 'sup', parts: splitScripts(exp[0].replace(/-/g, '−')) })
        i = exp[1]
        continue
      }
    }
    // Subscripts only after a lone letter (x_1, a_n, v_0, x_{n+1}); never snake_case.
    if (c === '_' && i > 0 && /[A-Za-z]/.test(s[i - 1]) && (i < 2 || !/[A-Za-z0-9_]/.test(s[i - 2]))) {
      const rest = s.slice(i + 1)
      let sub: [string, number] | null = null
      if (rest[0] === '{') {
        const end = groupEnd(s, i + 1)
        if (end > 0 && end - i > 3) sub = [s.slice(i + 2, end - 1), end]
      } else {
        const m = rest.match(/^(\d+|[a-z](?![A-Za-z0-9]))/)
        if (m) sub = [m[0], i + 1 + m[0].length]
      }
      if (sub) {
        flush()
        out.push({ kind: 'sub', parts: splitScripts(sub[0]) })
        i = sub[1]
        continue
      }
    }
    buf += c
    i++
  }
  flush()
  return out
}

// ── remark plugin ───────────────────────────────────────────────────────────

interface MdNode { type: string; value?: string; children?: MdNode[]; data?: Record<string, unknown> }

function toNodes(parts: ScriptPart[]): MdNode[] {
  return parts.map((p) => (typeof p === 'string'
    ? { type: 'text', value: p }
    : { type: p.kind === 'sup' ? 'superscript' : 'subscript', data: { hName: p.kind }, children: toNodes(p.parts) }))
}

function walk(node: MdNode) {
  if (!node.children) return
  const next: MdNode[] = []
  for (const child of node.children) {
    if (child.type === 'text' && child.value && (child.value.includes('^') || child.value.includes('_'))) {
      const parts = splitScripts(child.value)
      if (parts.length === 1 && typeof parts[0] === 'string') next.push(child)
      else next.push(...toNodes(parts))
    } else {
      walk(child)
      next.push(child)
    }
  }
  node.children = next
}

/** remark plugin: renders caret exponents / letter subscripts in text as <sup>/<sub>. */
export function remarkScripts() {
  return (tree: MdNode) => walk(tree)
}
