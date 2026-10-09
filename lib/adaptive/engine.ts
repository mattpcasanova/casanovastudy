// The adaptive practice loop, as pure functions (unit-tested in engine.test.ts).
// Nothing here calls the AI: the student's saved answers are replayed against
// the guide's question bank to decide what comes next, so answering is free.
// The only AI calls are the refills (when a concept runs low on questions) and
// the occasional "explain it" answer check; both are capped server-side.
//
// Mastery uses the same rule as teacher mastery quizzes (lib/mastery/engine.ts):
// 80% of the last 5 answers, at least 3 answered, stop after 15 on one concept.

import { evaluateConceptStatus, type ConceptStatus } from '@/lib/mastery/engine'
import type { AdaptiveGuide, AdaptiveLevel, AdaptiveQuestion } from './format'

export const ADAPTIVE_RULES = {
  threshold: 0.8,
  window: 5,
  minAnswered: 3,
  maxPerConcept: 15,
  /** Refill batches per session (each ~4 questions on Sonnet, ~$0.02-0.04). */
  maxRefills: 6,
  /**
   * Ask for a refill when a concept is down to this many unanswered questions.
   * The opening batch has 4 per concept (Opus); a refill is ~20x cheaper per
   * question (Sonnet), so students who need more get them from refills.
   */
  refillAt: 1,
  /** "Explain it in your own words" comes right after a correct answer once a concept is going this well... */
  explainMinAccuracy: 0.6,
  /** ...with at least this many answers on it (so it can follow the answer that masters it). One per concept; it never counts toward mastery. */
  explainAfter: 3,
  /** A missed question can come back for review after this many other questions on its concept. */
  reviewGap: 2,
} as const

export interface AdaptiveAnswer {
  /** Question id. */
  q: string
  correct: boolean
  /** mc/tf: option index; num/explain: what they typed. */
  given?: string
  /** explain only: the AI's 0-100 score. */
  score?: number
  /** Epoch ms. */
  at?: number
}

export type AdaptiveConceptStatus = ConceptStatus | 'out_of_questions'

export interface ConceptProgress {
  id: string
  name: string
  answered: number
  correct: number
  /** Last `window` results, oldest first. */
  recent: boolean[]
  accuracy: number
  status: AdaptiveConceptStatus
  /** Difficulty to serve next (1-3): up after two right in a row, down after a miss. */
  level: AdaptiveLevel
  /** Wrong answers in a row (2+ shows the concept's lesson). */
  missStreak: number
  /** Unanswered gradeable (non-explain) questions left. */
  remaining: number
  explainDone: boolean
}

const gradeable = (q: AdaptiveQuestion) => q.type !== 'explain'

/** Per-concept progress from the answer log. Explain answers never count toward mastery. */
export function conceptProgress(guide: AdaptiveGuide, answers: AdaptiveAnswer[]): ConceptProgress[] {
  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  return guide.concepts.map((c) => {
    const mine = answers.filter((a) => byId.get(a.q)?.conceptId === c.id)
    const graded = mine.filter((a) => gradeable(byId.get(a.q)!))
    const results = graded.map((a) => a.correct)
    const recent = results.slice(-ADAPTIVE_RULES.window)
    let level: AdaptiveLevel = 2
    let streak = 0
    let missStreak = 0
    for (const ok of results) {
      if (ok) {
        missStreak = 0
        if (++streak >= 2) { level = Math.min(3, level + 1) as AdaptiveLevel; streak = 0 }
      } else {
        streak = 0
        missStreak++
        level = Math.max(1, level - 1) as AdaptiveLevel
      }
    }
    const answeredIds = new Set(mine.map((a) => a.q))
    const remaining = guide.questions.filter((q) => q.conceptId === c.id && gradeable(q) && !answeredIds.has(q.id)).length
    const status = evaluateConceptStatus(
      { answered_count: results.length, recent_results: recent },
      { mastery_threshold: ADAPTIVE_RULES.threshold, min_questions: ADAPTIVE_RULES.minAnswered, max_questions_per_concept: ADAPTIVE_RULES.maxPerConcept },
    )
    return {
      id: c.id,
      name: c.name,
      answered: results.length,
      correct: results.filter(Boolean).length,
      recent,
      accuracy: recent.length ? recent.filter(Boolean).length / recent.length : 0,
      status,
      level,
      missStreak,
      remaining,
      explainDone: mine.some((a) => byId.get(a.q)?.type === 'explain'),
    }
  })
}

/** A missed question that can come back: its latest answer was wrong and enough other questions have passed. */
function reviewQuestion(guide: AdaptiveGuide, conceptId: string, answers: AdaptiveAnswer[]): AdaptiveQuestion | null {
  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  const onConcept = answers.filter((a) => byId.get(a.q)?.conceptId === conceptId && gradeable(byId.get(a.q)!))
  const latest = new Map<string, number>() // question id → index of its latest answer within onConcept
  onConcept.forEach((a, i) => latest.set(a.q, i))
  for (const [id, i] of latest) {
    if (!onConcept[i].correct && onConcept.length - 1 - i >= ADAPTIVE_RULES.reviewGap) return byId.get(id) ?? null
  }
  return null
}

