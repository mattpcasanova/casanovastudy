"use client"

import { createContext, useContext } from 'react'
import type { GraphSpec, Pt } from '@/lib/graphs/spec'

export interface DesmosApi {
  /** Opens the calculator panel and loads a figure's functions/points into it. */
  openWith: (spec: GraphSpec) => void
  /** Opens the calculator panel as-is (used by the Explain dock's Calculator button). */
  open: () => void
  /** Types a walkthrough's expressions (and data table) into the graphing calculator. */
  load: (setup: { expressions: string[]; table?: Pt[]; bounds?: { left: number; right: number; bottom: number; top: number } }) => void
  /** True when this guide's calculator is the graphing one (math), false for scientific (chemistry). */
  graphing: boolean
}

// null when the calculator isn't offered for this guide (or no API key is set).
export const DesmosContext = createContext<DesmosApi | null>(null)

export function useDesmos(): DesmosApi | null {
  return useContext(DesmosContext)
}
