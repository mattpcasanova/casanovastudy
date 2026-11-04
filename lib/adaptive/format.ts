// Parser for the "adaptive" study-guide format (adaptive practice). The guide
// is a bank of concept-tagged questions at three difficulty levels; the player
// (components/formats/adaptive-format.tsx) picks the next one with
// lib/adaptive/engine.ts. Skeleton (written by the prompt in lib/claude-api.ts):
//
//   # Title
//   *one-line description*
//   CONCEPT: <name>
//   LESSON: <2-4 sentence mini-lesson, shown when the student is struggling>
//   TRAP: t1 | <a common mistake on this concept, a few words> (2-3 per concept; optional)
//   Q: <1|2|3> | <mc|tf|num|explain>
//   <question text; extra lines = statements/data; a ```graph fence may follow>
//   A) … B) … C) … D) …
//   ANSWER: <letter | True/False | number(s) | model answer>
//   IF A: [t1] <why A is tempting and wrong; the tag names the concept's TRAP behind it>
//   PROBES: t1 (num/tf only: the trap a wrong answer points to)
//   HINT: <a nudge toward the method, never the answer>
//   EXPLANATION: <the key step>
//
// Refills (app/api/adaptive/[id]/refill) append "REFILL: k<n>" followed by
// more Q blocks for that concept. A teacher asking for more questions per
// topic on an assignment appends "MORE: k<n>" blocks the same way
// (lib/adaptive/top-up.ts); those don't count as a session's refills. Content is only ever appended, so concept ids
// (k1, k2 …) and question ids (a1, a2 …) follow document order and stay stable:
// saved answers key on them.

import { GRAPH_FENCE_LANGS } from '@/lib/graphs/spec'

export type AdaptiveQuestionType = 'mc' | 'tf' | 'num' | 'explain'
export type AdaptiveLevel = 1 | 2 | 3

export interface AdaptiveConcept {
  id: string
  name: string
  lesson: string
  /** Common mistakes on this concept that wrong answers are tagged with (ids like "t1"). */
  traps: Array<{ id: string; name: string }>
}

export interface AdaptiveQuestion {
  id: string
  conceptId: string
  level: AdaptiveLevel
  type: AdaptiveQuestionType
  prompt: string
  /** mc only. */
  options: string[]
  /** mc: option index; tf: 0 = True, 1 = False; otherwise -1. */
  correct: number
  /** num: accepted numbers as written ("3.5", "7/2"); explain: the model answer. */
  answers: string[]
  /** mc: feedback for choosing each wrong option, by option index. */
  feedback: Record<number, string>
  explanation?: string
  /** mc: the concept trap (mistake id) behind each tagged wrong option, by option index. */
  traps?: Record<number, string>
  /** Traps this question sets: every tagged wrong option (mc), or its PROBES line (num, tf). */
  probes?: string[]
  /** One-line nudge toward the method (never the answer), shown on request before answering. */
  hint?: string
  /** Body of a ```graph fence (lib/graphs/spec.ts). */
  figure?: string
  /** Body of a ```passage fence: the text the question is about, shown above it. */
  passage?: string
}

export interface AdaptiveGuide {
  title: string
  description: string
  concepts: AdaptiveConcept[]
  questions: AdaptiveQuestion[]
  /** How many refill batches have been appended. */
  refills: number
}

const strip = (s: string) => s.replace(/^\*\*\s*|\s*\*\*$/g, '').trim()

/** "**ANSWER:** B" / "Answer: B" → ["ANSWER", "B"]. Keys are upper-cased. */
function field(line: string): [string, string] | null {
  const m = line.match(/^\*{0,2}(CONCEPT|LESSON|TRAP|PROBES|Q|ANSWER|EXPLANATION|HINT|IF\s+[A-F]|REFILL|MORE)\s*:\*{0,2}\s*(.*)$/i)
  return m ? [m[1].toUpperCase().replace(/\s+/g, ' '), m[2].trim()] : null
}

const OPTION = /^\*{0,2}\(?([A-F])[).]\*{0,2}\s+(.+)$/

function parseHeader(v: string): { level: AdaptiveLevel; type: AdaptiveQuestionType } | null {
  const parts = v.toLowerCase().split('|').map((p) => p.trim())
  const level = Number(parts.find((p) => /^[123]$/.test(p)) ?? NaN)
  const typeRaw = parts.find((p) => /^(mc|tf|num|numeric|number|explain|sa|short)$/.test(p))
  if (!typeRaw) return null
  const type: AdaptiveQuestionType = typeRaw === 'mc' ? 'mc' : typeRaw === 'tf' ? 'tf' : /^num/.test(typeRaw) ? 'num' : 'explain'
  return { level: (level === 1 || level === 2 || level === 3 ? level : 2) as AdaptiveLevel, type }
}

interface Draft {
  conceptId: string
  level: AdaptiveLevel
  type: AdaptiveQuestionType
  stem: string[]
  options: string[]
  answer: string
  feedback: Record<number, string>
  traps: Record<number, string>
  probes: string[]
  explanation?: string
  hint?: string
  figure?: string
  passage?: string
  /** Inside the explain model answer / explanation, continuation lines join the last field. */
  last: 'stem' | 'answer' | 'explanation' | 'other'
}

