// Ordering classes. Pure; unit-tested.

export type ClassSort = 'period' | 'name' | 'newest'

export const CLASS_SORTS: Array<{ value: ClassSort; label: string }> = [
  { value: 'period', label: 'Period' },
  { value: 'name', label: 'Name' },
  { value: 'newest', label: 'Newest' },
]

interface Sortable { name: string; period: string | null; created_at?: string | null }

const byName = (a: Sortable, b: Sortable) => a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })

/** Period order is numeric-aware ("2" before "10", "3" before "3B"); classes without a period go last. */
export function sortClasses<T extends Sortable>(list: T[], by: ClassSort = 'period'): T[] {
  const copy = [...list]
  if (by === 'name') return copy.sort((a, b) => byName(a, b) || (a.period ?? '').localeCompare(b.period ?? '', undefined, { numeric: true }))
  if (by === 'newest') return copy.sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? '') || byName(a, b))
  return copy.sort((a, b) => {
    if (!a.period !== !b.period) return a.period ? -1 : 1
    return (a.period ?? '').localeCompare(b.period ?? '', undefined, { numeric: true, sensitivity: 'base' }) || byName(a, b)
  })
}
