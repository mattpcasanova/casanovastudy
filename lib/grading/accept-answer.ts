// After grading, the teacher decides a question should also accept another
// answer ("I'll take B as well on question 5"), or that everyone gets the
// marks for it (a bad question). Both re-mark that question across the whole
// class set from the saved reports, without grading again: the grader's
// feedback says what the student chose ("Chose C", "Correct, B"), and that is
// what gets matched. Pure; unit-tested. The class results page sends it as
// PATCH /api/grade-batch/[id] { acceptAnswer }.

import type { GradedQuestion } from './parse'

export interface AcceptAnswer {
  /** The question label exactly as in the breakdown ("5", "2a"). */
  question: string
  /** Letters (or short answers) to accept besides the key's; ignored when `everyone`. */
  answers: string[]
  /** Full marks for every student, whatever they wrote. */
  everyone: boolean
  /** Shown on each changed report ("Teacher also accepted B."). */
  reason?: string
}

export interface AcceptPlanRow {
  id: string
  name: string
  /** What the student chose, read from the feedback; null when it couldn't be told. */
  given: string | null
  before: number
  after: number
  changed: boolean
}

const LETTER = String.raw`\(?([A-Ha-h])\)?`
// No lookbehind (Safari before 16.4 throws on it at load): "answer was C" captures the word before it and skips "correct/right answer was C".
const GIVEN_PATTERNS: Array<{ re: RegExp; letter: number; skipIf?: (m: RegExpMatchArray) => boolean }> = [
  { re: new RegExp(String.raw`\b(?:chose|circled|selected|picked|marked|shaded|answered|chosen|gave|wrote)\s+(?:option\s+|answer\s+|letter\s+)?${LETTER}(?![a-z])`, 'i'), letter: 1 },
  { re: new RegExp(String.raw`^\s*correct[,:]?\s+${LETTER}(?![a-z])`, 'i'), letter: 1 },
  { re: new RegExp(String.raw`(?:^|\b(\w+)\s+)(?:student'?s?\s+)?answer\s+(?:was|is|given)\s*:?\s*${LETTER}(?![a-z])`, 'i'), letter: 2, skipIf: (m) => /^(?:correct|right)$/i.test(m[1] ?? '') },
  { re: new RegExp(String.raw`\bcorrect(?:ly)?\s+(?:answer(?:ed)?|chose|selected)\s+${LETTER}(?![a-z])`, 'i'), letter: 1 },
]

/** The option the student chose, as the grader wrote it ("Chose D (N and Cl)" -> "D"); null when the feedback doesn't say. */
export function givenAnswer(explanation: string | null | undefined): string | null {
  const text = (explanation ?? '').trim()
  if (!text) return null
  // "No answer is circled", "Nothing marked", "Left blank": the grader read no choice.
  if (/^(?:no (?:answer|choice|option|letter)|nothing|left blank|answer (?:could )?not)/i.test(text)) return null
  for (const { re, letter, skipIf } of GIVEN_PATTERNS) {
    const m = text.match(re)
    if (m && !skipIf?.(m)) return m[letter].toUpperCase()
  }
  return null
}

export const normalizeAnswerList = (raw: string): string[] =>
  [...new Set(raw.split(/[\s,;/]+/).map((a) => a.trim().toUpperCase()).filter((a) => a && a.length <= 20))]

/** Same label, ignoring spaces, case and "Question " ("Q5" = "5", "2 a" = "2a"). */
export const sameQuestion = (a: string, b: string) =>
  a.replace(/^question\s+|^q\.?\s*/i, '').replace(/\s+/g, '').toLowerCase() === b.replace(/^question\s+|^q\.?\s*/i, '').replace(/\s+/g, '').toLowerCase()

/** What would change on each paper. */
export function acceptAnswerPlan(papers: Array<{ id: string; name: string; breakdown: GradedQuestion[] }>, accept: AcceptAnswer): AcceptPlanRow[] {
  const answers = new Set(accept.answers.map((a) => a.toUpperCase()))
  return papers.map((p) => {
    const q = p.breakdown.find((x) => sameQuestion(String(x.questionNumber), accept.question))
    if (!q) return { id: p.id, name: p.name, given: null, before: 0, after: 0, changed: false }
    const before = Number(q.marksAwarded || 0)
    const possible = Number(q.marksPossible || 0)
    const given = givenAnswer(q.explanation)
    const earns = accept.everyone || (given !== null && answers.has(given))
    const after = earns ? Math.max(before, possible) : before
    return { id: p.id, name: p.name, given, before, after, changed: after !== before }
  })
}

/** The breakdown with that question re-marked (a new array; untouched questions are the same objects). */
export function applyAcceptance(breakdown: GradedQuestion[], accept: AcceptAnswer): GradedQuestion[] {
  const plan = acceptAnswerPlan([{ id: 'x', name: '', breakdown }], accept)[0]
  if (!plan.changed) return breakdown
  const note = accept.everyone
    ? `Teacher gave everyone full marks for this question${accept.reason ? ` (${accept.reason})` : ''}.`
    : `Teacher also accepted ${plan.given}${accept.reason ? ` (${accept.reason})` : ''}.`
  return breakdown.map((q) => (sameQuestion(String(q.questionNumber), accept.question)
    ? { ...q, marksAwarded: Number(q.marksPossible || 0), explanation: `${(q.explanation ?? '').trim()} ${note}`.trim() }
    : q))
}
