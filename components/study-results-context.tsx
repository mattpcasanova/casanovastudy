"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { recordResult, type ResultContext, type StudyResult } from '@/lib/results'
import { supabase } from '@/lib/supabase'
import { lastMissed, type GuideHistory } from '@/lib/learner/guide-history'

// Tells the quiz/practice/Learn players which guide they belong to, so they can
// log answers without threading guide ids through every format component.
const Ctx = createContext<ResultContext | null>(null)

export function StudyResultsProvider({ guideId, subject, children }: ResultContext & { children: React.ReactNode }) {
  const value = useMemo(() => ({ guideId, subject }), [guideId, subject])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

/** Logs an answer for the current guide. A no-op outside a provider (previews, editor). */
export function useRecordResult(): (r: StudyResult) => void {
  const ctx = useContext(Ctx)
  return useCallback((r: StudyResult) => { if (ctx) recordResult(ctx, r) }, [ctx])
}

/**
 * What the signed-in student got wrong last time in this guide (`q:` quiz
 * questions or `p:` practice activities), for the "Last time you missed N"
 * nudge. Null until loaded, or outside a provider / signed out.
 */
export function useGuideHistory(prefix: 'q:' | 'p:'): GuideHistory | null {
  const ctx = useContext(Ctx)
  const [history, setHistory] = useState<GuideHistory | null>(null)
  useEffect(() => {
    if (!ctx?.guideId) return
    let alive = true
    void (async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const { data } = await supabase
        .from('study_results')
        .select('item_id, topic, correct, answered_at')
        .eq('user_id', session.user.id)
        .eq('study_guide_id', ctx.guideId)
        .like('item_id', `${prefix}%`)
        .order('answered_at', { ascending: false })
        .limit(1000)
      if (alive && data) setHistory(lastMissed(data, prefix))
    })()
    return () => { alive = false }
  }, [ctx?.guideId, prefix])
  return history
}
