// Class report for assigned practice: the same "how the class did" as a
// graded set, built from each student's answers instead of marks. Each
// question is worth 1 (right or wrong), so the graded-set tools (topic
// stats, reteach groups, the AI class report) work on it unchanged.
// Pure; unit-tested.

import { answerText, parseQuizContent } from '@/lib/formats/quiz'
import { parsePractice } from '@/lib/formats/practice'
import { parseAdaptive } from '@/lib/adaptive/format'
import { plainText } from '@/lib/formats/normalize'
import { activityText } from '@/lib/learner/missed'
import type { GradedQuestion } from '@/lib/grading/parse'
import type { ReteachPaper } from '@/lib/grading/reteach'

export interface ReportQuestion {
  /** study_results-style id: q:<id> quiz, p:<id> practice, a:<id> adaptive. */
  itemId: string
  /** "1", "2", ... in guide order. */
  label: string
  text: string
  answer: string
  topic: string
  kind: string
  options?: string[]
}

/** One answer in a finished run (first answer per question). */
/** `score`: partial credit (0-1) on a multi-part activity that wasn't fully right. */
export interface PracticeAnswer { id: string; correct: boolean; given?: string; score?: number }

export interface StudentRun {
  rosterId: string
  name: string
  answers: PracticeAnswer[]
  /** Every question was in the run (quiz and practice), so unanswered ones count as wrong. Adaptive picks questions, so it's false. */
  complete: boolean
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)
const tidy = (t: string, n = 400) => clip(plainText(t).replace(/\s+/g, ' ').trim(), n)

/** The gradable questions of an assigned guide, in order. Adaptive explain questions are feedback only, so they're left out. */
export function reportQuestions(format: string, content: string): ReportQuestion[] {
  const out: Omit<ReportQuestion, 'label'>[] = []
  if (format === 'quiz') {
    for (const q of parseQuizContent(content)) {
      out.push({
        itemId: `q:${q.id}`,
        text: tidy(q.question),
        answer: tidy(answerText(q), 300),
        topic: q.section?.trim() ?? '',
        kind: q.type,
        ...(q.type === 'mc' ? { options: q.options.map((o) => tidy(o, 200)) } : {}),
      })
    }
  } else if (format === 'practice') {
    for (const a of parsePractice(content)) {
      const m = activityText(a)
      out.push({
        itemId: `p:${a.id}`,
        text: tidy(m?.question ?? a.prompt),
        answer: tidy(m?.answer ?? '', 300),
        topic: a.topic?.trim() ?? '',
        kind: a.kind,
        ...(a.kind === 'choice' ? { options: a.options.map((o) => tidy(o, 200)) } : {}),
      })
    }
  } else if (format === 'adaptive') {
    const guide = parseAdaptive(content)
    const concept = new Map(guide.concepts.map((c) => [c.id, c.name]))
    for (const q of guide.questions) {
      if (q.type === 'explain') continue
      const answer = q.type === 'mc' ? q.options[q.correct] ?? '' : q.type === 'tf' ? (q.correct === 0 ? 'True' : 'False') : q.answers[0] ?? ''
      out.push({
        itemId: `a:${q.id}`,
        text: tidy(q.prompt),
        answer: tidy(answer, 300),
        topic: concept.get(q.conceptId) ?? '',
        kind: q.type,
        ...(q.type === 'mc' ? { options: q.options.map((o) => tidy(o, 200)) } : {}),
      })
    }
  }
  return out.map((q, i) => ({ ...q, label: String(i + 1) }))
}

/** Adaptive saves mc/tf answers as an option index; show the option instead. */
export function givenText(q: ReportQuestion, given: string | undefined): string | null {
  if (given == null || !String(given).trim()) return null
  const g = String(given).trim()
  if (q.itemId.startsWith('a:') && (q.kind === 'mc' || q.kind === 'tf') && /^\d+$/.test(g)) {
    const i = Number(g)
    if (q.kind === 'tf') return i === 0 ? 'True' : 'False'
    return q.options?.[i] ?? g
  }
  if (q.kind === 'tf') return /^t/i.test(g) ? 'True' : /^f/i.test(g) ? 'False' : g
  return tidy(g, 200)
}

/** Answers from the browser, cleaned (null when there are none). */
export function sanitizeAnswers(v: unknown): PracticeAnswer[] | null {
  if (!Array.isArray(v)) return null
  const seen = new Set<string>()
  const out: PracticeAnswer[] = []
  for (const a of v.slice(0, 400)) {
    const id = typeof a?.id === 'string' ? a.id.slice(0, 120) : ''
    if (!/^[qpa]:/.test(id) || seen.has(id) || typeof a?.correct !== 'boolean') continue
    seen.add(id)
    const given = typeof a.given === 'string' && a.given.trim() ? a.given.trim().slice(0, 300) : undefined
    const score = !a.correct && typeof a.score === 'number' && a.score > 0 && a.score < 1 ? Math.round(a.score * 100) / 100 : undefined
    out.push({ id, correct: a.correct, ...(given ? { given } : {}), ...(score ? { score } : {}) })
  }
  return out.length ? out : null
}

