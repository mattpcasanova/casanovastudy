// Mark points: the separate marks a mark scheme awards on one question
// (Cambridge / AICE: M1 method, A1 accuracy, B1 independent, DM1, A1ft ...;
// science schemes: one tick per marking point). Pure, unit-tested.
//
// Two uses:
//  - a teacher marking papers herself: the answer key is read once into a
//    template (readMarkingTemplate), every paper starts as a blank mark sheet
//    (blankBreakdown) and she clicks each point earned or not;
//  - reports the grader marked: its "Codes: M1 A1 M1 A0" line becomes the same
//    clickable points (pointsFromCodes).

import type { GradedQuestion } from './parse'

export interface MarkPoint {
  /** The mark as the scheme writes it when earned: "M1", "A1", "B2", "DM1", "A1ft". Empty = an uncoded marking point. */
  code: string
  /** What it is worth (the digit in the code). */
  marks: number
  /** What earns it, in a few words. */
  note?: string
  earned?: boolean
  /** Where the teacher put this mark on the paper. */
  at?: StampPlace
}

/** A spot on the scanned paper: 1-based page, x and y as fractions of the page (0-1, from the top left as scanned). */
export interface StampPlace { page: number; x: number; y: number }

/** A note the teacher put on the paper that isn't one of the scheme's marks: a tick, a cross, "ft", "cao", a few words. */
export interface FreeStamp extends StampPlace {
  text: string
  tone: StampTone
}

export type StampTone = 'earned' | 'lost' | 'partial' | 'score' | 'note'

/** What the palette offers. The exam-board set shows when the paper uses mark codes. */
export interface Annotation { text: string; tone: StampTone; title: string }
export const BASIC_ANNOTATIONS: Annotation[] = [
  { text: '✓', tone: 'earned', title: 'Right' },
  { text: '✗', tone: 'lost', title: 'Wrong' },
  { text: '½', tone: 'partial', title: 'Half right' },
  { text: '^', tone: 'lost', title: 'Something missing' },
  { text: '?', tone: 'note', title: 'Unclear' },
]
/** Cambridge mark codes: on a question whose sheet has that kind of mark, these give or take the mark itself. */
export const EXAM_BOARD_MARKS: Annotation[] = [
  { text: 'M1', tone: 'earned', title: 'Method mark earned' },
  { text: 'A1', tone: 'earned', title: 'Accuracy mark earned' },
  { text: 'B1', tone: 'earned', title: 'Independent mark earned' },
  { text: 'DM1', tone: 'earned', title: 'Dependent method mark earned (needs the mark before it)' },
  { text: 'M0', tone: 'lost', title: 'Method mark not earned' },
  { text: 'A0', tone: 'lost', title: 'Accuracy mark not earned' },
  { text: 'B0', tone: 'lost', title: 'Independent mark not earned' },
]
export const EXAM_BOARD_ANNOTATIONS: Annotation[] = [
  { text: 'ft', tone: 'note', title: 'Follow through: correct working from an earlier wrong answer' },
  { text: 'cao', tone: 'note', title: 'Correct answer only' },
  { text: 'oe', tone: 'note', title: 'Or equivalent' },
  { text: 'dep', tone: 'note', title: 'Dependent on the previous mark' },
  { text: 'SC', tone: 'note', title: 'Special case' },
  { text: 'ECF', tone: 'note', title: 'Error carried forward' },
  { text: 'BOD', tone: 'note', title: 'Benefit of the doubt' },
  { text: 'ISW', tone: 'note', title: 'Ignore subsequent working' },
  { text: 'awrt', tone: 'note', title: 'Answers which round to' },
  { text: 'soi', tone: 'note', title: 'Seen or implied' },
  { text: 'seen', tone: 'note', title: 'Seen' },
  { text: 'www', tone: 'note', title: 'Without wrong working' },
  { text: 'nfww', tone: 'lost', title: 'Not from wrong working (the answer came from wrong working, so no mark)' },
  { text: 'AG', tone: 'note', title: 'Answer given on the paper: the working must be complete' },
  { text: 'ora', tone: 'note', title: 'Or reverse argument' },
  { text: 'owtte', tone: 'note', title: 'Or words to that effect' },
  { text: 'max', tone: 'note', title: 'The most marks this part can get' },
]

