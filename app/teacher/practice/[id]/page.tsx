"use client"

// One assigned practice: share link + QR, due date and attempts, and every
// assigned student's status and best score.

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { ArrowLeft, BookUp, CalendarClock, Check, Copy, Loader2, QrCode, Trash2 } from "lucide-react"
import { GradebookExportDialog } from "@/components/grading/gradebook-export-dialog"
import { ClassroomPracticePanel } from "@/components/assign/classroom-practice-panel"
import type { ExportRow } from "@/lib/grading/exports"
import NavigationHeader from "@/components/navigation-header"
import { actionButton, actionButtonPrimary, backLink } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { dayCount } from "@/lib/practice/assignments"

interface Student { rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null; studentNumber: string | null; email: string | null; status: string; daysLate?: number; attempts: number; best: { pct: number; correct: number; total: number; detail: { mastered?: string[]; notMastered?: string[] } | null } | null; lastAt: string | null }
interface Data {
  assignment: { id: string; title: string; grading: "percent" | "mastery"; max_attempts: number | null; due_at: string | null; url: string; created_at: string; class_id: string }
  students: Student[]
  guide: { id: string; title: string; format: string } | null
  class: { id: string; name: string; period: string | null } | null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  late: { label: "Late", cls: "bg-amber-50 text-amber-900 ring-amber-200" },
  missing: { label: "Missing", cls: "bg-rose-50 text-rose-800 ring-rose-200" },
  not_started: { label: "Not turned in yet", cls: "bg-slate-100 text-slate-700 ring-slate-300" },
}
const toLocalInput = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16) }

