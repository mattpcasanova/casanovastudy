// Regrading only some questions of a graded paper. The teacher picks the
// questions; the grader sees the pages those questions are on (when the first
// grading recorded them: GradedQuestion.pages) and returns just those entries,
// which replace the old ones. Everything else on the report, including the
// teacher's edits, stays. Pure; unit-tested. The route is
// POST /api/grade-exam/[id]/regrade { note, questions }.

import { normalizeQuestionKey, type GradedQuestion } from './parse'

/** The report's entries for the labels the teacher picked ("Q8" = "8"), in report order. */
export function targetQuestions(breakdown: GradedQuestion[], labels: string[]): GradedQuestion[] {
  const wanted = new Set(labels.map((l) => normalizeQuestionKey(String(l))))
  return breakdown.filter((q) => wanted.has(normalizeQuestionKey(String(q.questionNumber))))
}

/**
 * 1-based pages to send for these questions, or null for the whole paper:
 * when any of them has no recorded page (graded before pages were recorded,
 * or not attempted), a recorded page is past the end, or it's most of the
 * paper anyway.
 */
export function pagesToSend(targets: GradedQuestion[], pageCount: number): number[] | null {
  if (pageCount <= 1 || !targets.length) return null
  const pages = new Set<number>()
  for (const q of targets) {
    if (!Array.isArray(q.pages) || !q.pages.length) return null
    for (const p of q.pages) {
      if (!Number.isInteger(p) || p < 1 || p > pageCount) return null
      pages.add(p)
    }
  }
  if (pages.size >= pageCount) return null
  return [...pages].sort((a, b) => a - b)
}

/** The grader said an answer wasn't on the pages it was given. */
export const needsMorePages = (content: string) => /^\s*(?:\*\*)?\s*MORE PAGES NEEDED\b/im.test(content)

export interface RegradeChange { question: string; before: number; after: number }

/**
 * The breakdown with the regraded entries swapped in (labels and order stay
 * the report's; an entry the grader didn't return is left as it was). A new
 * entry with no page line keeps the old pages; the teacher's "checked" tick
 * goes, since the mark is new.
 */
export function mergeRegraded(breakdown: GradedQuestion[], regraded: GradedQuestion[], targets: GradedQuestion[]): { breakdown: GradedQuestion[]; changed: RegradeChange[]; notRegraded: string[] } {
  const bare = (label: string) => normalizeQuestionKey(label.replace(/\s*\(\d+(?:\.\d+)?(?:\s*marks?)?\)\s*$/i, ''))
  const fresh = new Map<string, GradedQuestion>()
  for (const q of regraded) {
    const key = bare(String(q.questionNumber))
    if (!fresh.has(key)) fresh.set(key, q)
  }
  const targetKeys = new Set(targets.map((q) => normalizeQuestionKey(String(q.questionNumber))))
  const changed: RegradeChange[] = []
  const notRegraded: string[] = []
  const merged = breakdown.map((old) => {
    const key = normalizeQuestionKey(String(old.questionNumber))
    if (!targetKeys.has(key)) return old
    const next = fresh.get(key)
    if (!next) { notRegraded.push(String(old.questionNumber)); return old }
    const entry: GradedQuestion = { ...next, questionNumber: old.questionNumber }
    if (!entry.pages?.length && old.pages?.length) entry.pages = old.pages
    if (Number(entry.marksAwarded) !== Number(old.marksAwarded)) changed.push({ question: String(old.questionNumber), before: Number(old.marksAwarded), after: Number(entry.marksAwarded) })
    return entry
  })
  return { breakdown: merged, changed, notRegraded }
}

/** The as-graded copy (ai_breakdown) with the same entries swapped; null stays null. */
export function mergeIntoAsGraded(asGraded: GradedQuestion[] | null, merged: GradedQuestion[], regradedLabels: string[]): GradedQuestion[] | null {
  if (!asGraded) return null
  const keys = new Set(regradedLabels.map((l) => normalizeQuestionKey(l)))
  const byKey = new Map(merged.map((q) => [normalizeQuestionKey(String(q.questionNumber)), q]))
  return asGraded.map((q) => {
    const key = normalizeQuestionKey(String(q.questionNumber))
    return keys.has(key) && byKey.has(key) ? byKey.get(key)! : q
  })
}
