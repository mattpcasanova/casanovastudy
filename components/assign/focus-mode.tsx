"use client"

// Focus mode on assigned practice (practice_assignments.focus_mode). A web
// page can't lock the device, so this discourages and records instead: the
// student starts with a notice, the work opens full screen, copy / paste /
// right-click are blocked, and leaving the page (another tab or app, another
// window beside it, leaving full screen) is logged with how long. The teacher
// sees the log on /teacher/practice/[id]. Nothing pauses the work.

import { useCallback, useEffect, useRef, useState } from "react"
import { AlertTriangle, Eye, Maximize2 } from "lucide-react"
import { supabase } from "@/lib/supabase"
import { durationText, type FocusEvent, type FocusKind } from "@/lib/practice/focus"

export type FocusState = "gate" | "on"

// Shorter trips (a notification sliding in, a click on the browser bar) aren't worth flagging.
const MIN_AWAY_SECONDS = 2

const fullscreenSupported = () => typeof document !== "undefined" && !!document.fullscreenEnabled && !!document.documentElement.requestFullscreen

async function enterFullscreen() {
  if (!fullscreenSupported() || document.fullscreenElement) return
  try { await document.documentElement.requestFullscreen({ navigationUI: "hide" }) } catch { /* refused: still recorded */ }
}

function exitFullscreen() {
  if (typeof document !== "undefined" && document.fullscreenElement) void document.exitFullscreen().catch(() => {})
}