const TONES: StampTone[] = ['earned', 'lost', 'partial', 'score', 'note']

export function cleanNotes(raw: unknown): FreeStamp[] {
  if (!Array.isArray(raw)) return []
  const out: FreeStamp[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const at = cleanPlace(r)
    const text = typeof r.text === 'string' ? r.text.replace(/\s+/g, ' ').trim().slice(0, 300) : ''
    if (!at || !text) continue
    out.push({ ...at, text, tone: TONES.includes(r.tone as StampTone) ? (r.tone as StampTone) : 'note' })
    if (out.length >= 40) break
  }
  return out
}

export function cleanPlace(raw: unknown): StampPlace | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const r = raw as Record<string, unknown>
  const page = Number(r.page), x = Number(r.x), y = Number(r.y)
  if (!Number.isInteger(page) || page < 1 || page > 200 || !(x >= 0 && x <= 1) || !(y >= 0 && y <= 1)) return undefined
  return { page, x: Math.round(x * 10000) / 10000, y: Math.round(y * 10000) / 10000 }
}

export interface TemplateQuestion {
  question: string
  marks: number
  points?: MarkPoint[]
  /** Levels of response: how many levels the scheme has (essay questions). */
  levels?: number
  /** The expected answer in a line, shown to the teacher while marking. */
  guide?: string
}

const CODE = /^([A-Za-z]{1,3})(\d{1,2})((?:\s?(?:ft|FT|dep|cao|oe))?)$/

/** "A1ft" -> { letters: "A", value: 1, suffix: "ft" }; null when it isn't a mark code. */
export function readCode(raw: string): { letters: string; value: number; suffix: string } | null {
  const m = raw.trim().match(CODE)
  if (!m) return null
  return { letters: m[1].toUpperCase(), value: parseInt(m[2], 10), suffix: m[3].trim().toLowerCase() }
}

/** The grader's "M1 A1 M1 A0" as points: a 0 is that mark not earned (worth 1). */
export function pointsFromCodes(codes: string | undefined | null): MarkPoint[] {
  const out: MarkPoint[] = []
  for (const token of String(codes ?? '').split(/[\s,;]+/)) {
    const c = readCode(token)
    if (!c) continue
    const marks = c.value || 1
    out.push({ code: `${c.letters}${marks}${c.suffix}`, marks, earned: c.value > 0 })
    if (out.length >= 30) break
  }
  return out
}

/** Points as the line an examiner writes: earned keep their code, lost ones show 0 ("M1 A0"). */
export function codesFromPoints(points: MarkPoint[] | undefined): string {
  return (points ?? [])
    .map((p) => {
      const c = readCode(p.code)
      if (!c) return ''
      return `${c.letters}${p.earned ? c.value : 0}${c.suffix}`
    })
    .filter(Boolean)
    .join(' ')
    .slice(0, 120)
}

/** Marks from the points earned, never more than the question carries ("any three from" lists five). */
export function pointsTotal(points: MarkPoint[] | undefined, possible: number): number {
  const sum = (points ?? []).reduce((s, p) => s + (p.earned ? p.marks : 0), 0)
  return Math.min(sum, possible)
}

/** The question after its points changed: marks and the codes line follow the points; it counts as marked. */
export function withPoints(q: GradedQuestion, points: MarkPoint[]): GradedQuestion {
  const next: GradedQuestion = { ...q, points, marksAwarded: pointsTotal(points, q.marksPossible) }
  const codes = codesFromPoints(points)
  if (codes) next.markCodes = codes
  else delete next.markCodes
  delete next.unmarked
  return next
}

