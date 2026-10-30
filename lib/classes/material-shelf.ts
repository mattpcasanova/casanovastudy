// Shaping the class materials picker (components/student/class-material-picker.tsx)
// for a student with many classes and many decks: newest first, the newest few
// per class with "Show all", and a search box once the list is long. Pure.

export interface ShelfMaterial { id: string; materialId: string; name: string; note: string | null; classId: string; createdAt: string }

export const SHELF_RULES = {
  /** Files shown per class before "Show all N". */
  perClass: 3,
  /** The search box appears from this many files (over all classes). */
  searchFrom: 8,
}

/** True when `query` matches the file name or the teacher's note, word by word, any order, accents ignored. */
export function materialMatches(m: { name: string; note: string | null }, query: string): boolean {
  const words = fold(query).split(/\s+/).filter(Boolean)
  if (!words.length) return true
  const hay = fold(`${m.name} ${m.note ?? ""}`)
  return words.every((w) => hay.includes(w))
}

const fold = (s: string) => s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[_.]+/g, " ")

export interface ShelfGroup<T extends ShelfMaterial> { classId: string; items: T[]; hidden: number }

/**
 * The picker's groups: one per class in `classOrder` that has files, newest
 * first inside each. With no query, each group is cut to `perClass` unless it's
 * expanded (`hidden` says how many more there are); a query shows every match.
 */
export function shelfGroups<T extends ShelfMaterial>(
  materials: T[],
  classOrder: string[],
  opts: { query?: string; only?: string | null; expanded?: Set<string>; perClass?: number } = {},
): ShelfGroup<T>[] {
  const query = (opts.query ?? "").trim()
  const perClass = opts.perClass ?? SHELF_RULES.perClass
  const out: ShelfGroup<T>[] = []
  for (const classId of classOrder) {
    if (opts.only && classId !== opts.only) continue
    const items = materials
      .filter((m) => m.classId === classId && materialMatches(m, query))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    if (!items.length) continue
    const fold = !query && !opts.expanded?.has(classId) && items.length > perClass
    out.push({ classId, items: fold ? items.slice(0, perClass) : items, hidden: fold ? items.length - perClass : 0 })
  }
  return out
}
