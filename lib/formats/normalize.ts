// Cleans AI-generated study-guide markdown before it is rendered.
//
// Generated guides (especially older ones) carry decoration that reads as
// "odd symbols" once rendered: emoji-prefixed headings, ALL-CAPS headings,
// `---` rules stacked in pairs, `____` note-taking lines, `<br>` inside table
// cells, and blockquote "boxes" (📦 KEY TERM BOX, 💡 Analogy, ❓ Check yourself).
// This pass strips the noise and rewrites blockquote boxes into typed fenced
// blocks (~~~~callout-<kind>) that the StudyMarkdown renderer turns into
// designed callouts.
//
// Everything here is line-based and linear — no nested-quantifier regexes
// (see the ReDoS note in CLAUDE.md).

export type CalloutKind = 'keyterm' | 'example' | 'check' | 'remember' | 'tip' | 'warning' | 'note'

export const CHECK_ANSWER_SEPARATOR = '@@answer@@'

const PICTOGRAPHIC = /\p{Extended_Pictographic}️?(‍\p{Extended_Pictographic}️?)*/gu

// Remove emoji. Check/cross marks carry meaning in tables, so map them to
// plain glyphs first.
export function stripEmoji(text: string): string {
  return text
    .replace(/✅|✔️|✔/g, '✓')
    .replace(/❌|✖️|✖/g, '✗')
    .replace(PICTOGRAPHIC, '')
    .replace(/️/g, '')
}

// Short words that stay lowercase in title case, and 2–3 letter words that are
// ordinary English (so "THE" → "The", but "DNA" / "AP" stay as acronyms).
const SMALL_WORDS = new Set(['a', 'an', 'and', 'as', 'at', 'but', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'vs', 'via', 'with', 'from', 'into'])
const COMMON_SHORT = new Set([
  'THE', 'AND', 'FOR', 'ONE', 'TWO', 'SIX', 'TEN', 'KEY', 'HOW', 'WHY', 'WHO', 'ALL', 'ANY', 'ARE', 'NOT', 'BUT', 'ITS',
  'OUR', 'YOU', 'CAN', 'USE', 'NEW', 'OLD', 'TOP', 'END', 'MAP', 'LAW', 'OF', 'TO', 'IN', 'ON', 'AN', 'A', 'AT', 'BY',
  'OR', 'IS', 'IT', 'AS', 'BE', 'VS', 'UP', 'NO', 'SO', 'IF', 'DO', 'MY', 'WE', 'BIG', 'SET', 'WAY', 'LAB', 'ART',
  'BOX', 'TIP', 'AIM', 'GET', 'LET', 'SEE', 'TRY', 'NOW', 'YES', 'FEW', 'TWO', 'OWN', 'ODD', 'SUM', 'AGE', 'ERA', 'WAR', 'ACT', 'RED', 'GAS', 'SUN', 'DAY', 'OUT', 'OFF', 'PER', 'VIA', 'HOT', 'LOW', 'SEA', 'AIR',
])

function isAllCaps(text: string): boolean {
  const letters = text.replace(/[^A-Za-z]/g, '')
  return letters.length >= 4 && letters === letters.toUpperCase()
}

export function toTitleCase(text: string): string {
  if (!isAllCaps(text)) {
    // Mixed text: title-case runs of 2+ ALL-CAPS words ("KEY TERM BOX — Mitosis").
    return text.replace(/\b[A-Z][A-Z'’]*(?:[ \-–—:&/]+[A-Z][A-Z'’]*)+\b/g, (run) => (isAllCaps(run) ? titleCaseCaps(run) : run))
  }
  return titleCaseCaps(text)
}

function titleCaseCaps(text: string): string {
  let first = true
  return text.replace(/[A-Za-z][A-Za-z'’]*/g, (word) => {
    const isFirst = first
    first = false
    // Keep likely acronyms (DNA, AP, WWI) — short words that aren't common English.
    if (word.length <= 4 && !COMMON_SHORT.has(word) && !(word.length === 4 && /[AEIOU]/.test(word.slice(1)))) return word
    const lower = word.toLowerCase()
    if (!isFirst && SMALL_WORDS.has(lower)) return lower
    return lower.charAt(0).toUpperCase() + lower.slice(1)
  })
}

// "*(Core concepts, key definitions…)*" → "Core concepts, key definitions…"
function unwrapParenItalic(text: string): string | null {
  const m = text.match(/^\*{1,2}_?\((.+)\)_?\*{1,2}$/) || text.match(/^_\((.+)\)_$/)
  return m ? m[1].trim() : null
}

