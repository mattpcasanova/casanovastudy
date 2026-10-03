// Server-side plan checks and usage metering (service role). Rules live in
// lib/plan-rules.ts; tables and the atomic try_consume_usage /
// redeem_access_code functions are in supabase/migrations/042.
//
// Routes call one helper per action (meterGuide, meterExplain, checkGrading).
// With PLANS_ENABLED off (lib/features.ts) nobody is capped, but each action
// is still recorded so the plan can be priced from real use, and Explain keeps
// a per-user safety ceiling.

import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { PLANS_ENABLED } from '@/lib/features'
import { PLAN_LIMITS, limitMessage, premiumOnlyReason, type MeteredKind, type PlanBlock, type PlanTier } from '@/lib/plan-rules'

const EXPLAIN_SAFETY = { limit: 150, days: 1 }

export interface PlanState {
  tier: PlanTier
  premiumUntil: string | null
  source: string | null
}

export async function getPlan(userId: string): Promise<PlanState> {
  const { data } = await createAdminClient()
    .from('user_plans').select('premium_until, source').eq('user_id', userId).maybeSingle()
  const until = data?.premium_until ?? null
  const premium = !!until && new Date(until).getTime() > Date.now()
  return { tier: premium ? 'premium' : 'free', premiumUntil: until, source: premium ? data?.source ?? null : null }
}

interface Consumed {
  allowed: boolean
  used: number
  limit: number
  resetsAt: string | null
  eventId: number | null
}

/** Records one action if the user is under the limit (atomic in the database). */
async function consume(userId: string, kind: MeteredKind, rule: { limit: number; days: number }): Promise<Consumed> {
  const { data, error } = await createAdminClient().rpc('try_consume_usage', {
    p_user: userId, p_kind: kind, p_window: `${rule.days} days`, p_limit: rule.limit,
  })
  if (error) throw new Error(`Usage check failed: ${error.message}`)
  const row = (Array.isArray(data) ? data[0] : data) as { allowed: boolean; used: number; resets_at: string | null; event_id: number | null }
  return { allowed: row.allowed, used: row.used, limit: rule.limit, resetsAt: row.resets_at, eventId: row.event_id }
}

/** Counted but not capped. */
async function record(userId: string, kind: 'guide' | 'grading'): Promise<number | null> {
  const { data } = await createAdminClient().from('usage_events').insert({ user_id: userId, kind }).select('id').single()
  return data?.id ?? null
}

/** Gives an action back (the generation failed before the user got anything). */
export async function releaseUsage(eventId: number | null): Promise<void> {
  if (!eventId) return
  await createAdminClient().from('usage_events').delete().eq('id', eventId)
}

function limitBlock(kind: MeteredKind, tier: PlanTier, c: Consumed): PlanBlock {
  return { error: limitMessage(kind, tier), code: 'limit_reached', kind, limit: c.limit, resetsAt: c.resetsAt ?? undefined }
}

export function planBlockResponse(block: PlanBlock): NextResponse {
  return NextResponse.json(block, { status: 403 })
}

export interface Metered {
  block: PlanBlock | null
  eventId: number | null
}

/**
 * A guide generation: Premium-only options (free plan), then the guide limit.
 * `customAi` = the custom builder's AI assistant (Premium only).
 */
export async function meterGuide(userId: string, opts: { format?: string; length?: string; difficulty?: string; customAi?: boolean }): Promise<Metered> {
  if (!PLANS_ENABLED) return { block: null, eventId: await record(userId, 'guide') }
  const { tier } = await getPlan(userId)
  if (tier === 'free') {
    if (opts.customAi) {
      return { block: { error: 'The AI assistant in the custom builder is part of Premium. You can still build guides by hand.', code: 'premium_only', kind: 'custom_ai' }, eventId: null }
    }
    const reason = premiumOnlyReason(opts)
    if (reason) return { block: { error: reason, code: 'premium_only' }, eventId: null }
  }
  const c = await consume(userId, 'guide', PLAN_LIMITS[tier].guide)
  return c.allowed ? { block: null, eventId: c.eventId } : { block: limitBlock('guide', tier, c), eventId: null }
}

export interface MeteredExplain extends Metered {
  remaining: number
  limit: number
  /** 'free' | 'premium', or 'off' while plans are disabled. */
  plan: PlanTier | 'off'
}

/** One Explain message (every message counts, follow-ups included). */
export async function meterExplain(userId: string): Promise<MeteredExplain> {
  const tier: PlanTier | 'off' = PLANS_ENABLED ? (await getPlan(userId)).tier : 'off'
  const rule = tier === 'off' ? EXPLAIN_SAFETY : PLAN_LIMITS[tier].explain
  const c = await consume(userId, 'explain', rule)
  if (!c.allowed) {
    const block = tier === 'off'
      ? { error: "You've reached today's limit for explanations. Please try again tomorrow.", code: 'limit_reached' as const, kind: 'explain' as const, resetsAt: c.resetsAt ?? undefined }
      : limitBlock('explain', tier, c)
    return { block, eventId: null, remaining: 0, limit: c.limit, plan: tier }
  }
  return { block: null, eventId: c.eventId, remaining: Math.max(0, c.limit - c.used), limit: c.limit, plan: tier }
}

/** Whether this user may grade (Premium only when plans are on). Records nothing. */
export async function gradingBlock(userId: string): Promise<PlanBlock | null> {
  if (PLANS_ENABLED && (await getPlan(userId)).tier === 'free') {
    return { error: 'Grading is part of Premium.', code: 'premium_only', kind: 'grading' }
  }
  return null
}

/** Grading one paper: Premium only when plans are on; always recorded. */
export async function checkGrading(userId: string): Promise<PlanBlock | null> {
  const block = await gradingBlock(userId)
  if (block) return block
  await record(userId, 'grading')
  return null
}

export async function usageSummary(userId: string, tier: PlanTier) {
  const supabase = createAdminClient()
  const out = {} as Record<MeteredKind, { used: number; limit: number; resetsAt: string | null }>
  for (const kind of ['guide', 'explain'] as const) {
    const { limit, days } = PLAN_LIMITS[tier][kind]
    const since = new Date(Date.now() - days * 86_400_000).toISOString()
    const { data } = await supabase
      .from('usage_events').select('created_at').eq('user_id', userId).eq('kind', kind)
      .gt('created_at', since).order('created_at', { ascending: true })
    const used = data?.length ?? 0
    const resetsAt = used ? new Date(new Date(data![0].created_at).getTime() + days * 86_400_000).toISOString() : null
    out[kind] = { used, limit, resetsAt }
  }
  return out
}