function finish(d: Draft, id: string): AdaptiveQuestion | null {
  const prompt = d.stem.join('\n').trim()
  if (!prompt || !d.answer) return null
  const base = { id, conceptId: d.conceptId, level: d.level, type: d.type, prompt, feedback: {}, explanation: d.explanation || undefined, ...(d.hint ? { hint: d.hint } : {}), ...(d.figure ? { figure: d.figure } : {}), ...(d.passage ? { passage: d.passage } : {}) }
  if (d.type === 'mc') {
    if (d.options.length < 2) return null
    const letter = d.answer.match(/^\(?([A-F])\b/i)?.[1]
    const idx = letter ? letter.toUpperCase().charCodeAt(0) - 65 : d.options.findIndex((o) => o.toLowerCase() === d.answer.toLowerCase())
    if (idx < 0 || idx >= d.options.length) return null
    const feedback: Record<number, string> = {}
    for (const [k, v] of Object.entries(d.feedback)) if (Number(k) !== idx && Number(k) < d.options.length) feedback[Number(k)] = v
    const traps: Record<number, string> = {}
    for (const [k, v] of Object.entries(d.traps)) if (Number(k) !== idx && Number(k) < d.options.length) traps[Number(k)] = v
    const probes = [...new Set(Object.values(traps))]
    return { ...base, options: d.options, correct: idx, answers: [], feedback, ...(probes.length ? { traps, probes } : {}) }
  }
  const probed = d.probes.length ? { probes: d.probes } : {}
  if (d.type === 'tf') {
    const t = d.answer.toLowerCase()
    if (!/^(true|false|t|f)\b/.test(t)) return null
    return { ...base, options: ['True', 'False'], correct: t.startsWith('t') ? 0 : 1, answers: [], ...probed }
  }
  if (d.type === 'num') {
    const answers = d.answer.split(/\s*(?:\||\bor\b|;)\s*/i).map((a) => a.trim()).filter(Boolean)
    if (!answers.length || !answers.some((a) => parseNumber(a) !== null)) return null
    return { ...base, options: [], correct: -1, answers, ...probed }
  }
  return { ...base, options: [], correct: -1, answers: [d.answer] }
}

export function parseAdaptive(content: string): AdaptiveGuide {
  const concepts: AdaptiveConcept[] = []
  const questions: AdaptiveQuestion[] = []
  let title = ''
  let description = ''
  let refills = 0
  let concept: AdaptiveConcept | null = null
  let draft: Draft | null = null
  let lessonOpen = false
  let qCount = 0 // question ids count every Q block, valid or not, so later ids never shift

  const flush = () => {
    if (!draft) return
    qCount++
    const q = finish(draft, `a${qCount}`)
    if (q) questions.push(q)
    draft = null
  }

  const raw = content.split('\n')
  for (let i = 0; i < raw.length; i++) {
    const open = raw[i].match(/^\s*(`{3,}|~{3,})\s*([\w+#.-]*)/)
    if (open) {
      const body: string[] = []
      let j = i + 1
      for (; j < raw.length; j++) {
        if (/^\s*(`{3,}|~{3,})\s*$/.test(raw[j]) && raw[j].trim().startsWith(open[1][0].repeat(open[1].length))) break
        body.push(raw[j])
      }
      i = j
      if (draft && GRAPH_FENCE_LANGS.test(open[2]) && !draft.figure) draft.figure = body.join('\n')
      else if (draft && /^(passage|text)$/i.test(open[2]) && !draft.passage) draft.passage = body.join('\n').trim()
      else if (draft && !draft.options.length && !draft.answer) draft.stem.push('```' + open[2], ...body, '```') // code in a question
      continue
    }

    const line = raw[i].trim()
    if (!line) { lessonOpen = false; continue }

    const h1 = line.match(/^#\s+(.+)$/)
    if (h1 && !title && !concept) { title = strip(h1[1]); continue }
    if (!description && !concept && /^[*_][^*_].*[*_]$/.test(line)) { description = line.replace(/^[*_]+|[*_]+$/g, '').trim(); continue }

    const f0 = field(line)
    // "More: ..." or "Trap: ..." inside a question is its own text, not a marker.
    const f: [string, string] | null = f0 && ((f0[0] === 'MORE' && !/^k\d+$/i.test(f0[1])) || (f0[0] === 'TRAP' && draft)) ? null : f0
    if (f) {
      const [key, value]: [string, string] = f
      if (key === 'CONCEPT') {
        flush()
        lessonOpen = false
        const name: string = strip(value).replace(/^k\d+\s*[|:-]\s*/i, '')
        if (!name) { concept = null; continue }
        concept = { id: `k${concepts.length + 1}`, name, lesson: '', traps: [] }
        concepts.push(concept)
        continue
      }
      if (key === 'REFILL' || key === 'MORE') {
        flush()
        lessonOpen = false
        if (key === 'REFILL') refills++
        concept = concepts.find((c) => c.id === value.trim().toLowerCase()) ?? null
        continue
      }
      if (key === 'LESSON') {
        if (concept && !draft) { concept.lesson = value; lessonOpen = true }
        continue
      }
      if (key === 'TRAP') {
        // Concept level only: "t1 | Adds the denominators".
        const m = value.match(/^\[?([a-z]\d{1,2})\]?\s*[|:-]\s*(.+)$/i)
        if (concept && !draft && m && concept.traps.length < 6) { concept.traps.push({ id: m[1].toLowerCase(), name: strip(m[2]) }); lessonOpen = false }
        continue
      }
      if (key === 'Q') {
        flush()
        lessonOpen = false
        const header = parseHeader(value)
        if (!header || !concept) { qCount++; continue } // keep later ids stable even when a block is unusable
        draft = { conceptId: concept.id, ...header, stem: [], options: [], answer: '', feedback: {}, traps: {}, probes: [], last: 'stem' }
        continue
      }
      if (!draft) continue
      const d: Draft = draft
      if (key === 'ANSWER') { d.answer = value; d.last = 'answer' }
      else if (key === 'EXPLANATION') { d.explanation = value; d.last = 'explanation' }
      else if (key === 'HINT') { d.hint = value; d.last = 'other' }
      else if (key === 'PROBES') { d.probes = (value.toLowerCase().match(/\b[a-z]\d{1,2}\b/g) ?? []).slice(0, 3); d.last = 'other' }
      else if (key.startsWith('IF ')) {
        // "[t1] You added the denominators..." -> the trap tag comes off the feedback.
        const tag = value.match(/^\[([a-z]\d{1,2})\]\s*/i)
        const i = key.charCodeAt(3) - 65
        if (tag) d.traps[i] = tag[1].toLowerCase()
        d.feedback[i] = tag ? value.slice(tag[0].length) : value
        d.last = 'other'
      }
      continue
    }

    if (lessonOpen && concept && !draft) { concept.lesson += ' ' + line; continue }
    if (!draft) continue
    const d: Draft = draft
    const opt = d.type === 'mc' && !d.answer ? line.match(OPTION) : null
    if (opt) { d.options.push(strip(opt[2])); d.last = 'other'; continue }
    if (d.last === 'stem' && !d.options.length) d.stem.push(strip(line))
    else if (d.last === 'answer' && d.type === 'explain') d.answer += ' ' + line
    else if (d.last === 'explanation') d.explanation += ' ' + line
  }
  flush()

  return { title, description, concepts: concepts.filter((c) => questions.some((q) => q.conceptId === c.id)), questions, refills }
}

