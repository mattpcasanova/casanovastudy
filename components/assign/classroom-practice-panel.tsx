"use client"

// Assigned practice ↔ Google Classroom: post it as a Classroom assignment for
// just those students (with the link), then send their best scores back.
// Hidden when Classroom isn't set up on this site.

import { useCallback, useEffect, useState } from "react"
import { ExternalLink, GraduationCap, Loader2, Send } from "lucide-react"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { connectGoogleClassroom } from "@/components/classes/google-classroom-dialog"
import { authFetch } from "@/lib/auth-fetch"

interface Status { configured: boolean; connected: boolean; courseId: string | null; posted: { link: string | null; syncedAt: string | null } | null }
interface Course { id: string; name: string; section: string | null }

export function ClassroomPracticePanel({ assignmentId, students, compact = false }: { assignmentId: string; students: number; compact?: boolean }) {
  const [status, setStatus] = useState<Status | null>(null)
  const [courses, setCourses] = useState<Course[] | null>(null)
  const [course, setCourse] = useState("")
  const [busy, setBusy] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const res = await authFetch(`/api/practice-assignments/${assignmentId}/classroom`, { cache: "no-store" })
    if (res.ok) setStatus(await res.json())
  }, [assignmentId])
  useEffect(() => { void load() }, [load])

  // No course tied to this class yet: let them pick it.
  useEffect(() => {
    if (!status?.connected || status.courseId || status.posted || courses) return
    void (async () => {
      const res = await authFetch("/api/google/classroom/courses", { cache: "no-store" })
      if (res.ok) setCourses((await res.json()).courses ?? [])
    })()
  }, [status, courses])

  const connect = async () => {
    const err = await connectGoogleClassroom(`/teacher/practice/${assignmentId}`)
    if (err) setError(err)
  }

  const act = async (action: "post" | "grades") => {
    setBusy(action === "post" ? "Posting to Classroom…" : "Sending scores…")
    setError("")
    setMessage("")
    try {
      const res = await authFetch(`/api/practice-assignments/${assignmentId}/classroom`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, courseId: course || undefined }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(`${data.error || "That didn't work"}${data.unmatched?.length ? ` (${data.unmatched.slice(0, 6).join(", ")})` : ""}`)
        if (data.reconnect) setStatus((s) => (s ? { ...s, connected: false } : s))
        return
      }
      if (action === "post") setMessage(`Posted for ${data.posted} student${data.posted === 1 ? "" : "s"}.${data.unmatched?.length ? ` Not in that Classroom course: ${data.unmatched.join(", ")} (share the link with them).` : ""}`)
      else setMessage(`Sent ${data.sent} score${data.sent === 1 ? "" : "s"} to Classroom as drafts and grades.${data.notFound?.length ? ` Couldn't match: ${data.notFound.join(", ")}.` : ""} Return them in Classroom when you're ready.`)
      await load()
    } finally {
      setBusy("")
    }
  }

  if (!status?.configured) return null
  return (
    <div className={compact ? "rounded-xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200" : "mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"}>
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><GraduationCap className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1 text-sm">
          <p className="font-semibold text-slate-900">Google Classroom</p>
          <p className="text-slate-600">
            {status.posted
              ? `Posted for these students.${status.posted.syncedAt ? ` Scores last sent ${new Date(status.posted.syncedAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.` : " Send their scores when they're done."}`
              : `Post it to just these ${students} student${students === 1 ? "" : "s"} in Classroom, with the link. Their scores can go back to Classroom later.`}
          </p>
        </div>
        {!status.connected ? (
          <button type="button" className={actionButton} onClick={() => void connect()}>Connect Google Classroom</button>
        ) : status.posted ? (
          <span className="flex flex-wrap gap-2">
            {status.posted.link && <a href={status.posted.link} target="_blank" rel="noreferrer" className={actionButton}><ExternalLink />Open in Classroom</a>}
            <button type="button" className={actionButtonPrimary} disabled={!!busy} onClick={() => void act("grades")}>{busy ? <Loader2 className="animate-spin" /> : <Send />}Send scores to Classroom</button>
          </span>
        ) : (
          <span className="flex flex-wrap items-center gap-2">
            {!status.courseId && (
              <select aria-label="Classroom course" value={course} onChange={(e) => setCourse(e.target.value)} className="h-10 max-w-[16rem] rounded-xl border border-slate-300 bg-white px-3 text-sm">
                <option value="">{courses ? "Which Classroom course?" : "Loading courses…"}</option>
                {courses?.map((c) => <option key={c.id} value={c.id}>{c.name}{c.section ? ` (${c.section})` : ""}</option>)}
              </select>
            )}
            <button type="button" className={actionButtonPrimary} disabled={!!busy || (!status.courseId && !course)} onClick={() => void act("post")}>{busy ? <Loader2 className="animate-spin" /> : <GraduationCap />}Post to Google Classroom</button>
          </span>
        )}
      </div>
      {busy && <p className="mt-2 text-sm text-slate-500">{busy}</p>}
      {message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900" aria-live="polite">{message}</p>}
      {error && <p className="mt-3 rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{error}{!status.connected && <> <button type="button" className="font-semibold underline" onClick={() => void connect()}>Connect again</button></>}</p>}
    </div>
  )
}