/** Click a point: earned <-> not earned. */
export function togglePoint(q: GradedQuestion, index: number): GradedQuestion {
  const points = (q.points ?? []).map((p, i) => (i === index ? { ...p, earned: !p.earned } : p))
  return withPoints(q, points)
}

/** Every point earned (up to the question's marks) or none. */
export function setAllPoints(q: GradedQuestion, earned: boolean): GradedQuestion {
  if (!q.points?.length) return markedAs(q, earned ? q.marksPossible : 0)
  let left = q.marksPossible
  const points = q.points.map((p) => {
    const take = earned && p.marks <= left
    if (take) left -= p.marks
    return { ...p, earned: take }
  })
  return withPoints(q, points)
}

/** A mark typed or picked directly (no points, or overriding them). */
export function markedAs(q: GradedQuestion, marks: number): GradedQuestion {
  const next: GradedQuestion = { ...q, marksAwarded: Math.min(Math.max(0, marks), q.marksPossible) }
  delete next.unmarked
  return next
}

/** The points to show on a question: its own, else the grader's codes line. */
export function pointsOf(q: GradedQuestion): MarkPoint[] {
  // A mark typed over the points (full edit) wins: the points no longer describe it.
  if (q.points?.length && (q.unmarked || pointsTotal(q.points, q.marksPossible) === q.marksAwarded)) return q.points
  const fromCodes = pointsFromCodes(q.markCodes)
  // Only trust a codes line that adds up to the mark given (an old or hand-typed line may not).
  return fromCodes.length && pointsTotal(fromCodes, q.marksPossible) === q.marksAwarded ? fromCodes : []
}

function cleanPoint(raw: unknown): MarkPoint | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const code = typeof p.code === 'string' ? p.code.trim().slice(0, 10) : ''
  const read = code ? readCode(code) : null
  if (code && !read) return null
  const marks = read ? read.value || 1 : Number(p.marks) > 0 ? Math.min(Number(p.marks), 20) : 1
  const out: MarkPoint = { code: read ? `${read.letters}${marks}${read.suffix}` : '', marks }
  const note = typeof p.note === 'string' ? p.note.replace(/\s+/g, ' ').trim().slice(0, 160) : ''
  if (note) out.note = note
  if (typeof p.earned === 'boolean') out.earned = p.earned
  const at = cleanPlace(p.at)
  if (at) out.at = at
  return out
}

export function cleanPoints(raw: unknown): MarkPoint[] {
  if (!Array.isArray(raw)) return []
  return raw.map(cleanPoint).filter((p): p is MarkPoint => !!p).slice(0, 30)
}

/** Validate a template from the model or the browser: labels, marks, points, at most 300 questions. */
export function normalizeTemplate(raw: unknown): TemplateQuestion[] {
  const list = Array.isArray(raw) ? raw : Array.isArray((raw as { questions?: unknown })?.questions) ? (raw as { questions: unknown[] }).questions : []
  const out: TemplateQuestion[] = []
  const seen = new Set<string>()
  for (const item of list) {
    if (!item || typeof item !== 'object') continue
    const r = item as Record<string, unknown>
    const question = String(r.question ?? r.q ?? '').replace(/^(?:question|q\.?)\s*/i, '').trim().slice(0, 50)
    const marks = Number(r.marks)
    if (!question || !Number.isFinite(marks) || marks <= 0 || marks > 200) continue
    const key = question.toLowerCase().replace(/\s+/g, '')
    if (seen.has(key)) continue
    seen.add(key)
    const q: TemplateQuestion = { question, marks: Math.round(marks * 2) / 2 }
    const points = cleanPoints(r.points).map(({ earned: _earned, at: _at, ...p }) => p)
    // Points that can't reach the question's marks are a misread: mark that question by number instead.
    if (points.length && points.reduce((s, p) => s + p.marks, 0) >= q.marks) q.points = points
    const levels = Number(r.levels)
    if (Number.isInteger(levels) && levels >= 2 && levels <= 8) q.levels = levels
    const guide = typeof (r.guide ?? r.answer) === 'string' ? String(r.guide ?? r.answer).replace(/\s+/g, ' ').trim().slice(0, 300) : ''
    if (guide) q.guide = guide
    out.push(q)
    if (out.length >= 300) break
  }
  return out
}

