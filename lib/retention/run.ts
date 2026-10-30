// The daily retention job: deletes what the privacy policy says we no longer
// keep (periods in rules.ts). Called by /api/cron/retention and by
// scripts/retention.ts (dry run). Each step is independent and bounded, so a
// failure in one doesn't stop the others and a backlog clears over a few days.

import type { SupabaseClient } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase-server'
import { deleteAccount } from '@/lib/account'
import { sendEmail } from '@/lib/email/send'
import { inactiveAccountEmail } from '@/lib/email/templates'
import { isUploadPath } from '@/lib/uploads/refs'
import { RETENTION, accountStage, cutoffDays, cutoffHours, deletionDate, latestOf } from './rules'

export interface RetentionReport {
  guideImages: number
  gradingPages: { reports: number; files: number }
  aiUses: number
  focusEvents: number
  usageEvents: number
  accounts: { checked: number; warned: string[]; deleted: string[]; unwarned: number }
  errors: string[]
}

interface Options {
  now?: Date
  dryRun?: boolean
  siteUrl?: string
  supabase?: SupabaseClient
}

export async function runRetention(opts: Options = {}): Promise<RetentionReport> {
  const supabase = opts.supabase ?? createAdminClient()
  const now = opts.now ?? new Date()
  const dry = !!opts.dryRun
  const siteUrl = (opts.siteUrl || process.env.NEXT_PUBLIC_APP_URL || 'https://casanovastudy.com').replace(/\/$/, '')
  const report: RetentionReport = {
    guideImages: 0,
    gradingPages: { reports: 0, files: 0 },
    aiUses: 0,
    focusEvents: 0,
    usageEvents: 0,
    accounts: { checked: 0, warned: [], deleted: [], unwarned: 0 },
    errors: [],
  }
  const step = async (name: string, fn: () => Promise<void>) => {
    try { await fn() } catch (e) { report.errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`) }
  }

  // 1. Photos and pages uploaded to make a guide: read once while it's written.
  await step('guide images', async () => {
    const { data, error } = await supabase.rpc('old_uploads', {
      p_kind: 'guide-images', p_before: cutoffHours(now, RETENTION.guideImagesHours).toISOString(), p_limit: RETENTION.batch,
    })
    if (error) throw new Error(error.message)
    const names = ((data ?? []) as Array<{ name: string }>).map((r) => r.name).filter(isUploadPath)
    report.guideImages = names.length
    if (!dry) await removeFromBucket(supabase, 'uploads', names)
  })

  // 2. Scans of exam pages: a school year after grading, the pages go and the report stays.
  await step('grading pages', async () => {
    const { data, error } = await supabase
      .from('grading_results')
      .select('id, page_urls')
      .not('page_urls', 'is', null)
      .lt('created_at', cutoffDays(now, RETENTION.gradingPagesDays).toISOString())
      .limit(RETENTION.batch)
    if (error) throw new Error(error.message)
    const rows = (data ?? []) as Array<{ id: string; page_urls: unknown }>
    const paths = new Set<string>()
    for (const r of rows) {
      if (!Array.isArray(r.page_urls)) continue
      for (const p of r.page_urls) {
        const path = typeof p === 'string' ? p : (p as { path?: unknown })?.path
        if (isUploadPath(path)) paths.add(path)
      }
    }
    report.gradingPages = { reports: rows.length, files: paths.size }
    if (dry || !rows.length) return
    // Group copies share their pages: clear every row first, then remove the files once.
    const { error: upErr } = await supabase.from('grading_results').update({ page_urls: null }).in('id', rows.map((r) => r.id))
    if (upErr) throw new Error(upErr.message)
    await removeFromBucket(supabase, 'uploads', [...paths])
  })

  // 3. Logs on assigned work (what students asked for help with, focus-mode events) and usage counts.
  await step('ai uses', async () => {
    report.aiUses = await deleteOlder(supabase, 'assignment_ai_uses', 'created_at', cutoffDays(now, RETENTION.assignedWorkLogsDays), dry)
  })
  await step('focus events', async () => {
    report.focusEvents = await deleteOlder(supabase, 'assignment_focus_events', 'created_at', cutoffDays(now, RETENTION.assignedWorkLogsDays), dry)
  })
  await step('usage events', async () => {
    report.usageEvents = await deleteOlder(supabase, 'usage_events', 'created_at', cutoffDays(now, RETENTION.usageEventsDays), dry)
  })

  // 4. Accounts nobody has used for about two years: warn, then delete.
  await step('inactive accounts', async () => {
    const r = await inactiveAccounts(supabase, now, dry, siteUrl)
    report.accounts = r
  })

  return report
}

async function removeFromBucket(supabase: SupabaseClient, bucket: string, paths: string[]): Promise<void> {
  for (let i = 0; i < paths.length; i += 100) {
    const { error } = await supabase.storage.from(bucket).remove(paths.slice(i, i + 100))
    if (error) throw new Error(error.message)
  }
}

async function deleteOlder(supabase: SupabaseClient, table: string, column: string, before: Date, dry: boolean): Promise<number> {
  const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true }).lt(column, before.toISOString())
  if (error) throw new Error(error.message)
  if (!dry && count) {
    const { error: delErr } = await supabase.from(table).delete().lt(column, before.toISOString())
    if (delErr) throw new Error(delErr.message)
  }
  return count ?? 0
}

/**
 * Last activity = the newest of the auth sign-in and the user's saved work
 * (a student who keeps a session alive for months never "signs in" again).
 */
async function lastActivity(supabase: SupabaseClient, userId: string, signIn: string | null | undefined, created: string): Promise<Date> {
  const newest = async (table: string, column: string, by = 'user_id') => {
    const { data } = await supabase.from(table).select(column).eq(by, userId).order(column, { ascending: false }).limit(1).maybeSingle()
    return (data as Record<string, string> | null)?.[column] ?? null
  }
  const [guide, progress, result, grading, attempt] = await Promise.all([
    newest('study_guides', 'created_at'),
    newest('study_progress', 'updated_at'),
    newest('study_results', 'created_at'),
    newest('grading_results', 'created_at'),
    newest('practice_attempts', 'finished_at', 'student_user_id'),
  ])
  return latestOf(signIn, created, guide, progress, result, grading, attempt) ?? new Date(created)
}

async function inactiveAccounts(supabase: SupabaseClient, now: Date, dry: boolean, siteUrl: string): Promise<RetentionReport['accounts']> {
  const out: RetentionReport['accounts'] = { checked: 0, warned: [], deleted: [], unwarned: 0 }
  // Only accounts whose last sign-in is near the line need the full activity check.
  const candidateBefore = cutoffDays(now, RETENTION.inactiveAccountDays - RETENTION.inactiveWarningDays)
  const candidates: Array<{ id: string; email: string | null; lastSignIn: string | null; created: string }> = []
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw new Error(error.message)
    for (const u of data.users) {
      const seen = latestOf(u.last_sign_in_at, u.created_at)
      if (seen && seen < candidateBefore) candidates.push({ id: u.id, email: u.email ?? null, lastSignIn: u.last_sign_in_at ?? null, created: u.created_at })
    }
    if (data.users.length < 1000) break
  }
  const { data: noticeRows } = await supabase.from('account_retention_notices').select('user_id, warned_at')
  const notices = new Map((noticeRows ?? []).map((n) => [n.user_id as string, new Date(n.warned_at as string)]))
  const { data: profiles } = candidates.length
    ? await supabase.from('user_profiles').select('id, first_name').in('id', candidates.map((c) => c.id))
    : { data: [] }
  const firstNames = new Map((profiles ?? []).map((p) => [p.id as string, (p.first_name as string | null) ?? null]))

  let acted = 0
  for (const c of candidates) {
    out.checked++
    const lastActive = await lastActivity(supabase, c.id, c.lastSignIn, c.created)
    const warnedAt = notices.get(c.id) ?? null
    const stage = accountStage({ lastActive, warnedAt }, now)
    if (stage === 'keep') continue
    if (stage === 'unwarn') {
      out.unwarned++
      if (!dry) await supabase.from('account_retention_notices').delete().eq('user_id', c.id)
      continue
    }
    if (acted >= RETENTION.batch) break
    acted++
    if (stage === 'warn') {
      const deleteOn = deletionDate({ lastActive }, now)
      out.warned.push(c.email ?? c.id)
      if (dry) continue
      const { error } = await supabase.from('account_retention_notices').upsert({
        user_id: c.id, warned_at: now.toISOString(), last_active_at: lastActive.toISOString(), delete_after: deleteOn.toISOString(),
      })
      if (error) throw new Error(error.message)
      if (c.email) {
        const mail = inactiveAccountEmail({
          firstName: firstNames.get(c.id) ?? null,
          deleteOn: deleteOn.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/New_York' }),
          link: `${siteUrl}/auth/signin`,
          siteUrl,
        })
        await sendEmail({ to: c.email, ...mail })
      }
      continue
    }
    // stage === 'delete'
    out.deleted.push(c.email ?? c.id)
    if (!dry) await deleteAccount(c.id)
  }
  return out
}
