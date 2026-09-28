// Spaced-repetition scheduler for Learn mode (Leitner boxes).
//
// Each item sits in a box 0..MAX_BOX. Answering correctly (on the first try in
// a session) moves it up a box and schedules the next review further out;
// a miss sends it back to box 0 (due again now). Pure functions — the state is
// a plain object persisted per guide in study_progress (kind 'learn').

export const INTERVAL_DAYS = [0, 1, 2, 4, 7, 15, 30] as const
export const MAX_BOX = INTERVAL_DAYS.length - 1
export const MASTERED_BOX = 5 // reviewed correctly ~5 times in a row, spaced out

export interface ItemState {
  box: number
  due: string // ISO timestamp
  reps: number // total reviews
  lapses: number // times it fell back to box 0
}

export type LearnState = Record<string, ItemState>

const DAY = 86_400_000

/** Due at the start of the day `days` from now, so "tomorrow" means tomorrow morning. */
function dueAfter(now: Date, days: number): string {
  if (days === 0) return now.toISOString()
  const d = new Date(now.getTime() + days * DAY)
  d.setHours(4, 0, 0, 0)
  return d.toISOString()
}

export function gradeItem(state: LearnState, id: string, correct: boolean, now = new Date()): LearnState {
  const prev = state[id]
  const box = correct ? Math.min((prev?.box ?? 0) + 1, MAX_BOX) : 0
  return {
    ...state,
    [id]: {
      box,
      due: dueAfter(now, INTERVAL_DAYS[box]),
      reps: (prev?.reps ?? 0) + 1,
      // A lapse = forgetting something you'd learned (box > 0); repeated misses
      // while relearning in the same session don't pile up.
      lapses: (prev?.lapses ?? 0) + (!correct && prev && prev.box > 0 ? 1 : 0),
    },
  }
}

export function isDue(s: ItemState | undefined, now = new Date()): boolean {
  return !!s && new Date(s.due).getTime() <= now.getTime()
}

/**
 * Items for one session: everything due (most overdue / lowest box first),
 * then up to `newLimit` never-seen items in document order, capped at `max`.
 */
export function buildSession(ids: string[], state: LearnState, now = new Date(), opts: { newLimit?: number; max?: number } = {}): string[] {
  const { newLimit = 8, max = 20 } = opts
  const due = ids
    .filter((id) => isDue(state[id], now))
    .sort((a, b) => state[a].box - state[b].box || new Date(state[a].due).getTime() - new Date(state[b].due).getTime())
  const fresh = ids.filter((id) => !state[id]).slice(0, newLimit)
  return [...due, ...fresh].slice(0, max)
}

export interface LearnSummary {
  total: number
  due: number // seen before and due now
  fresh: number // never seen
  learning: number // seen, below the mastered box
  mastered: number
  nextDue: string | null // soonest future review
}

export function summarize(ids: string[], state: LearnState, now = new Date()): LearnSummary {
  let due = 0, fresh = 0, learning = 0, mastered = 0
  let nextDue: string | null = null
  for (const id of ids) {
    const s = state[id]
    if (!s) { fresh++; continue }
    if (s.box >= MASTERED_BOX) mastered++
    else learning++
    if (isDue(s, now)) due++
    else if (!nextDue || s.due < nextDue) nextDue = s.due
  }
  return { total: ids.length, due, fresh, learning, mastered, nextDue }
}
