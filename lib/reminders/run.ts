// The daily review-reminder job: load everyone's Learn state, recent activity,
// settings and consent, decide with lib/reminders/rules.ts, and email the ones
// that qualify. Called by /api/cron/review-reminders and scripts/reminders.ts.

import { createAdminClient } from '@/lib/supabase-server'
import { consentStep } from '@/lib/consent-rules'
import { buildProfile, type AnswerRow } from '@/lib/learner/profile'
import type { LearnState } from '@/lib/learn/scheduler'
import { sendEmail } from '@/lib/email/send'
import { reviewReminderEmail } from '@/lib/email/templates'
import { dueByGuide, reminderDecision, sessionMinutes, type GuideDue, type ReminderSkip } from './rules'
import { oneClickUrl, unsubscribeUrl } from './unsubscribe'

type Admin = ReturnType<typeof createAdminClient>

export interface ReminderOutcome {
  userId: string
  email: string | null
  sent: boolean
  reason?: ReminderSkip | 'error' | 'forced'
  dueTotal: number
  weak: string | null
  error?: string
}

export interface RunOptions {
  /** Decide and report, but send nothing and record nothing. */
  dryRun?: boolean
  /** Only consider these user ids. */
  onlyUserIds?: string[]
  /** Send even when the rules say not to (testing with your own account). */
  force?: boolean
  now?: Date
  siteUrl?: string
}