function pickByLevel(pool: AdaptiveQuestion[], level: AdaptiveLevel, struggling: boolean): AdaptiveQuestion | null {
  if (!pool.length) return null
  return [...pool].sort((a, b) => {
    const da = Math.abs(a.level - level), db = Math.abs(b.level - level)
    if (da !== db) return da - db
    // Equally far: an easier one after a miss, a harder one otherwise.
    if (a.level !== b.level) return struggling ? a.level - b.level : b.level - a.level
    return 0 // stable: document order
  })[0]
}

export type NextStep =
  | { kind: 'question'; question: AdaptiveQuestion; review: boolean }
  /** Every unfinished concept is out of new questions; a refill may still come. */
  | { kind: 'empty'; conceptIds: string[] }
  | { kind: 'done' }

/**
 * What to ask next. Concepts take turns (never the same one twice in a row
 * when there's a choice); weaker concepts come up more often; within a concept
 * the question nearest the student's current level is picked.
 */
export function nextStep(guide: AdaptiveGuide, answers: AdaptiveAnswer[]): NextStep {
  const progress = conceptProgress(guide, answers)
  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  const answered = new Set(answers.map((a) => a.q))
  const last = answers.length ? answers[answers.length - 1] : undefined
  const lastConcept = last ? byId.get(last.q)?.conceptId : undefined

  // Right after a correct answer on a concept that's going well (or just got
  // mastered): its one "explain it in your own words" question, if it has one.
  const lp = progress.find((p) => p.id === lastConcept)
  if (lp && last?.correct && !lp.explainDone && lp.status !== 'max_reached' && lp.answered >= ADAPTIVE_RULES.explainAfter && lp.accuracy >= ADAPTIVE_RULES.explainMinAccuracy) {
    const explain = guide.questions.find((q) => q.conceptId === lp.id && q.type === 'explain' && !answered.has(q.id))
    if (explain) return { kind: 'question', question: explain, review: false }
  }

  const open = progress.filter((p) => p.status === 'in_progress')
  if (!open.length) return { kind: 'done' }

  const options: Array<{ p: ConceptProgress; q: AdaptiveQuestion; review: boolean }> = []
  for (const p of open) {
    const unanswered = guide.questions.filter((q) => q.conceptId === p.id && gradeable(q) && !answered.has(q.id))
    const fresh = pickByLevel(unanswered, p.level, p.missStreak > 0)
    if (fresh) { options.push({ p, q: fresh, review: false }); continue }
    const review = reviewQuestion(guide, p.id, answers)
    if (review) options.push({ p, q: review, review: true })
  }
  if (!options.length) return { kind: 'empty', conceptIds: open.map((p) => p.id) }

  const pool = options.length > 1 ? options.filter((o) => o.p.id !== lastConcept) : options
  const priority = (p: ConceptProgress) => p.answered + 4 * p.accuracy
  const best = pool.reduce((a, b) => (priority(b.p) < priority(a.p) ? b : a))
  return { kind: 'question', question: best.q, review: best.review }
}

/**
 * Concepts that should get new questions now: still in progress and down to
 * `refillAt` unanswered ones, while the session has refills left. Most in need
 * first (fewest left, then weakest).
 */
export function conceptsNeedingRefill(guide: AdaptiveGuide, answers: AdaptiveAnswer[]): string[] {
  if (guide.refills >= ADAPTIVE_RULES.maxRefills) return []
  return conceptProgress(guide, answers)
    .filter((p) => p.status === 'in_progress' && p.remaining <= ADAPTIVE_RULES.refillAt && p.answered + p.remaining < ADAPTIVE_RULES.maxPerConcept)
    .sort((a, b) => a.remaining - b.remaining || a.accuracy - b.accuracy)
    .map((p) => p.id)
}

/** The concept's level for a refill batch and the questions the student got wrong on it (latest first). */
export function refillTarget(guide: AdaptiveGuide, answers: AdaptiveAnswer[], conceptId: string): { level: AdaptiveLevel; missed: AdaptiveAnswer[] } {
  const p = conceptProgress(guide, answers).find((c) => c.id === conceptId)
  const ids = new Set(guide.questions.filter((q) => q.conceptId === conceptId).map((q) => q.id))
  const missed = answers.filter((a) => ids.has(a.q) && !a.correct).reverse().slice(0, 4)
  return { level: p?.level ?? 2, missed }
}

export interface SessionSummary {
  answered: number
  correct: number
  mastered: number
  total: number
  done: boolean
}

export function sessionSummary(guide: AdaptiveGuide, answers: AdaptiveAnswer[]): SessionSummary {
  const progress = conceptProgress(guide, answers)
  const answered = progress.reduce((n, p) => n + p.answered, 0)
  return {
    answered,
    correct: progress.reduce((n, p) => n + p.correct, 0),
    mastered: progress.filter((p) => p.status === 'mastered').length,
    total: progress.length,
    done: progress.every((p) => p.status !== 'in_progress'),
  }
}

/** Marks concepts that can't get more questions (no refills left, nothing to review) as finished. */
export function withOutOfQuestions(progress: ConceptProgress[], emptyIds: string[]): ConceptProgress[] {
  const empty = new Set(emptyIds)
  return progress.map((p) => (empty.has(p.id) && p.status === 'in_progress' ? { ...p, status: 'out_of_questions' } : p))
}
