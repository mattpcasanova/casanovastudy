import { describe, expect, it } from 'vitest'
import { daysAway, dueByGuide, reminderDecision, sessionMinutes } from './rules'
import { reviewReminderEmail } from '@/lib/email/templates'

// 5pm Eastern on Oct 4 2026 (21:00 UTC), when the daily job runs.
const now = new Date('2026-10-04T21:00:00Z')
const base = { enabled: true, consentOk: true, lastSent: null, dueTotal: 5, weakCount: 0, now }

describe('daysAway', () => {
  it('counts Eastern calendar days, not 24-hour blocks', () => {
    expect(daysAway('2026-10-04T13:00:00Z', now)).toBe(0) // this morning
    expect(daysAway('2026-10-04T01:30:00Z', now)).toBe(1) // 9:30pm last night Eastern
    expect(daysAway('2026-09-27T21:00:00Z', now)).toBe(7)
  })
})

describe('reminderDecision', () => {
  it('sends the day after studying when cards are due', () => {
    expect(reminderDecision({ ...base, lastActivity: '2026-10-03T20:00:00Z' })).toEqual({ send: true })
  })
  it('skips when they already studied today', () => {
    expect(reminderDecision({ ...base, lastActivity: '2026-10-04T15:00:00Z' })).toEqual({ send: false, reason: 'studied-today' })
  })
  it('backs off on in-between days and stops after 30 days', () => {
    expect(reminderDecision({ ...base, lastActivity: '2026-10-01T20:00:00Z' })).toEqual({ send: false, reason: 'backing-off' }) // 3 days
    expect(reminderDecision({ ...base, lastActivity: '2026-09-30T20:00:00Z' })).toEqual({ send: true }) // 4 days
    expect(reminderDecision({ ...base, lastActivity: '2026-09-01T20:00:00Z' })).toEqual({ send: false, reason: 'gone-quiet' })
  })
  it('respects the switch, consent, and the daily limit', () => {
    const last = '2026-10-03T20:00:00Z'
    expect(reminderDecision({ ...base, lastActivity: last, enabled: false })).toEqual({ send: false, reason: 'off' })
    expect(reminderDecision({ ...base, lastActivity: last, consentOk: false })).toEqual({ send: false, reason: 'consent' })
    expect(reminderDecision({ ...base, lastActivity: last, lastSent: '2026-10-04T10:00:00Z' })).toEqual({ send: false, reason: 'sent-recently' })
    expect(reminderDecision({ ...base, lastActivity: null })).toEqual({ send: false, reason: 'never-studied' })
  })
  it('needs a few due cards or a weak spot', () => {
    const last = '2026-10-03T20:00:00Z'
    expect(reminderDecision({ ...base, lastActivity: last, dueTotal: 2 })).toEqual({ send: false, reason: 'nothing-due' })
    expect(reminderDecision({ ...base, lastActivity: last, dueTotal: 0, weakCount: 1 })).toEqual({ send: true })
  })
})

describe('dueByGuide', () => {
  it('counts due cards per guide, most first', () => {
    const items = (dues: string[]) => Object.fromEntries(dues.map((d, i) => [`i${i}`, { box: 1, due: d, reps: 1, lapses: 0 }]))
    const out = dueByGuide([
      { study_guide_id: 'a', title: 'A', items: items(['2026-10-04T08:00:00Z', '2026-10-06T08:00:00Z']) },
      { study_guide_id: 'b', title: 'B', items: items(['2026-10-01T08:00:00Z', '2026-10-02T08:00:00Z', '2026-10-04T20:59:00Z']) },
      { study_guide_id: 'c', title: 'C', items: null },
    ], now)
    expect(out).toEqual([{ guideId: 'b', title: 'B', due: 3 }, { guideId: 'a', title: 'A', due: 1 }])
  })
})

describe('sessionMinutes', () => {
  it('estimates one session, capped at a full session', () => {
    expect(sessionMinutes(1)).toBe(1)
    expect(sessionMinutes(9)).toBe(3)
    expect(sessionMinutes(100)).toBe(7)
  })
})

describe('reviewReminderEmail', () => {
  const mail = (over: Partial<Parameters<typeof reviewReminderEmail>[0]> = {}) => reviewReminderEmail({
    firstName: 'Ana <b>', guides: [{ title: 'AP Chem & Bonding', due: 6, url: 'https://x/g/learn' }], totalDue: 6, minutes: 2,
    weak: { topic: 'Hybridization', accuracy: 0.4, url: 'https://x/progress' }, streak: 3,
    startUrl: 'https://x/g/learn', unsubscribeUrl: 'https://x/reminders/off?u=1&t=2', siteUrl: 'https://x', ...over,
  })
  it('names the due cards and streak, escapes text, and links to unsubscribe', () => {
    const m = mail()
    expect(m.subject).toBe('6 cards to review. Keep your 3-day streak')
    expect(m.html).toContain('Ana &lt;b&gt;')
    expect(m.html).toContain('AP Chem &amp; Bonding')
    expect(m.html).toContain('40% on your recent answers')
    expect(m.html).toContain('https://x/reminders/off?u=1&t=2')
    expect(m.text).toContain('Turn off reminders: https://x/reminders/off?u=1&t=2')
    expect(m.html + m.subject + m.text).not.toContain('—')
  })
  it('leads with the weak spot when nothing is due', () => {
    expect(mail({ totalDue: 0, guides: [], streak: 0 }).subject).toBe('Time to practice Hybridization')
  })
})