/** PostgREST returns at most 1000 rows per request; page through the rest. */
async function fetchAll<T>(page: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

/** fetchAll over `ids` in chunks, so `.in(...)` URLs stay short. */
async function fetchByIds<T>(ids: string[], page: (chunk: string[], from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += 150) {
    const chunk = ids.slice(i, i + 150)
    out.push(...await fetchAll<T>((a, b) => page(chunk, a, b)))
  }
  return out
}

const latest = (a: string | null | undefined, b: string | null | undefined) => (!a ? b ?? null : !b ? a : a > b ? a : b)

export async function runReminders(opts: RunOptions = {}): Promise<ReminderOutcome[]> {
  const now = opts.now ?? new Date()
  const siteUrl = (opts.siteUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://casanovastudy.com').replace(/\/$/, '')
  const admin = createAdminClient()
  const since = new Date(now.getTime() - 35 * 86_400_000).toISOString()
  const only = opts.onlyUserIds

  const progress = await fetchAll<{ user_id: string; study_guide_id: string; kind: string; data: { items?: LearnState } | null; updated_at: string }>((a, b) => {
    let q = admin.from('study_progress').select('user_id, study_guide_id, kind, data, updated_at').order('id').range(a, b)
    if (only) q = q.in('user_id', only)
    return q
  })
  const answers = await fetchAll<{ user_id: string; answered_at: string }>((a, b) => {
    let q = admin.from('study_results').select('user_id, answered_at').gte('answered_at', since).order('id').range(a, b)
    if (only) q = q.in('user_id', only)
    return q
  })

  // Last activity = newest answer or saved progress; Learn state per user.
  const lastActivity = new Map<string, string | null>()
  const learnRows = new Map<string, { study_guide_id: string; items: LearnState | undefined }[]>()
  for (const r of answers) lastActivity.set(r.user_id, latest(lastActivity.get(r.user_id), r.answered_at))
  for (const r of progress) {
    lastActivity.set(r.user_id, latest(lastActivity.get(r.user_id), r.updated_at))
    if (r.kind === 'learn') learnRows.set(r.user_id, [...(learnRows.get(r.user_id) ?? []), { study_guide_id: r.study_guide_id, items: r.data?.items }])
  }
  const userIds = only ?? [...lastActivity.keys()]
  if (!userIds.length) return []

  const [profiles, consents, prefs] = await Promise.all([
    fetchByIds<{ id: string; email: string | null; first_name: string | null; user_type: string | null; birth_date: string | null; clever_id: string | null }>(userIds, (ids, a, b) => admin.from('user_profiles').select('id, email, first_name, user_type, birth_date, clever_id').in('id', ids).order('id').range(a, b)),
    fetchByIds<{ user_id: string; status: 'pending' | 'granted' | 'school' | null }>(userIds, (ids, a, b) => admin.from('parental_consents').select('user_id, status').in('user_id', ids).order('user_id').range(a, b)),
    fetchByIds<{ user_id: string; email_enabled: boolean; last_sent_at: string | null }>(userIds, (ids, a, b) => admin.from('reminder_prefs').select('user_id, email_enabled, last_sent_at').in('user_id', ids).order('user_id').range(a, b)),
  ])
  const profileById = new Map(profiles.map((p) => [p.id, p]))
  const consentById = new Map(consents.map((c) => [c.user_id, c.status]))
  const prefById = new Map(prefs.map((p) => [p.user_id, p]))

  const guideIds = [...new Set([...learnRows.values()].flat().map((r) => r.study_guide_id))]
  const titles = new Map<string, string>()
  if (guideIds.length) {
    const guides = await fetchByIds<{ id: string; title: string }>(guideIds, (ids, a, b) => admin.from('study_guides').select('id, title').in('id', ids).order('id').range(a, b))
    for (const g of guides) titles.set(g.id, g.title)
  }

  const outcomes: ReminderOutcome[] = []
  for (const userId of userIds) {
    const profile = profileById.get(userId)
    const pref = prefById.get(userId)
    const due: GuideDue[] = dueByGuide((learnRows.get(userId) ?? []).filter((r) => titles.has(r.study_guide_id)).map((r) => ({ ...r, title: titles.get(r.study_guide_id)! })), now)
    const dueTotal = due.reduce((n, g) => n + g.due, 0)
    const base = {
      enabled: pref?.email_enabled ?? true,
      consentOk: consentStep({ userType: profile?.user_type, birthDate: profile?.birth_date, viaSchool: !!profile?.clever_id, status: consentById.get(userId) ?? null, now }) === 'ok',
      lastActivity: lastActivity.get(userId) ?? null,
      lastSent: pref?.last_sent_at ?? null,
      dueTotal,
      now,
    }
    const outcome: ReminderOutcome = { userId, email: profile?.email ?? null, sent: false, dueTotal, weak: null }
    outcomes.push(outcome)

    // Decide without the weak spot first; only load the answer history when it could matter.
    const early = reminderDecision({ ...base, weakCount: 1 })
    if (!early.send && !opts.force) { outcome.reason = early.reason; continue }
    if (!profile?.email) { outcome.reason = 'error'; outcome.error = 'no email'; continue }

    const { data: history } = await admin.from('study_results').select('subject, topic, correct, answered_at, study_guide_id').eq('user_id', userId).order('answered_at', { ascending: false }).limit(2000)
    const learner = buildProfile((history ?? []) as AnswerRow[], now)
    const weak = learner.weak[0] ?? null
    outcome.weak = weak?.topic ?? null
    const decision = reminderDecision({ ...base, weakCount: learner.weak.length })
    if (!decision.send && !opts.force) { outcome.reason = decision.reason; continue }
    if (!decision.send) outcome.reason = 'forced'
    if (opts.dryRun) continue

    const mail = reviewReminderEmail({
      firstName: profile.first_name,
      guides: due.slice(0, 3).map((g) => ({ title: g.title, due: g.due, url: `${siteUrl}/study-guide/${g.guideId}/learn` })),
      totalDue: dueTotal,
      minutes: sessionMinutes(dueTotal),
      weak: weak ? { topic: weak.topic, accuracy: weak.recentAccuracy, url: `${siteUrl}/progress` } : null,
      streak: learner.streak,
      startUrl: due[0] ? `${siteUrl}/study-guide/${due[0].guideId}/learn` : `${siteUrl}/progress`,
      unsubscribeUrl: unsubscribeUrl(siteUrl, userId),
      siteUrl,
    })
    try {
      await sendEmail({
        to: profile.email,
        ...mail,
        headers: { 'List-Unsubscribe': `<${oneClickUrl(siteUrl, userId)}>`, 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      })
      outcome.sent = true
      await recordSent(admin, userId, now)
    } catch (e) {
      outcome.reason = 'error'
      outcome.error = e instanceof Error ? e.message : String(e)
    }
  }
  return outcomes
}

async function recordSent(admin: Admin, userId: string, now: Date) {
  await admin.from('reminder_prefs').upsert({ user_id: userId, last_sent_at: now.toISOString(), updated_at: now.toISOString() }, { onConflict: 'user_id' })
}

/** Switch email reminders off for a user (signed unsubscribe link). */
export async function turnOffReminders(userId: string): Promise<void> {
  const admin = createAdminClient()
  const { error } = await admin.from('reminder_prefs').upsert({ user_id: userId, email_enabled: false, updated_at: new Date().toISOString() }, { onConflict: 'user_id' })
  if (error) throw new Error(error.message)
}
