// Group work: one paper, several students. Pure; unit-tested.

export interface GroupMember {
  name: string
  rosterId?: string | null
}

export const MAX_GROUP = 8

/**
 * Members from a request: 2+ distinct names make a group (the paper's own
 * name first); otherwise just the single student. Names are trimmed and
 * deduplicated case-insensitively.
 */
export function groupMembersFrom(input: unknown, single: GroupMember): GroupMember[] {
  const list: GroupMember[] = []
  const seen = new Set<string>()
  const add = (m: GroupMember) => {
    const name = m.name.replace(/\s+/g, ' ').trim().slice(0, 120)
    const key = name.toLowerCase()
    if (!name || seen.has(key) || list.length >= MAX_GROUP) return
    seen.add(key)
    list.push({ name, rosterId: typeof m.rosterId === 'string' && m.rosterId ? m.rosterId : null })
  }
  add(single)
  if (Array.isArray(input)) {
    for (const m of input) {
      if (typeof m === 'string') add({ name: m })
      else if (m && typeof m === 'object' && typeof (m as GroupMember).name === 'string') add(m as GroupMember)
    }
  }
  return list
}

export const groupLabel = (members: Array<{ name: string }>) =>
  members.length <= 3 ? members.map((m) => m.name).join(', ') : `${members.slice(0, 2).map((m) => m.name).join(', ')} and ${members.length - 2} more`
