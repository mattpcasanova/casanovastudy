// Grade scales for graded papers. Every grade the app shows or stores comes
// from gradeFor(), so a teacher's scale (US letters, Cambridge A*-E with the
// paper's raw-mark boundaries, IB 1-7, percent only...) applies everywhere.

export type ScalePreset = 'us' | 'percent' | 'none' | 'a_level' | 'as_level' | 'ib' | 'pass_fail' | 'custom'

export interface GradeBand {
  grade: string
  /** Lowest score that earns this grade: a percentage, or raw marks when basis is 'marks'. */
  min: number
}

export interface GradeScale {
  preset: ScalePreset
  basis: 'percent' | 'marks'
  /** Highest band first. A score below every band gets `below`. */
  bands: GradeBand[]
  /** Grade under the lowest band (F, U...). */
  below: string
}

const pct = (bands: Array<[string, number]>): GradeBand[] => bands.map(([grade, min]) => ({ grade, min }))

export const SCALE_PRESETS: Record<ScalePreset, { label: string; hint: string; scale: GradeScale }> = {
  us: { label: 'US letters (A-F)', hint: 'A 90%, B 80%, C 70%, D 60%', scale: { preset: 'us', basis: 'percent', bands: pct([['A', 90], ['B', 80], ['C', 70], ['D', 60]]), below: 'F' } },
  percent: { label: 'Percent only', hint: 'Shows the percentage, no letter', scale: { preset: 'percent', basis: 'percent', bands: [], below: '' } },
  none: { label: 'No grade', hint: 'Marks only', scale: { preset: 'none', basis: 'percent', bands: [], below: '' } },
  a_level: { label: 'Cambridge A Level (A*-E)', hint: 'Type the paper\'s raw-mark boundaries', scale: { preset: 'a_level', basis: 'percent', bands: pct([['A*', 90], ['A', 80], ['B', 70], ['C', 60], ['D', 50], ['E', 40]]), below: 'U' } },
  as_level: { label: 'Cambridge AS Level (a-e)', hint: 'Type the paper\'s raw-mark boundaries', scale: { preset: 'as_level', basis: 'percent', bands: pct([['a', 80], ['b', 70], ['c', 60], ['d', 50], ['e', 40]]), below: 'u' } },
  ib: { label: 'IB (1-7)', hint: 'Edit the boundaries to match your paper', scale: { preset: 'ib', basis: 'percent', bands: pct([['7', 80], ['6', 70], ['5', 60], ['4', 50], ['3', 40], ['2', 25]]), below: '1' } },
  pass_fail: { label: 'Pass / Fail', hint: 'Pass at 60%', scale: { preset: 'pass_fail', basis: 'percent', bands: pct([['Pass', 60]]), below: 'Fail' } },
  custom: { label: 'Custom', hint: 'Your own grades and boundaries', scale: { preset: 'custom', basis: 'percent', bands: pct([['A', 90], ['B', 80], ['C', 70], ['D', 60]]), below: 'F' } },
}

export const DEFAULT_SCALE: GradeScale = SCALE_PRESETS.us.scale

export function presetScale(preset: ScalePreset): GradeScale {
  const s = SCALE_PRESETS[preset].scale
  return { ...s, bands: s.bands.map((b) => ({ ...b })) }
}

/** True when the scale draws letter/number grades (not percent-only or none). */
export function hasGrades(scale: GradeScale | null | undefined): boolean {
  const s = scale ?? DEFAULT_SCALE
  return s.preset !== 'percent' && s.preset !== 'none'
}

export function percentOf(marks: number, possible: number): number {
  return possible > 0 ? Math.round((marks / possible) * 10000) / 100 : 0
}

export function gradeFor(scale: GradeScale | null | undefined, marks: number, possible: number): string {
  const s = scale ?? DEFAULT_SCALE
  const percentage = percentOf(marks, possible)
  if (s.preset === 'none') return ''
  if (s.preset === 'percent') return `${Math.round(percentage)}%`
  const score = s.basis === 'marks' ? marks : percentage
  const bands = [...s.bands].sort((a, b) => b.min - a.min)
  for (const band of bands) if (score >= band.min) return band.grade
  return s.below
}

/** Validates a scale from a request body or a jsonb column; null when unusable. */
export function normalizeScale(input: unknown): GradeScale | null {
  if (!input || typeof input !== 'object') return null
  const raw = input as Record<string, unknown>
  const preset = raw.preset as ScalePreset
  if (!(preset in SCALE_PRESETS)) return null
  const basis = raw.basis === 'marks' ? 'marks' : 'percent'
  const bands: GradeBand[] = []
  if (Array.isArray(raw.bands)) {
    for (const b of raw.bands.slice(0, 12)) {
      if (!b || typeof b !== 'object') continue
      const grade = String((b as GradeBand).grade ?? '').trim().slice(0, 12)
      const min = Number((b as GradeBand).min)
      if (grade && Number.isFinite(min) && min >= 0) bands.push({ grade, min })
    }
  }
  const below = typeof raw.below === 'string' ? raw.below.trim().slice(0, 12) : SCALE_PRESETS[preset].scale.below
  bands.sort((a, b) => b.min - a.min)
  return { preset, basis, bands, below }
}
