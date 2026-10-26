"use client"

// One assigned practice: share link + QR, due date, attempts and AI help,
// every assigned student's status, best score and what they asked the AI, and
// the class report (where they went wrong, question by question) with a
// reteach plan (components/assign/practice-report.tsx).

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { AlertTriangle, ArrowLeft, BookUp, CalendarClock, Check, Copy, Eye, Loader2, MessageCircleQuestion, QrCode, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { FOCUS_MODE_HINT, focusChip, focusEventText, summarizeFocus, type FocusEvent } from "@/lib/practice/focus"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GradebookExportDialog } from "@/components/grading/gradebook-export-dialog"
import { ClassroomPracticePanel } from "@/components/assign/classroom-practice-panel"
import { PracticeReport } from "@/components/assign/practice-report"
import type { ExportRow } from "@/lib/grading/exports"
import NavigationHeader from "@/components/navigation-header"
import { actionButton, actionButtonPrimary, backLink, buttonRow, selectBox } from "@/components/grading/grading-ui"
import { compareNames, displayName } from "@/lib/grading/names"
import { useNameOrder } from "@/lib/use-name-order"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { AI_HELP_OPTIONS, dayCount, type AiHelp } from "@/lib/practice/assignments"
import type { AiUse } from "@/lib/practice/server"

