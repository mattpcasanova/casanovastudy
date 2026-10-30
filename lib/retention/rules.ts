// Data retention: how long each kind of information is kept, and the pure
// decisions the daily job (/api/cron/retention, lib/retention/run.ts) makes.
// The numbers here are the ones the privacy policy quotes (/privacy, "How long
// we keep it"); change both together. Unit-tested in rules.test.ts.

export const RETENTION = {
  /** Photos and pages uploaded to make a guide are only read while it's written. */
  guideImagesHours: 24,
  /** Scans of exam pages stay for a school year so teachers can regrade or show the paper. */
  gradingPagesDays: 365,
  /** Scanner-inbox scans and phone sends (student work waiting to be graded). */
  scanInboxDays: 30,
  /** What students asked for help with, and focus-mode events, on assigned work. */
  assignedWorkLogsDays: 365,
  /** Usage counts (guide / explain / grading events): no content, kept a year for the plan caps and pricing. */
  usageEventsDays: 400,
  /** Error reports (already scrubbed of emails and ids). */
  errorsDays: 30,
  /** An account nobody has used for this long is deleted, after a warning. */
  inactiveAccountDays: 730,
  /** The warning email goes out this many days before the deletion. */
  inactiveWarningDays: 30,
  /** How many of each thing one daily run handles (the rest waits for tomorrow). */
  batch: 500,
}

export function cutoffDays(now: Date, days: number): Date {
  return new Date(now.getTime() - days * 24 * 3600 * 1000)
}

export function cutoffHours(now: Date, hours: number): Date {
  return new Date(now.getTime() - hours * 3600 * 1000)
}

export type AccountStage = 'keep' | 'warn' | 'delete' | 'unwarn'

/**
 * What to do with an account today. `lastActive` is the latest sign-in or
 * saved work; `warnedAt` is when we last emailed that it would be deleted.
 * - keep: still in use (or warned recently, waiting out the notice period)
 * - warn: idle long enough that deletion is `inactiveWarningDays` away
 * - delete: idle past the limit and warned at least `inactiveWarningDays` ago
 * - unwarn: was warned but has been used since, so the warning is void
 */
export function accountStage(a: { lastActive: Date; warnedAt: Date | null }, now: Date): AccountStage {
  const idleDays = (now.getTime() - a.lastActive.getTime()) / (24 * 3600 * 1000)
  if (a.warnedAt && a.lastActive > a.warnedAt) return 'unwarn'
  if (idleDays >= RETENTION.inactiveAccountDays) {
    if (!a.warnedAt) return 'warn'
    const warnedDays = (now.getTime() - a.warnedAt.getTime()) / (24 * 3600 * 1000)
    return warnedDays >= RETENTION.inactiveWarningDays ? 'delete' : 'keep'
  }
  if (idleDays >= RETENTION.inactiveAccountDays - RETENTION.inactiveWarningDays) return a.warnedAt ? 'keep' : 'warn'
  return 'keep'
}

/** The date the warning email names: the notice period from today, never before the idle limit. */
export function deletionDate(a: { lastActive: Date }, now: Date): Date {
  const byIdle = new Date(a.lastActive.getTime() + RETENTION.inactiveAccountDays * 24 * 3600 * 1000)
  const byNotice = cutoffDays(now, -RETENTION.inactiveWarningDays)
  return byIdle > byNotice ? byIdle : byNotice
}

/** The newest of several possibly-missing timestamps. */
export function latestOf(...dates: Array<string | Date | null | undefined>): Date | null {
  let best: Date | null = null
  for (const d of dates) {
    if (!d) continue
    const t = typeof d === 'string' ? new Date(d) : d
    if (Number.isNaN(t.getTime())) continue
    if (!best || t > best) best = t
  }
  return best
}