/** The model's reply (JSON, maybe inside a code fence or after a sentence) as a template. */
export function parseTemplate(text: string): TemplateQuestion[] {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start < 0 || end <= start) return []
  try {
    return normalizeTemplate(JSON.parse(text.slice(start, end + 1)))
  } catch {
    return []
  }
}

/** A blank mark sheet for one paper: every question waiting for the teacher. */
export function blankBreakdown(template: TemplateQuestion[]): GradedQuestion[] {
  return template.map((t) => {
    const q: GradedQuestion = { questionNumber: t.question, marksAwarded: 0, marksPossible: t.marks, explanation: '', unmarked: true }
    if (t.points?.length) q.points = t.points.map((p) => ({ ...p }))
    if (t.levels) q.levels = t.levels
    if (t.guide) q.guide = t.guide
    return q
  })
}

/** The template a marked (or part-marked) paper was made from, for papers added to the set later. */
export function templateFromBreakdown(breakdown: GradedQuestion[]): TemplateQuestion[] {
  return breakdown.map((q) => {
    const t: TemplateQuestion = { question: q.questionNumber, marks: q.marksPossible }
    if (q.points?.length) t.points = q.points.map(({ earned: _earned, at: _at, ...p }) => p)
    if (q.levels) t.levels = q.levels
    if (q.guide) t.guide = q.guide
    return t
  }).filter((t) => t.marks > 0)
}

/** Questions the teacher hasn't marked yet. */
export function unmarkedCount(breakdown: unknown): number {
  return Array.isArray(breakdown) ? breakdown.filter((q) => (q as GradedQuestion | null)?.unmarked === true).length : 0
}

/** A paper still on the teacher's desk: its score isn't a score yet, so class averages leave it out. */
export function stillMarking(breakdown: unknown): boolean {
  return unmarkedCount(breakdown) > 0
}

/** The teacher marked this paper herself (a mark sheet, not the grader). */
export function teacherMarked(row: { ai_breakdown?: unknown; grade_breakdown?: unknown }): boolean {
  return !row.ai_breakdown && Array.isArray(row.grade_breakdown) && row.grade_breakdown.some((q) => Array.isArray((q as GradedQuestion)?.points) || (q as GradedQuestion)?.unmarked)
}

/** What a student may see: the expected-answer line is the teacher's. */
export function forStudent(breakdown: GradedQuestion[]): GradedQuestion[] {
  return breakdown.map(({ guide: _guide, ...q }) => q)
}

// Marks on the paper itself: the teacher places each mark where it was earned
// (or lost), the way an examiner annotates a script.

/**
 * Which mark is being placed: a question's point; its score (point null); or
 * one of the teacher's own notes on it (note = index into q.notes, or a new one
 * when `add` is given).
 */
export interface StampTarget { question: number; point: number | null; note?: number; add?: Annotation }

export interface PaperStamp extends StampPlace {
  key: string
  target: StampTarget
  /** "M1", "A0", "✓", "✗", or a score like "2/3". */
  text: string
  tone: StampTone
  question: string
}

/** A point as an examiner writes it: "M1" earned, "M0" lost; uncoded points are a tick or a cross. */
export function pointText(p: MarkPoint): string {
  const c = readCode(p.code)
  if (!c) return p.earned ? '✓' : '✗'
  return `${c.letters}${p.earned ? c.value : 0}${c.suffix}`
}

const scoreText = (q: GradedQuestion) => `${Number.isInteger(q.marksAwarded) ? q.marksAwarded : q.marksAwarded.toFixed(1)}/${q.marksPossible}`

/** What a target would read as on the paper right now. */
export function stampText(breakdown: GradedQuestion[], target: StampTarget): string {
  const q = breakdown[target.question]
  if (!q) return ''
  if (target.add) return target.add.text
  if (target.note !== undefined) return q.notes?.[target.note]?.text ?? ''
  if (target.point === null) return scoreText(q)
  const p = pointsOf(q)[target.point]
  return p ? pointText(p) : ''
}

