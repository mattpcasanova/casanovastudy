// Editing a finished guide (the Edit page). A guide is stored as the text its
// viewer parses, so editing works on that text without losing anything the
// parsers read: the guide is cut into PIECES (one question, card, event or
// section each), and a piece into FIELDS (its labeled lines: the question, each
// option, the answer, the explanation; everything else stays as free text).
// Putting fields and pieces back together gives the same text with the edits in.
// Pure; unit-tested (a round trip must parse to the same guide).

import { parseQuizRaw } from '@/lib/formats/quiz'
import { parsePracticeRaw } from '@/lib/formats/practice'
import { sameShape } from '@/lib/formats/versions'

export const EDITABLE_FORMATS = ['quiz', 'practice', 'flashcards', 'outline', 'summary', 'cheatsheet', 'timeline'] as const
export type EditableFormat = (typeof EDITABLE_FORMATS)[number]
export const isEditableFormat = (format: string): format is EditableFormat => (EDITABLE_FORMATS as readonly string[]).includes(format)

export const GUIDE_CONTENT_MAX = 400_000
export const GUIDE_TITLE_MAX = 200

export type PieceKind = 'title' | 'heading' | 'item' | 'section' | 'text'
export interface Piece { id: number; kind: PieceKind; text: string }

const FENCE = /^\s*(`{3,}|~{3,})/
const HEADING = /^\s*#{1,6}\s+\S/
const QUIZ_ITEM = /(MC|TF|SA|NUM)_QUESTION:/
const PRACTICE_ITEM = /^\s*\*{0,2}(MATCH|FILL|ORDER|SORT|MC_QUESTION|TF_QUESTION|FIND_BUG|WRITE_CODE)\s*:/i
const CARD_ITEM = /^\s*\*{0,2}(?:Q|Question)\s*\d*\s*:/i
const EVENT_ITEM = /^\s*\*{0,2}EVENT\s*:/i

const ITEM_START: Partial<Record<EditableFormat, RegExp>> = { quiz: QUIZ_ITEM, practice: PRACTICE_ITEM, flashcards: CARD_ITEM, timeline: EVENT_ITEM }

/** What one item is called in each format ("Question 3", "Card 12"). */
export const ITEM_NOUN: Record<EditableFormat, string> = {
  quiz: 'Question', practice: 'Activity', flashcards: 'Card', timeline: 'Event', outline: 'Section', summary: 'Section', cheatsheet: 'Box',
}

/** Cuts a guide into pieces. A heading or an item marker (outside code fences) starts a new one. */
export function splitPieces(format: EditableFormat, content: string): Piece[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n')
  const itemStart = ITEM_START[format]
  const pieces: Piece[] = []
  let current: { kind: PieceKind; lines: string[] } | null = null
  let fence: string | null = null
  let sawTitle = false
  const close = () => {
    if (!current) return
    const text = current.lines.join('\n').replace(/^\n+|\s+$/g, '')
    if (text) pieces.push({ id: pieces.length, kind: current.kind, text })
    current = null
  }
  for (const line of lines) {
    if (fence) {
      current?.lines.push(line)
      if (line.trim().startsWith(fence)) fence = null
      continue
    }
    const f = line.match(FENCE)
    if (f) {
      fence = f[1]
      if (!current) current = { kind: 'text', lines: [] }
      current.lines.push(line)
      continue
    }
    if (HEADING.test(line)) {
      close()
      const top = /^\s*#\s/.test(line) && !sawTitle
      if (top) sawTitle = true
      current = { kind: top ? 'title' : itemStart ? 'heading' : 'section', lines: [line] }
      continue
    }
    if (itemStart?.test(line)) {
      close()
      current = { kind: 'item', lines: [line] }
      continue
    }
    if (!current) {
      if (!line.trim()) continue
      current = { kind: 'text', lines: [] }
    }
    current.lines.push(line)
  }
  close()
  return pieces
}

/** The guide text again, one blank line between pieces. */
export function joinPieces(pieces: Array<Pick<Piece, 'text'>>): string {
  return pieces.map((p) => p.text.replace(/^\n+|\s+$/g, '')).filter(Boolean).join('\n\n') + '\n'
}

// ---------- fields inside a piece ----------

export type Field =
  | { type: 'heading'; prefix: string; value: string }
  | { type: 'line'; key: string; label: string; prefix: string; value: string }
  | { type: 'option'; letter: string; prefix: string; value: string }
  | { type: 'text'; value: string }

const LABELS: Record<string, string> = {
  MC_QUESTION: 'Multiple choice question', TF_QUESTION: 'True or false question', SA_QUESTION: 'Written question', NUM_QUESTION: 'Number question',
  'CORRECT ANSWER': 'Correct answer', ANSWER: 'Answer', 'SAMPLE ANSWER': 'Sample answer', EXPLANATION: 'Explanation', WHY: 'Why it matters', HINT: 'Hint',
  MATCH: 'Matching', FILL: 'Fill in the blank', ORDER: 'Put in order', SORT: 'Sort into groups', FIND_BUG: 'Find the bug', WRITE_CODE: 'Write the code',
  EVENT: 'Event', WHAT: 'What happened', Q: 'Front', QUESTION: 'Front', A: 'Back',
}

const LINE_KEYS: Record<EditableFormat, string> = {
  quiz: 'correct answer|sample answer|answer|explanation|hint',
  practice: 'match|fill|order|sort|mc_question|tf_question|find_bug|write_code|correct answer|answer|explanation|why|hint',
  flashcards: 'question\\s*\\d*|q\\s*\\d*|answer|a',
  timeline: 'event|what|why',
  outline: '', summary: '', cheatsheet: '',
}

/** What to type under a marker whose body is free text (shown as a hint beside it). */
export const BODY_HINTS: Record<string, string> = {
  MATCH: 'One pair per line: - Term = definition',
  FILL: 'Each blank is {{answer}}; add other accepted answers with |, like {{mitochondria|mitochondrion}}',
  ORDER: 'One step per line, numbered, in the correct order (students see them shuffled)',
  SORT: 'One group per line: - Group name: item, item, item',
  EVENT: 'Date | title, like 1776 | Declaration of Independence',
  NUM_QUESTION: 'Answer is the number; separate equal forms with |, like 3.5 | 7/2',
}

/** Cuts a piece into its labeled lines and the free text between them. */
export function pieceFields(format: EditableFormat, text: string): Field[] {
  const keys = LINE_KEYS[format]
  const lineRe = keys ? new RegExp(`^(\\s*\\*{0,2}(${keys})\\s*:\\*{0,2}[ \\t]*)(.*)$`, 'i') : null
  const options = format === 'quiz' || format === 'practice'
  const fields: Field[] = []
  let fence: string | null = null
  const free = (line: string) => {
    const last = fields[fields.length - 1]
    if (last?.type === 'text') last.value += '\n' + line
    else fields.push({ type: 'text', value: line })
  }
  for (const line of text.split('\n')) {
    if (fence) {
      free(line)
      if (line.trim().startsWith(fence)) fence = null
      continue
    }
    const f = line.match(FENCE)
    if (f) { fence = f[1]; free(line); continue }
    const h = line.match(/^(\s*#{1,6}\s+)(.*)$/)
    if (h) { fields.push({ type: 'heading', prefix: h[1], value: h[2] }); continue }
    if (format === 'quiz') {
      const q = line.match(/^(.*?((?:MC|TF|SA|NUM)_QUESTION):\*{0,2}[ \t]*)(.*)$/)
      if (q) { fields.push({ type: 'line', key: q[2], label: LABELS[q[2]], prefix: q[1], value: q[3] }); continue }
    }
    if (options) {
      const o = line.match(/^(\s*\*{0,2}\(?([A-F])[).][ \t]+)(.*)$/)
      if (o) { fields.push({ type: 'option', letter: o[2], prefix: o[1], value: o[3] }); continue }
    }
    const m = lineRe ? line.match(lineRe) : null
    if (m) {
      const key = m[2].toUpperCase().replace(/\s*\d+$/, '').replace(/\s+/g, ' ')
      fields.push({ type: 'line', key, label: LABELS[key] ?? m[2], prefix: m[1], value: m[3] })
      continue
    }
    free(line)
  }
  return fields
}

/** A field's value is one line unless it is free text: line breaks typed into it become spaces. */
export function joinFields(fields: Field[]): string {
  return fields.map((f) => (f.type === 'text' ? f.value : f.prefix + f.value.replace(/\s*\n+\s*/g, ' '))).join('\n')
}

// ---------- checks before saving ----------

/** How many items the viewer will show (questions, activities, cards, events); null for formats without items. */
export function itemCount(format: EditableFormat, content: string): number | null {
  if (format === 'quiz') return parseQuizRaw(content).length
  if (format === 'practice') return parsePracticeRaw(content).length
  if (format === 'flashcards' || format === 'timeline') return splitPieces(format, content).filter((p) => p.kind === 'item').length
  return null
}

/**
 * Why an edit can't be saved, or null. `locked` = the guide is assigned to students:
 * their answers and the teacher's report are matched to items by position, so
 * the items have to stay the same in number, order and type (wording is free).
 */
export function editProblem(format: EditableFormat, before: string, after: string, locked: boolean): string | null {
  if (!after.trim()) return 'The guide is empty.'
  if (after.length > GUIDE_CONTENT_MAX) return 'The guide is too long to save.'
  // (Old guides without item markers have none to begin with.)
  if (itemCount(format, after) === 0 && itemCount(format, before) !== 0) return `There has to be at least one ${ITEM_NOUN[format].toLowerCase()}.`
  if (format === 'quiz' || format === 'practice') {
    // A multiple-choice key has to name one of the item's own options.
    let n = 0
    for (const piece of splitPieces(format, after)) {
      if (piece.kind !== 'item') continue
      n++
      const fields = pieceFields(format, piece.text)
      const letters = fields.filter((f) => f.type === 'option').map((f) => (f as { letter: string }).letter)
      if (!letters.length) continue
      const key = fields.find((f) => f.type === 'line' && (f.key === 'CORRECT ANSWER' || f.key === 'ANSWER'))
      const letter = key?.value.match(/^\W*([A-F])\b/i)?.[1].toUpperCase()
      if (!letter || !letters.includes(letter)) return `${ITEM_NOUN[format]} ${n} needs a correct answer that is one of its options.`
    }
  }
  if (locked && (format === 'quiz' || format === 'practice') && !sameShape(format, before, after)) {
    return `This ${format === 'quiz' ? 'quiz' : 'practice set'} is assigned to students, so its ${format === 'quiz' ? 'questions' : 'activities'} have to stay the same in number, type and number of options. You can change any wording.`
  }
  return null
}
