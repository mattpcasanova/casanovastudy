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

/**
 * The rules one session runs on. A student's own session uses DEFAULT_RULES;
 * assigned work that counts uses gradedRules() with the teacher's settings.
 */
export interface AdaptiveRules {
  /** Share of the last `window` answers that must be right (0-1). */
  threshold: number
  window: number
  minAnswered: number
  /** Questions on one concept before it stops (the teacher's "questions per topic" on assigned work). */
  maxPerConcept: number
  /**
   * Graded sessions have no second tries and a short, fixed length, so a
   * concept that reaches its last question (the cap, or the end of the bank)
   * is mastered when round(threshold x answers judged) of them were right:
   * 3 of 4 at 80%, 4 of 5 at 80%, 3 of 5 at 60%.
   */
  creditAtEnd: boolean
  /** Serve each concept's "explain it in your own words" question. */
  explain: boolean
}

export const DEFAULT_RULES: AdaptiveRules = {
  threshold: ADAPTIVE_RULES.threshold,
  window: ADAPTIVE_RULES.window,
  minAnswered: ADAPTIVE_RULES.minAnswered,
  maxPerConcept: ADAPTIVE_RULES.maxPerConcept,
  creditAtEnd: false,
  explain: true,
}

/** What a teacher can set on an assigned adaptive session (null = the default). */
export interface AdaptiveSettings {
  /** Mastery level in percent (50-100). */
  masteryPct?: number | null
  /** Questions per topic (3-15). */
  perConcept?: number | null
  /** Ask the "explain it" question. */
  explain?: boolean | null
}

export const ADAPTIVE_SETTING_DEFAULTS = { masteryPct: 80, perConcept: 4, explain: true } as const
/** Mastery levels a teacher can pick. The rule looks at the last 5 answers, so these are the ones that differ. */
export const MASTERY_PICKS = [60, 80, 100] as const
export const PER_CONCEPT_PICKS = [4, 6, 8, 10] as const

export function normalizeMasteryPct(v: unknown): number | null {
  const n = Number(v)
  return v != null && v !== '' && Number.isFinite(n) && n >= 50 && n <= 100 ? Math.round(n) : null
}

export function normalizePerConcept(v: unknown): number | null {
  const n = Number(v)
  return v != null && v !== '' && Number.isInteger(n) && n >= 3 && n <= ADAPTIVE_RULES.maxPerConcept ? n : null
}

/** Rules for an assigned session that counts. Settings left empty keep the long-standing defaults. */
export function gradedRules(settings?: AdaptiveSettings | null): AdaptiveRules {
  const pct = normalizeMasteryPct(settings?.masteryPct)
  const per = normalizePerConcept(settings?.perConcept)
  return {
    ...DEFAULT_RULES,
    threshold: pct != null ? pct / 100 : DEFAULT_RULES.threshold,
    maxPerConcept: per ?? DEFAULT_RULES.maxPerConcept,
    creditAtEnd: true,
    explain: settings?.explain !== false,
  }
}

/** Right answers needed out of `n` judged ones: round(threshold x n). */
export function neededRight(threshold: number, n: number): number {
  return Math.round((Math.round(threshold * 100) * n) / 100)
}

/** "4 of the last 5 right", for labels. */
export function masteryRuleText(pct: number, window: number = ADAPTIVE_RULES.window): string {
  return `${neededRight(pct / 100, window)} of the last ${window} right`
}

/** "4 of your last 5 right" / "3 of its 4 questions right", for the student's side panel. */
export function masteryHelpText(rules: AdaptiveRules): string {
  if (rules.creditAtEnd && rules.maxPerConcept <= rules.window) return `${neededRight(rules.threshold, rules.maxPerConcept)} of its ${rules.maxPerConcept} questions right`
  return `${neededRight(rules.threshold, rules.window)} of your last ${rules.window} right`
}

const earnsCredit = (recent: boolean[], rules: AdaptiveRules) =>
  rules.creditAtEnd && recent.length >= rules.minAnswered && recent.filter(Boolean).length >= neededRight(rules.threshold, recent.length)

