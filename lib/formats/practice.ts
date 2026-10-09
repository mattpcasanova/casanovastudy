// Parser + answer checking for the interactive "practice" study-guide format.
//
// Output contract (see the practice skeleton in lib/claude-api.ts):
//   ## <Topic>
//   MATCH: <instruction>          - Term = Definition        (4-6 lines)
//   FILL: The {{mitochondria}} makes ATP.   ({{answer|alt}} accepts alternates)
//   ORDER: <instruction>          1. first … n. last         (correct order)
//   SORT: <instruction>           - Category: item, item, item
//   MC_QUESTION: … A) … Correct Answer: B     TF_QUESTION: … Answer: True
//   FIND_BUG: <prompt>  ```lang …code… ```  Bug line: 3   Fix: <corrected line>
//   Explanation: <optional line after any activity>
// Any activity may include one fenced code block (``` or ~~~) in its body; it is
// attached as `code` and shown above the activity. A ```graph fence instead
// becomes `figure` (lib/graphs/spec.ts). Fence contents are never parsed as
// options/answers.
// Everything is line-based and linear (no nested-quantifier regexes).

import { stripEmoji, toTitleCase, plainText } from './normalize'
import { GRAPH_FENCE_LANGS } from '@/lib/graphs/spec'

export interface CodeSnippet { lang: string; text: string }

interface Base {
  id: string
  topic: string
  prompt: string
  explanation?: string
  /** One-line nudge toward the method (never the answer), shown before answering. */
  hint?: string
  code?: CodeSnippet
  /** Body of a ```graph fence, drawn above the activity. */
  figure?: string
}
export interface MatchActivity extends Base { kind: 'match'; pairs: Array<{ term: string; definition: string }> }
export interface FillActivity extends Base { kind: 'fill'; parts: Array<string | { answers: string[] }> }
export interface OrderActivity extends Base { kind: 'order'; items: string[] }
export interface SortActivity extends Base { kind: 'sort'; buckets: Array<{ name: string; items: string[] }> }
export interface ChoiceActivity extends Base { kind: 'choice'; options: string[]; correct: number }
/** "Find the bug": click the wrong line(s) of `code`. `bugLines` are 1-based. */
export interface BugActivity extends Base { kind: 'bug'; code: CodeSnippet; bugLines: number[]; fix?: string }
export type PracticeActivity = MatchActivity | FillActivity | OrderActivity | SortActivity | ChoiceActivity | BugActivity

