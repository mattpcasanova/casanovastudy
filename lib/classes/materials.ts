// Class materials (migration 080): slides and notes a teacher puts on a class,
// prepared once in the teacher's browser, so students can build guides from
// them without downloading anything. Pure rules; server side in
// materials-server.ts, UI in components/classes/class-materials.tsx.

import { uploadKind } from '@/lib/uploads/kinds'

export type MaterialKind = 'slides' | 'document' | 'pdf' | 'other'

export const MATERIAL_LIMITS = {
  /** Text kept per file (a 60-slide deck is ~30k characters). */
  maxChars: 200_000,
  /** Scanned pages kept per file. */
  maxImages: 40,
  /** Materials a student can attach to one guide. */
  maxPerGuide: 8,
  /** Text from materials sent to the model for one guide, all files together. */
  maxGuideChars: 150_000,
  /** Classes one material can be put on at once. */
  maxClasses: 20,
}

export function materialKind(name: string, mime = ''): MaterialKind {
  switch (uploadKind(name, mime)) {
    case 'pptx': return 'slides'
    case 'docx': case 'text': return 'document'
    case 'pdf': return 'pdf'
    default: return 'other'
  }
}

/** File name without its extension, for guide titles ("Unit 4 Slides.pptx" → "Unit 4 Slides"). */
export function materialTitle(name: string): string {
  const base = name.replace(/\.[a-z0-9]{1,5}$/i, '').replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim()
  return base || name
}

/** "From your teacher" text blocks for one guide, in the order picked, within the total budget. */
export function trimForGuide<T extends { name: string; content: string }>(materials: T[], budget = MATERIAL_LIMITS.maxGuideChars): Array<{ name: string; content: string }> {
  const out: Array<{ name: string; content: string }> = []
  let left = budget
  for (const m of materials) {
    const text = m.content.trim()
    if (!text || left <= 0) continue
    // Split what's left evenly over the rest, so the last file isn't starved.
    const remaining = materials.slice(materials.indexOf(m)).filter((x) => x.content.trim()).length
    const share = Math.max(Math.floor(left / remaining), Math.min(text.length, 2000))
    const kept = text.length > share ? text.slice(0, share) : text
    out.push({ name: `From your teacher: ${m.name}`, content: kept })
    left -= kept.length
  }
  return out
}

/** Unique valid ids from a request body, at most `max`. */
export function pickMaterialIds(list: unknown, max = MATERIAL_LIMITS.maxPerGuide): string[] {
  if (!Array.isArray(list)) return []
  const ids = list.filter((v): v is string => typeof v === 'string' && /^[0-9a-f-]{36}$/i.test(v))
  return [...new Set(ids)].slice(0, max)
}
