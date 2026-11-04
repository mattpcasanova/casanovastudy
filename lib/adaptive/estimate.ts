// How long an assigned adaptive session runs, for the teacher setting it up
// (pure, unit-tested). The length depends on the student: a concept stops
// after 3 answers when they're all right, and at the teacher's "questions per
// topic" when they aren't. Seconds per question are rough classroom figures
// (a quick student on a choice question, a slow one reading the feedback and
// the lesson); the explain question is typed and checked, so it takes longer.

import { ADAPTIVE_RULES, ADAPTIVE_SETTING_DEFAULTS, type AdaptiveSettings } from './engine'
import type { AdaptiveGuide } from './format'

export const ESTIMATE_SECONDS = { fast: 30, slow: 60, explainFast: 60, explainSlow: 110 } as const

export interface BankShape {
  concepts: number
  /** Graded questions on the concept that has the fewest. */
  perConcept: number
  /** Every concept has its "explain it" question. */
  explain: boolean
}

export function bankShape(guide: AdaptiveGuide): BankShape {
  const counts = guide.concepts.map((c) => guide.questions.filter((q) => q.conceptId === c.id && q.type !== 'explain').length)
  return {
    concepts: guide.concepts.length,
    perConcept: counts.length ? Math.min(...counts) : 0,
    explain: guide.concepts.length > 0 && guide.concepts.every((c) => guide.questions.some((q) => q.conceptId === c.id && q.type === 'explain')),
  }
}

export interface AdaptiveEstimate {
  minQuestions: number
  maxQuestions: number
  minMinutes: number
  maxMinutes: number
}

const toFive = (seconds: number) => Math.max(5, Math.round(seconds / 300) * 5)

export function estimateAdaptive(bank: Pick<BankShape, 'concepts' | 'explain'>, settings?: AdaptiveSettings | null): AdaptiveEstimate {
  const per = Math.max(ADAPTIVE_RULES.minAnswered, settings?.perConcept ?? ADAPTIVE_SETTING_DEFAULTS.perConcept)
  const explain = bank.explain && settings?.explain !== false ? 1 : 0
  const n = Math.max(1, bank.concepts)
  const s = ESTIMATE_SECONDS
  const minMinutes = toFive(n * (ADAPTIVE_RULES.minAnswered * s.fast + explain * s.explainFast))
  return {
    minQuestions: n * (ADAPTIVE_RULES.minAnswered + explain),
    maxQuestions: n * (per + explain),
    minMinutes,
    maxMinutes: Math.max(minMinutes, toFive(n * (per * s.slow + explain * s.explainSlow))),
  }
}

/** "About 15 to 30 minutes" */
export function estimateText(e: AdaptiveEstimate): string {
  return e.minMinutes === e.maxMinutes ? `About ${e.minMinutes} minutes` : `About ${e.minMinutes} to ${e.maxMinutes} minutes`
}

/** "15 to 25 questions" */
export function questionRangeText(e: AdaptiveEstimate): string {
  return e.minQuestions === e.maxQuestions ? `${e.minQuestions} questions` : `${e.minQuestions} to ${e.maxQuestions} questions`
}

/** Time a finished session took, from the answer timestamps: gaps between answers, each capped so a break doesn't count. */
export function sessionSeconds(answers: Array<{ at?: number }>, capSeconds = 300): number | null {
  const times = answers.map((a) => a.at).filter((t): t is number => typeof t === 'number' && t > 0).sort((a, b) => a - b)
  if (times.length < 2) return null
  let total = 0
  const gaps: number[] = []
  for (let i = 1; i < times.length; i++) gaps.push(Math.min(capSeconds, Math.max(0, (times[i] - times[i - 1]) / 1000)))
  for (const g of gaps) total += g
  // The first question has no gap before it: count it as a typical one.
  return Math.round(total + total / gaps.length)
}
