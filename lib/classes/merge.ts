// Combining class lists (pure, unit-tested): names coming in from another
// source (a Google Classroom import into a class made from a Focus file, or the
// reverse) land on the student already there instead of a second copy, so one
// row ends up with both the student ID and the school email.

import { matchRoster, normalizeName } from '@/lib/grading/names'

export interface ExistingRosterName { id: string; firstName: string; lastName: string; studentNumber: string | null; email: string | null }
export interface IncomingName { firstName: string; lastName: string; studentNumber?: string | null; email?: string | null }

export interface RosterMergePlan<T extends IncomingName> {
  /** Existing rows to fill in (only fields they're missing). */
  fills: Array<{ id: string; studentNumber?: string; email?: string }>
  /** Names to add as new students. */
  fresh: T[]
  /** Incoming names that matched someone already on the list. */
  matched: number
}

const fullName = (n: { firstName: string; lastName: string }) => normalizeName(`${n.firstName} ${n.lastName}`)

/**
 * Match each incoming name to at most one existing student: same student ID,
 * same email, same name, or a confident name match ("Ayden Alonso" ~ "Ayden
 * Lucas Alonso", with `fuzzy`: whole-list imports only, since a name typed
 * on purpose may really be a new student). A different student ID or email on
 * both sides means a different person. Unsure matches are added as new names.
 */
export function planRosterMerge<T extends IncomingName>(existing: ExistingRosterName[], incoming: T[], opts: { fuzzy?: boolean } = {}): RosterMergePlan<T> {
  const claimed = new Set<string>()
  const fills = new Map<string, { id: string; studentNumber?: string; email?: string }>()
  const fresh: T[] = []
  const freshNames = new Set<string>()
  let matched = 0
  const email = (e: string | null | undefined) => (e ?? '').trim().toLowerCase() || null
  const number = (n: string | null | undefined) => (n ?? '').trim() || null

  for (const n of incoming) {
    const num = number(n.studentNumber)
    const mail = email(n.email)
    const name = fullName(n)
    const open = existing.filter((r) => !claimed.has(r.id))
    const conflicts = (r: ExistingRosterName) => (!!num && !!number(r.studentNumber) && number(r.studentNumber) !== num) || (!!mail && !!email(r.email) && email(r.email) !== mail)
    let row = (num ? open.find((r) => number(r.studentNumber) === num) : undefined)
      ?? (mail ? open.find((r) => email(r.email) === mail) : undefined)
      ?? open.find((r) => fullName(r) === name && !conflicts(r))
    if (!row && opts.fuzzy) {
      const pool = open.filter((r) => !conflicts(r))
      const m = matchRoster(`${n.firstName} ${n.lastName}`, pool)
      if (m.confidence === 'sure' && m.rosterId) row = pool.find((r) => r.id === m.rosterId)
    }
    if (row) {
      claimed.add(row.id)
      matched++
      const fill = { ...(fills.get(row.id) ?? { id: row.id }) }
      if (!number(row.studentNumber) && num) fill.studentNumber = num
      if (!email(row.email) && mail) fill.email = mail
      if (fill.studentNumber || fill.email) fills.set(row.id, fill)
      continue
    }
    if (freshNames.has(name)) continue // the same name twice in one import
    freshNames.add(name)
    fresh.push(n)
  }
  return { fills: [...fills.values()], fresh, matched }
}