export default function PracticeAssignmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")
  const [copied, setCopied] = useState(false)
  const [qr, setQr] = useState("")
  const [showQr, setShowQr] = useState(false)
  const [editDue, setEditDue] = useState(false)
  const [due, setDue] = useState("")
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const load = useCallback(async () => {
    const res = await authFetch(`/api/practice-assignments/${id}`, { cache: "no-store" })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || "Could not load this assignment"); return }
    setData(d)
  }, [id])
  useEffect(() => { void load() }, [load])
  useEffect(() => { if (data && showQr && !qr) void QRCode.toDataURL(data.assignment.url, { margin: 1, width: 480 }).then(setQr) }, [data, showQr, qr])

  const patch = async (body: Record<string, unknown>) => {
    await authFetch(`/api/practice-assignments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    await load()
  }

  if (error) return <Shell><p className="rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p></Shell>
  if (!data) return <Shell><p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p></Shell>

  const { assignment: a, students } = data
  const finished = students.filter((s) => s.best)
  const avg = finished.length ? finished.reduce((n, s) => n + s.best!.pct, 0) / finished.length : null
  const score = (s: Student) => !s.best ? "-" : a.grading === "mastery" ? `${s.best.correct}/${s.best.total} topics` : `${s.best.correct}/${s.best.total} · ${Math.round(s.best.pct)}%`

  return (
    <Shell>
      {data.class && <Link href={`/teacher/classes/${data.class.id}`} className={backLink}><ArrowLeft />{data.class.name}{data.class.period ? ` (P${data.class.period})` : ""}</Link>}
      <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{a.title}</h1>
          <p className="text-slate-600">
            {students.length} student{students.length === 1 ? "" : "s"} · {students.filter((s) => s.status === "done" || s.status === "late").length} done
            {avg != null && <> · average {a.grading === "mastery" ? `${Math.round(avg)}% of topics mastered` : `${Math.round(avg)}%`}</>}
            {data.guide && <> · <Link href={`/study-guide/${data.guide.id}`} className="font-medium text-blue-700 hover:underline">open the practice</Link></>}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={actionButtonPrimary} onClick={async () => { await navigator.clipboard.writeText(a.url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check />Copied</> : <><Copy />Copy link</>}</button>
          <button type="button" className={actionButton} onClick={() => setShowQr((v) => !v)}><QrCode />QR code</button>
          <button type="button" className={actionButton} onClick={() => setExportOpen(true)} disabled={!finished.length && !students.some((s) => s.status === "missing")}><BookUp />Send to gradebook</button>
        </div>
      </div>

      {showQr && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {qr ? <img src={qr} alt="QR code for the assignment link" className="h-72 w-72" /> : <Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
          <code className="text-sm text-slate-600">{a.url}</code>
        </div>
      )}

      <ClassroomPracticePanel assignmentId={a.id} students={students.length} />

      <section className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-3xl border border-slate-200 bg-white p-5 text-sm shadow-sm">
        <span className="inline-flex items-center gap-2 text-slate-800"><CalendarClock className="h-4 w-4 text-slate-500" />
          {editDue ? (
            <span className="flex flex-wrap items-center gap-2">
              <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3" />
              <button type="button" className={actionButtonPrimary} onClick={async () => { await patch({ dueAt: due ? new Date(due).toISOString() : null }); setEditDue(false) }}>Save</button>
              {a.due_at && <button type="button" className={actionButton} onClick={async () => { await patch({ dueAt: null }); setEditDue(false) }}>No due date</button>}
            </span>
          ) : (
            <>{a.due_at ? `Due ${new Date(a.due_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : "No due date"}
              <button type="button" className={actionButton} onClick={() => { setDue(a.due_at ? toLocalInput(a.due_at) : ""); setEditDue(true) }}>Change</button></>
          )}
        </span>
        {a.grading === "percent" ? (
          <label className="inline-flex items-center gap-2 text-slate-800">Attempts
            <select value={a.max_attempts ?? "any"} onChange={(e) => void patch({ maxAttempts: e.target.value === "any" ? null : Number(e.target.value) })} className="h-10 rounded-xl border border-slate-300 bg-white px-3">
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
              <option value="any">Unlimited</option>
            </select>
            <span className="text-slate-500">best one counts</span>
          </label>
        ) : <span className="text-slate-700">Graded on topics mastered</span>}
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 font-semibold text-slate-900">Students</h2>
        <ul className="divide-y divide-slate-100">
          {students.map((s) => (
            <li key={s.rosterId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <Link href={`/teacher/classes/${a.class_id}/students/${s.rosterId}`} className="min-w-[10rem] flex-1 font-medium text-slate-900 hover:text-blue-700">
                {s.lastName}{s.lastName && s.firstName ? ", " : ""}{s.firstName}
                {s.linkedVia === "picked" && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200" title="Picked their own name from the link (the class list had no student ID to check)">self-matched</span>}
                {!s.linked && <span className="ml-2 text-xs font-normal text-slate-400">hasn&apos;t opened the link</span>}
              </Link>
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", (STATUS[s.status] ?? STATUS.not_started).cls)}>{(STATUS[s.status] ?? STATUS.not_started).label}{s.daysLate ? ` · ${dayCount(s.daysLate)}` : ""}</span>
              <span className="w-36 text-right font-semibold tabular-nums text-slate-900">{score(s)}</span>
              <span className="w-28 text-right text-xs text-slate-500">{s.attempts ? `${s.attempts} attempt${s.attempts === 1 ? "" : "s"}` : ""}{s.lastAt ? ` · ${new Date(s.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}</span>
              {a.grading === "mastery" && s.best?.detail?.notMastered?.length ? <span className="w-full pl-0 text-xs text-slate-500">Not mastered yet: {s.best.detail.notMastered.join(", ")}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <GradebookExportDialog
        open={exportOpen}
        onOpenChange={setExportOpen}
        title={a.title}
        rows={students.map((s): ExportRow => ({
          firstName: s.firstName,
          lastName: s.lastName,
          studentNumber: s.studentNumber,
          email: s.email,
          marks: s.best ? s.best.correct : null,
          possible: s.best ? s.best.total : null,
          pct: s.best ? s.best.pct : null,
          status: s.best ? (s.status === "late" ? "late" : null) : s.status === "missing" ? "missing" : null,
        }))}
      />

      <div className="mt-8 flex justify-end">
        {confirmDelete ? (
          <span className="flex items-center gap-2 text-sm text-slate-700">Delete this assignment and its scores?
            <button type="button" className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700" onClick={async () => { await authFetch(`/api/practice-assignments/${id}`, { method: "DELETE" }); router.push(data.class ? `/teacher/classes/${data.class.id}` : "/teach") }}>Delete</button>
            <button type="button" className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100" onClick={() => setConfirmDelete(false)}>Keep</button>
          </span>
        ) : (
          <button type="button" className={cn(actionButton, "text-rose-700 ring-rose-200 hover:bg-rose-50")} onClick={() => setConfirmDelete(true)}><Trash2 />Delete assignment</button>
        )}
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-4xl px-4 py-10">{children}</main>
    </div>
  )
}
