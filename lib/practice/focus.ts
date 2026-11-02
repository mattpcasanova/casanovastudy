// Focus mode on assigned practice (pure; unit-tested in focus.test.ts).
// The student page records events (components/assign/focus-mode.tsx), the
// route cleans them (sanitizeFocusEvents) and the teacher page summarizes them.

export type FocusKind = 'start' | 'left' | 'fullscreen_exit' | 'copy' | 'paste'
export const FOCUS_KINDS: FocusKind[] = ['start', 'left', 'fullscreen_exit', 'copy', 'paste']
export interface FocusEvent { kind: FocusKind; at: string; seconds?: number | null }

const MAX_PER_POST = 50
const MAX_AGE_MS = 24 * 60 * 60 * 1000

/** Keep well-formed events from a student's post: known kinds, sane times, at most 50. */
export function sanitizeFocusEvents(raw: unknown, now = Date.now()): FocusEvent[] {
  if (!Array.isArray(raw)) return []
  const out: FocusEvent[] = []
  for (const e of raw.slice(0, MAX_PER_POST)) {
    if (!e || typeof e !== 'object') continue
    const { kind, at, seconds } = e as Record<string, unknown>
    if (!FOCUS_KINDS.includes(kind as FocusKind) || typeof at !== 'string') continue
    const t = Date.parse(at)
    if (Number.isNaN(t) || t > now + 60_000 || t < now - MAX_AGE_MS) continue
    const s = Number(seconds)
    const timed = kind === 'left' || kind === 'fullscreen_exit'
    out.push({ kind: kind as FocusKind, at: new Date(t).toISOString(), seconds: timed && seconds != null && Number.isFinite(s) ? Math.min(Math.max(Math.round(s), 0), 86_400) : null })
  }
  return out
}

export interface FocusSummary {
  started: boolean
  leaves: number
  awaySeconds: number
  longestAway: number
  fullscreenExits: number
  /** Seconds out of full screen (exits recorded with how long they lasted). */
  fullscreenSeconds: number
  /** Total seconds out of focus: time away and time out of full screen, overlaps counted once. */
  outSeconds: number
  copies: number
  pastes: number
}

export function summarizeFocus(events: FocusEvent[]): FocusSummary {
  const s: FocusSummary = { started: false, leaves: 0, awaySeconds: 0, longestAway: 0, fullscreenExits: 0, fullscreenSeconds: 0, outSeconds: 0, copies: 0, pastes: 0 }
  const spans: Array<[number, number]> = []
  const span = (e: FocusEvent) => {
    const t = Date.parse(e.at)
    if (e.seconds && !Number.isNaN(t)) spans.push([t, t + e.seconds * 1000])
  }
  for (const e of events) {
    if (e.kind === 'start') s.started = true
    else if (e.kind === 'left') {
      s.leaves++
      s.awaySeconds += e.seconds ?? 0
      s.longestAway = Math.max(s.longestAway, e.seconds ?? 0)
      span(e)
    } else if (e.kind === 'fullscreen_exit') {
      s.fullscreenExits++
      s.fullscreenSeconds += e.seconds ?? 0
      span(e)
    } else if (e.kind === 'copy') s.copies++
    else if (e.kind === 'paste') s.pastes++
  }
  // Leaving the tab usually also leaves full screen: merge the spans so the time isn't counted twice.
  spans.sort((a, b) => a[0] - b[0])
  let end = -Infinity
  let total = 0
  for (const [a, b] of spans) {
    if (b <= end) continue
    total += b - Math.max(a, end)
    end = b
  }
  // Events without usable times (older rows) still count their seconds.
  s.outSeconds = spans.length ? Math.round(total / 1000) : s.awaySeconds
  return s
}

/** "1m 20s", "45s", "2h 5m" */
export function durationText(seconds: number): string {
  const s = Math.max(0, Math.round(seconds))
  if (s < 60) return `${s}s`
  if (s < 3600) return s % 60 ? `${Math.floor(s / 60)}m ${s % 60}s` : `${s / 60}m`
  const m = Math.round((s % 3600) / 60)
  return m ? `${Math.floor(s / 3600)}h ${m}m` : `${s / 3600}h`
}

/** Chip text for the teacher's list, or null when nothing worth flagging. */
export function focusChip(s: FocusSummary): string | null {
  const parts: string[] = []
  if (s.outSeconds >= 1) parts.push(`Out of focus ${durationText(s.outSeconds)} total`)
  if (s.leaves) parts.push(`left the page ${s.leaves}×`)
  if (s.fullscreenExits) parts.push(`left full screen ${s.fullscreenExits}×`)
  if (s.copies + s.pastes) parts.push(`${s.copies + s.pastes} copy/paste`)
  if (!parts.length) return null
  const text = parts.join(' · ')
  return text.charAt(0).toUpperCase() + text.slice(1)
}

/** One line per event for the teacher's dialog. */
export function focusEventText(e: FocusEvent): string {
  switch (e.kind) {
    case 'start': return 'Started in focus mode'
    case 'left': return e.seconds != null ? `Left the page for ${durationText(e.seconds)}` : 'Left the page and did not come back'
    case 'fullscreen_exit': return e.seconds != null ? `Out of full screen for ${durationText(e.seconds)}` : 'Left full screen'
    case 'copy': return 'Tried to copy text'
    case 'paste': return 'Tried to paste text'
  }
}

/** What the teacher's switch says (assign dialog and assignment page). */
export const FOCUS_MODE_HINT = "Opens full screen, turns off copy and paste, and shows you when a student leaves the page and for how long. It can't see other devices, so keep phones put away. Pairs well with AI help Off."
