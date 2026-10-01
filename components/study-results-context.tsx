"use client"

import { createContext, useCallback, useContext, useMemo } from 'react'
import { recordResult, type ResultContext, type StudyResult } from '@/lib/results'

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
