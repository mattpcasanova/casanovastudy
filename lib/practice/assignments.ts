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

const DAY = 24 * 60 * 60 * 1000

/** Whole days past a deadline, rounded up (3 hours late is 1 day); 0 when on time or no deadline. */
export function daysLate(dueAt: string | null | undefined, at: string | number | null | undefined): number {
  if (!dueAt || at == null) return 0
  const over = (typeof at === 'number' ? at : Date.parse(at)) - Date.parse(dueAt)
  return Number.isFinite(over) && over > 0 ? Math.ceil(over / DAY) : 0
}

/** Days late for practiceStatus: late = first finished run vs the due date, missing = now vs the due date. */
export function practiceDaysLate(attempts: Attempt[], dueAt: string | null, now = Date.now()): number {
  const status = practiceStatus(attempts, dueAt, now)
  if (status === 'late') return daysLate(dueAt, attempts.filter((a) => a.counted).map((a) => a.finishedAt).sort()[0])
  if (status === 'missing') return daysLate(dueAt, now)
  return 0
}

/** "1 day" / "4 days". */
export function dayCount(days: number): string {
  return `${days} day${days === 1 ? '' : 's'}`
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

/**
 * AI help (the Explain panel) on assigned work, set per assignment:
 * off = none, tutor = helps but never answers an unanswered question,
 * full = the normal panel. Every use is logged for the teacher.
 */
export type AiHelp = 'off' | 'tutor' | 'full'
export const AI_HELP_LEVELS: AiHelp[] = ['tutor', 'off', 'full']
export const AI_HELP_OPTIONS: Array<{ value: AiHelp; label: string; hint: string }> = [
  { value: 'tutor', label: 'Hints only', hint: "The AI explains ideas and gives a first step, but won't answer questions they haven't answered yet." },
  { value: 'off', label: 'Off', hint: 'No AI help while they do it.' },
  { value: 'full', label: 'Full help', hint: 'The normal AI help, answers included.' },
]
export const normalizeAiHelp = (v: unknown): AiHelp => (v === 'off' || v === 'full' ? v : 'tutor')

/** The strictest setting among a student's open assignments on one guide (off > tutor > full); null when none. */
export function strictestAiHelp(levels: AiHelp[]): AiHelp | null {
  if (!levels.length) return null
  if (levels.includes('off')) return 'off'
  return levels.includes('tutor') ? 'tutor' : 'full'
}

/** Days after the due date that the AI setting still applies (late work is still graded). */
export const AI_RULE_GRACE_DAYS = 7

/**
 * Whether an assignment still governs the AI for this student: attempts left
 * (unlimited counts) and not more than AI_RULE_GRACE_DAYS past the due date.
 */
export function assignmentOpen(maxAttempts: number | null, attempts: Attempt[], dueAt: string | null, now = Date.now()): boolean {
  if (attemptsLeft(maxAttempts, attempts) === 0) return false
  return !dueAt || now <= Date.parse(dueAt) + AI_RULE_GRACE_DAYS * DAY
}

export type AiUseKind = 'typed' | 'highlight' | 'why' | 'first_step' | 'check_work' | 'figure' | 'desmos'

/**
 * What to show the teacher for one Explain message: the kind, plus the
 * student's own words for typed messages, or a short label (the question's
 * first line) for button asks, whose prompts carry answers and specs.
 */
export function describeAiUse(content: string, hasImage = false): { kind: AiUseKind; message: string } {
  const text = content.trim()
  const lines = text.split('\n')
  const line = (i: number) => (lines[i] ?? '').trim()
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)
  const questionAfterBlank = () => cut(line(lines.findIndex((l, i) => i > 0 && !l.trim()) + 1) || line(1), 300)
  if (hasImage || text.startsWith('Here is a photo of my work')) return { kind: 'check_work', message: questionAfterBlank() }
  if (text.startsWith('Show me the first step')) return { kind: 'first_step', message: questionAfterBlank() }
  if (text.startsWith('Show me step by step how to solve this with the Desmos')) return { kind: 'desmos', message: cut(line(1), 300) }
  if (/^Explain this (question from my quiz|practice activity from my guide|practice question):/.test(text)) return { kind: 'why', message: cut(line(1), 300) }
  const highlight = text.match(/^Explain this part of my study guide: "([\s\S]*?)"\n/)
  if (highlight) return { kind: 'highlight', message: cut(highlight[1], 800) }
  if (/^Explain this .+ from my study guide: what it shows/.test(text)) return { kind: 'figure', message: cut(line(0).replace(/: what it shows.*$/, ''), 200) }
  return { kind: 'typed', message: cut(text, 2000) }
}
