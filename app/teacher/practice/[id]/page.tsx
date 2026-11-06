"use client"

// One assigned practice: share link + QR, due date, attempts and AI help,
// every assigned student's status, best score and what they asked the AI, and
// the class report (where they went wrong, question by question) with a
// reteach plan (components/assign/practice-report.tsx).

import { use, useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import QRCode from "qrcode"
import { AlertTriangle, ArrowLeft, BookUp, CalendarClock, Check, CheckCircle2, Clock, Copy, Eye, Layers, ListChecks, Loader2, MessageCircleQuestion, PenLine, QrCode, Target, Timer, Trash2, XCircle } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { FOCUS_MODE_HINT, durationText, focusChip, focusChipShort, focusEventText, summarizeFocus, type FocusEvent } from "@/lib/practice/focus"
import { givenText, type PracticeAnswer, type ReportQuestion } from "@/lib/practice/report"
import { InlineMarkdown } from "@/components/formats/study-markdown"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { GradebookExportDialog } from "@/components/grading/gradebook-export-dialog"
import { ClassroomPracticePanel } from "@/components/assign/classroom-practice-panel"
import { PracticeReport } from "@/components/assign/practice-report"
import type { ExportRow } from "@/lib/grading/exports"
import NavigationHeader from "@/components/navigation-header"
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog"
import { AssignmentLanguage, languageChip } from "@/components/assign/assignment-language"
import { actionButton, actionButtonPrimary, backLink, buttonRow, selectBox } from "@/components/grading/grading-ui"
import { compareNames, displayName } from "@/lib/grading/names"
import { useNameOrder } from "@/lib/use-name-order"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { AI_HELP_OPTIONS, TIME_LIMIT_PICKS, dayCount, overTimeLimit, progressStatusText, runLengthText, type AiHelp, type RunCount } from "@/lib/practice/assignments"
import type { AiUse } from "@/lib/practice/server"
import { ADAPTIVE_SETTING_DEFAULTS, MASTERY_PICKS, PER_CONCEPT_PICKS, masteryRuleText, neededRight } from "@/lib/adaptive/engine"
import { estimateAdaptive, estimateText, questionRangeText, type BankShape } from "@/lib/adaptive/estimate"

interface ReportData { questions: ReportQuestion[]; students: Array<{ rosterId: string; answers: PracticeAnswer[]; complete: boolean; version: number }> }
const chip = "inline-flex h-7 items-center gap-1 rounded-full px-2.5 text-xs font-semibold ring-1 ring-inset"
interface Student { rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null; account: { name: string; matches: boolean } | null; studentNumber: string | null; email: string | null; status: string; daysLate?: number; attempts: number; best: { pct: number; correct: number; total: number; detail: { mastered?: string[]; notMastered?: string[] } | null; seconds?: number | null } | null; lastAt: string | null; aiUses: AiUse[]; focus: FocusEvent[]; inProgress?: RunCount | null; incomplete?: RunCount | null; language?: string | null }
interface Data {
  assignment: { id: string; title: string; grading: "percent" | "mastery"; max_attempts: number | null; due_at: string | null; ai_help: AiHelp; focus_mode: boolean; time_limit_seconds: number | null; mastery_pct: number | null; questions_per_concept: number | null; explain_questions: boolean; url: string; created_at: string; class_id: string }
  /** Adaptive practice: topics and questions per topic in the guide's bank. */
  bank?: BankShape | null
  students: Student[]
  guide: { id: string; title: string; format: string; language?: string } | null
  class: { id: string; name: string; period: string | null } | null
}

const STATUS: Record<string, { label: string; cls: string }> = {
  done: { label: "Done", cls: "bg-emerald-50 text-emerald-800 ring-emerald-200" },
  late: { label: "Late", cls: "bg-amber-50 text-amber-900 ring-amber-200" },
  missing: { label: "Missing", cls: "bg-rose-50 text-rose-800 ring-rose-200" },
  not_started: { label: "Not turned in yet", cls: "bg-slate-100 text-slate-700 ring-slate-300" },
  incomplete: { label: "Incomplete", cls: "bg-orange-50 text-orange-900 ring-orange-200" },
}
const IN_PROGRESS_CLS = "bg-blue-50 text-blue-800 ring-blue-200"
const STATUS_TEXT = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [k, v.label]))
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
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [exportOpen, setExportOpen] = useState(false)
  const [aiFor, setAiFor] = useState<Student | null>(null)
  const [focusFor, setFocusFor] = useState<Student | null>(null)
  // "See answers": every question with what this student answered on the attempt that counts (from the class report's data, fetched once).
  const [answersFor, setAnswersFor] = useState<Student | null>(null)
  const [report, setReport] = useState<ReportData | null | "loading">(null)
  const openAnswers = (s: Student, assignmentId: string) => {
    setAnswersFor(s)
    if (report) return
    setReport("loading")
    void authFetch(`/api/practice-assignments/${assignmentId}/report`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: ReportData | null) => setReport(j && Array.isArray(j.questions) ? j : null))
      .catch(() => setReport(null))
  }
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

  // Raising the questions per topic writes the missing questions first (a few seconds): `saving` names that setting.
  const [saving, setSaving] = useState("")
  const [bankShort, setBankShort] = useState(false)
  const patch = async (body: Record<string, unknown>, what = "") => {
    setSaving(what)
    try {
      const res = await authFetch(`/api/practice-assignments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const d = await res.json().catch(() => ({}))
      if ("questionsPerConcept" in body) setBankShort(!!d.bankShort)
      await load()
    } finally {
      setSaving("")
    }
  }

  // The wrong student is on this name: unlink it (their runs here move to their own class or are removed).
  const notThem = async (s: Student) => {
    if (!data) return
    await authFetch(`/api/classes/${data.assignment.class_id}/roster/${s.rosterId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ unlink: true }) })
    await load()
  }
  // The account's name is spelled differently but it is this student: confirm it so the warning stops.
  const confirmThem = async (s: Student) => {
    if (!data) return
    await authFetch(`/api/classes/${data.assignment.class_id}/roster/${s.rosterId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirm: true }) })
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
            {students.some((s) => s.status === "incomplete") && <> · {students.filter((s) => s.status === "incomplete").length} incomplete</>}
            {students.some((s) => s.inProgress && (s.status === "not_started" || s.status === "missing")) && <> · {students.filter((s) => s.inProgress && (s.status === "not_started" || s.status === "missing")).length} in progress</>}
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
        <button type="button" className={cn(actionButton, "text-red-700 hover:bg-red-50 hover:text-red-800")} onClick={() => setConfirmDelete(true)}><Trash2 />Delete assignment</button>
      </div>

      {showQr && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          {qr ? <img src={qr} alt="QR code for the assignment link" className="h-72 w-72" /> : <Loader2 className="h-6 w-6 animate-spin text-slate-400" />}
          <code className="text-sm text-slate-600">{a.url}</code>
        </div>
      )}

      <ClassroomPracticePanel assignmentId={a.id} students={students.length} />

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className={cn("grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2", a.grading === "mastery" ? "lg:grid-cols-5" : "lg:grid-cols-4")}>
          <Field label="Due" icon={CalendarClock} wide={editDue}>
            {editDue ? (
              <>
                <input type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className="h-10 rounded-xl border border-slate-300 px-3 text-sm" aria-label="Due date and time" />
                <button type="button" className={actionButtonPrimary} onClick={async () => { await patch({ dueAt: due ? new Date(due).toISOString() : null }); setEditDue(false) }}>Save</button>
                {a.due_at && <button type="button" className={actionButton} onClick={async () => { await patch({ dueAt: null }); setEditDue(false) }}>No due date</button>}
                <button type="button" className={actionButton} onClick={() => setEditDue(false)}>Cancel</button>
              </>
            ) : (
              <>
                <span className="font-medium text-slate-900">{a.due_at ? new Date(a.due_at).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "No due date"}</span>
                <button type="button" className="text-sm font-semibold text-blue-700 hover:underline" onClick={() => { setDue(a.due_at ? toLocalInput(a.due_at) : ""); setEditDue(true) }}>Change</button>
              </>
            )}
          </Field>
          {a.grading === "mastery" && (
            <>
              <Field label="Mastery level" icon={Target}>
                <select value={a.mastery_pct ?? ADAPTIVE_SETTING_DEFAULTS.masteryPct} onChange={(e) => void patch({ masteryPct: Number(e.target.value) })} className={cn(selectBox, "pr-9")} aria-label="Mastery level">
                  {[...new Set([...MASTERY_PICKS, a.mastery_pct ?? ADAPTIVE_SETTING_DEFAULTS.masteryPct])].sort((x, y) => x - y).map((pct) => <option key={pct} value={pct}>{pct}%</option>)}
                </select>
              </Field>
              <Field label="Questions per topic" icon={Layers}>
                <select value={a.questions_per_concept ?? "bank"} disabled={saving === "per"} onChange={(e) => void patch({ questionsPerConcept: Number(e.target.value) }, "per")} className={cn(selectBox, "pr-9")} aria-label="Questions per topic">
                  {a.questions_per_concept == null && <option value="bank">As written{data.bank ? ` (${data.bank.perConcept})` : ""}</option>}
                  {[...new Set([...PER_CONCEPT_PICKS, ...(a.questions_per_concept ? [a.questions_per_concept] : [])])].sort((x, y) => x - y).map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                {saving === "per" && <span className="inline-flex items-center gap-1.5 text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Writing questions…</span>}
              </Field>
              {data.bank?.explain && (
                <Field label="Written question" icon={PenLine}>
                  <select value={a.explain_questions ? "on" : "off"} onChange={(e) => void patch({ explainQuestions: e.target.value === "on" })} className={cn(selectBox, "pr-9")} aria-label="Explain in your own words question">
                    <option value="on">One per topic</option>
                    <option value="off">Off</option>
                  </select>
                </Field>
              )}
            </>
          )}
          {a.grading === "percent" && <Field label="Attempts" icon={ListChecks}>
            {a.grading === "percent" ? (
              <>
                <select value={a.max_attempts ?? "any"} onChange={(e) => void patch({ maxAttempts: e.target.value === "any" ? null : Number(e.target.value) })} className={cn(selectBox, "pr-9")} aria-label="Attempts allowed">
                  {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                  <option value="any">Unlimited</option>
                </select>
                <span className="text-slate-500">best one counts</span>
              </>
            ) : <span className="font-medium text-slate-900">Until mastered</span>}
          </Field>}
          {a.grading === "percent" && <Field label="Time limit" icon={Timer}>
            {a.grading === "percent" ? (
              <select value={a.time_limit_seconds ?? "none"} onChange={(e) => void patch({ timeLimitSeconds: e.target.value === "none" ? null : Number(e.target.value) })} className={cn(selectBox, "pr-9")} aria-label="Time limit">
                <option value="none">None</option>
                {[...new Set([...TIME_LIMIT_PICKS.map((m) => m * 60), ...(a.time_limit_seconds ? [a.time_limit_seconds] : [])])].sort((x, y) => x - y).map((sec) => <option key={sec} value={sec}>{sec % 60 ? `${Math.round(sec / 6) / 10} min` : `${sec / 60} min`}</option>)}
              </select>
            ) : <span className="text-slate-500">Not used for adaptive practice</span>}
          </Field>}
          <Field label="AI help" icon={MessageCircleQuestion}>
            <select value={a.ai_help} onChange={(e) => void patch({ aiHelp: e.target.value })} className={cn(selectBox, "pr-9")} aria-label="AI help">
              {AI_HELP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
        </div>
        {a.grading === "mastery" && data.bank && (() => {
          const per = a.questions_per_concept ?? data.bank.perConcept
          const pct = a.mastery_pct ?? ADAPTIVE_SETTING_DEFAULTS.masteryPct
          const e = estimateAdaptive(data.bank, { perConcept: per, explain: a.explain_questions })
          return (
            <p className="mt-4 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm text-slate-700 ring-1 ring-inset ring-slate-200">
              <Clock className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
              <span>
                <span className="font-semibold text-slate-900">{estimateText(e)}</span> for most students: {data.bank.concepts} topic{data.bank.concepts === 1 ? "" : "s"}, {questionRangeText(e)} depending on how they do.{" "}
                A topic is mastered with {per <= 5 ? `${neededRight(pct / 100, per)} of its ${per} questions right` : masteryRuleText(pct)}, and the grade is the share of topics mastered. Changes apply to students who haven&apos;t finished yet.
              </span>
            </p>
          )
        })()}
        {bankShort && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">Some topics got fewer new questions than you asked for, so those topics end a little sooner. Pick the number again to try once more.</p>}
        <p className="mt-3 text-sm text-slate-500">{AI_HELP_OPTIONS.find((o) => o.value === a.ai_help)?.hint} You see every question a student asks the AI while doing it.</p>
        <label className="mt-4 flex items-start justify-between gap-4 border-t border-slate-100 pt-4">
          <span className="text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-900"><Eye className="h-4 w-4 text-slate-500" />Focus mode</span>
            <span className="mt-0.5 block text-slate-500">{FOCUS_MODE_HINT} Changes apply the next time a student opens it.</span>
          </span>
          <Switch checked={a.focus_mode} onCheckedChange={(on) => void patch({ focusMode: on })} aria-label="Focus mode" className="mt-0.5" />
        </label>
      </section>

      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
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
          {ordered.map((s) => {
            const focus = summarizeFocus(s.focus)
            const focusText = focusChipShort(focus)
            const over = s.best?.seconds != null && overTimeLimit(s.best.seconds, a.time_limit_seconds)
            return (
              <li key={s.rosterId} className="grid grid-cols-1 gap-x-6 gap-y-2 py-3.5 text-sm sm:grid-cols-[minmax(0,1fr)_11rem] sm:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                    <Link href={`/teacher/classes/${a.class_id}/students/${s.rosterId}`} className="font-medium text-slate-900 hover:text-blue-700">{displayName(s, nameOrder)}</Link>
                    {s.account && !s.account.matches ? null : s.linkedVia === "picked" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-amber-200" title="Picked their own name from the link (the class list had no student ID to check)">self-matched</span>}
                    {!s.linked && <span className="text-xs text-slate-400">hasn&apos;t opened the link</span>}
                  </div>
                  {s.account && !s.account.matches && (
                    <span className="mt-1.5 inline-flex flex-wrap items-center gap-2 rounded-full bg-amber-50 py-1 pl-2.5 pr-1 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">
                      <AlertTriangle className="h-3.5 w-3.5" />Signed in as {s.account.name || "someone else"}
                      <button type="button" onClick={() => void confirmThem(s)} className="h-7 rounded-full bg-amber-700 px-2.5 font-semibold text-white hover:bg-amber-800">Yes, that&apos;s them</button>
                      <button type="button" onClick={() => void notThem(s)} className="h-7 rounded-full bg-white px-2.5 font-semibold ring-1 ring-amber-300 hover:bg-amber-100">Not them</button>
                    </span>
                  )}
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(chip, s.inProgress && (s.status === "not_started" || s.status === "missing") ? IN_PROGRESS_CLS : (STATUS[s.status] ?? STATUS.not_started).cls)}
                      title={s.status === "incomplete" ? "Never finished: what they had answered was sent at the due date (unanswered count as 0). If they finish it, that counts as late and the better score is kept." : s.inProgress ? "Started and saved, not turned in yet" : undefined}
                    >
                      {progressStatusText(s, STATUS_TEXT)}{s.daysLate ? ` · ${dayCount(s.daysLate)}` : ""}
                    </span>
                    {languageChip(s.language) && <span className={cn(chip, "bg-slate-50 text-slate-700 ring-slate-200")} title="Gets this practice in another language">{languageChip(s.language)}</span>}
                    {s.aiUses.length > 0 && (
                      <button type="button" onClick={() => setAiFor(s)} className={cn(chip, "bg-violet-50 text-violet-800 ring-violet-200 hover:bg-violet-100")}><MessageCircleQuestion className="h-3.5 w-3.5" />Asked AI {s.aiUses.length}×</button>
                    )}
                    {focusText && (
                      <button type="button" onClick={() => setFocusFor(s)} className={cn(chip, "bg-amber-50 text-amber-900 ring-amber-200 hover:bg-amber-100")} title={focusChip(focus) ?? undefined}><Eye className="h-3.5 w-3.5" />{focusText}</button>
                    )}
                    {s.best?.seconds != null && (
                      <span className={cn(chip, "tabular-nums", over ? "bg-rose-50 text-rose-800 ring-rose-200" : "bg-slate-50 text-slate-700 ring-slate-200")} title={over ? "This run took longer than the time limit" : "How long their best run took"}>
                        <Timer className="h-3.5 w-3.5" />{runLengthText(s.best.seconds)}{over ? " · over the limit" : ""}
                      </span>
                    )}
                  </div>
                  {a.grading === "mastery" && s.best?.detail?.notMastered?.length ? <p className="mt-1 text-xs text-slate-500">Not mastered yet: {s.best.detail.notMastered.join(", ")}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 sm:flex-col sm:items-end sm:gap-0 sm:text-right">
                  <span className={cn("font-semibold tabular-nums", s.best ? "text-slate-900" : "text-slate-300")}>{score(s)}</span>
                  {(s.attempts > 0 || s.lastAt) && (
                    <span className="text-xs text-slate-500 tabular-nums">{s.attempts ? `${s.attempts} attempt${s.attempts === 1 ? "" : "s"}` : ""}{s.attempts && s.lastAt ? " · " : ""}{s.lastAt ? new Date(s.lastAt).toLocaleDateString([], { month: "short", day: "numeric" }) : ""}</span>
                  )}
                  {s.best && <button type="button" onClick={() => openAnswers(s, a.id)} className="text-xs font-semibold text-blue-700 hover:underline">See answers</button>}
                </div>
              </li>
            )
          })}
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

      <Dialog open={!!answersFor} onOpenChange={(o) => { if (!o) setAnswersFor(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{answersFor?.firstName || answersFor?.name}: question by question</DialogTitle>
            <DialogDescription>
              {answersFor?.best ? `The attempt that counts: ${score(answersFor)}${answersFor.lastAt ? ` · ${new Date(answersFor.lastAt).toLocaleDateString([], { month: "short", day: "numeric" })}` : ""}.` : ""}
              {" "}Their first answer to each question in that run.
            </DialogDescription>
          </DialogHeader>
          {answersFor && <StudentAnswers student={answersFor} report={report} />}
        </DialogContent>
      </Dialog>

      <Dialog open={!!focusFor} onOpenChange={(o) => { if (!o) setFocusFor(null) }}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{focusFor?.firstName || focusFor?.name} in focus mode</DialogTitle>
            <DialogDescription>Everything recorded while they had this assignment open, in order. Leaving can also mean a notification or another window they clicked by accident, so ask before assuming. iPhones and iPads don&apos;t use full screen, so only leaving the page counts there.</DialogDescription>
          </DialogHeader>
          {focusFor && (() => {
            const f = summarizeFocus(focusFor.focus)
            return (
              <div className="grid grid-cols-1 gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-950 ring-1 ring-inset ring-amber-200 sm:grid-cols-3">
                <div><p className="text-xs text-amber-800">Total out of focus</p><p className="text-lg font-semibold tabular-nums">{durationText(f.outSeconds)}</p></div>
                <div><p className="text-xs text-amber-800">Left the page</p><p className="text-lg font-semibold tabular-nums">{f.leaves}× <span className="text-sm font-normal">({durationText(f.awaySeconds)})</span></p></div>
                <div><p className="text-xs text-amber-800">Out of full screen</p><p className="text-lg font-semibold tabular-nums">{f.fullscreenExits}× <span className="text-sm font-normal">({durationText(f.fullscreenSeconds)})</span></p></div>
              </div>
            )
          })()}
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

      {data.guide && <AssignmentLanguage assignmentId={a.id} guideLanguage={data.guide.language} students={ordered} onChanged={load} />}

      <AlertDialog open={confirmDelete} onOpenChange={(o) => { if (!deleting) { setConfirmDelete(o); setDeleteError("") } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              {finished.length > 0
                ? `${finished.length} student${finished.length === 1 ? " has" : "s have"} turned it in. Their scores for this assignment are deleted with it and can't be brought back.`
                : "Nobody has turned it in yet, so no scores are lost."}{" "}
              Students stop seeing it under their classwork. The practice itself stays in My Guides.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {deleteError && <p role="alert" className="text-sm font-medium text-red-700">{deleteError}</p>}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Keep it</AlertDialogCancel>
            <button type="button" disabled={deleting} className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-red-600 px-4 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              onClick={async () => {
                setDeleting(true); setDeleteError("")
                const res = await authFetch(`/api/practice-assignments/${id}`, { method: "DELETE" }).catch(() => null)
                if (res?.ok) { router.push(data.class ? `/teacher/classes/${data.class.id}` : "/teach"); return }
                setDeleting(false); setDeleteError("Could not delete it. Please try again.")
              }}>
              {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}Delete assignment
            </button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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


/** One labeled setting in the settings grid. */
function Field({ label, icon: Icon, wide, children }: { label: string; icon: typeof CalendarClock; wide?: boolean; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", wide && "sm:col-span-full")}>
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500"><Icon className="h-3.5 w-3.5" />{label}</span>
      <div className="flex flex-wrap items-center gap-2 text-sm text-slate-800">{children}</div>
    </div>
  )
}

/** Every question with what the student answered (the class report's data). */
function StudentAnswers({ student, report }: { student: Student; report: ReportData | null | "loading" }) {
  if (report === "loading" || report === null) {
    return report === null
      ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">Their answers couldn&apos;t be loaded. Try again in a moment.</p>
      : <p className="flex items-center gap-2 py-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading their answers…</p>
  }
  const run = report.students.find((r) => r.rosterId === student.rosterId)
  if (!run) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">No answers were saved for this run. Runs finished before answers were kept show only the score.</p>
  const byId = new Map(run.answers.map((x) => [x.id, x]))
  const rows = report.questions.filter((q) => run.complete || byId.has(q.itemId))
  const right = rows.filter((q) => byId.get(q.itemId)?.correct).length
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{right} of {rows.length}</span> right{run.version > 0 ? "." : " on the first try."}</p>
      {run.version > 0 && (
        <p className="rounded-xl bg-blue-50 p-3 text-sm text-blue-900 ring-1 ring-inset ring-blue-200">
          This attempt used new versions of the questions (attempt {run.version + 1}), written for this student on the same skills. The wording differed from the original, so each question shows right or wrong, not the exact answer given.
        </p>
      )}
      <ol className="space-y-2">
        {rows.map((q) => {
          const x = byId.get(q.itemId)
          const ok = !!x?.correct
          const part = !ok && !!x?.score
          const given = x ? givenText(q, x.given) : null
          return (
            <li key={q.itemId} className={cn("rounded-xl border p-3 text-sm", ok ? "border-emerald-200 bg-emerald-50/50" : part ? "border-amber-200 bg-amber-50/50" : "border-rose-200 bg-rose-50/50")}>
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0">{ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className={cn("h-5 w-5", part ? "text-amber-600" : "text-rose-600")} />}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-slate-900"><span className="font-semibold">{q.label}.</span> <InlineMarkdown text={q.text} /></p>
                  {q.topic && <p className="text-xs text-slate-500">{q.topic}</p>}
                  {x
                    ? <p className="text-slate-700"><span className="font-semibold">Answered:</span> {given ? <InlineMarkdown text={given} /> : ok ? "right" : part ? `partly right (${Math.round((x.score ?? 0) * 100)}%)` : run.version > 0 ? "wrong" : "no answer saved"}</p>
                    : <p className="text-slate-500">Not answered</p>}
                  {!ok && run.version === 0 && q.answer && <p className="text-emerald-800"><span className="font-semibold">Answer:</span> <InlineMarkdown text={q.answer} /></p>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