/** Each student's run as a "paper" (1 mark per question) for the graded-set tools. Paper ids are roster ids. */
export function practicePapers(questions: ReportQuestion[], runs: StudentRun[]): ReteachPaper[] {
  return runs.map((r) => {
    const byId = new Map(r.answers.map((a) => [a.id, a]))
    const breakdown: GradedQuestion[] = []
    for (const q of questions) {
      const a = byId.get(q.itemId)
      if (!a && !r.complete) continue
      const given = givenText(q, a?.given)
      breakdown.push({
        questionNumber: q.label,
        marksAwarded: a?.correct ? 1 : a?.score ?? 0,
        marksPossible: 1,
        explanation: a?.correct ? '' : !a ? 'Not answered.' : a.score ? `Partly right${given ? ` (${given})` : ''}.` : given ? `Answered "${given}"; the answer is "${q.answer}".` : `Got it wrong; the answer is "${q.answer}".`,
      })
    }
    return { id: r.rosterId, name: r.name, rosterId: r.rosterId, breakdown }
  }).filter((p) => p.breakdown.length > 0)
}

export interface ReportStudent { rosterId: string; name: string }

export interface QuestionResult {
  question: ReportQuestion
  /** Students who saw it (answered, or skipped in a complete run). */
  n: number
  pct: number
  right: ReportStudent[]
  /** Wrong answers grouped by what they picked or wrote, most common first (given null = not recorded). */
  wrong: Array<{ given: string | null; students: ReportStudent[] }>
  skipped: ReportStudent[]
}

/** Per-question results, in guide order; questions nobody saw are left out. */
export function questionResults(questions: ReportQuestion[], runs: StudentRun[]): QuestionResult[] {
  const out: QuestionResult[] = []
  for (const q of questions) {
    const right: ReportStudent[] = []
    const skipped: ReportStudent[] = []
    const wrong = new Map<string, { given: string | null; students: ReportStudent[] }>()
    for (const r of runs) {
      const who = { rosterId: r.rosterId, name: r.name }
      const a = r.answers.find((x) => x.id === q.itemId)
      if (!a) { if (r.complete) skipped.push(who); continue }
      if (a.correct) { right.push(who); continue }
      const given = givenText(q, a.given)
      const key = given ? given.toLowerCase() : '\u0000'
      const g = wrong.get(key) ?? { given, students: [] }
      g.students.push(who)
      wrong.set(key, g)
    }
    const n = right.length + skipped.length + [...wrong.values()].reduce((s, g) => s + g.students.length, 0)
    if (!n) continue
    const groups = [...wrong.values()].sort((a, b) => (a.given === null ? 1 : 0) - (b.given === null ? 1 : 0) || b.students.length - a.students.length)
    out.push({ question: q, n, pct: (right.length / n) * 100, right, wrong: groups, skipped })
  }
  return out
}

/** The guide's own topics (quiz sections, practice topics, adaptive concepts) as label groups; empty when it has fewer than 2. */
export function guideTopics(questions: ReportQuestion[]): Array<{ name: string; questions: string[] }> {
  const byName = new Map<string, string[]>()
  for (const q of questions) {
    if (!q.topic) continue
    byName.set(q.topic, [...(byName.get(q.topic) ?? []), q.label])
  }
  return byName.size >= 2 ? [...byName.entries()].map(([name, labels]) => ({ name, questions: labels })) : []
}

/**
 * What the AI reads for the class report: every question with its text,
 * the answer, how many got it right and the wrong answers students gave.
 * Never names students.
 */
export function practiceInsightsInput(results: QuestionResult[], students: number): string {
  const lines = [`${students} student${students === 1 ? '' : 's'} finished it. Each question is right or wrong (1 mark).`]
  for (const r of results) {
    const q = r.question
    lines.push('', `Question ${q.label}${q.topic ? ` (topic: ${q.topic})` : ''}: ${clip(q.text, 300)}`)
    lines.push(`Answer: ${clip(q.answer, 200)}. ${r.right.length} of ${r.n} right (${Math.round(r.pct)}%)${r.skipped.length ? `, ${r.skipped.length} left it blank` : ''}.`)
    const given = r.wrong.filter((w) => w.given)
    if (given.length) lines.push(`Wrong answers given: ${given.slice(0, 5).map((w) => `"${clip(w.given!, 120)}" (${w.students.length})`).join(', ')}`)
  }
  return lines.join('\n')
}

/** Which of a student's attempts the report uses: the best counted one (the one that's graded), else the latest. */
export function reportAttempt<T extends { pct: number; counted: boolean; finishedAt: string }>(attempts: T[]): T | null {
  const counted = attempts.filter((a) => a.counted)
  if (counted.length) return counted.reduce((best, a) => (a.pct > best.pct ? a : best))
  return [...attempts].sort((a, b) => a.finishedAt.localeCompare(b.finishedAt)).pop() ?? null
}

/**
 * Older attempts didn't save answers: rebuild them from the answer log
 * (study_results) for that guide between the previous attempt and this one.
 * The last answer per item wins, since a missed-only retry before the run
 * also logs answers.
 */
export function answersFromLog(rows: Array<{ item_id: string; correct: boolean; answered_at: string }>, after: string | null, upTo: string): PracticeAnswer[] {
  const end = Date.parse(upTo) + 2 * 60 * 1000 // answers can be logged a moment after the run is sent
  const start = after ? Date.parse(after) : -Infinity
  const byId = new Map<string, PracticeAnswer>()
  for (const r of [...rows].sort((a, b) => a.answered_at.localeCompare(b.answered_at))) {
    const t = Date.parse(r.answered_at)
    if (!(t > start && t <= end) || !/^[qpa]:/.test(r.item_id)) continue
    byId.set(r.item_id, { id: r.item_id, correct: !!r.correct })
  }
  return [...byId.values()]
}
