// Error log rules (pure, unit-tested). Browser and server errors land in
// app_errors (migration 066) and a daily digest goes to ADMIN_EMAIL. Nothing
// here may carry personal data: paths lose their query and ids, messages are
// trimmed, and errors are grouped by a fingerprint without numbers or ids.

export type ErrorSource = 'client' | 'server'

export interface ErrorReport {
  source: ErrorSource
  message: string
  stack?: string | null
  path?: string | null
  digest?: string | null
}

export const MAX_MESSAGE = 500
export const MAX_STACK = 4000

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi

/** "/study-guide/0f8…/learn?x=1" → "/study-guide/:id/learn". Share codes and tokens go too. */
export function normalizePath(path: string | null | undefined): string {
  if (!path) return ''
  let p = path
  try { p = new URL(path, 'https://x.invalid').pathname } catch { p = path.split(/[?#]/)[0] }
  return p
    .replace(UUID, ':id')
    .replace(/^\/practice\/[^/]+/, '/practice/:code')
    .replace(/^\/classes\/join\/[^/]+/, '/classes/join/:code')
    .split('/')
    .map((seg) => (/^\d+$/.test(seg) || /^[A-Za-z0-9_-]{24,}$/.test(seg) ? ':id' : seg))
    .join('/')
    .slice(0, 200)
}

/** Strip emails and long tokens from a message before storing it. */
export function scrubMessage(message: string): string {
  return message
    .replace(/[^\s@]+@[^\s@]+\.[^\s@]+/g, '<email>')
    .replace(/\b(eyJ[\w-]+\.[\w-]+\.[\w-]+)\b/g, '<token>')
    .replace(UUID, '<id>')
    .slice(0, MAX_MESSAGE)
}

/** Stacks keep file:line info but lose query strings (chunk hashes stay; they're not personal). */
export function scrubStack(stack: string | null | undefined): string | null {
  if (!stack) return null
  return stack.replace(/\?[^\s):]*/g, '').replace(UUID, '<id>').slice(0, MAX_STACK)
}

/** Same bug, same fingerprint: digits and ids removed, plus the first frame without line numbers. */
export function fingerprint(r: { source: ErrorSource; message: string; stack?: string | null }): string {
  const msg = r.message.replace(UUID, '').replace(/\d+/g, '#').replace(/\s+/g, ' ').trim().slice(0, 160)
  const frame = (r.stack ?? '').split('\n').map((l) => l.trim()).find((l) => /^at |@/.test(l)) ?? ''
  const where = frame.replace(/:\d+(:\d+)?\)?$/, '').replace(/\?[^\s)]*/g, '').replace(/[0-9a-f]{8,}/gi, '').slice(0, 160)
  return `${r.source}|${msg}|${where}`
}

const NOISE = [
  /ResizeObserver loop/i,
  /^Script error\.?$/i,
  /chrome-extension:|moz-extension:|safari-extension:/i,
  /Non-Error promise rejection captured/i,
  /AbortError|The user aborted a request|signal is aborted/i,
  /Load failed$|Failed to fetch$|NetworkError when attempting to fetch/im, // offline / flaky wifi
  /NEXT_REDIRECT|NEXT_NOT_FOUND/,
]

/** Errors that aren't ours or aren't actionable. */
export function isNoise(r: { message: string; stack?: string | null }): boolean {
  return !r.message.trim() || NOISE.some((re) => re.test(r.message.trim()) || (!!r.stack && re.test(r.stack)))
}

export interface StoredError {
  fingerprint: string
  source: ErrorSource
  message: string
  stack: string | null
  path: string | null
  user_id: string | null
  created_at: string
}

export interface DigestGroup {
  fingerprint: string
  source: ErrorSource
  message: string
  stack: string | null
  count: number
  users: number
  paths: string[]
  first: string
  last: string
}

/** Errors grouped for the daily email, most frequent first. */
export function digestGroups(rows: StoredError[]): DigestGroup[] {
  const groups = new Map<string, DigestGroup & { userSet: Set<string>; pathSet: Set<string> }>()
  for (const r of rows) {
    const g = groups.get(r.fingerprint) ?? { fingerprint: r.fingerprint, source: r.source, message: r.message, stack: r.stack, count: 0, users: 0, paths: [], first: r.created_at, last: r.created_at, userSet: new Set<string>(), pathSet: new Set<string>() }
    g.count++
    if (r.user_id) g.userSet.add(r.user_id)
    if (r.path) g.pathSet.add(r.path)
    if (r.created_at < g.first) g.first = r.created_at
    if (r.created_at > g.last) g.last = r.created_at
    groups.set(r.fingerprint, g)
  }
  return [...groups.values()]
    .map(({ userSet, pathSet, ...g }) => ({ ...g, users: userSet.size, paths: [...pathSet].slice(0, 5) }))
    .sort((a, b) => b.users - a.users || b.count - a.count)
}
