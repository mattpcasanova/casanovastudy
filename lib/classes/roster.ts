// Class rosters (table class_roster, migration 051). Pure helpers; unit-tested.

import { fullName, matchRoster, normalizeName, type RosterName } from '@/lib/grading/names'
import { parseClassImport, type ImportedStudent } from './import'

/**
 * A pasted class list or one class's file → names (with student numbers when
 * the file has an ID column). Any form parseClassImport reads works; class and
 * period columns are ignored here. Duplicates are dropped.
 */
export function parseRosterPaste(text: string): ImportedStudent[] {
  const out: ImportedStudent[] = []
  const seen = new Set<string>()
  for (const cls of parseClassImport(text).classes) {
    for (const s of cls.students) {
      const key = normalizeName(fullName(s))
      if (seen.has(key)) continue
      seen.add(key)
      out.push(s)
    }
  }
  return out.slice(0, 200)
}

/** The roster row a newly joined student should be linked to, if their profile name confidently matches an unlinked one. */
export function rosterRowForStudent(
  profile: { firstName: string; lastName: string },
  roster: Array<RosterName & { linked: boolean }>,
): string | null {
  const open = roster.filter((r) => !r.linked)
  const match = matchRoster(fullName(profile), open)
  return match.confidence === 'sure' ? match.rosterId : null
}