const UNICODE_SUB: Record<string, string> = { '0': '₀', '1': '₁', '2': '₂', '3': '₃', '4': '₄', '5': '₅', '6': '₆', '7': '₇', '8': '₈', '9': '₉', '+': '₊', '-': '₋', '(': '₍', ')': '₎' }
const UNICODE_SUP: Record<string, string> = { '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹', '+': '⁺', '-': '⁻', '(': '⁽', ')': '⁾', 'n': 'ⁿ' }

// Raw HTML is not rendered (no rehype-raw), so it would show up literally.
function cleanInlineHtml(line: string): string {
  return line
    .replace(/<br\s*\/?>/gi, ' · ')
    .replace(/<sub>([^<]{1,12})<\/sub>/gi, (m, inner: string) =>
      [...inner].every((c) => UNICODE_SUB[c]) ? [...inner].map((c) => UNICODE_SUB[c]).join('') : inner)
    .replace(/<sup>([^<]{1,12})<\/sup>/gi, (m, inner: string) =>
      [...inner].every((c) => UNICODE_SUP[c]) ? [...inner].map((c) => UNICODE_SUP[c]).join('') : `^${inner}`)
    .replace(/<\/?(?:b|strong)>/gi, '**')
    .replace(/<\/?(?:i|em)>/gi, '*')
    .replace(/<\/?(?:u|span|div|p|small|mark|center|font)[^>]*>/gi, '')
}

const NOTES_HEADING = /\b(notes? space|student notes|your notes|my notes|notes section|space for notes)\b/i

// Emoji the generator used as box icons — a strong hint before they're stripped.
function emojiHint(text: string): CalloutKind | null {
  if (/⚠|❗|‼|🚫|⛔|🚨/u.test(text)) return 'warning'
  if (/❓|❔|🤔|✏|📝/u.test(text)) return 'check'
  if (/💡|🌍|🔎|🔍/u.test(text)) return 'example'
  if (/🔑|📦|📌|📖|📚/u.test(text)) return 'keyterm'
  if (/🧠|🔗|🔄/u.test(text)) return 'remember'
  if (/🎯|✅|⭐|🏆/u.test(text)) return 'tip'
  return null
}

