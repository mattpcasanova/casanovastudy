"use client"

// "Make their practice set" on a reteach plan remembers who it's for, so the
// Assign dialog on the new guide opens with that class and those students.

export interface AssignPreset {
  classId: string
  rosterIds: string[]
  title?: string
  /** Where the group came from: a graded set's or an assigned practice's reteach plan. */
  source?: { batchId?: string; practiceId?: string; groupKey?: string }
  at: number
}

const KEY = 'cs:assign-preset'

export function rememberAssignPreset(p: Omit<AssignPreset, 'at'>) {
  try { sessionStorage.setItem(KEY, JSON.stringify({ ...p, at: Date.now() })) } catch {}
}

/** The preset if a guide made after it is being opened (within 30 minutes). */
export function assignPresetFor(guideCreatedAt: string | undefined): AssignPreset | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as AssignPreset
    if (Date.now() - p.at > 30 * 60 * 1000) { sessionStorage.removeItem(KEY); return null }
    if (guideCreatedAt && Date.parse(guideCreatedAt) < p.at - 60_000) return null
    return p
  } catch {
    return null
  }
}

export function clearAssignPreset() {
  try { sessionStorage.removeItem(KEY) } catch {}
}