export function useFocusMode(assignmentId: string | null, enabled: boolean) {
  const [state, setState] = useState<FocusState>("gate")
  const [notice, setNotice] = useState<string | null>(null)
  const [outOfFullscreen, setOutOfFullscreen] = useState(false)
  const queue = useRef<FocusEvent[]>([])
  const token = useRef<string | null>(null)
  const awaySince = useRef<number | null>(null)
  const lastAttempt = useRef<Record<string, number>>({})

  const refreshToken = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    token.current = session?.access_token ?? null
  }, [])

  const flush = useCallback((keepalive = false) => {
    if (!assignmentId || !queue.current.length || !token.current) return
    const events = queue.current.splice(0, 50)
    void fetch(`/api/practice-assignments/${assignmentId}/focus`, {
      method: "POST",
      credentials: "omit",
      keepalive,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token.current}` },
      body: JSON.stringify({ events }),
    }).catch(() => { queue.current.unshift(...events) })
  }, [assignmentId])

  const record = useCallback((kind: FocusKind, seconds?: number | null, at = Date.now()) => {
    queue.current.push({ kind, at: new Date(at).toISOString(), seconds: seconds ?? null })
  }, [])

  const start = useCallback(async () => {
    await refreshToken()
    await enterFullscreen()
    record("start")
    flush()
    setOutOfFullscreen(false)
    setState("on")
  }, [flush, record, refreshToken])

  // A run finished: leave full screen without flagging it. Recording goes on
  // while they're on the page, since another run could still count.
  const finishedRun = useRef(false)
  const [finished, setFinished] = useState(false)
  const runFinished = useCallback(() => {
    if (state !== "on") return
    finishedRun.current = true
    setFinished(true)
    exitFullscreen()
    flush()
  }, [flush, state])

  useEffect(() => {
    if (!enabled || state !== "on") return

    const goAway = () => { if (awaySince.current == null) awaySince.current = Date.now() }
    const comeBack = () => {
      if (awaySince.current == null || document.visibilityState !== "visible" || !document.hasFocus()) return
      const since = awaySince.current
      awaySince.current = null
      const seconds = Math.round((Date.now() - since) / 1000)
      if (seconds < MIN_AWAY_SECONDS) return
      record("left", seconds, since)
      flush()
      setNotice(`You left this page for ${durationText(seconds)}. Your teacher can see this.`)
    }
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { goAway(); flush(true) }
      else comeBack()
    }
    // A window beside the browser (another app, a chat) keeps the page visible, so blur counts too.
    // Focus moving into a frame inside the page (calculator, code runner) isn't leaving.
    const onBlur = () => { setTimeout(() => { if (!(document.activeElement instanceof HTMLIFrameElement)) goAway() }, 0) }
    const onFocus = () => comeBack()
    const onFullscreen = () => {
      if (!fullscreenSupported()) return
      const out = !document.fullscreenElement
      if (out && finishedRun.current) { finishedRun.current = false; return }
      if (!out) setFinished(false)
      setOutOfFullscreen(out)
      if (out) { record("fullscreen_exit"); flush() }
    }
    const attempt = (kind: "copy" | "paste") => (e: Event) => {
      e.preventDefault()
      const now = Date.now()
      if (now - (lastAttempt.current[kind] ?? 0) < 3000) return
      lastAttempt.current[kind] = now
      record(kind)
      setNotice(kind === "copy" ? "Copying is off for this assignment." : "Pasting is off for this assignment.")
    }
    const onCopy = attempt("copy")
    const onPaste = attempt("paste")
    const block = (e: Event) => e.preventDefault()
    // Closing the tab while away: send what we know.
    const onPageHide = () => {
      if (awaySince.current != null) { record("left", null, awaySince.current); awaySince.current = null }
      flush(true)
    }

    document.addEventListener("visibilitychange", onVisibility)
    window.addEventListener("blur", onBlur)
    window.addEventListener("focus", onFocus)
    document.addEventListener("fullscreenchange", onFullscreen)
    document.addEventListener("copy", onCopy)
    document.addEventListener("cut", onCopy)
    document.addEventListener("paste", onPaste)
    document.addEventListener("contextmenu", block)
    document.addEventListener("dragstart", block)
    window.addEventListener("pagehide", onPageHide)
    const timer = setInterval(() => { void refreshToken().then(() => flush()) }, 15000)
    return () => {
      document.removeEventListener("visibilitychange", onVisibility)
      window.removeEventListener("blur", onBlur)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("fullscreenchange", onFullscreen)
      document.removeEventListener("copy", onCopy)
      document.removeEventListener("cut", onCopy)
      document.removeEventListener("paste", onPaste)
      document.removeEventListener("contextmenu", block)
      document.removeEventListener("dragstart", block)
      window.removeEventListener("pagehide", onPageHide)
      clearInterval(timer)
    }
  }, [enabled, state, flush, record, refreshToken])

  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 9000)
    return () => clearTimeout(t)
  }, [notice])

  return { state, start, runFinished, finished, notice, dismissNotice: () => setNotice(null), outOfFullscreen, backToFullscreen: enterFullscreen }
}

/** Shown over the guide before a focus-mode assignment starts. */
export function FocusGate({ title, onStart }: { title: string; onStart: () => void }) {
  const canFullscreen = fullscreenSupported()
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="focus-gate-title">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700"><Eye className="h-6 w-6" /></span>
        <h2 id="focus-gate-title" className="mt-4 text-xl font-semibold text-slate-900">Focus mode is on</h2>
        <p className="mt-1 text-slate-600">Your teacher turned on focus mode for <span className="font-medium text-slate-800">{title}</span>.</p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          {canFullscreen && <li className="flex gap-2"><Maximize2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />It opens full screen. Stay in full screen until you finish.</li>}
          <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />If you leave this page (another tab, app or window), your teacher sees when and for how long.</li>
          <li className="flex gap-2"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />Copy and paste are turned off.</li>
        </ul>
        <button type="button" onClick={onStart} className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-emerald-700 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-800">
          {canFullscreen && <Maximize2 className="h-5 w-5" />}Start
        </button>
      </div>
    </div>
  )
}

/** Notices while focus mode runs: time away, blocked copy/paste, out of full screen. */
export function FocusNotices({ notice, onDismiss, outOfFullscreen, onBackToFullscreen }: { notice: string | null; onDismiss: () => void; outOfFullscreen: boolean; onBackToFullscreen: () => void }) {
  if (!notice && !outOfFullscreen) return null
  return (
    <div className="fixed inset-x-0 top-0 z-[65] flex flex-col items-center gap-2 p-3 print:hidden" aria-live="assertive">
      {outOfFullscreen && (
        <div className="flex w-full max-w-xl flex-wrap items-center gap-3 rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-lg ring-1 ring-amber-300">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <span className="min-w-[12rem] flex-1">You left full screen. Your teacher can see this.</span>
          <button type="button" onClick={onBackToFullscreen} className="inline-flex h-10 items-center gap-2 rounded-xl bg-amber-700 px-4 font-semibold text-white hover:bg-amber-800"><Maximize2 className="h-4 w-4" />Back to full screen</button>
        </div>
      )}
      {notice && (
        <button type="button" onClick={onDismiss} className="flex w-full max-w-xl items-center gap-3 rounded-2xl bg-slate-900 px-4 py-3 text-left text-sm text-white shadow-lg">
          <Eye className="h-5 w-5 shrink-0 text-amber-300" />{notice}
        </button>
      )}
    </div>
  )
}
