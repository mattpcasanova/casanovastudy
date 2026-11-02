// New versions of a quiz or practice set for another attempt (pure; unit-tested).
// The route (/api/study-guides/[id]/version) writes them; the players pick
// which version a run uses (components/formats/use-attempt-version.ts).

import { parseQuizRaw } from './quiz'
import { parsePracticeRaw } from './practice'

/** Versions written per student per guide (or assignment); later attempts reuse them in a new order. */
export const MAX_VERSIONS = 10

/** Item types in order: a new version must match them one for one (ids q-0/p-0... then line up). */
export function shapeOf(format: 'quiz' | 'practice', content: string): string[] {
  if (format === 'quiz') return parseQuizRaw(content).map((q) => (q.type === 'mc' ? `mc${q.options.length}` : q.type))
  return parsePracticeRaw(content).map((a) => (a.kind === 'choice' ? `choice${a.options.length}` : a.kind))
}

export function sameShape(format: 'quiz' | 'practice', original: string, next: string): boolean {
  const a = shapeOf(format, original)
  const b = shapeOf(format, next)
  return a.length > 0 && a.length === b.length && a.every((x, i) => x === b[i])
}

/**
 * Which stored version an assigned attempt uses: attempt 1 is the original (0),
 * attempt N the version N - 1, cycling through MAX_VERSIONS after that.
 */
export function versionForAttempt(attempt: number): number {
  if (attempt <= 1) return 0
  return ((attempt - 2) % MAX_VERSIONS) + 1
}
