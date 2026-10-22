"use client"

// Assigned practice while a student does it: opened as
// /study-guide/<id>?assignment=<assignmentId>. Shows who assigned it, the due
// date and attempts, and saves the score when a run finishes (quiz, practice
// and adaptive call useAssignmentFinish). Outside an assignment it's a no-op.
// Also carries the teacher's AI help setting for the Explain panel
// (useAssignmentAi); /api/explain enforces it either way.

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { CalendarClock, CheckCircle2, ClipboardCheck, MessageCircleOff, MessageCircleQuestion } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

interface Mine {
  title: string
  guideId: string
  grading: "percent" | "mastery"
  dueAt: string | null
  maxAttempts: number | null
  attempts: number
  attemptsLeft: number | null
  best: { pct: number; correct: number; total: number } | null
  status: string
  aiHelp: "off" | "tutor" | "full"
}
type Finish = (score: { correct: number; total: number; detail?: { mastered?: string[]; notMastered?: string[] } }) => void

const Ctx = createContext<{ finish: Finish; aiHelp: Mine["aiHelp"] } | null>(null)

/** Report a finished run of assigned practice (no-op when not assigned). */
export function useAssignmentFinish(): Finish | null {
  return useContext(Ctx)?.finish ?? null
}

/** The AI help setting on this assigned work, or null outside an assignment. */
export function useAssignmentAi(): Mine["aiHelp"] | null {
  return useContext(Ctx)?.aiHelp ?? null
}

const dueText = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function AssignmentProvider({ guideId, children }: { guideId: string; children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null)
  const [mine, setMine] = useState<Mine | null>(null)
  const [saved, setSaved] = useState<string>("")

  useEffect(() => {
    const a = new URLSearchParams(window.location.search).get("assignment")
    if (!a || !/^[0-9a-f-]{36}$/i.test(a)) return
    void (async () => {
      const res = await authFetch(`/api/practice-assignments/${a}/me`, { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as Mine
      if (data.guideId !== guideId) return
      setId(a)
      setMine(data)
    })()
  }, [guideId])

  const finish = useCallback<Finish>((score) => {
    if (!id || score.total <= 0) return
    void (async () => {
      const res = await authFetch(`/api/practice-assignments/${id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(score) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setSaved(data.error || "Your score couldn't be saved. Tell your teacher."); return }
      const pct = Math.round((score.correct / score.total) * 100)
      setMine((m) => (m ? { ...m, attempts: m.attempts + (data.counted ? 1 : 0), attemptsLeft: data.attemptsLeft, best: data.best ?? m.best, status: "done" } : m))
      setSaved(data.counted
        ? `Sent to your teacher: ${mine?.grading === "mastery" ? `${score.correct} of ${score.total} topics mastered` : `${score.correct}/${score.total} (${pct}%)`}.`
        : "You've used all your attempts, so this one wasn't sent. Your best score still counts.")
    })()
  }, [id, mine?.grading])

  if (!id || !mine) return <>{children}</>
  const best = mine.best ? (mine.grading === "mastery" ? `${mine.best.correct} of ${mine.best.total} topics mastered` : `${Math.round(mine.best.pct)}%`) : null
  return (
    <Ctx.Provider value={{ finish, aiHelp: mine.aiHelp }}>
      <div className="border-b border-emerald-200 bg-emerald-50 print:hidden">
        <div className="container mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-sm text-emerald-950">
          <span className="inline-flex items-center gap-2 font-semibold"><ClipboardCheck className="h-4 w-4" />Assigned: {mine.title}</span>
          {mine.dueAt && <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />Due {dueText(mine.dueAt)}</span>}
          {mine.maxAttempts != null && <span>Attempt {Math.min(mine.attempts + 1, mine.maxAttempts)} of {mine.maxAttempts}{mine.attemptsLeft === 0 ? " (all used)" : ""}</span>}
          {mine.grading === "mastery" && <span>Graded on how many topics you master</span>}
          {mine.aiHelp === "off" && <span className="inline-flex items-center gap-1.5"><MessageCircleOff className="h-4 w-4" />AI help is off</span>}
          {mine.aiHelp === "tutor" && <span className="inline-flex items-center gap-1.5"><MessageCircleQuestion className="h-4 w-4" />AI help: hints only. Your teacher can see what you ask</span>}
          {mine.aiHelp === "full" && <span className="inline-flex items-center gap-1.5"><MessageCircleQuestion className="h-4 w-4" />Your teacher can see what you ask the AI</span>}
          {best && <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Best so far: {best}</span>}
          {saved && <span className="w-full font-medium" aria-live="polite">{saved}</span>}
        </div>
      </div>
      {children}
    </Ctx.Provider>
  )
}
