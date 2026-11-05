// Parses the exam-grading model output into a per-question breakdown.
//
// The grading prompt asks for one entry per question:
//   **Question 1a**, Mark: 2/2 - feedback…   (feedback may wrap onto following lines)
// followed by closing sections (Total:, Percentage:, Grade:, Feedback:, Strengths:,
// Areas for improvement:). Parsing is LINE-based: an entry's feedback runs until
// the next entry line or a closing-section heading at the START of a line — so
// feedback that merely mentions "percentage" or "total" is no longer cut off
// (the old single regex stopped at those words anywhere in the text).

import { DEFAULT_SCALE, gradeFor } from './scale'
import type { MarkPoint, StampPlace } from './mark-points'

export interface GradedQuestion {
  questionNumber: string // bare label: "1", "2a", "3(b)(i)", "Section C 2a"
  marksAwarded: number
  marksPossible: number
  explanation: string
  /** Optional exam-board marking (AICE etc.), from a "Codes: … | Level: … | AO: …" line. */
  markCodes?: string
  level?: string
  ao?: Record<string, number>
  /** The grader wasn't sure it read the answer right ("Check: faint circle on C"); the teacher should look. */
  check?: string
  /** The teacher looked at the page and confirmed (or fixed) the mark; set on the report. */
  checked?: boolean
  /** 1-based pages the student's answer is on, from a "Page: 3" / "Page: 3-4" line (gradings since 2026-11-04). */
  pages?: number[]
  /** The separate marks on this question (M1, A1, B1 ...), each earned or not (lib/grading/mark-points.ts). */
  points?: MarkPoint[]
  /** A teacher-marked paper: this question is still waiting for its mark. */
  unmarked?: boolean
  /** Where the teacher put this question's score on the paper (questions with no mark points). */
  at?: StampPlace
  /** Levels of response: how many levels the scheme has. */
  levels?: number
  /** The expected answer in a line, for the teacher while marking (never sent to students). */
  guide?: string
}

// "**Question 1a**, Mark: 2/2 - text", "Question 1a: Mark 2/2", "2b, Mark: 1/3 — text",
// "**1(a)(i)** Mark: 1/2", "- Question 4, Marks: 2.5/3: text"
const ENTRY = /^\s*(?:[-*•]\s+)?(?:\*\*)?\s*(?:question\s+|q\.?\s*)?(.{1,50}?)\s*(?:\*\*)?\s*[,:\-–—]?\s*(?:\*\*)?\s*marks?\s*(?:awarded)?\s*[:=]?\s*(?:\*\*)?\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:marks?)?\s*(?:\*\*)?\s*[-–—:.]?\s*(.*)$/i

// Closing sections that end the last question's feedback (must start the line).
const SECTION_END = /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:total(?:\s+marks)?|percentage|overall\s+grade|grade|final\s+grade|overall\s+feedback|general\s+feedback|feedback|summary|strengths|areas\s+(?:for|to)\s+improve\w*|next\s+steps|\[mark scheme summary\]|\[end summary\])\b/i

// Optional tag line under a question: "Codes: M1 A1 B0 | Level: 3 | AO: AO1 2, AO2 1", "Check: faint circle on C", or "Page: 3-4"
const TAGS = /^\s*(?:[-*•]\s+)?(?:\*\*)?\s*(?:mark\s+)?(?:codes?|level|aos?|assessment\s+objectives?|check|pages?)\s*(?:\*\*)?\s*:/i

/** "3", "3-4", "3, 5", "3 and 4" -> [3], [3, 4], [3, 5], [3, 4]; at most 6 pages, none past 200. */
export function parsePageList(value: string): number[] {
  const out = new Set<number>()
  for (const part of value.split(/[,;&]|\band\b/i)) {
    const m = part.match(/(\d{1,3})(?:\s*(?:-|–|to)\s*(\d{1,3}))?/)
    if (!m) continue
    const from = parseInt(m[1], 10)
    const to = m[2] ? parseInt(m[2], 10) : from
    for (let n = from; n <= to && n - from < 6; n++) if (n >= 1 && n <= 200) out.add(n)
  }
  return [...out].sort((a, b) => a - b).slice(0, 6)
}

