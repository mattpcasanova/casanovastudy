import type { QuestionType } from '@/lib/types/question-bank'

// Pure functions for the adaptive mastery loop. No I/O here — API routes load
// state, call these, and persist the results. Keep it that way: this is the
// one piece of the feature with unit tests (lib/mastery/engine.test.ts).

export interface MasteryConfig {
  mastery_threshold: number
  window_size: number
  min_questions: number
  max_questions_per_concept: number
  questions_per_round: number
  allowed_types: QuestionType[]
  allow_ai_fallback: boolean
}

export type ConceptStatus = 'in_progress' | 'mastered' | 'max_reached'

export interface ConceptRollup {
  concept_id: string
  answered_count: number
  correct_count: number
  recent_results: boolean[]
  status: ConceptStatus
}

export interface CandidateQuestion {
  id: string
  concept_id: string
  type: QuestionType
  difficulty: number
  times_served: number
}

/**
 * Accuracy over the rolling window: correct answers in the last
 * min(window_size, answered_count) responses. 0 when nothing answered yet.
 */
export function windowAccuracy(rollup: Pick<ConceptRollup, 'recent_results'>): number {
  const recent = rollup.recent_results
  if (recent.length === 0) return 0
  const correct = recent.filter(Boolean).length
  return correct / recent.length
}

/**
 * The mastery rule. A concept is:
 * - mastered:    answered >= min_questions AND window accuracy >= threshold.
 *                Misses age out of the window, so early mistakes don't
 *                permanently poison the ratio.
 * - max_reached: hit the per-concept question cap without mastering
 *                (frustration/cost safety valve — stops being served).
 * - in_progress: otherwise.
 */
export function evaluateConceptStatus(
  rollup: Pick<ConceptRollup, 'answered_count' | 'recent_results'>,
  config: Pick<MasteryConfig, 'mastery_threshold' | 'min_questions' | 'max_questions_per_concept'>
): ConceptStatus {
  if (
    rollup.answered_count >= config.min_questions &&
    windowAccuracy(rollup) >= config.mastery_threshold
  ) {
    return 'mastered'
  }
  if (rollup.answered_count >= config.max_questions_per_concept) {
    return 'max_reached'
  }
  return 'in_progress'
}

/**
 * Fold one graded answer into a rollup: bump counts, push into the capped
 * window, re-evaluate status.
 */
export function applyAnswer(
  rollup: ConceptRollup,
  isCorrect: boolean,
  config: MasteryConfig
): ConceptRollup {
  const recent = [...rollup.recent_results, isCorrect].slice(-config.window_size)
  const next: ConceptRollup = {
    ...rollup,
    answered_count: rollup.answered_count + 1,
    correct_count: rollup.correct_count + (isCorrect ? 1 : 0),
    recent_results: recent,
    status: rollup.status,
  }
  next.status = evaluateConceptStatus(next, config)
  return next
}

/**
 * Distribute the round's question slots across in-progress concepts,
 * round-robin with priority to the lowest window accuracy — struggling
 * concepts get reps first when there are more concepts than slots.
 * Returns concept_id -> slot count (only concepts that got >= 1 slot).
 */
export function allocateRoundSlots(
  rollups: ConceptRollup[],
  questionsPerRound: number
): Map<string, number> {
  const eligible = rollups
    .filter(r => r.status === 'in_progress')
    .sort((a, b) => {
      const diff = windowAccuracy(a) - windowAccuracy(b)
      if (diff !== 0) return diff
      // Tie-break: fewer answers first (least data = most need), then stable by id
      if (a.answered_count !== b.answered_count) return a.answered_count - b.answered_count
      return a.concept_id.localeCompare(b.concept_id)
    })

  const slots = new Map<string, number>()
  if (eligible.length === 0 || questionsPerRound <= 0) return slots

  let remaining = questionsPerRound
  let i = 0
  while (remaining > 0) {
    const concept = eligible[i % eligible.length]
    slots.set(concept.concept_id, (slots.get(concept.concept_id) ?? 0) + 1)
    remaining--
    i++
    // Don't hand one concept more slots than a full round when it's alone
    if (eligible.length === 1 && (slots.get(concept.concept_id) ?? 0) >= questionsPerRound) break
  }
  return slots
}

/**
 * Pick `count` questions for one concept from its unseen candidates.
 * Struggling students (window accuracy < 0.5) get easier questions first
 * (difficulty <= 2 preferred); least-served questions win ties so the whole
 * bank gets exercise. Callers pre-shuffle candidates for variety — this sort
 * is stable, so the shuffle breaks remaining ties.
 */
export function selectConceptQuestions(
  candidates: CandidateQuestion[],
  count: number,
  rollup: ConceptRollup
): CandidateQuestion[] {
  const struggling = rollup.answered_count > 0 && windowAccuracy(rollup) < 0.5
  const sorted = [...candidates].sort((a, b) => {
    if (struggling) {
      const aEasy = a.difficulty <= 2 ? 0 : 1
      const bEasy = b.difficulty <= 2 ? 0 : 1
      if (aEasy !== bEasy) return aEasy - bEasy
    }
    return a.times_served - b.times_served
  })
  return sorted.slice(0, count)
}

/** Final score projection: mastered concepts over total concepts. */
export function computeFinalScore(rollups: ConceptRollup[]): {
  mastered: number
  total: number
  percentage: number
} {
  const total = rollups.length
  const mastered = rollups.filter(r => r.status === 'mastered').length
  return {
    mastered,
    total,
    percentage: total === 0 ? 0 : Math.round((mastered / total) * 1000) / 10,
  }
}

/** An attempt is complete when no concept is still in progress. */
export function isAttemptComplete(rollups: ConceptRollup[]): boolean {
  return rollups.length > 0 && rollups.every(r => r.status !== 'in_progress')
}