export interface AdaptiveAnswer {
  /** Question id. */
  q: string
  correct: boolean
  /** mc/tf: option index; num/explain: what they typed. */
  given?: string
  /** explain only: the AI's 0-100 score. */
  score?: number
  /** The student opened the hint first. Still counts as right, but doesn't push difficulty up. */
  hinted?: boolean
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
export function conceptProgress(guide: AdaptiveGuide, answers: AdaptiveAnswer[], rules: AdaptiveRules = DEFAULT_RULES): ConceptProgress[] {
  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  return guide.concepts.map((c) => {
    const mine = answers.filter((a) => byId.get(a.q)?.conceptId === c.id)
    const graded = mine.filter((a) => gradeable(byId.get(a.q)!))
    const results = graded.map((a) => a.correct)
    // Mastery is judged without answers that were right only with a hint.
    const unaided = graded.filter((a) => !(a.correct && a.hinted)).map((a) => a.correct)
    const recent = unaided.slice(-rules.window)
    let level: AdaptiveLevel = 2
    let streak = 0
    let missStreak = 0
    for (const a of graded) {
      if (a.correct) {
        missStreak = 0
        if (a.hinted) continue // right with help: hold the level
        if (++streak >= 2) { level = Math.min(3, level + 1) as AdaptiveLevel; streak = 0 }
      } else {
        streak = 0
        missStreak++
        level = Math.max(1, level - 1) as AdaptiveLevel
      }
    }
    const answeredIds = new Set(mine.map((a) => a.q))
    const remaining = guide.questions.filter((q) => q.conceptId === c.id && gradeable(q) && !answeredIds.has(q.id)).length
    const judged = evaluateConceptStatus(
      { answered_count: unaided.length, recent_results: recent },
      { mastery_threshold: rules.threshold, min_questions: rules.minAnswered, max_questions_per_concept: rules.maxPerConcept },
    )
    // The question cap counts every answer, hinted or not. On graded work the last question can still earn the concept.
    const capped = judged === 'max_reached' || (judged === 'in_progress' && results.length >= rules.maxPerConcept)
    const status = capped ? (earnsCredit(recent, rules) ? 'mastered' : 'max_reached') : judged
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

/** The traps a question sets: the mistakes its wrong options come from (mc), or the one a wrong answer points to (num, tf). */
export function probesOf(q: AdaptiveQuestion): string[] {
  return q.probes ?? []
}

/** The mistake behind a wrong answer, when the bank names it. */
export function trapOf(q: AdaptiveQuestion, given?: string): string | null {
  if (q.type === 'mc') return (given != null && q.traps?.[Number(given)]) || null
  return q.probes?.[0] ?? null
}

/**
 * The mistake the student still has to fix on a concept: the trap of their
 * latest tagged miss, until they get a question that sets the same trap right.
 */
export function openTrap(guide: AdaptiveGuide, conceptId: string, answers: AdaptiveAnswer[]): string | null {
  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  let open: string | null = null
  for (const a of answers) {
    const q = byId.get(a.q)
    if (!q || q.conceptId !== conceptId || !gradeable(q)) continue
    if (!a.correct) open = trapOf(q, a.given) ?? open
    else if (open && probesOf(q).includes(open)) open = null
  }
  return open
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
  | { kind: 'question'; question: AdaptiveQuestion; review: boolean; /** The mistake (trap id) this question was picked to recheck. */ trap?: string }
  /** Every unfinished concept is out of new questions; a refill may still come. */
  | { kind: 'empty'; conceptIds: string[] }
  | { kind: 'done' }

/**
 * What to ask next. Concepts take turns (never the same one twice in a row
 * when there's a choice); weaker concepts come up more often; within a concept
 * the question nearest the student's current level is picked.
 */
export function nextStep(guide: AdaptiveGuide, answers: AdaptiveAnswer[], opts: { reviews?: boolean; rules?: AdaptiveRules } = {}): NextStep {
  // Assigned (graded) sessions pass reviews: false: a missed question coming back
  // let students pick the option they now knew was right, and kept them going
  // after they ran out of new questions. Their session ends there instead.
  const reviews = opts.reviews ?? true
  const rules = opts.rules ?? DEFAULT_RULES
  const progress = conceptProgress(guide, answers, rules)
  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  const answered = new Set(answers.map((a) => a.q))
  const last = answers.length ? answers[answers.length - 1] : undefined
  const lastConcept = last ? byId.get(last.q)?.conceptId : undefined

  // Right after a correct answer on a concept that's going well (or just got
  // mastered): its one "explain it in your own words" question, if it has one.
  const lp = progress.find((p) => p.id === lastConcept)
  if (rules.explain && lp && last?.correct && !lp.explainDone && lp.status !== 'max_reached' && lp.answered >= ADAPTIVE_RULES.explainAfter && lp.accuracy >= ADAPTIVE_RULES.explainMinAccuracy) {
    const explain = guide.questions.find((q) => q.conceptId === lp.id && q.type === 'explain' && !answered.has(q.id))
    if (explain) return { kind: 'question', question: explain, review: false }
  }

  const open = progress.filter((p) => p.status === 'in_progress')
  if (!open.length) return { kind: 'done' }

  const options: Array<{ p: ConceptProgress; q: AdaptiveQuestion; review: boolean; trap?: string }> = []
  for (const p of open) {
    const unanswered = guide.questions.filter((q) => q.conceptId === p.id && gradeable(q) && !answered.has(q.id))
    // After a miss, a question that sets the same trap comes first: it shows whether the mistake is fixed.
    const trap = openTrap(guide, p.id, answers)
    const aimed = trap ? unanswered.filter((q) => probesOf(q).includes(trap)) : []
    const fresh = pickByLevel(aimed.length ? aimed : unanswered, p.level, p.missStreak > 0)
    if (fresh) { options.push({ p, q: fresh, review: false, ...(aimed.length && trap ? { trap } : {}) }); continue }
    const review = reviews ? reviewQuestion(guide, p.id, answers) : null
    if (review) options.push({ p, q: review, review: true })
  }
  if (!options.length) return { kind: 'empty', conceptIds: open.map((p) => p.id) }

  const pool = options.length > 1 ? options.filter((o) => o.p.id !== lastConcept) : options
  const priority = (p: ConceptProgress) => p.answered + 4 * p.accuracy
  const best = pool.reduce((a, b) => (priority(b.p) < priority(a.p) ? b : a))
  return { kind: 'question', question: best.q, review: best.review, ...(best.trap ? { trap: best.trap } : {}) }
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

export function sessionSummary(guide: AdaptiveGuide, answers: AdaptiveAnswer[], rules: AdaptiveRules = DEFAULT_RULES): SessionSummary {
  const progress = conceptProgress(guide, answers, rules)
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
export function withOutOfQuestions(progress: ConceptProgress[], emptyIds: string[], rules: AdaptiveRules = DEFAULT_RULES): ConceptProgress[] {
  const empty = new Set(emptyIds)
  return progress.map((p) => {
    if (!empty.has(p.id) || p.status !== 'in_progress') return p
    // Graded sessions have no second tries, so a concept can run out after 4 questions:
    // 3 of 4 right then counts as mastered at 80% (the running rule needs 80% of the last 5).
    if (earnsCredit(p.recent, rules)) return { ...p, status: 'mastered' }
    return { ...p, status: 'out_of_questions' }
  })
}
