// A quiz or practice run in progress, saved so a student can leave and pick it
// up later (started in class, finished for homework). Pure helpers; the hook
// that loads and saves lives in lib/use-run-progress.ts.

/** `run: null` = nothing in progress (finished or started over), so clearing syncs across devices too. */
export interface SavedRun<T> { run: T | null; updatedAt: number }

export function parseSaved(raw: unknown): SavedRun<unknown> | null {
  if (!raw || typeof raw !== 'object') return null
  const v = raw as { run?: unknown; updatedAt?: unknown }
  if (typeof v.updatedAt !== 'number' || !('run' in v)) return null
  return { run: v.run ?? null, updatedAt: v.updatedAt }
}

/** JSON with sorted keys, so two copies of the same run compare equal. */
export function stableJson(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, (v as Record<string, unknown>)[k]]))
      : v
  )
}

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const strings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((s): s is string => typeof s === 'string') : [])
const num = (v: unknown, fallback = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
/** Keep only entries whose key is a known item id. */
function only<T>(v: unknown, ids: Set<string>, keep: (x: unknown) => x is T): Record<string, T> {
  if (!isRecord(v)) return {}
  return Object.fromEntries(Object.entries(v).filter(([k, x]) => ids.has(k) && keep(x))) as Record<string, T>
}

// ── Practice ────────────────────────────────────────────────────────────────

export type PracticeOutcome = { correct: boolean; note?: string; given?: string }
export interface PracticeRun {
  index: number
  results: Record<string, PracticeOutcome>
  later: string[]
  subset: string[] | null
  streak: number
  bestStreak: number
}

const isOutcome = (x: unknown): x is PracticeOutcome => isRecord(x) && typeof x.correct === 'boolean'

/** A saved practice run checked against the guide's activities; null when there's nothing to resume. */
export function cleanPracticeRun(raw: unknown, activityIds: string[]): PracticeRun | null {
  if (!isRecord(raw)) return null
  const ids = new Set(activityIds)
  const subset = Array.isArray(raw.subset) ? strings(raw.subset).filter((id) => ids.has(id)) : null
  if (subset && !subset.length) return null
  const total = subset ? subset.length : activityIds.length
  const results = only(raw.results, ids, isOutcome)
  const index = Math.max(0, Math.min(Math.floor(num(raw.index)), total - 1))
  if (!Object.keys(results).length && index === 0) return null
  return {
    index,
    results,
    later: strings(raw.later).filter((id) => ids.has(id)),
    subset,
    streak: Math.max(0, num(raw.streak)),
    bestStreak: Math.max(0, num(raw.bestStreak)),
  }
}

// ── Quiz ────────────────────────────────────────────────────────────────────

export type QuizScore = { score: number; feedback: string; isCorrect: boolean }
export interface QuizRun {
  mode: 'practice' | 'test'
  index: number
  answers: Record<string, string>
  checked: Record<string, boolean>
  hinted: Record<string, boolean>
  saScores: Record<string, QuizScore>
  marked: string[]
  subset: string[] | null
}

const isScore = (x: unknown): x is QuizScore => isRecord(x) && typeof x.score === 'number' && typeof x.isCorrect === 'boolean' && typeof x.feedback === 'string'
const isTrue = (x: unknown): x is boolean => x === true

/** A saved quiz run checked against the guide's questions; null when there's nothing to resume. */
export function cleanQuizRun(raw: unknown, questionIds: string[]): QuizRun | null {
  if (!isRecord(raw)) return null
  const ids = new Set(questionIds)
  const subset = Array.isArray(raw.subset) ? strings(raw.subset).filter((id) => ids.has(id)) : null
  if (subset && !subset.length) return null
  const total = subset ? subset.length : questionIds.length
  const answers = only(raw.answers, ids, (x): x is string => typeof x === 'string')
  const marked = strings(raw.marked).filter((id) => ids.has(id))
  const index = Math.max(0, Math.min(Math.floor(num(raw.index)), total - 1))
  if (!Object.keys(answers).length && !marked.length && index === 0) return null
  return {
    mode: raw.mode === 'test' ? 'test' : 'practice',
    index,
    answers,
    checked: only(raw.checked, ids, isTrue),
    hinted: only(raw.hinted, ids, isTrue),
    saScores: only(raw.saScores, ids, isScore),
    marked,
    subset,
  }
}
