// Written (short-answer) questions: how a checked answer turns into a verdict and points.
// The checker (ClaudeService.gradeShortAnswer) gives credit per thing the question asks for;
// these rules are shared by the quiz player, adaptive practice, unfinished runs sent at the
// due date and the server, so "correct" means the same everywhere.

/** A score at or above this counts as correct (it was 80, which failed every partly-right answer). */
export const SA_CORRECT_AT = 70
/** Below this the answer earns nothing. */
export const SA_PARTLY_AT = 40

export type ShortAnswerVerdict = 'correct' | 'partly' | 'not_yet'

export function shortAnswerVerdict(score: number): ShortAnswerVerdict {
  return score >= SA_CORRECT_AT ? 'correct' : score >= SA_PARTLY_AT ? 'partly' : 'not_yet'
}

/** The share of the question's one point a score earns: partly right earns its share. */
export function shortAnswerPoints(score: number | undefined | null): number {
  if (typeof score !== 'number' || !Number.isFinite(score) || score < SA_PARTLY_AT) return 0
  return Math.min(100, score) / 100
}

export interface CreditPart { asks: string; credit: number }

/** Credit per part (1, 0.5 or 0 each) → a 0-100 score. Anything unreadable is left out. */
export function scoreFromParts(parts: unknown): { score: number; parts: CreditPart[] } | null {
  if (!Array.isArray(parts)) return null
  const clean: CreditPart[] = []
  for (const p of parts.slice(0, 4)) {
    const credit = Number((p as { credit?: unknown })?.credit)
    if (!Number.isFinite(credit)) continue
    clean.push({ asks: String((p as { asks?: unknown })?.asks ?? '').slice(0, 120), credit: credit >= 0.75 ? 1 : credit >= 0.25 ? 0.5 : 0 })
  }
  if (!clean.length) return null
  return { score: Math.round((clean.reduce((sum, p) => sum + p.credit, 0) / clean.length) * 100), parts: clean }
}
