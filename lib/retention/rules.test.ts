import { describe, expect, it } from 'vitest'
import { RETENTION, accountStage, cutoffDays, cutoffHours, deletionDate, latestOf } from './rules'

const now = new Date('2026-10-30T12:00:00Z')
const daysAgo = (n: number) => new Date(now.getTime() - n * 24 * 3600 * 1000)

describe('cutoffs', () => {
  it('count back from now', () => {
    expect(cutoffDays(now, 30).toISOString()).toBe('2026-09-30T12:00:00.000Z')
    expect(cutoffHours(now, 24).toISOString()).toBe('2026-10-29T12:00:00.000Z')
  })
})

describe('accountStage', () => {
  it('keeps accounts in use', () => {
    expect(accountStage({ lastActive: daysAgo(3), warnedAt: null }, now)).toBe('keep')
    expect(accountStage({ lastActive: daysAgo(699), warnedAt: null }, now)).toBe('keep')
  })
  it('warns once deletion is a notice period away', () => {
    expect(accountStage({ lastActive: daysAgo(700), warnedAt: null }, now)).toBe('warn')
    expect(accountStage({ lastActive: daysAgo(900), warnedAt: null }, now)).toBe('warn')
  })
  it('waits out the notice period after a warning', () => {
    expect(accountStage({ lastActive: daysAgo(700), warnedAt: daysAgo(1) }, now)).toBe('keep')
    expect(accountStage({ lastActive: daysAgo(731), warnedAt: daysAgo(10) }, now)).toBe('keep')
  })
  it('deletes after the limit and the notice period', () => {
    expect(accountStage({ lastActive: daysAgo(731), warnedAt: daysAgo(30) }, now)).toBe('delete')
    expect(accountStage({ lastActive: daysAgo(800), warnedAt: daysAgo(45) }, now)).toBe('delete')
  })
  it('never deletes an account that was used after the warning', () => {
    expect(accountStage({ lastActive: daysAgo(2), warnedAt: daysAgo(40) }, now)).toBe('unwarn')
    expect(accountStage({ lastActive: daysAgo(731), warnedAt: daysAgo(40) }, now)).toBe('delete')
  })
  it('never deletes before the idle limit even when the warning is old', () => {
    // Warned at day 700, now day 729 (warning 29 days old): still keep.
    expect(accountStage({ lastActive: daysAgo(729), warnedAt: daysAgo(29) }, now)).toBe('keep')
  })
})

describe('deletionDate', () => {
  it('is the notice period away when the account just crossed the warning line', () => {
    expect(deletionDate({ lastActive: daysAgo(700) }, now).toISOString()).toBe(daysAgo(-30).toISOString())
  })
  it('is never earlier than the notice period, even for very old accounts', () => {
    expect(deletionDate({ lastActive: daysAgo(900) }, now).toISOString()).toBe(daysAgo(-30).toISOString())
  })
  it('matches the limit for an account between the lines', () => {
    const d = deletionDate({ lastActive: daysAgo(RETENTION.inactiveAccountDays - 10) }, now)
    expect(d.toISOString()).toBe(daysAgo(-RETENTION.inactiveWarningDays).toISOString())
  })
})

describe('latestOf', () => {
  it('takes the newest and skips blanks and junk', () => {
    expect(latestOf(null, '2026-01-01T00:00:00Z', undefined, 'nope', new Date('2026-03-01T00:00:00Z'))?.toISOString()).toBe('2026-03-01T00:00:00.000Z')
    expect(latestOf(null, undefined)).toBeNull()
  })
})
