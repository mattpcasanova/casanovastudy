// Assigned practice: codes, grading kind, attempts, statuses and the
// "which student are you?" match for share links. Pure; unit-tested.

export type PracticeGrading = 'percent' | 'mastery'

export const ASSIGNABLE_FORMATS = ['quiz', 'practice', 'adaptive'] as const

export const gradingFor = (format: string): PracticeGrading => (format === 'adaptive' ? 'mastery' : 'percent')

// No 0/O, 1/l/I: codes get read off a projector.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
export function makeCode(random: () => number = Math.random): string {
  let out = ''
  for (let i = 0; i < 8; i++) out += ALPHABET[Math.floor(random() * ALPHABET.length)]
  return out
}

export interface Attempt { pct: number; correct: number; total: number; counted: boolean; finishedAt: string }

/** The attempt that counts for the grade: best counted one. */
export function bestAttempt<T extends Attempt>(attempts: T[]): T | null {
  return attempts.filter((a) => a.counted).reduce<T | null>((best, a) => (!best || a.pct > best.pct ? a : best), null)
}

export function attemptsLeft(maxAttempts: number | null, attempts: Attempt[]): number | null {
  if (maxAttempts == null) return null
  return Math.max(0, maxAttempts - attempts.filter((a) => a.counted).length)
}

export type PracticeStatus = 'done' | 'late' | 'missing' | 'not_started'

/** Done (on time), late (first finished after the due date), missing (due date passed, nothing finished), not started. */
export function practiceStatus(attempts: Attempt[], dueAt: string | null, now = Date.now()): PracticeStatus {
  const counted = attempts.filter((a) => a.counted).sort((a, b) => a.finishedAt.localeCompare(b.finishedAt))
  const due = dueAt ? Date.parse(dueAt) : null
  if (counted.length) return due != null && Date.parse(counted[0].finishedAt) > due ? 'late' : 'done'
  return due != null && now > due ? 'missing' : 'not_started'
}

const digits = (s: string | null | undefined) => (s ?? '').replace(/\D+/g, '').replace(/^0+/, '')
const alnum = (s: string | null | undefined) => (s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '')

/** A typed student ID matches the roster's (spaces, dashes and leading zeros ignored). */
export function sameStudentId(typed: string, onRoster: string | null): boolean {
  if (!onRoster || !typed.trim()) return false
  const a = digits(typed), b = digits(onRoster)
  return a && b ? a === b : alnum(typed) === alnum(onRoster)
}

/** "Lianna W." for the name picker on a share link: enough to find yourself, not the whole roster's names. */
export function pickerName(firstName: string, lastName: string): string {
  const first = firstName.trim().split(/\s+/)[0] ?? ''
  return lastName.trim() ? `${first} ${lastName.trim()[0].toUpperCase()}.` : first
}
