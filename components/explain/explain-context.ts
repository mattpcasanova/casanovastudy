"use client"

// Shared by ExplainProvider and anything that asks it (figures, quiz and
// practice feedback). Kept separate so figure components don't import the
// provider (which imports StudyMarkdown, which imports the figures).

import { createContext, useContext } from 'react'

/** What to ask: `label` is shown in the thread, `prompt` is sent to the AI. */
export interface ExplainRequest { label: string; prompt: string }
export interface ExplainApi { ask: (req: ExplainRequest) => void }

export const ExplainContext = createContext<ExplainApi | null>(null)
/** null outside an ExplainProvider (e.g. the live generation preview). */
export const useExplain = () => useContext(ExplainContext)
