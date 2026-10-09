// Free vs Premium rules, shared by the API routes (enforcement) and the UI
// (badges, counts). Agreed 2026-10-03: free = 3 guides per rolling week in the
// four original formats, no Long, no Hard, no grading, no custom-builder AI,
// and 5 Explain messages per rolling day. Premium has fair-use ceilings.
// Adaptive practice (2026-10-08) is a Premium format; free accounts get one
// session per rolling week, counted separately from their 3 guides.
// Database side: supabase/migrations/042 (user_plans, usage_events, codes).

export type PlanTier = 'free' | 'premium'
export type MeteredKind = 'guide' | 'explain' | 'adaptive'

export const FREE_FORMATS = ['outline', 'quiz', 'flashcards', 'summary'] as const

export const PLAN_LIMITS: Record<PlanTier, Record<MeteredKind, { limit: number; days: number }>> = {
  free: { guide: { limit: 3, days: 7 }, explain: { limit: 5, days: 1 }, adaptive: { limit: 1, days: 7 } },
  premium: { guide: { limit: 60, days: 30 }, explain: { limit: 40, days: 1 }, adaptive: { limit: 30, days: 30 } },
}

const FORMAT_LABELS: Record<string, string> = {
  adaptive: 'Adaptive practice', practice: 'Practice', plan: 'Study plan', cheatsheet: 'Cheat sheet', timeline: 'Timeline', custom: 'Custom',
}

export function isFreeFormat(format?: string | null): boolean {
  return !!format && (FREE_FORMATS as readonly string[]).includes(format)
}

/** Why these guide options need Premium, or null when a free account can use them. */
export function premiumOnlyReason(opts: { format?: string | null; length?: string | null; difficulty?: string | null }): string | null {
  if (opts.format === 'adaptive') return null // its own weekly allowance (PLAN_LIMITS.free.adaptive)
  if (opts.format && !isFreeFormat(opts.format)) return `${FORMAT_LABELS[opts.format] ?? 'This'} guides are part of Premium.`
  if (opts.length === 'long') return 'Long guides are part of Premium.'
  if (opts.difficulty === 'hard') return 'Hard questions are part of Premium.'
  return null
}

/** Body of a 403 from a metered route; the UI turns it into the Premium dialog. */
export interface PlanBlock {
  error: string
  code: 'limit_reached' | 'premium_only'
  kind?: MeteredKind | 'grading' | 'custom_ai'
  limit?: number
  resetsAt?: string
}

export function isPlanBlock(value: unknown): value is PlanBlock {
  const v = value as PlanBlock | null
  return !!v && (v.code === 'limit_reached' || v.code === 'premium_only') && typeof v.error === 'string'
}

export function limitMessage(kind: MeteredKind, tier: PlanTier): string {
  const { limit } = PLAN_LIMITS[tier][kind]
  if (kind === 'adaptive') {
    return tier === 'free'
      ? `You've used this week's free adaptive practice session.`
      : `You've reached this month's limit of ${limit} adaptive practice sessions.`
  }
  if (kind === 'guide') {
    return tier === 'free'
      ? `You've used your ${limit} free guides for this week.`
      : `You've reached this month's limit of ${limit} guides.`
  }
  return tier === 'free'
    ? `You've used today's ${limit} free explanations.`
    : `You've reached today's limit of ${limit} explanations.`
}
