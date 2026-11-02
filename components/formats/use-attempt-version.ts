"use client"

// Which version of a quiz or practice set a run uses (2026-11-02). Retrying the
// same questions let students learn which option was right, so:
// - Assigned work: attempt 1 is the original; every later attempt that counts
//   gets a new version written for that student (versionForAttempt), prepared in
//   the background as soon as the previous attempt is turned in.
// - Their own guide (or assigned work with no attempts left): "Try again with
//   new questions" moves to the next version, remembered per guide in
//   localStorage so a reload keeps the same questions.
// Each version lines up item for item with the original (same ids), so missed
// ids, the teacher's report and saved runs keep working. Every version also gets
// its own answer order (the seed).

import { useCallback, useEffect, useRef, useState } from "react"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { useAttemptInfo } from "@/components/assign/assignment-context"
import { MAX_VERSIONS, versionForAttempt } from "@/lib/formats/versions"
import { usePlan } from "@/components/plan/plan-provider"
import { isPlanBlock } from "@/lib/plan-rules"

type Active = { version: number; seed: string; assigned: boolean }
const selfKey = (guideId: string) => `cs:guide-version:${guideId}`

function readSelf(guideId: string | undefined): number {
  if (!guideId) return 0
  try {
    const n = Number(localStorage.getItem(selfKey(guideId)))
    return Number.isInteger(n) && n > 0 && n <= MAX_VERSIONS ? n : 0
  } catch { return 0 }
}

export interface AttemptVersion {
  /** The guide text this run uses, or null while its version is being written. */
  content: string | null
  /** Seed for the answer order of this run. */
  seed: string
  /** 0 = the original. */
  version: number
  /** A new version is being written (show the waiting card). */
  preparing: boolean
  /** It couldn't be written: the original is used in a new order. */
  failed: boolean
  /** Whether "new questions" is available, and what the button says. */
  next: { label: string; assigned: boolean; waiting?: boolean } | null
  /** Move to the next version (the caller then restarts the run). */
  startNext: () => void
}

export function useAttemptVersion(original: string, guideId: string | undefined): AttemptVersion {
  const info = useAttemptInfo()
  const { user } = useAuth()
  const { openPremium } = usePlan()
  const signedIn = !!user
  const assignedNow = !!info?.assignmentId && info.counts && info.percent
  const [active, setActive] = useState<Active>(() => {
    const v = readSelf(guideId)
    return { version: v, seed: v ? `self-${v}` : "", assigned: false }
  })
  const [texts, setTexts] = useState<Record<string, string>>({})
  const [failedKeys, setFailedKeys] = useState<Record<string, true>>({})
  const asking = useRef(new Set<string>())

  const keyOf = (version: number, assigned: boolean) => `${assigned ? info?.assignmentId ?? "" : "self"}:${version}`

  // Once the assignment lookup is in: an assigned attempt uses its own version (once, not again mid-run).
  const appliedSettle = useRef(false)
  useEffect(() => {
    if (!info?.settled || appliedSettle.current) return
    appliedSettle.current = true
    if (assignedNow) setActive({ version: versionForAttempt(info.nextAttempt), seed: info.nextAttempt > 1 ? `attempt-${info.nextAttempt}` : "", assigned: true })
  }, [info?.settled, info?.nextAttempt, assignedNow])

  const fetchVersion = useCallback(async (version: number, assigned: boolean) => {
    if (!guideId || version < 1 || !signedIn) return
    const key = keyOf(version, assigned)
    if (asking.current.has(key)) return
    asking.current.add(key)
    const assignmentId = assigned ? info?.assignmentId ?? undefined : undefined
    const done = (data: { status?: string; content?: string }) => {
      if (data.status === "ready" && typeof data.content === "string") { setTexts((t) => ({ ...t, [key]: data.content as string })); return true }
      if (data.status === "failed" || data.status === "none") { setFailedKeys((f) => ({ ...f, [key]: true })); return true }
      return false
    }
    try {
      const res = await authFetch(`/api/study-guides/${guideId}/version`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ version, assignmentId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Today's guide limit: say so (the run goes on with the same questions in a new order).
        if (isPlanBlock(data)) openPremium(data)
        setFailedKeys((f) => ({ ...f, [key]: true }))
        return
      }
      if (done(data)) return
      // Another tab (or the background prefetch) is writing it: wait for it.
      const qs = new URLSearchParams({ version: String(version), ...(assignmentId ? { assignmentId } : {}) })
      for (let i = 0; i < 60; i++) {
        await new Promise((r) => setTimeout(r, 4000))
        const poll = await authFetch(`/api/study-guides/${guideId}/version?${qs}`, { cache: "no-store" }).catch(() => null)
        const pd = poll?.ok ? await poll.json().catch(() => ({})) : {}
        if (pd.status === "none") { asking.current.delete(key); void fetchVersion(version, assigned); return }
        if (done(pd)) return
      }
      setFailedKeys((f) => ({ ...f, [key]: true }))
    } catch {
      setFailedKeys((f) => ({ ...f, [key]: true }))
    } finally {
      asking.current.delete(key)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guideId, signedIn, info?.assignmentId, openPremium])

  // Load the version this run uses.
  const activeKey = keyOf(active.version, active.assigned)
  useEffect(() => {
    if (active.version > 0 && !texts[activeKey] && !failedKeys[activeKey]) void fetchVersion(active.version, active.assigned)
  }, [active, activeKey, texts, failedKeys, fetchVersion])

  // An assigned attempt was just turned in with another left: write the next version now, while they read their results.
  useEffect(() => {
    if (!info?.settled || !assignedNow || info.nextAttempt < 2) return
    const v = versionForAttempt(info.nextAttempt)
    if (!texts[keyOf(v, true)] && !failedKeys[keyOf(v, true)]) void fetchVersion(v, true)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [info?.settled, info?.nextAttempt, assignedNow, fetchVersion])

  const startNext = useCallback(() => {
    if (assignedNow && info) {
      setActive({ version: versionForAttempt(info.nextAttempt), seed: `attempt-${info.nextAttempt}`, assigned: true })
      return
    }
    const v = (active.assigned ? 0 : active.version) % MAX_VERSIONS + 1
    try { if (guideId) localStorage.setItem(selfKey(guideId), String(v)) } catch {}
    setActive({ version: v, seed: `self-${v}`, assigned: false })
  }, [assignedNow, info, active, guideId])

  const failed = active.version > 0 && !!failedKeys[activeKey]
  const content = active.version === 0 || failed ? original : texts[activeKey] ?? null
  const next = !signedIn || !guideId
    ? null
    : assignedNow && info
      ? info.sending
        ? { label: "Sending your score…", assigned: true, waiting: true }
        : { label: `Start attempt ${info.nextAttempt} with new questions`, assigned: true }
      : { label: "Try again with new questions", assigned: false }
  return {
    content,
    // A version that couldn't be written still gets a fresh answer order.
    seed: failed ? `${active.seed}-fallback` : active.seed,
    version: failed ? 0 : active.version,
    preparing: content === null,
    failed,
    next,
    startNext,
  }
}