const MARKER = /^\*{0,2}(MATCH|FILL|ORDER|SORT|MC_QUESTION|TF_QUESTION|FIND_BUG)\s*:\*{0,2}\s*(.*)$/i
const FENCE = /^(`{3,}|~{3,})\s*([\w+#.-]*)/

/** "3", "3, 5", "lines 3 and 5" → [3, 5] (positive integers, deduped, sorted). */
export function parseLineList(v: unknown): number[] {
  const nums = Array.isArray(v) ? v.map((x) => Number(x)) : String(v ?? '').match(/\d+/g)?.map(Number) ?? []
  return [...new Set(nums.filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b)
}
const clean = (s: string) => stripEmoji(s).replace(/^\*\*\s*|\s*\*\*$/g, '').trim()

export function parsePractice(content: string): PracticeActivity[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const out: PracticeActivity[] = []
  let topic = ''

  // Collect the body lines of the activity starting at `start` (exclusive).
  // Fence-aware: the first fenced code block becomes `code` (indentation kept),
  // and nothing inside a fence is treated as a marker, option or answer.
  const bodyFrom = (start: number) => {
    const body: string[] = []
    let code: CodeSnippet | undefined
    let figure: string | undefined
    let j = start + 1
    for (; j < lines.length; j++) {
      const t = lines[j].trim()
      const fence = t.match(FENCE)
      if (fence) {
        const close = fence[1]
        const block: string[] = []
        j++
        while (j < lines.length && !lines[j].trim().startsWith(close)) block.push(lines[j++])
        // Drop common indentation (the model sometimes indents the whole fence).
        const indent = Math.min(...block.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length), Infinity)
        const text = block.map((l) => (Number.isFinite(indent) ? l.slice(indent) : l)).join('\n').replace(/\s+$/, '')
        if (GRAPH_FENCE_LANGS.test(fence[2])) { if (!figure && text.trim()) figure = text }
        else if (!code && text.trim()) code = { lang: fence[2].toLowerCase(), text }
        continue
      }
      if (MARKER.test(t) || /^#{1,6}\s/.test(t)) break
      body.push(t)
    }
    return { body, code, figure, next: j }
  }
  const takeExplanation = (body: string[]) => {
    const idx = body.findIndex((l) => /^\*{0,2}(explanation|why)\s*:/i.test(l))
    if (idx < 0) return { rest: body, explanation: undefined }
    const explanation = clean(body[idx].replace(/^\*{0,2}(explanation|why)\s*:\*{0,2}\s*/i, ''))
    return { rest: body.filter((_, k) => k !== idx), explanation: explanation || undefined }
  }

  let i = 0
  while (i < lines.length) {
    const t = lines[i].trim()
    const heading = t.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      const title = toTitleCase(plainText(stripEmoji(heading[1])).trim())
      if (title && !/^(practice|learning objectives|how to use)/i.test(title) && !(i === 0 && t.startsWith('# '))) topic = title
      i++
      continue
    }
    const m = t.match(MARKER)
    if (!m) { i++; continue }

    const kind = m[1].toUpperCase()
    const head = clean(m[2])
    const { body, code, figure, next } = bodyFrom(i)
    const hintIdx = body.findIndex((l) => /^\*{0,2}hint\s*:/i.test(l))
    const hint = hintIdx >= 0 ? clean(body[hintIdx].replace(/^\*{0,2}hint\s*:\*{0,2}\s*/i, '')) || undefined : undefined
    const { rest: restAll, explanation } = takeExplanation(body.filter((l, k) => l && k !== hintIdx))
    const before = out.length
    const id = `p-${out.length}`
    i = next
    // Attach the snippet to whatever activity gets built below.
    const withCode = <T extends PracticeActivity>(a: T): T => {
      const withFig = figure ? { ...a, figure } : a
      return code && a.kind !== 'bug' ? { ...withFig, code } : withFig
    }
    const rest = restAll

    if (kind === 'MATCH') {
      const pairs = rest
        .map((l) => l.replace(/^[-*•]\s+|^\d+[.)]\s+/, ''))
        .map((l) => {
          const sep = l.search(/\s(=|→|->|—|–|::)\s/)
          if (sep < 0) return null
          const term = clean(l.slice(0, sep))
          const definition = clean(l.slice(sep).replace(/^\s(=|→|->|—|–|::)\s/, ''))
          return term && definition ? { term, definition } : null
        })
        .filter((p): p is { term: string; definition: string } => !!p)
      if (pairs.length >= 2) out.push(withCode({ kind: 'match', id, topic, prompt: head || 'Match each term to its meaning', pairs, explanation }))
    } else if (kind === 'FILL') {
      const text = [head, ...rest].join(' ').trim()
      const parts: FillActivity['parts'] = []
      let last = 0
      const re = /\{\{([^{}]+)\}\}/g
      let mm: RegExpExecArray | null
      while ((mm = re.exec(text))) {
        if (mm.index > last) parts.push(text.slice(last, mm.index))
        parts.push({ answers: mm[1].split('|').map((a) => a.trim()).filter(Boolean) })
        last = mm.index + mm[0].length
      }
      if (last < text.length) parts.push(text.slice(last))
      if (parts.some((p) => typeof p !== 'string')) out.push(withCode({ kind: 'fill', id, topic, prompt: 'Fill in the blank', parts, explanation }))
    } else if (kind === 'ORDER') {
      const items = rest.map((l) => clean(l.replace(/^(\d+[.)]|[-*•])\s+/, ''))).filter(Boolean)
      if (items.length >= 3) out.push(withCode({ kind: 'order', id, topic, prompt: head || 'Put these in the correct order', items, explanation }))
    } else if (kind === 'SORT') {
      const buckets = rest
        .map((l) => l.replace(/^[-*•]\s+/, ''))
        .map((l) => {
          const colon = l.indexOf(':')
          if (colon < 1) return null
          const name = clean(l.slice(0, colon))
          const items = l.slice(colon + 1).split(/[,;]/).map((x) => clean(x)).filter(Boolean)
          return name && items.length ? { name, items } : null
        })
        .filter((b): b is { name: string; items: string[] } => !!b)
      if (buckets.length >= 2) out.push(withCode({ kind: 'sort', id, topic, prompt: head || 'Sort each item into the right group', buckets, explanation }))
    } else if (kind === 'MC_QUESTION') {
      const options: string[] = []
      const stem: string[] = [] // lines between the question and its options (I./II./III. statements, data)
      let letter = ''
      for (const l of rest) {
        const opt = l.match(/^\*{0,2}\(?([A-F])[).:]\*{0,2}\s+(.+)$/)
        const ans = l.match(/answer\s*:?\**\s*:?\s*\(?([A-F])\b/i)
        if (ans && /answer/i.test(l.slice(0, 20))) letter = ans[1].toUpperCase()
        else if (opt) options.push(clean(opt[2]))
        else if (!options.length && l.trim()) stem.push(clean(l))
      }
      const correct = letter ? letter.charCodeAt(0) - 65 : 0
      const prompt = [head, ...stem].join('\n')
      if (head && options.length >= 2 && correct < options.length) out.push(withCode({ kind: 'choice', id, topic, prompt, options, correct, explanation }))
    } else if (kind === 'TF_QUESTION') {
      const ans = rest.find((l) => /answer\s*:/i.test(l))
      const isTrue = ans ? /true/i.test(ans.split(/answer\s*:/i)[1] ?? '') : true
      const stem = rest.slice(0, Math.max(0, rest.indexOf(ans ?? ''))).filter((l) => l.trim()).map(clean)
      if (head) out.push(withCode({ kind: 'choice', id, topic, prompt: [head, ...stem].join('\n'), options: ['True', 'False'], correct: isTrue ? 0 : 1, explanation }))
    } else if (kind === 'FIND_BUG') {
      const lineRow = rest.find((l) => /^\*{0,2}bug\s*lines?\s*:/i.test(l))
      const fixRow = rest.find((l) => /^\*{0,2}fix(ed line)?\s*:/i.test(l))
      const bugLines = parseLineList(lineRow?.replace(/^[^:]*:/, ''))
      const fix = fixRow ? fixRow.replace(/^[^:]*:\*{0,2}\s*/, '').replace(/^`|`$/g, '').trim() : undefined
      const total = code ? code.text.split('\n').length : 0
      if (code && total >= 2 && bugLines.length && bugLines.every((n) => n <= total)) {
        out.push({ kind: 'bug', id, topic, prompt: head || 'Find the bug', code, bugLines, fix: fix || undefined, explanation })
      }
    }
    if (hint && out.length > before) out[out.length - 1].hint = hint
  }

  // One topic for the whole set adds nothing.
  if (new Set(out.map((a) => a.topic)).size <= 1) out.forEach((a) => { a.topic = '' })
  return out
}

// ── Answer checking ─────────────────────────────────────────────────────────

export function normalizeAnswer(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // accents: "élan" ≈ "elan"
    .replace(/[^a-z0-9.+\-/ ]/g, ' ')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const prev = Array.from({ length: b.length + 1 }, (_, k) => k)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]
    prev[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp
    }
  }
  return prev[b.length]
}

/** Typo-tolerant: one slip allowed for answers of 5+ characters (two for 10+). */
export function isBlankCorrect(given: string, answers: string[]): boolean {
  const g = normalizeAnswer(given)
  if (!g) return false
  return answers.some((a) => {
    const n = normalizeAnswer(a)
    if (g === n) return true
    const allowed = n.length >= 10 ? 2 : n.length >= 5 ? 1 : 0
    return allowed > 0 && levenshtein(g, n) <= allowed
  })
}

// Deterministic shuffle so server and client render the same order.
export function seededShuffle<T>(items: T[], seed: string): T[] {
  let h = 2166136261
  for (let k = 0; k < seed.length; k++) h = Math.imul(h ^ seed.charCodeAt(k), 16777619)
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507)
    h = Math.imul(h ^ (h >>> 13), 3266489909)
    return ((h ^= h >>> 16) >>> 0) / 4294967296
  }
  const out = [...items]
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1))
    ;[out[k], out[j]] = [out[j], out[k]]
  }
  // Never hand back the answer order for ordering tasks.
  if (out.length > 1 && out.every((x, k) => x === items[k])) out.push(out.shift() as T)
  return out
}

// ── Structured activities (custom-guide "practice" blocks) ───────────────────
// Custom guides store practice activities as JSON in the PracticeActivity
// shapes above. These helpers convert fill sentences to/from an editable
// string and defensively normalize JSON that came from the editor or the AI.

/** "The [mitochondria|mitochondrion] makes ATP" (or {{…}}) → fill parts. */
export function parseFillSentence(text: string): FillActivity['parts'] {
  const parts: FillActivity['parts'] = []
  const re = /\{\{([^{}]+)\}\}|\[([^[\]]+)\]/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    const answers = (m[1] ?? m[2]).split('|').map((a) => a.trim()).filter(Boolean)
    if (answers.length) parts.push({ answers })
    else parts.push(m[0])
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

/** Fill parts → editable sentence with [answer|alt] blanks. */
export function fillToSentence(parts: FillActivity['parts']): string {
  return parts.map((p) => (typeof p === 'string' ? p : `[${p.answers.join('|')}]`)).join('')
}

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : '')
const strList = (v: unknown) => (Array.isArray(v) ? v.map(str) : [])
const KIND_ALIASES: Record<string, PracticeActivity['kind'] | 'tf'> = {
  match: 'match', matching: 'match',
  fill: 'fill', 'fill-in-the-blank': 'fill', fill_blank: 'fill', cloze: 'fill',
  order: 'order', ordering: 'order', sequence: 'order',
  sort: 'sort', sorting: 'sort', categorize: 'sort',
  choice: 'choice', mc: 'choice', 'multiple-choice': 'choice', multiple_choice: 'choice',
  tf: 'tf', 'true-false': 'tf', true_false: 'tf', truefalse: 'tf',
  bug: 'bug', 'find-bug': 'bug', find_bug: 'bug', 'find-the-bug': 'bug', find_the_bug: 'bug', findbug: 'bug', debug: 'bug', 'spot-the-bug': 'bug',
}

/** `{lang, text}` or a bare string (+ optional o.language/o.lang) → CodeSnippet. */
function toCode(v: unknown, langHint?: unknown): CodeSnippet | undefined {
  if (typeof v === 'string') return v.trim() ? { lang: str(langHint).toLowerCase(), text: v.replace(/\s+$/, '') } : undefined
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>
    const text = str(o.text ?? o.code ?? o.source).replace(/\s+$/, '')
    return text.trim() ? { lang: str(o.lang ?? o.language ?? langHint).toLowerCase(), text } : undefined
  }
  return undefined
}

/** True when the activity has enough content to be played. */
export function isPlayable(a: PracticeActivity): boolean {
  switch (a.kind) {
    case 'match': return a.pairs.filter((p) => p.term.trim() && p.definition.trim()).length >= 2
    case 'fill': return a.parts.some((p) => typeof p !== 'string' && p.answers.some((x) => x.trim()))
    case 'order': return a.items.filter((x) => x.trim()).length >= 2
    case 'sort': return a.buckets.filter((b) => b.name.trim() && b.items.some((x) => x.trim())).length >= 2
    case 'choice': return !!a.prompt.trim() && a.options.filter((o) => o.trim()).length >= 2 && a.correct >= 0 && a.correct < a.options.length
    case 'bug': {
      const total = a.code.text.split('\n').length
      return total >= 2 && a.bugLines.length > 0 && a.bugLines.every((n) => n >= 1 && n <= total)
    }
  }
}

/** Strip blank rows so a partly-edited activity plays cleanly. */
export function tidyActivity(a: PracticeActivity): PracticeActivity {
  switch (a.kind) {
    case 'match': return { ...a, pairs: a.pairs.filter((p) => p.term.trim() && p.definition.trim()) }
    case 'order': return { ...a, items: a.items.filter((x) => x.trim()) }
    case 'sort': return { ...a, buckets: a.buckets.map((b) => ({ ...b, items: b.items.filter((x) => x.trim()) })).filter((b) => b.name.trim() && b.items.length) }
    case 'choice': {
      const keep = a.options.map((o, i) => ({ o, i })).filter(({ o }) => o.trim())
      return { ...a, options: keep.map(({ o }) => o), correct: Math.max(0, keep.findIndex(({ i }) => i === a.correct)) }
    }
    default: return a
  }
}

/**
 * Normalize unknown JSON (saved guide, editor draft, or AI output) into
 * PracticeActivity[]. Unrecognized items are dropped. With `strict`, items that
 * aren't playable yet are dropped too (viewer); without it, half-authored
 * activities survive (editor round-trips).
 */
export function normalizePracticeActivities(raw: unknown, opts: { strict?: boolean; idPrefix?: string } = {}): PracticeActivity[] {
  if (!Array.isArray(raw)) return []
  const out: PracticeActivity[] = []
  const used = new Set<string>()
  raw.forEach((item, idx) => {
    if (!item || typeof item !== 'object') return
    const o = item as Record<string, unknown>
    const kindKey = str(o.kind ?? o.type ?? o.activityType).toLowerCase().trim()
    const kind = KIND_ALIASES[kindKey]
    if (!kind) return
    let id = str(o.id).trim() || `${opts.idPrefix ?? 'act'}-${idx}`
    while (used.has(id)) id = `${id}-${idx}`
    used.add(id)
    const code = toCode(o.code ?? o.snippet, o.language ?? o.lang)
    const figure = str(o.figure ?? o.graph).trim()
    const base = { id, topic: str(o.topic), prompt: str(o.prompt ?? o.instruction ?? o.question), explanation: str(o.explanation) || undefined, ...(str(o.hint) ? { hint: str(o.hint) } : {}), ...(code ? { code } : {}), ...(figure ? { figure } : {}) }
    let act: PracticeActivity | null = null

    if (kind === 'match') {
      const pairs = (Array.isArray(o.pairs) ? o.pairs : [])
        .map((p) => (p && typeof p === 'object' ? p as Record<string, unknown> : {}))
        .map((p) => ({ term: str(p.term ?? p.left), definition: str(p.definition ?? p.right ?? p.match) }))
      act = { kind, ...base, pairs }
    } else if (kind === 'fill') {
      let parts: FillActivity['parts'] = []
      if (Array.isArray(o.parts)) {
        parts = o.parts
          .map((p): FillActivity['parts'][number] | null => {
            if (typeof p === 'string') return p
            if (p && typeof p === 'object') {
              const answers = strList((p as Record<string, unknown>).answers).map((x) => x.trim()).filter(Boolean)
              return { answers }
            }
            return null
          })
          .filter((p): p is FillActivity['parts'][number] => p !== null)
      } else {
        parts = parseFillSentence(str(o.sentence ?? o.text ?? o.prompt))
      }
      act = { kind, ...base, prompt: base.prompt && !o.sentence && !o.text && !o.parts ? '' : base.prompt, parts }
    } else if (kind === 'order') {
      act = { kind, ...base, items: strList(o.items ?? o.steps) }
    } else if (kind === 'sort') {
      const buckets = (Array.isArray(o.buckets ?? o.categories) ? (o.buckets ?? o.categories) as unknown[] : [])
        .map((b) => (b && typeof b === 'object' ? b as Record<string, unknown> : {}))
        .map((b) => ({ name: str(b.name ?? b.category ?? b.label), items: strList(b.items) }))
      act = { kind, ...base, buckets }
    } else if (kind === 'bug') {
      const bugLines = parseLineList(o.bugLines ?? o.bugLine ?? o.lines ?? o.line)
      act = { kind, ...base, code: code ?? { lang: str(o.language ?? o.lang).toLowerCase(), text: '' }, bugLines, fix: str(o.fix ?? o.fixedLine ?? o.correction) || undefined }
    } else {
      const isTF = kind === 'tf'
      const options = isTF ? ['True', 'False'] : strList(o.options)
      let correct = -1
      const c = o.correct ?? o.correctIndex ?? o.correctAnswer ?? o.answer
      if (typeof c === 'number' && Number.isInteger(c)) correct = c
      else if (typeof c === 'boolean') correct = c ? 0 : 1
      else {
        const s = str(c).trim()
        if (/^[A-F]$/i.test(s) && options.length > s.toUpperCase().charCodeAt(0) - 65 && !options.some((opt) => opt.trim().toLowerCase() === s.toLowerCase())) {
          correct = s.toUpperCase().charCodeAt(0) - 65
        } else {
          correct = options.findIndex((opt) => opt.trim().toLowerCase() === s.toLowerCase())
        }
      }
      if (isTF && correct < 0) correct = 0
      act = { kind: 'choice', ...base, options, correct: opts.strict ? correct : Math.max(0, correct) }
    }

    if (!act) return
    if (opts.strict) {
      if (!isPlayable(act)) return
      act = tidyActivity(act)
    }
    out.push(act)
  })
  return out
}

/** True/false is stored as a two-option choice. */
export function isTrueFalse(a: PracticeActivity): boolean {
  return a.kind === 'choice' && a.options.length === 2 && a.options[0] === 'True' && a.options[1] === 'False'
}