export function applyTags(q: GradedQuestion, line: string): void {
  for (const part of line.replace(/\*\*/g, '').split('|')) {
    const m = part.match(/^\s*(?:[-*•]\s+)?([a-z ]+?)\s*:\s*(.*)$/i)
    if (!m) continue
    const key = m[1].toLowerCase().trim()
    const value = m[2].trim()
    if (!value || /^(n\/?a|none|-)$/i.test(value)) continue
    if (key === 'check') {
      q.check = value.replace(/\*\*/g, '').slice(0, 160)
    } else if (key === 'page' || key === 'pages') {
      const pages = parsePageList(value)
      if (pages.length) q.pages = pages
    } else if (/codes?$/.test(key)) {
      const codes = value.match(/\b[A-Z]{1,2}\d+\b/g)
      if (codes) q.markCodes = codes.join(' ').slice(0, 120)
    } else if (key === 'level') {
      q.level = value.replace(/^level\s*/i, '').slice(0, 20)
    } else if (/^(aos?|assessment objectives?)$/.test(key)) {
      const ao: Record<string, number> = {}
      for (const [, name, n] of value.matchAll(/\b(AO\s*\d+)\s*[:=]?\s*(\d+(?:\.\d+)?)/gi)) {
        const k = name.replace(/\s+/g, '').toUpperCase()
        ao[k] = (ao[k] ?? 0) + parseFloat(n)
      }
      if (Object.keys(ao).length) q.ao = ao
    }
  }
}

function cleanLabel(raw: string): string | null {
  const label = raw.replace(/\*\*/g, '').replace(/^(?:question|q\.?)\s*/i, '').replace(/[\s,:\-–—]+$/, '').trim()
  if (!label || label.length > 50) return null
  // Must look like a question identifier: contains a digit, or is a section/part reference.
  if (!/\d/.test(label) && !/^(section|part|option)\b/i.test(label)) return null
  // Reject prose that happens to contain "mark x/y" (e.g. "Lost 3 marks").
  if (/\b(lost|awarded|scored|gets?|earned|the|student|answer|because|but)\b/i.test(label)) return null
  return label
}

export function normalizeQuestionKey(label: string): string {
  return label.toLowerCase().replace(/^(?:question|q\.?)\s*/i, '').replace(/\s+/g, '')
}

export function parseGradingOutput(content: string): {
  breakdown: GradedQuestion[]
  totalMarks: number
  totalPossible: number
  grade: string
} {
  const breakdown: GradedQuestion[] = []
  const seen = new Set<string>()
  let current: GradedQuestion | null = null
  let inSummary = false

  const finish = () => {
    if (current) {
      current.explanation = current.explanation.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000)
      breakdown.push(current)
    }
    current = null
  }

  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    // Skip the mark-scheme summary block entirely.
    if (/\[mark scheme summary\]/i.test(line)) { finish(); inSummary = true; continue }
    if (inSummary) { if (/\[end summary\]/i.test(line)) inSummary = false; continue }

    const m = line.match(ENTRY)
    const label = m ? cleanLabel(m[1]) : null
    if (m && label) {
      finish()
      const key = normalizeQuestionKey(label)
      if (seen.has(key)) continue // duplicates: keep the first grading
      seen.add(key)
      current = {
        questionNumber: label,
        marksAwarded: parseFloat(m[2]),
        marksPossible: parseFloat(m[3]),
        explanation: m[4] ?? '',
      }
      continue
    }
    if (current && TAGS.test(line)) { applyTags(current, line); continue }
    if (SECTION_END.test(line)) { finish(); continue }
    if (current && line.trim()) current.explanation += ' ' + line.trim()
  }
  finish()

  // Totals and grade always come from the breakdown (the model's own Total line
  // and letter grade can disagree or use non-US scales).
  const totalMarks = breakdown.reduce((s, q) => s + q.marksAwarded, 0)
  const totalPossible = breakdown.reduce((s, q) => s + q.marksPossible, 0)
  const grade = gradeFor(DEFAULT_SCALE, totalMarks, totalPossible)
  return { breakdown, totalMarks, totalPossible, grade }
}
