"use client"

// Account-synced study progress (table study_progress, migration 038).
// The browser copy (localStorage) renders instantly and works signed-out; the
// account copy is the source of truth once it exists, so progress follows the
// student between devices. Owner-only RLS — writes go straight from the browser.

import { supabase } from '@/lib/supabase'

export type ProgressKind = 'outline' | 'plan' | 'practice' | 'learn' | 'schedule'

async function currentUserId(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user?.id ?? null
}

/** The saved progress for this guide, or null (signed out / nothing saved / error). */
export async function loadProgress<T>(studyGuideId: string, kind: ProgressKind): Promise<T | null> {
  const userId = await currentUserId()
  if (!userId) return null
  const { data, error } = await supabase
    .from('study_progress')
    .select('data')
    .eq('user_id', userId)
    .eq('study_guide_id', studyGuideId)
    .eq('kind', kind)
    .maybeSingle()
  if (error) {
    console.warn('Could not load progress:', error.message)
    return null
  }
  return (data?.data as T) ?? null
}

/** Upsert progress for this guide. Silently no-ops when signed out. */
export async function saveProgress(studyGuideId: string, kind: ProgressKind, value: unknown): Promise<void> {
  const userId = await currentUserId()
  if (!userId) return
  const { error } = await supabase
    .from('study_progress')
    .upsert(
      { user_id: userId, study_guide_id: studyGuideId, kind, data: value, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,study_guide_id,kind' }
    )
  if (error) console.warn('Could not save progress:', error.message)
}

/** Keys like "cs:outline:<guideId>" / "cs:plan:<guideId>" map to a synced kind. */
export function parseProgressKey(key: string): { kind: ProgressKind; studyGuideId: string } | null {
  const m = key.match(/^cs:(outline|plan|practice|learn):([0-9a-f-]{36})$/i)
  return m ? { kind: m[1].toLowerCase() as ProgressKind, studyGuideId: m[2] } : null
}
