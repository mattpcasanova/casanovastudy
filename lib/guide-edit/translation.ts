// A guide in another language (lib/guide-edit/translation-server.ts makes them).
// Pure; unit-tested.

import { sameShape } from '@/lib/formats/versions'
import { parseAdaptive } from '@/lib/adaptive/format'

/** Formats a student can be given in another language inside one assignment. */
export const ASSIGN_LANGUAGE_FORMATS = ['quiz', 'practice', 'adaptive'] as const

/**
 * Whether a translation still matches its original item for item. Answers, the
 * teacher's report and new versions are matched by position, so a translation
 * that fell out of step (the original was edited, or questions were added to an
 * adaptive bank) must not be served in its place.
 */
export function translationLinesUp(format: string, original: string, translated: string): boolean {
  if (!translated.trim()) return false
  if (format === 'quiz' || format === 'practice') return sameShape(format, original, translated)
  if (format === 'adaptive') {
    const a = parseAdaptive(original), b = parseAdaptive(translated)
    return a.questions.length > 0 && b.questions.length === a.questions.length && b.concepts.length === a.concepts.length
      && a.questions.every((q, i) => q.type === b.questions[i].type && q.correct === b.questions[i].correct && q.conceptId === b.questions[i].conceptId)
  }
  // Prose and cards: nothing is matched by position; just make sure it wasn't cut short.
  return translated.length > original.length * 0.5
}