/** Every mark placed on the paper, in question order. */
export function stampsOf(breakdown: GradedQuestion[]): PaperStamp[] {
  const out: PaperStamp[] = []
  breakdown.forEach((q, qi) => {
    ;(q.notes ?? []).forEach((n, ni) => out.push({ page: n.page, x: n.x, y: n.y, key: `${qi}:n${ni}`, target: { question: qi, point: null, note: ni }, text: n.text, tone: n.tone, question: q.questionNumber }))
    if (q.unmarked) return
    if (q.at) out.push({ ...q.at, key: `${qi}`, target: { question: qi, point: null }, text: scoreText(q), tone: 'score', question: q.questionNumber })
    pointsOf(q).forEach((p, pi) => {
      if (p.at) out.push({ ...p.at, key: `${qi}:${pi}`, target: { question: qi, point: pi }, text: pointText(p), tone: p.earned ? 'earned' : 'lost', question: q.questionNumber })
    })
  })
  return out
}

/** Put a mark on the paper (or, with no place, take it off). The marks themselves don't change. */
export function placeStamp(breakdown: GradedQuestion[], target: StampTarget, at: StampPlace | undefined): GradedQuestion[] {
  return breakdown.map((q, qi) => {
    if (qi !== target.question) return q
    if (target.add) return at ? { ...q, notes: [...(q.notes ?? []), { ...at, text: target.add.text, tone: target.add.tone }].slice(0, 40) } : q
    if (target.note !== undefined) {
      const notes = (q.notes ?? []).map((n, ni) => (ni === target.note && at ? { ...n, ...at } : n)).filter((_, ni) => at || ni !== target.note)
      const next: GradedQuestion = { ...q, notes }
      if (!notes.length) delete next.notes
      return next
    }
    if (target.point === null) {
      const next = { ...q }
      if (at) next.at = at
      else delete next.at
      return next
    }
    const points = pointsOf(q)
    if (!points[target.point]) return q
    return { ...q, points: points.map((p, pi) => {
      if (pi !== target.point) return p
      const next = { ...p }
      if (at) next.at = at
      else delete next.at
      return next
    }) }
  })
}

/**
 * A pick from the palette for one question. A mark code (M1, A0 ...) on a
 * question whose sheet has a mark of that kind gives or takes that mark and is
 * then placed as it; a tick earns the next uncoded point; anything else is a
 * note on the page. Returns the breakdown and what to place.
 */
export function applyAnnotation(breakdown: GradedQuestion[], question: number, a: Annotation): { breakdown: GradedQuestion[]; target: StampTarget } {
  const q = breakdown[question]
  const asNote = { breakdown, target: { question, point: null, add: a } as StampTarget }
  if (!q) return asNote
  const points = pointsOf(q)
  const code = readCode(a.text)
  let index = -1
  if (code && /^[A-Z]{1,2}$/.test(code.letters) && a.tone !== 'note') {
    const wanted = code.value > 0
    index = points.findIndex((p) => readCode(p.code)?.letters === code.letters && !!p.earned !== wanted)
    // Every mark of that kind already stands as asked: place the first one again.
    if (index < 0) index = points.findIndex((p) => readCode(p.code)?.letters === code.letters)
    if (index < 0) return asNote
    const next = points.map((p, i) => (i === index ? { ...p, earned: wanted } : p))
    return { breakdown: breakdown.map((x, i) => (i === question ? withPoints({ ...x, points }, next) : x)), target: { question, point: index } }
  }
  if (a.text === '✓') {
    index = points.findIndex((p) => !readCode(p.code) && !p.earned)
    if (index < 0) return asNote
    return { breakdown: breakdown.map((x, i) => (i === question ? togglePoint({ ...x, points }, index) : x)), target: { question, point: index } }
  }
  return asNote
}
