// Review reminders: who gets one today and what it says. Pure and unit-tested;
// lib/reminders/run.ts loads the data and sends. Email is the only channel for
// now; the mobile app will reuse these rules for push.
//
// A reminder goes out when a student studied before, hasn't studied yet today,
// and has Learn cards due or a weak spot to work on. It backs off the longer
// they're away (1, 2, 4, 7, 14 and 30 days after their last study), then stops.

import type { LearnState } from '@/lib/learn/scheduler'

export const REMINDER_RULES = {
  /** Days since the last study session on which a reminder may go out. */
  sendOnDaysAway: [1, 2, 4, 7, 14, 30],
  /** Learn cards due before a reminder is worth sending (without a weak spot). */
  minDue: 3,
  /** Never two reminders closer together than this. */
  minHoursBetween: 20,
  /** Calendar days are counted here (the daily job runs late afternoon Eastern). */
  timeZone: 'America/New_York',
  /** Rough time per Learn card, for "about N minutes". */
  secondsPerCard: 20,
  /** One Learn session holds at most this many cards. */
  sessionMax: 20,
}

export interface GuideDue {
  guideId: string
  title: string
  due: number
}

/** Learn cards due now, per guide, most first. */
export function dueByGuide(rows: { study_guide_id: string; title: string; items: LearnState | null | undefined }[], now = new Date()): GuideDue[] {
  const out: GuideDue[] = []
  for (const r of rows) {
    let due = 0
    for (const s of Object.values(r.items ?? {})) if (s?.due && new Date(s.due).getTime() <= now.getTime()) due++
    if (due > 0) out.push({ guideId: r.study_guide_id, title: r.title, due })
  }
  return out.sort((a, b) => b.due - a.due)
}

function dayKey(d: Date, timeZone: string): number {
  const [y, m, day] = new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d).split('-').map(Number)
  return Date.UTC(y, m - 1, day) / 86_400_000
}

/** Calendar days between the last study and now (0 = studied today). */
export function daysAway(lastActivity: string, now = new Date(), timeZone = REMINDER_RULES.timeZone): number {
  return dayKey(now, timeZone) - dayKey(new Date(lastActivity), timeZone)
}

export type ReminderSkip = 'off' | 'consent' | 'never-studied' | 'studied-today' | 'backing-off' | 'gone-quiet' | 'sent-recently' | 'nothing-due'

export function reminderDecision(input: {
  enabled: boolean
  consentOk: boolean
  lastActivity: string | null
  lastSent: string | null
  dueTotal: number
  weakCount: number
  now?: Date
}): { send: true } | { send: false; reason: ReminderSkip } {
  const now = input.now ?? new Date()
  if (!input.enabled) return { send: false, reason: 'off' }
  if (!input.consentOk) return { send: false, reason: 'consent' }
  if (!input.lastActivity) return { send: false, reason: 'never-studied' }
  const away = daysAway(input.lastActivity, now)
  if (away <= 0) return { send: false, reason: 'studied-today' }
  const last = REMINDER_RULES.sendOnDaysAway[REMINDER_RULES.sendOnDaysAway.length - 1]
  if (away > last) return { send: false, reason: 'gone-quiet' }
  if (!REMINDER_RULES.sendOnDaysAway.includes(away)) return { send: false, reason: 'backing-off' }
  if (input.lastSent && now.getTime() - new Date(input.lastSent).getTime() < REMINDER_RULES.minHoursBetween * 3_600_000) return { send: false, reason: 'sent-recently' }
  if (input.dueTotal < REMINDER_RULES.minDue && input.weakCount === 0) return { send: false, reason: 'nothing-due' }
  return { send: true }
}

/** "about 4 minutes" for one session of these cards. */
export function sessionMinutes(dueTotal: number): number {
  const cards = Math.min(dueTotal, REMINDER_RULES.sessionMax)
  return Math.max(1, Math.round((cards * REMINDER_RULES.secondsPerCard) / 60))
}
