"use client"

import { createContext, useContext } from 'react'
import type { GraphSpec } from '@/lib/graphs/spec'

export interface DesmosApi {
  /** Opens the calculator panel and loads a figure's functions/points into it. */
  openWith: (spec: GraphSpec) => void
}

// null when the calculator isn't offered for this guide (or no API key is set).
export const DesmosContext = createContext<DesmosApi | null>(null)

export function useDesmos(): DesmosApi | null {
  return useContext(DesmosContext)
}