// ── Answer checking ─────────────────────────────────────────────────────────

import { isNumberCorrect, parseNumber } from '@/lib/formats/numeric'
export { parseNumber, isNumberCorrect } from '@/lib/formats/numeric'

/** mc/tf: the chosen option index as a string; num: what they typed. Explain answers are checked by the AI. */
export function isAnswerCorrect(q: AdaptiveQuestion, given: string): boolean {
  if (q.type === 'mc' || q.type === 'tf') return Number(given) === q.correct
  if (q.type === 'num') return isNumberCorrect(given, q.answers)
  return false
}

// ── Writing refill blocks back into the guide ───────────────────────────────

const LETTERS = 'ABCDEF'

/** One question as a Q block (used to append refills in the canonical format). */
export function serializeQuestion(q: Omit<AdaptiveQuestion, 'id' | 'conceptId'>): string {
  const out = [`Q: ${q.level} | ${q.type}`, q.prompt]
  if (q.passage) out.push('```passage', q.passage, '```')
  if (q.figure) out.push('```graph', q.figure, '```')
  if (q.type === 'mc') {
    q.options.forEach((o, i) => out.push(`${LETTERS[i]}) ${o}`))
    out.push(`ANSWER: ${LETTERS[q.correct]}`)
    for (const [k, v] of Object.entries(q.feedback)) out.push(`IF ${LETTERS[Number(k)]}: ${q.traps?.[Number(k)] ? `[${q.traps[Number(k)]}] ` : ''}${v}`)
  } else if (q.type === 'tf') {
    out.push(`ANSWER: ${q.correct === 0 ? 'True' : 'False'}`)
  } else {
    out.push(`ANSWER: ${q.answers.join(' | ')}`)
  }
  if (q.type !== 'mc' && q.probes?.length) out.push(`PROBES: ${q.probes.join(', ')}`)
  if (q.hint) out.push(`HINT: ${q.hint}`)
  if (q.explanation) out.push(`EXPLANATION: ${q.explanation}`)
  return out.join('\n')
}

/** `marker`: REFILL for a student's session, MORE for questions a teacher added to the bank (not counted as a refill). */
export function refillBlock(conceptId: string, questions: Array<Omit<AdaptiveQuestion, 'id' | 'conceptId'>>, marker: 'REFILL' | 'MORE' = 'REFILL'): string {
  return [`${marker}: ${conceptId}`, '', ...questions.map((q) => serializeQuestion(q) + '\n')].join('\n').trim()
}