interface Student { rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null; account: { name: string; matches: boolean } | null; studentNumber: string | null; email: string | null; status: string; daysLate?: number; attempts: number; best: { pct: number; correct: number; total: number; detail: { mastered?: string[]; notMastered?: string[] } | null } | null; lastAt: string | null; aiUses: AiUse[]; focus: FocusEvent[] }
interface Data {
  assignment: { id: string; title: string; grading: "percent" | "mastery"; max_attempts: number | null; due_at: string | null; ai_help: AiHelp; focus_mode: boolean; url: string; created_at: string; class_id: string }
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
const AI_KIND: Record<string, string> = {
  typed: "Typed",
  highlight: "Highlighted",
  why: "Why? (after answering)",
  first_step: "First step",
  check_work: "Check my work (photo)",
  figure: "Explain a figure",
  desmos: "Desmos steps",
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
  const [aiFor, setAiFor] = useState<Student | null>(null)
  const [focusFor, setFocusFor] = useState<Student | null>(null)
  const [nameOrder, setNameOrder] = useNameOrder()
  const [byScore, setByScore] = useState(false)

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

  // The wrong student is on this name: unlink it (their runs here move to their own class or are removed).
  const notThem = async (s: Student) => {
    if (!data) return
    await authFetch(`/api/classes/${data.assignment.class_id}/roster/${s.rosterId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlink: true }) })
    await load()
  }

  if (error) return <Shell><p className="rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p></Shell>
  if (!data) return <Shell><p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p></Shell>

  const { assignment: a, students } = data
  const finished = students.filter((s) => s.best)
  const avg = finished.length ? finished.reduce((n, s) => n + s.best!.pct, 0) / finished.length : null
  // Best score first, students with none last; otherwise by name.
  const ordered = [...students].sort((x, y) => (byScore ? (y.best?.pct ?? -1) - (x.best?.pct ?? -1) : 0) || compareNames(x, y, nameOrder))
  const score = (s: Student) => !s.best ? "-" : a.grading === "mastery" ? `${s.best.correct}/${s.best.total} topics` : `${s.best.correct}/${s.best.total} · ${Math.round(s.best.pct)}%`

  return (
    <Shell>
      {data.class && <Link href={`/teacher/classes/${data.class.id}`} className={backLink}><ArrowLeft />{data.class.name}{data.class.period ? ` (P${data.class.period})` : ""}</Link>}
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{a.title}</h1>
          <p className="text-slate-600">
            {students.length} student{students.length === 1 ? "" : "s"} · {students.filter((s) => s.status === "done" || s.status === "late").length} done
            {avg != null && <> · average {a.grading === "mastery" ? `${Math.round(avg)}% of topics mastered` : `${Math.round(avg)}%`}</>}
            {students.some((s) => s.aiUses.length) && <> · {students.filter((s) => s.aiUses.length).length} used AI help</>}
            {students.some((s) => focusChip(summarizeFocus(s.focus))) && <> · {students.filter((s) => focusChip(summarizeFocus(s.focus))).length} left the page</>}
            {data.guide && <> · <Link href={`/study-guide/${data.guide.id}`} className="font-medium text-blue-700 hover:underline">open the practice</Link></>}
            {finished.length > 0 && <> · <Link href={`/teacher/practice/${a.id}/reteach`} className="font-medium text-blue-700 hover:underline">Reteach plan</Link></>}
          </p>
        </div>
        <button type="button" className={cn(actionButtonPrimary, "h-11 w-full px-5 sm:w-auto")} onClick={async () => { await navigator.clipboard.writeText(a.url); setCopied(true); setTimeout(() => setCopied(false), 2000) }}>{copied ? <><Check />Copied</> : <><Copy />Copy link</>}</button>
      </div>
      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className={buttonRow}>
          <button type="button" className={cn(actionButton, showQr && "bg-blue-50 text-blue-800 ring-blue-300")} aria-pressed={showQr} onClick={() => setShowQr((v) => !v)}><QrCode />QR code</button>
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
        <label className="inline-flex items-center gap-2 text-slate-800"><MessageCircleQuestion className="h-4 w-4 text-slate-500" />AI help
          <select value={a.ai_help} onChange={(e) => void patch({ aiHelp: e.target.value })} className="h-10 rounded-xl border border-slate-300 bg-white px-3">
            {AI_HELP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <p className="w-full text-slate-500">{AI_HELP_OPTIONS.find((o) => o.value === a.ai_help)?.hint} You see every question a student asks the AI while doing it.</p>
        <label className="flex w-full items-start justify-between gap-4 border-t border-slate-100 pt-3">
          <span>
            <span className="flex items-center gap-2 font-medium text-slate-800"><Eye className="h-4 w-4 text-slate-500" />Focus mode</span>
            <span className="block text-slate-500">{FOCUS_MODE_HINT} Changes apply the next time a student opens it.</span>
          </span>
          <Switch checked={a.focus_mode} onCheckedChange={(on) => void patch({ focusMode: on })} aria-label="Focus mode" className="mt-0.5" />
        </label>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-slate-900">Students</h2>
          <select
            aria-label="Sort students"
            value={byScore ? "score" : nameOrder}
            onChange={(e) => { const v = e.target.value; setByScore(v === "score"); if (v !== "score") setNameOrder(v === "first" ? "first" : "last") }}
            className={cn(selectBox, "pr-9")}
          >
            <option value="last">Sort by last name</option>
            <option value="first">Sort by first name</option>
            <option value="score">Sort by score</option>
          </select>
        </div>
        <ul className="divide-y divide-slate-100">
          {ordered.map((s) => (
            <li key={s.rosterId} className="flex flex-wrap items-center gap-3 py-3 text-sm">
              <Link href={`/teacher/classes/${a.class_id}/students/${s.rosterId}`} className="min-w-[10rem] flex-1 font-medium text-slate-900 hover:text-blue-700">
                {displayName(s, nameOrder)}
                {s.account && !s.account.matches ? null : s.linkedVia === "picked" && <span className="ml-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200" title="Picked their own name from the link (the class list had no student ID to check)">self-matched</span>}
                {!s.linked && <span className="ml-2 text-xs font-normal text-slate-400">hasn&apos;t opened the link</span>}
              </Link>
              {s.account && !s.account.matches && (
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />Signed in as {s.account.name || "someone else"}
                  <button type="button" onClick={() => void notThem(s)} className="h-7 rounded-full bg-white px-2.5 font-semibold ring-1 ring-amber-300 hover:bg-amber-100">Not them</button>
                </span>
              )}
              <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", (STATUS[s.status] ?? STATUS.not_started).cls)}>{(STATUS[s.status] ?? STATUS.not_started).label}{s.daysLate ? ` · ${dayCount(s.daysLate)}` : ""}</span>
              {s.aiUses.length > 0
                ? <button type="button" onClick={() => setAiFor(s)} className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-800 ring-1 ring-inset ring-violet-200 hover:bg-violet-100"><MessageCircleQuestion className="h-3.5 w-3.5" />Asked AI {s.aiUses.length}×</button>
                : null}
              {(() => {
                const chip = focusChip(summarizeFocus(s.focus))
                return chip ? <button type="button" onClick={() => setFocusFor(s)} className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200 hover:bg-amber-100"><Eye className="h-3.5 w-3.5" />{chip}</button> : null
              })()}
              <span className="w-36 text-right font-semibold tabular-nums text-slate-900">{score(s)}</span>
              <span className="w-28 text-right text-xs text-slate-500">{s.attempts ? `${s.attempts} attempt${s.attempts === 1 ? "" : "s"}` : ""}{s.lastAt ? ` · ${new Date(s.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}</span>
              {a.grading === "mastery" && s.best?.detail?.notMastered?.length ? <span className="w-full pl-0 text-xs text-slate-500">Not mastered yet: {s.best.detail.notMastered.join(", ")}</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <PracticeReport assignmentId={a.id} classId={a.class_id} />

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

      <Dialog open={!!focusFor} onOpenChange={(o) => { if (!o) setFocusFor(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{focusFor?.firstName || focusFor?.name} in focus mode</DialogTitle>
            <DialogDescription>Everything recorded while they had this assignment open, in order. Leaving can also mean a notification or another window they clicked by accident, so ask before assuming.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-2">
            {focusFor?.focus.map((e, i) => (
              <li key={i} className={cn("flex items-baseline gap-3 rounded-xl border p-3 text-sm", e.kind === "start" ? "border-slate-200" : "border-amber-200 bg-amber-50/60")}>
                <span className="w-32 shrink-0 text-xs text-slate-500">{new Date(e.at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit", second: "2-digit" })}</span>
                <span className="text-slate-900">{focusEventText(e)}</span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

      <Dialog open={!!aiFor} onOpenChange={(o) => { if (!o) setAiFor(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>What {aiFor?.firstName || aiFor?.name} asked the AI</DialogTitle>
            <DialogDescription>{aiFor?.aiUses.length} message{aiFor?.aiUses.length === 1 ? "" : "s"} while doing this assignment, newest first. Buttons like Why? show the question they were on.</DialogDescription>
          </DialogHeader>
          <ul className="space-y-3">
            {aiFor?.aiUses.map((u, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-3 text-sm">
                <p className="mb-1 text-xs text-slate-500">{new Date(u.at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })} · {AI_KIND[u.kind] ?? u.kind}</p>
                <p className="whitespace-pre-wrap break-words text-slate-900">{u.message}</p>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>

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
