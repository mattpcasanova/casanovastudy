// Scores a student's saved, unfinished run (study_progress) of an assigned
// guide: how far along they are (teacher's "In progress") and what gets sent
// for them when the due date passes (unanswered counts as 0). Pure.

import { parsePractice } from '@/lib/formats/practice'
import { isObjectiveCorrect, parseQuizContent } from '@/lib/formats/quiz'
import { parseAdaptive } from '@/lib/adaptive/format'
import { conceptProgress, sessionSummary, type AdaptiveAnswer } from '@/lib/adaptive/engine'
import { cleanPracticeRun, cleanQuizRun, parseSaved } from '@/lib/run-progress-rules'
import type { PracticeAnswer } from './report'

export interface SavedRunScore {
  /** Points (percent grading) or concepts mastered (adaptive). */
  correct: number
  /** Activities / questions in the guide, or concepts (adaptive). */
  total: number
  /** Items answered so far (adaptive: questions answered). */
  answered: number
  /** What `answered` counts, for labels. */
  unit: 'activities' | 'questions'
  answers: PracticeAnswer[]
  /** Adaptive (mastery grading) only. */
  mastered?: string[]
  notMastered?: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

/**
 * Null when there's nothing to send: no saved run, nothing answered, or a
 * "retry the missed ones" run (not a full attempt).
 */
export function scoreSavedRun(format: string, content: string, data: unknown): SavedRunScore | null {
  if (format === 'practice') {
    const saved = parseSaved(data)
    const activities = parsePractice(content)
    const run = saved?.run != null ? cleanPracticeRun(saved.run, activities.map((a) => a.id)) : null
    if (!run || run.subset) return null
    const done = activities.filter((a) => run.results[a.id])
    if (!done.length) return null
    const points = done.reduce((sum, a) => {
      const r = run.results[a.id]
      return sum + (r.correct ? 1 : r.score ?? 0)
    }, 0)
    return {
      correct: round2(points),
      total: activities.length,
      answered: done.length,
      unit: 'activities',
      answers: done.map((a) => {
        const r = run.results[a.id]
        return { id: `p:${a.id}`, correct: r.correct, ...(r.given ? { given: r.given } : {}), ...(!r.correct && r.score ? { score: r.score } : {}) }
      }),
    }
  }
  if (format === 'quiz') {
    const saved = parseSaved(data)
    const questions = parseQuizContent(content)
    const run = saved?.run != null ? cleanQuizRun(saved.run, questions.map((q) => q.id)) : null
    if (!run || run.subset) return null
    const answered = questions.filter((q) => run.answers[q.id]?.trim())
    if (!answered.length) return null
    // Short answers count only once they were scored (a typed but unchecked answer can't be graded here).
    const marks = answered.map((q) => ({ q, ok: q.type === 'sa' ? !!run.saScores[q.id]?.isCorrect : isObjectiveCorrect(q, run.answers[q.id]) }))
    return {
      correct: marks.filter((m) => m.ok).length,
      total: questions.length,
      answered: answered.length,
      unit: 'questions',
      answers: marks.map(({ q, ok }) => ({ id: `q:${q.id}`, correct: ok, given: run.answers[q.id].slice(0, 300) })),
    }
  }
  if (format === 'adaptive') {
    const answers = (data as { answers?: unknown } | null)?.answers
    if (!Array.isArray(answers) || !answers.length) return null
    const guide = parseAdaptive(content)
    const log = answers as AdaptiveAnswer[]
    const summary = sessionSummary(guide, log)
    if (!summary.answered || !summary.total) return null
    const progress = conceptProgress(guide, log)
    return {
      correct: summary.mastered,
      total: summary.total,
      answered: summary.answered,
      unit: 'questions',
      answers: [],
      mastered: progress.filter((p) => p.status === 'mastered').map((p) => p.name),
      notMastered: progress.filter((p) => p.status !== 'mastered').map((p) => p.name),
    }
  }
  return null
}