function classifyCallout(label: string, body: string, hint: CalloutKind | null): CalloutKind {
  const t = `${label} ${body.slice(0, 80)}`.toLowerCase()
  const l = label.toLowerCase()
  if (/check yourself|quick check|self[- ]check|try it|practice|exam pattern|test yourself/.test(l)) return 'check'
  if (/trap|mistake|warning|careful|caution|avoid|pitfall|misconception|don['’]t/.test(l)) return 'warning'
  if (/key term|definition|vocab|key idea|big idea|term box|define|formula|law\b|rule\b|principle/.test(l)) return 'keyterm'
  if (/analogy|example|think of|imagine|real[- ]world|applied|application|case/.test(l)) return 'example'
  if (/tip|exam|strategy|study|test focus|how to use/.test(l)) return 'tip'
  if (/remember|memory|mnemonic|trick|connection|relates|link|compare|note|recall/.test(l)) return 'remember'
  if (hint) return hint
  if (/\banswer:/.test(t)) return 'check'
  // "**Osmosis:** diffusion of water…" — a short unknown label reads as a term.
  if (label && label.split(/\s+/).length <= 4 && body.trim()) return 'keyterm'
  if (/analogy|think of it/.test(t)) return 'example'
  return 'note'
}

// Split a callout's first line into a label and the rest of the body.
function splitCalloutLabel(lines: string[]): { label: string; body: string[] } {
  if (lines.length === 0) return { label: '', body: [] }
  const first = lines[0].trim()
  // Whole line is a bold label: **KEY TERM BOX — Statistical Science**
  const whole = first.match(/^\*\*([^*]+?)\*\*:?$/)
  if (whole) return { label: whole[1].replace(/:$/, '').trim(), body: lines.slice(1) }
  // Leading bold label: **Analogy:** text…
  const lead = first.match(/^\*\*([^*]{1,60}?):?\*\*:?\s+(.+)$/)
  if (lead && (lead[0].includes(':**') || lead[0].includes('**:'))) {
    return { label: lead[1].replace(/:$/, '').trim(), body: [lead[2], ...lines.slice(1)] }
  }
  // Plain "Label:" prefix (short)
  const plain = first.match(/^([A-Z][A-Za-z '’-]{1,30}):\s+(.+)$/)
  if (plain) return { label: plain[1].trim(), body: [plain[2], ...lines.slice(1)] }
  return { label: '', body: lines }
}

function calloutBlock(quoteLines: string[]): string[] {
  const inner = quoteLines.map((l) => l.replace(/^\s*>\s?/, ''))
  // Trim blank edges
  while (inner.length && !inner[0].trim()) inner.shift()
  while (inner.length && !inner[inner.length - 1].trim()) inner.pop()
  if (inner.length === 0) return []

  const hint = emojiHint(inner[0])
  const cleaned = inner.map((l) => tidyBold(stripEmoji(l)))
  let { label: rawLabel, body } = splitCalloutLabel(cleaned)
  // A whole bold sentence with nothing under it is a statement, not a label.
  if (rawLabel && body.every((l) => !l.trim()) && rawLabel.split(/\s+/).length > 5) {
    body = [`**${rawLabel}**`]
    rawLabel = ''
  }
  const label = toTitleCase(rawLabel.replace(/\s+/g, ' ').trim()).replace(/^[-–—:\s]+|[-–—:\s]+$/g, '')
  const kind = classifyCallout(label, body.join(' '), hint)

  let bodyLines = body
  if (kind === 'check') {
    // Split question / answer on the first "Answer:" marker.
    const idx = body.findIndex((l) => /^\s*(\*\*)?\s*(sample )?answer\s*:?\s*(\*\*)?\s*:?/i.test(l))
    if (idx >= 0) {
      const answerFirst = body[idx].replace(/^\s*(\*\*)?\s*(sample )?answer\s*:?\s*(\*\*)?\s*:?\s*/i, '')
      bodyLines = [...body.slice(0, idx), CHECK_ANSWER_SEPARATOR, answerFirst, ...body.slice(idx + 1)]
    }
  }

  const info = `callout-${kind}${label ? ` ${encodeURIComponent(label)}` : ''}`
  return ['', `~~~~${info}`, ...bodyLines, '~~~~', '']
}

// Stripping an emoji from "**🔑 Term**" leaves "** Term**", which markdown won't
// bold. Collapse "** " only where it opens a bold span (even count before it).
function tidyBold(line: string): string {
  return line.replace(/\*\*\s+/g, (m, off: number, s: string) => {
    const before = s.slice(0, off).split('**').length - 1
    return before % 2 === 0 ? '**' : m
  })
}

function normalizeHeading(line: string): string | null {
  const m = line.match(/^(#{1,6})\s+(.*)$/)
  if (!m) return line
  let text = stripEmoji(m[2]).replace(/\s+/g, ' ').trim()
  const paren = unwrapParenItalic(text)
  if (paren) return `*${paren}*` // decorative subtitle → italic paragraph
  text = text.replace(/^\*\*(.+)\*\*$/, '$1').replace(/^[|:\-–—\s]+/, '').trim()
  if (!text) return null
  return `${m[1]} ${toTitleCase(text)}`
}

// Models sometimes write "> **Check yourself:** …", a blank line, then a
// separate "> **Answer:** …" quote. Join them so the answer stays hidden
// behind the Reveal button instead of showing as its own callout.
const QUOTE_ANSWER = /^>\s*(\*\*)?\s*answer\s*:?/i
const QUOTE_CHECK = /^>\s*(\*\*)?\s*(check yourself|quick check|self[- ]check|test yourself)/i
function joinSplitCheckAnswers(lines: string[]): string[] {
  const out: string[] = []
  let inCheck = false // inside a check quote that has no answer yet
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim()
    if (t.startsWith('>')) {
      if (QUOTE_CHECK.test(t)) inCheck = true
      else if (QUOTE_ANSWER.test(t)) inCheck = false
      out.push(lines[i])
      continue
    }
    if (!t && inCheck) {
      let j = i
      while (j < lines.length && !lines[j].trim()) j++
      if (j < lines.length && QUOTE_ANSWER.test(lines[j].trim())) {
        i = j - 1 // drop the blank lines so both quotes form one block
        continue
      }
    }
    inCheck = false
    out.push(lines[i])
  }
  return out
}

/**
 * Normalize AI-generated guide markdown for display.
 * - strips emoji, `---` rules, underscore note lines, and "notes" sections
 * - title-cases ALL-CAPS headings
 * - rewrites blockquote boxes into ~~~~callout-<kind> fenced blocks
 * - converts "•" bullets to markdown lists and cleans inline HTML
 * Code fences are passed through untouched.
 */
export function normalizeGuideMarkdown(input: string): string {
  const lines = joinSplitCheckAnswers(input.replace(/\r\n?/g, '\n').split('\n'))
  const out: string[] = []
  let fence: string | null = null
  let quote: string[] = []
  let skipDepth = 0 // >0 while inside a "notes space" section (heading depth)

  const flushQuote = () => {
    if (quote.length) out.push(...calloutBlock(quote))
    quote = []
  }

  for (const raw of lines) {
    const trimmed = raw.trim()

    // Inside a code fence: pass through verbatim.
    if (fence) {
      out.push(raw)
      if (trimmed.startsWith(fence)) fence = null
      continue
    }
    // Fences inside a blockquote are kept as part of the quote.
    if (!trimmed.startsWith('>')) {
      const f = trimmed.match(/^(`{3,}|~{3,})/)
      if (f) {
        flushQuote()
        if (skipDepth) continue
        fence = f[1]
        out.push(raw)
        continue
      }
    }

    const heading = trimmed.match(/^(#{1,6})\s/)
    if (heading) {
      flushQuote()
      const depth = heading[1].length
      if (skipDepth && depth > skipDepth) continue
      skipDepth = 0
      if (NOTES_HEADING.test(trimmed)) {
        skipDepth = depth
        continue
      }
      const h = normalizeHeading(trimmed)
      if (h) out.push(h)
      continue
    }
    if (skipDepth) continue

    if (trimmed.startsWith('>')) {
      quote.push(cleanInlineHtml(trimmed)) // emoji stripped in calloutBlock, after hinting
      continue
    }
    flushQuote()

    // Horizontal rules and note-taking lines add noise, not structure.
    if (/^([-*_]\s*){3,}$/.test(trimmed)) continue
    if (/^_{4,}$/.test(trimmed.replace(/\s/g, ''))) continue
    if (trimmed === '—' || trimmed === '--') continue

    // An equation alone on its line ("$$E = mc^2$$") → display (block) math.
    const eq = trimmed.match(/^\$\$([^$]+)\$\$$/)
    if (eq) {
      out.push('', '$$', eq[1].trim(), '$$', '')
      continue
    }

    let line = cleanInlineHtml(raw)
    // "• item" → "- item"
    line = line.replace(/^(\s*)(?:[-*]\s+)?[•●▪◦]\s+/, '$1- ')
    // Emoji used as bullets/labels: strip, then tidy a leading "** " left behind.
    line = tidyBold(stripEmoji(line))
    out.push(line.replace(/[ \t]+$/, ''))
  }
  flushQuote()

  // Collapse runs of blank lines.
  return groupFigureFences(out).join('\n').replace(/\n{3,}/g, '\n\n').trim()
}

const FIGURE_FENCE = /^\s*(`{3,}|~{3,})\s*(graph|plot|chart|figure|molecule|lewis|model|diagram)\s*$/i
/** Separates figure bodies inside a ```graph-group fence. */
export const FIGURE_GROUP_SEPARATOR = '%%'

/**
 * Consecutive figure fences (only blank lines between them) become one
 * ```graph-group fence, which StudyMarkdown lays out side by side, so a run of
 * models like CH₄ / NH₃ / H₂O reads as a comparison instead of a tall column.
 */
function groupFigureFences(lines: string[]): string[] {
  const out: string[] = []
  let i = 0
  const readFence = (start: number): { body: string[]; end: number } | null => {
    const open = lines[start]?.match(FIGURE_FENCE)
    if (!open) return null
    const body: string[] = []
    for (let j = start + 1; j < lines.length; j++) {
      if (lines[j].trim().startsWith(open[1])) return { body, end: j + 1 }
      body.push(lines[j])
    }
    return null
  }
  while (i < lines.length) {
    const first = readFence(i)
    if (!first) { out.push(lines[i++]); continue }
    const bodies = [first.body]
    let next = first.end
    for (;;) {
      let k = next
      while (k < lines.length && !lines[k].trim()) k++
      const more = readFence(k)
      if (!more) break
      bodies.push(more.body)
      next = more.end
    }
    if (bodies.length === 1) {
      out.push(...lines.slice(i, first.end))
    } else {
      out.push('```graph-group', ...bodies.flatMap((b, n) => (n ? [FIGURE_GROUP_SEPARATOR, ...b] : b)), '```')
    }
    i = next
  }
  return out
}

// Plain-text version of a markdown fragment (for titles, TOC entries, aria).
export function plainText(md: string): string {
  return md
    .replace(/\*\*|__/g, '')
    .replace(/(^|[^*])\*([^*]+)\*/g, '$1$2')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim()
}
