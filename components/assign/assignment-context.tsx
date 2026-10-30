"use client"

// Assigned practice while a student does it: opened as
// /study-guide/<id>?assignment=<assignmentId>, or without the param (from My
// Guides, a bookmark, a saved copy): /api/practice-assignments/for-guide finds
// the student's assignment on this guide, or sends a copy back to the original. Shows who assigned it, the due
// date and attempts, and saves the score when a run finishes (quiz, practice
// and adaptive call useAssignmentFinish). Outside an assignment it's a no-op.
// Also carries the teacher's AI help setting for the Explain panel
// (useAssignmentAi); /api/explain enforces it either way.

import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, CalendarClock, CheckCircle2, ClipboardCheck, Eye, Loader2, Maximize2, MessageCircleOff, MessageCircleQuestion, RotateCcw, Timer } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { timeLimitText } from "@/lib/practice/assignments"
import { FocusGate, FocusNotices, useFocusMode } from "./focus-mode"

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
  focusMode: boolean
  /** Seconds allowed per run (quiz and practice; null = no limit). */
  timeLimit: number | null
  teacherName: string | null
  /** What they had answered, sent for them at the due date (status incomplete). */
  sentAtDue: { answered: number; total: number; pct: number } | null
}

/** The run just finished, as sent to the teacher (shown by TurnedInCard on the results screen). */
type Submission =
  | { state: "sending" }
  | { state: "sent"; correct: number; total: number; counted: boolean; attemptsLeft: number | null; best: Mine["best"]; late: boolean }
  | { state: "error"; message: string; score: Parameters<Finish>[0] }
/** First answer per question in the run (q:/p:/a: ids, as in study_results), for the teacher's class report. */
export type FinishAnswer = { id: string; correct: boolean; given?: string }
type Finish = (score: { correct: number; total: number; seconds?: number; detail?: { mastered?: string[]; notMastered?: string[]; answers?: FinishAnswer[] } }) => void

const Ctx = createContext<{ finish: Finish; aiHelp: Mine["aiHelp"]; counts: boolean; timeLimit: number | null; teacherName: string | null; grading: Mine["grading"]; submission: Submission | null } | null>(null)

/** Report a finished run of assigned practice (no-op when not assigned). */
export function useAssignmentFinish(): Finish | null {
  return useContext(Ctx)?.finish ?? null
}

/** The AI help setting on this assigned work, or null outside an assignment. */
export function useAssignmentAi(): Mine["aiHelp"] | null {
  return useContext(Ctx)?.aiHelp ?? null
}

/** True while this run will be sent to the teacher (assigned, attempts left): players then don't offer Start over mid-run. */
export function useAssignmentCounts(): boolean {
  return useContext(Ctx)?.counts ?? false
}

/** The teacher's time limit in seconds for a run that will count, or null (no limit, not assigned, or attempts used up). */
export function useAssignmentTimeLimit(): number | null {
  const c = useContext(Ctx)
  return c && c.counts ? c.timeLimit : null
}

/** Who assigned this guide to the student (null outside an assignment). */
export function useAssignedBy(): { teacherName: string | null } | null {
  const c = useContext(Ctx)
  return c ? { teacherName: c.teacherName } : null
}

const dueText = (iso: string) => new Date(iso).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })

export function AssignmentProvider({ guideId, children }: { guideId: string; children: React.ReactNode }) {
  const [id, setId] = useState<string | null>(null)
  const [mine, setMine] = useState<Mine | null>(null)
  const [submission, setSubmission] = useState<Submission | null>(null)
  // Focus mode only matters while there's an attempt left to count.
  const focusOn = !!mine?.focusMode && mine.attemptsLeft !== 0
  const focus = useFocusMode(id, focusOn)

  const router = useRouter()
  useEffect(() => {
    let a = new URLSearchParams(window.location.search).get("assignment")
    void (async () => {
      if (!a || !/^[0-9a-f-]{36}$/i.test(a)) {
        // Opened without the link's ?assignment= (My Guides, history, a saved copy): find it.
        const found = await authFetch(`/api/practice-assignments/for-guide?guideId=${guideId}`, { cache: "no-store" })
        if (!found.ok) return
        const hit = (await found.json().catch(() => null)) as { assignmentId?: string; guideId?: string } | null
        if (!hit?.assignmentId || !hit.guideId) return
        if (hit.guideId !== guideId) {
          // Their saved copy of an assigned guide: the assignment, its progress and score live on the original.
          router.replace(`/study-guide/${hit.guideId}?assignment=${hit.assignmentId}`)
          return
        }
        a = hit.assignmentId
        const url = new URL(window.location.href)
        url.searchParams.set("assignment", a)
        window.history.replaceState(window.history.state, "", url)
      }
      const res = await authFetch(`/api/practice-assignments/${a}/me`, { cache: "no-store" })
      if (!res.ok) return
      const data = (await res.json()) as Mine
      if (data.guideId !== guideId) return
      setId(a)
      setMine(data)
    })()
  }, [guideId, router])

  const focusFinished = focus.runFinished
  const finish = useCallback<Finish>((score) => {
    if (!id || score.total <= 0) return
    focusFinished()
    setSubmission({ state: "sending" })
    void (async () => {
      const res = await authFetch(`/api/practice-assignments/${id}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(score) }).catch(() => null)
      const data = res ? await res.json().catch(() => ({})) : {}
      if (!res?.ok) { setSubmission({ state: "error", message: data.error || "Your score couldn't be sent.", score }); return }
      const late = !!mine?.dueAt && Date.now() > Date.parse(mine.dueAt)
      setMine((m) => (m ? { ...m, attempts: m.attempts + (data.counted ? 1 : 0), attemptsLeft: data.attemptsLeft, best: data.best ?? m.best, status: late ? "late" : "done", sentAtDue: null } : m))
      setSubmission({ state: "sent", correct: score.correct, total: score.total, counted: !!data.counted, attemptsLeft: data.attemptsLeft ?? null, best: data.best ?? null, late })
    })()
  }, [id, mine?.dueAt, focusFinished])

  if (!id || !mine) return <>{children}</>
  const best = mine.best ? (mine.grading === "mastery" ? `${mine.best.correct} of ${mine.best.total} topics mastered` : `${Math.round(mine.best.pct)}%`) : null
  return (
    <Ctx.Provider value={{ finish, aiHelp: mine.aiHelp, counts: mine.attemptsLeft !== 0, timeLimit: mine.timeLimit ?? null, teacherName: mine.teacherName ?? null, grading: mine.grading, submission }}>
      <div className="border-b border-emerald-200 bg-emerald-50 print:hidden">
        <div className="container mx-auto flex max-w-5xl flex-wrap items-center gap-x-5 gap-y-1 px-4 py-2.5 text-sm text-emerald-950">
          <span className="inline-flex items-center gap-2 font-semibold"><ClipboardCheck className="h-4 w-4" />{mine.teacherName ? `Assigned by ${mine.teacherName}` : "Assigned"}: {mine.title}</span>
          {mine.dueAt && <span className="inline-flex items-center gap-1.5"><CalendarClock className="h-4 w-4" />Due {dueText(mine.dueAt)}</span>}
          {mine.maxAttempts != null && <span>Attempt {Math.min(mine.attempts + 1, mine.maxAttempts)} of {mine.maxAttempts}{mine.attemptsLeft === 0 ? " (all used)" : ""}</span>}
          {mine.grading === "mastery" && <span>Graded on how many topics you master</span>}
          {mine.timeLimit != null && mine.attemptsLeft !== 0 && <span className="inline-flex items-center gap-1.5"><Timer className="h-4 w-4" />Time limit {timeLimitText(mine.timeLimit)}: the clock starts when you press Start</span>}
          {mine.aiHelp === "off" && <span className="inline-flex items-center gap-1.5"><MessageCircleOff className="h-4 w-4" />Get help is off for this assignment</span>}
          {mine.aiHelp === "tutor" && <span className="inline-flex items-center gap-1.5"><MessageCircleQuestion className="h-4 w-4" />Get help: hints only. Your teacher can see what you ask</span>}
          {mine.aiHelp === "full" && <span className="inline-flex items-center gap-1.5"><MessageCircleQuestion className="h-4 w-4" />Your teacher can see what you ask in Get help</span>}
          {best && <span className="inline-flex items-center gap-1.5"><CheckCircle2 className="h-4 w-4" />Best so far: {best}</span>}
          {focusOn && focus.state === "on" && <span className="inline-flex items-center gap-1.5 font-medium"><Eye className="h-4 w-4" />Focus mode: leaving this page is recorded</span>}
          {focusOn && focus.state === "on" && focus.finished && (
            <button type="button" onClick={() => void focus.backToFullscreen()} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-700 px-3 font-semibold text-white hover:bg-emerald-800">
              <Maximize2 className="h-4 w-4" />Full screen for another attempt
            </button>
          )}
          {mine.status === "incomplete" && mine.sentAtDue && (
            <span className="w-full font-medium">
              You didn&apos;t finish by the due date, so what you&apos;d answered was sent ({mine.sentAtDue.total ? `${mine.sentAtDue.answered} of ${mine.sentAtDue.total}` : mine.sentAtDue.answered} answered, {Math.round(mine.sentAtDue.pct)}%). Finish it to raise your score; it will count as late.
            </span>
          )}
          {submission?.state === "sent" && <span className="w-full font-medium" aria-live="polite">{submission.counted ? "Turned in. Your teacher has your score." : "You've used all your attempts, so this one wasn't sent."}</span>}
        </div>
      </div>
      {focusOn && focus.state === "gate" && <FocusGate title={mine.title} onStart={() => void focus.start()} />}
      {focusOn && focus.state === "on" && <FocusNotices notice={focus.notice} onDismiss={focus.dismissNotice} outOfFullscreen={focus.outOfFullscreen} onBackToFullscreen={() => void focus.backToFullscreen()} />}
      {children}
    </Ctx.Provider>
  )
}

const scoreText = (grading: Mine["grading"], correct: number, total: number) =>
  grading === "mastery" ? `${correct} of ${total} topics mastered` : `${Number.isInteger(correct) ? correct : correct.toFixed(2).replace(/0$/, "")}/${total} (${Math.round((correct / total) * 100)}%)`

/**
 * The "turned in" moment at the top of a results screen: sending, sent to the
 * teacher (score, best, attempts left), not counted (attempts used up), or a
 * failed send with Try again. Nothing outside an assignment or before a finish.
 */
export function TurnedInCard() {
  const c = useContext(Ctx)
  const s = c?.submission
  if (!c || !s) return null
  const to = c.teacherName ? `to ${c.teacherName}` : "to your teacher"
  if (s.state === "sending") {
    return (
      <div role="status" className="flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-slate-700 ring-1 ring-inset ring-slate-200 print:hidden">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" /> Sending your score {to}…
      </div>
    )
  }
  if (s.state === "error") {
    return (
      <div role="alert" className="flex flex-wrap items-center gap-3 rounded-2xl bg-rose-50 p-4 text-rose-900 ring-1 ring-inset ring-rose-200 print:hidden">
        <AlertTriangle className="h-5 w-5 shrink-0" />
        <span className="min-w-0 flex-1"><span className="font-semibold">Not sent yet.</span> {s.message} Your answers are still here.</span>
        <button type="button" onClick={() => c.finish(s.score)} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-rose-700 px-4 text-sm font-semibold text-white hover:bg-rose-800"><RotateCcw className="h-4 w-4" />Try again</button>
      </div>
    )
  }
  if (!s.counted) {
    return (
      <div role="status" className="flex items-start gap-3 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-inset ring-amber-200 print:hidden">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <span>
          <span className="font-semibold">This run wasn&apos;t sent: you&apos;ve used all your attempts.</span>{" "}
          {s.best ? `Your best score, ${c.grading === "mastery" ? `${s.best.correct} of ${s.best.total} topics` : `${Math.round(s.best.pct)}%`}, is the one that counts.` : "Your earlier score is the one that counts."} Practicing more still helps.
        </span>
      </div>
    )
  }
  const better = s.best && Math.round(s.best.pct) > Math.round((s.correct / s.total) * 100)
  return (
    <div role="status" className="flex items-start gap-4 rounded-2xl bg-emerald-50 p-5 text-emerald-950 ring-1 ring-inset ring-emerald-200 print:hidden">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-white"><CheckCircle2 className="h-6 w-6" /></span>
      <span className="min-w-0">
        <span className="block text-lg font-semibold">Turned in {to}{s.late ? " (late)" : ""}</span>
        <span className="block">Score sent: {scoreText(c.grading, s.correct, s.total)}.{better && s.best ? ` Your best, ${Math.round(s.best.pct)}%, is the one that counts.` : ""}</span>
        <span className="mt-1 block text-sm text-emerald-800">
          {s.attemptsLeft == null
            ? "You can go again any time; your best score counts."
            : s.attemptsLeft > 0
              ? `You have ${s.attemptsLeft} more attempt${s.attemptsLeft === 1 ? "" : "s"} if you want to raise it; your best score counts.`
              : "That was your last attempt. You can still practice; it won't change your score."}
        </span>
      </span>
    </div>
  )
}
