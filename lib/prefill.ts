"use client"

// Hand a ready-to-generate request to the homepage (e.g. "quiz me on what I
// missed"). Stored in sessionStorage — not the URL — and consumed once.

export interface GuidePrefill {
  source: 'missed-quiz' | 'weak-spots' | 'adaptive-next'
  sourceTitle: string
  studyRequest: string
  studyGuideName: string
  format: string
  subject?: string
  gradeLevel?: string
  detail: string // one line shown in the arrival banner, e.g. "6 questions you missed"
  /** Adaptive next sessions: 'hard' = level up, 'easier' = foundations. */
  difficultyLevel?: 'easier' | 'standard' | 'hard'
}

const KEY = 'cs:prefill'

export function openHomeWithPrefill(p: GuidePrefill): string {
  try { sessionStorage.setItem(KEY, JSON.stringify(p)) } catch {}
  return '/?from=prefill'
}

export function takePrefill(): GuidePrefill | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    sessionStorage.removeItem(KEY)
    return raw ? (JSON.parse(raw) as GuidePrefill) : null
  } catch {
    return null
  }
}
