"use client"

// Class results for one batch (/grade-exam/batch): every student's score, a
// class average, links to each report (where marks can be adjusted), CSV, and
// the class report (components/grading/class-report.tsx).

import { actionButton, actionButtonPrimary, backLink, buttonRow, selectBox } from "@/components/grading/grading-ui"
import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { BookUp, Diff, Download, FilePlus2, GraduationCap, ListChecks, Loader2, ClipboardList, Pencil, Plus, FileText, Trash2 } from "lucide-react"
import { GradebookExportDialog } from "@/components/grading/gradebook-export-dialog"
import { GoogleClassroomSync } from "@/components/grading/google-classroom-sync"
import type { ExportRow } from "@/lib/grading/exports"
import { compareNames, parseName } from "@/lib/grading/names"
import { useNameOrder } from "@/lib/use-name-order"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth-fetch"
import { resultsCsv } from "@/lib/grading/batch"
import { ClassReport, type SavedInsights } from "@/components/grading/class-report"
import type { GradedQuestion } from "@/lib/grading/parse"
import { ScaleEditor } from "@/components/grading/report/scale-editor"
import { BatchClassPanel, type BatchRosterEntry } from "@/components/grading/batch-class-panel"
import { DEFAULT_SCALE, gradeFor, normalizeScale, type GradeScale } from "@/lib/grading/scale"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { dayCount } from "@/lib/practice/assignments"
import { AdjustmentDialog, type AdjustablePaper } from "@/components/grading/adjustment-dialog"
import { AcceptAnswerDialog } from "@/components/grading/accept-answer-dialog"
import type { AcceptPlanRow } from "@/lib/grading/accept-answer"
import { adjustedTotals, adjustmentGroups, adjustmentLine, gradebookComment, normalizeAdjustments, type GradeAdjustment } from "@/lib/grading/adjustments"

interface Row {
  id: string
  student_name: string
  total_marks: number
  total_possible_marks: number
  percentage: number
  grade: string
  grade_scale: GradeScale | null
  class_id: string | null
  roster_id: string | null
  student_user_id: string | null
  released: boolean
  group_id: string | null
  group_members: Array<{ name: string }> | null
  exam_title: string | null
  class_name: string | null
  class_period: string | null
  created_at: string
  grade_breakdown: GradedQuestion[] | null
  adjustments: GradeAdjustment[] | null
}

/** The marks as graded, before extra credit / points off. */
function rawMarksOf(r: Row): number {
  const b = r.grade_breakdown ?? []
  if (b.length) return b.reduce((s, q) => s + Number(q.marksAwarded || 0), 0)
  return Number(r.total_marks) - adjustedTotals(0, Number(r.total_possible_marks), normalizeAdjustments(r.adjustments)).change
}

/** "+5%" / "-12.5%": how far adjustments moved this paper. */
function changeChip(r: Row) {
  const adj = normalizeAdjustments(r.adjustments)
  if (!adj.length) return null
  const raw = rawMarksOf(r)
  const t = adjustedTotals(raw, Number(r.total_possible_marks), adj)
  const diff = t.percentage - adjustedTotals(raw, Number(r.total_possible_marks), []).percentage
  return (
    <span title={adj.map(adjustmentLine).join("\n")} className={cn("ml-1.5 inline-block rounded-full px-1.5 py-0.5 text-xs font-semibold ring-1 ring-inset", diff >= 0 ? "bg-emerald-50 text-emerald-800 ring-emerald-200" : "bg-rose-50 text-rose-800 ring-rose-200")}>
      {diff >= 0 ? "+" : ""}{Number.isInteger(diff) ? diff : diff.toFixed(1)}%
    </span>
  )
}

const NO_PAPER_LABEL: Record<string, string> = { none: "No paper yet", missing: "Missing", absent: "Absent", exempt: "Exempt" }
const NO_PAPER_TONE: Record<string, string> = {
  none: "bg-slate-100 text-slate-700 ring-slate-200",
  missing: "bg-rose-50 text-rose-800 ring-rose-200",
  absent: "bg-slate-100 text-slate-700 ring-slate-300",
  exempt: "bg-white text-slate-500 ring-slate-200",
}

/** Questions where the grader said it wasn't sure of its reading ("Check:" lines). */
const checksFor = (r: { grade_breakdown: GradedQuestion[] | null }) => (r.grade_breakdown ?? []).filter((q) => q.check).length

export default function BatchResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <BatchResults id={id} />
    </AuthGate>
  )
}

function BatchResults({ id }: { id: string }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [saved, setSaved] = useState<SavedInsights | null>(null)
  const [roster, setRoster] = useState<BatchRosterEntry[]>([])
  const [classInfo, setClassInfo] = useState<{ id: string; googleCourseId: string | null } | null>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<"name" | "score">("name")
  const [nameOrder, setNameOrder] = useNameOrder()
  const [scaleOpen, setScaleOpen] = useState(false)
  const [scale, setScale] = useState<GradeScale | null>(null)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [editingAdjustment, setEditingAdjustment] = useState<{ adjustment: GradeAdjustment; paperIds: string[] } | null>(null)

  const patchBatch = async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
    const res = await authFetch(`/api/grade-batch/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Could not save")
    return data
  }

  const rename = async (row: Row, name: string) => {
    const clean = name.trim()
    if (!clean || clean === row.student_name) return
    setRows((rs) => rs?.map((r) => (r.id === row.id ? { ...r, student_name: clean } : r)) ?? null)
    try { await patchBatch({ names: [{ id: row.id, name: clean }] }); setNotice(`Saved ${clean}`) } catch (e) { setNotice(e instanceof Error ? e.message : "Could not save") }
  }

  const applyScale = async () => {
    if (!scale) return
    setBusy(true)
    try {
      await patchBatch({ gradeScale: scale })
      setRows((rs) => rs?.map((r) => ({ ...r, grade_scale: scale, grade: gradeFor(scale, Number(r.total_marks), Number(r.total_possible_marks)) })) ?? null)
      setScaleOpen(false)
      setNotice("Grade scale applied to every paper")
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  const load = useCallback(async () => {
    const res = await authFetch(`/api/grade-batch/${id}`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError(data.error || "Could not load these results")
    else { setRows(data.results); setSaved(data.insights ?? null); setRoster(data.roster ?? []); setClassInfo(data.classInfo ?? null) }
  }, [id])
  useEffect(() => { void load() }, [load])
  // Back from connecting Google Classroom to send scores: reopen the dialog.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search)
    if (q.get("send") === "1") { setExportOpen(true); window.history.replaceState(null, "", window.location.pathname) }
  }, [])

  const adjustable: AdjustablePaper[] = useMemo(() => (rows ?? []).map((r) => ({
    id: r.id, name: r.student_name, createdAt: r.created_at, rawMarks: rawMarksOf(r), possible: Number(r.total_possible_marks), adjustments: normalizeAdjustments(r.adjustments),
  })), [rows])
  const groups = useMemo(() => adjustmentGroups(adjustable), [adjustable])
  const nameOf = useMemo(() => new Map((rows ?? []).map((r) => [r.id, r.student_name])), [rows])

  const saveAdjustment = async (adjustment: GradeAdjustment, paperIds: string[]) => {
    await patchBatch({ adjustment, paperIds })
    await load()
    setNotice(paperIds.length ? `${adjustmentLine(adjustment)} saved for ${paperIds.length} student${paperIds.length === 1 ? "" : "s"}` : "Removed")
  }
  const [acceptOpen, setAcceptOpen] = useState(false)
  const questionLabels = useMemo(() => { const seen: string[] = []; for (const r of rows ?? []) for (const q of r.grade_breakdown ?? []) { const l = String(q.questionNumber); if (!seen.includes(l)) seen.push(l) } return seen }, [rows])
  const previewAccept = useCallback(async (accept: { question: string; answers: string; everyone: boolean }) => {
    const res = await authFetch(`/api/grade-batch/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acceptAnswer: accept, preview: true }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || "Could not preview")
    return data.plan as AcceptPlanRow[]
  }, [id])
  const saveAccept = async (accept: { question: string; answers: string; everyone: boolean; reason: string }) => {
    const data = await patchBatch({ acceptAnswer: accept })
    await load()
    const n = Number(data.changed ?? 0)
    setNotice(`Question ${accept.question}: ${n} student${n === 1 ? "" : "s"} re-marked`)
  }
  const removeAdjustment = async (adjustment: GradeAdjustment) => {
    setConfirmRemove(null)
    try { await patchBatch({ removeAdjustment: adjustment.id }); await load(); setNotice("Removed") } catch (e) { setNotice(e instanceof Error ? e.message : "Could not remove") }
  }

  // Names from the class list when the paper is matched to it, else read from the typed name.
  const sorted = useMemo(() => {
    if (!rows) return []
    const byRoster = new Map(roster.map((e) => [e.rosterId, e]))
    const nameOf = (r: (typeof rows)[number]) => { const e = r.roster_id ? byRoster.get(r.roster_id) : undefined; return e ? { firstName: e.firstName, lastName: e.lastName } : parseName(r.student_name) }
    return [...rows].sort((a, b) => (sort === "name" ? compareNames(nameOf(a), nameOf(b), nameOrder) : Number(b.percentage) - Number(a.percentage)))
  }, [rows, sort, roster, nameOrder])

  // Class-list students with nothing in this set: listed under the papers so it's clear who's still out.
  const noPaperRows = useMemo(() => roster.filter((e) => !e.hasPaper && !e.left).sort((a, b) => compareNames(a, b, nameOrder)), [roster, nameOrder])

  // One row per student for gradebook files: graded papers (names/IDs from the
  // roster when matched) plus roster students with no paper and their status.
  const exportRows: ExportRow[] = useMemo(() => {
    const byRoster = new Map(roster.map((e) => [e.rosterId, e]))
    return [
      ...(rows ?? []).map((r) => {
        const e = r.roster_id ? byRoster.get(r.roster_id) : undefined
        const n = e ? { firstName: e.firstName, lastName: e.lastName } : parseName(r.student_name)
        return { ...n, studentNumber: e?.studentNumber ?? null, email: e?.email ?? null, marks: Number(r.total_marks), possible: Number(r.total_possible_marks), pct: Number(r.percentage), status: e?.status ?? null, comment: gradebookComment(normalizeAdjustments(r.adjustments)) || null }
      }),
      ...roster.filter((e) => !e.hasPaper).map((e) => ({ firstName: e.firstName, lastName: e.lastName, studentNumber: e.studentNumber, email: e.email, marks: null, possible: null, pct: null, status: e.status })),
    ]
  }, [rows, roster])

  const reportPapers = useMemo(() => (rows ?? []).map((r) => ({ id: r.id, name: r.student_name, breakdown: r.grade_breakdown ?? [] })), [rows])

  const first = rows?.[0]
  const average = rows?.length ? rows.reduce((s, r) => s + Number(r.percentage), 0) / rows.length : 0
  const title = first?.exam_title || "Class results"
  const subtitle = [first?.class_name, first?.class_period && `Period ${first.class_period}`].filter(Boolean).join(" · ")

  const downloadCsv = () => {
    const label = (st: string | null) => (st ? st[0].toUpperCase() + st.slice(1) : undefined)
    const byRoster = new Map(roster.map((e) => [e.rosterId, e]))
    const csv = resultsCsv([
      ...sorted.map((r) => {
        const entry = r.roster_id ? byRoster.get(r.roster_id) : undefined
        return { name: r.student_name, marks: Number(r.total_marks), possible: Number(r.total_possible_marks), percentage: Number(r.percentage), grade: r.grade, studentNumber: entry?.studentNumber, status: entry?.status === "late" ? (entry.daysLate ? `Late (${dayCount(entry.daysLate)})` : "Late") : undefined, adjustments: gradebookComment(normalizeAdjustments(r.adjustments)) || undefined }
      }),
      ...roster.filter((e) => !e.hasPaper).map((e) => ({ name: e.name, marks: null, possible: null, percentage: null, grade: "", studentNumber: e.studentNumber, status: label(e.status) ?? "No paper" })),
    ])
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `${title.replace(/[^\w-]+/g, "_")}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link href="/grade-exam/batch" className={backLink}><Plus />Grade another class</Link>
        {error ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
        ) : !rows ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading results…</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{title}</h1>
                <p className="text-slate-600">{subtitle ? `${subtitle} · ` : ""}{rows.length} student{rows.length === 1 ? "" : "s"} · class average {average.toFixed(1)}% · <Link href={`/grade-exam/batch/${id}/reteach`} className="font-medium text-blue-700 hover:underline">Reteach plan</Link></p>
              </div>
              <div className={buttonRow}>
                <Link href={`/grade-exam/batch?batch=${id}${classInfo ? `&class=${classInfo.id}` : ""}`} className={actionButton}><FilePlus2 />Add more papers</Link>
                <button type="button" className={actionButton} onClick={() => { setScale(normalizeScale(first?.grade_scale) ?? DEFAULT_SCALE); setScaleOpen((o) => !o) }}><GraduationCap />Grade scale</button>
                <button type="button" className={actionButton} onClick={() => { setEditingAdjustment(null); setAdjustOpen(true) }}><Diff />Extra credit / points off</button>
                <button type="button" className={actionButton} onClick={() => setAcceptOpen(true)}><ListChecks />Accept another answer</button>
                <select
                  aria-label="Sort students"
                  value={sort === "score" ? "score" : nameOrder}
                  onChange={(e) => { const v = e.target.value; if (v === "score") setSort("score"); else { setSort("name"); setNameOrder(v === "first" ? "first" : "last") } }}
                  className={cn(selectBox, "pr-9")}
                >
                  <option value="last">Sort by last name</option>
                  <option value="first">Sort by first name</option>
                  <option value="score">Sort by score</option>
                </select>
                <button type="button" className={actionButton} onClick={downloadCsv}><Download />CSV</button>
                <button type="button" className={actionButtonPrimary} onClick={() => setExportOpen(true)}><BookUp />Send to gradebook</button>
              </div>
            </div>
            {scaleOpen && scale && (
              <div className="mt-4 max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-lg">
                <h2 className="mb-1 font-semibold text-slate-900">Grade scale for this class set</h2>
                <p className="mb-3 text-xs text-slate-500">For Cambridge papers, switch to raw marks and type this paper&apos;s boundaries.</p>
                <ScaleEditor value={scale} onChange={setScale} possible={Number(first?.total_possible_marks) || undefined} />
                <div className="mt-4 flex gap-2">
                  <Button onClick={applyScale} disabled={busy} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>{busy ? "Applying…" : `Apply to all ${rows.length} papers`}</Button>
                  <Button variant="ghost" onClick={() => setScaleOpen(false)} className={actionButton}>Cancel</Button>
                </div>
              </div>
            )}
            {/* Phones: one card per student (the table needs ~600px). */}
            <ul className="mt-6 space-y-2 sm:hidden">
              {sorted.map((r) => {
                const e = r.roster_id ? roster.find((x) => x.rosterId === r.roster_id) : undefined
                const pct = Number(r.percentage)
                return (
                  <li key={r.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                    <div className="flex items-center gap-2">
                      <input
                        key={r.student_name}
                        defaultValue={r.student_name}
                        onBlur={(ev) => rename(r, ev.target.value)}
                        onKeyDown={(ev) => { if (ev.key === "Enter") ev.currentTarget.blur() }}
                        aria-label="Student name"
                        className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1.5 py-1 text-base font-semibold text-slate-900 focus:border-blue-400 focus:bg-white focus:outline-none"
                      />
                      <span className={cn("shrink-0 rounded-lg px-2 py-1 text-sm font-semibold tabular-nums", pct >= 80 ? "bg-emerald-50 text-emerald-800" : pct >= 65 ? "bg-blue-50 text-blue-800" : pct >= 50 ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-800")}>{pct.toFixed(1)}%</span>{changeChip(r)}
                    </div>
                    <div className="mt-2 flex items-center gap-2 pl-1.5">
                      <span className="text-sm text-slate-600">{r.total_marks}/{r.total_possible_marks} marks{r.grade ? <> · <strong className="text-slate-900">{r.grade}</strong></> : null}</span>
                      {e?.status === "late" && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">Late{e.daysLate ? ` · ${dayCount(e.daysLate)}` : ""}</span>}
                      {r.group_id && r.group_members && r.group_members.length > 1 && <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">Group of {r.group_members.length}</span>}
                      {checksFor(r) > 0 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300" title="The grader wasn't sure it read these answers right">{checksFor(r)} to check</span>}
                      <Link href={`/grade-report/${r.id}`} className={cn(actionButton, "ml-auto text-blue-700")}><FileText />Report</Link>
                    </div>
                  </li>
                )
              })}
              {noPaperRows.map((e) => (
                <li key={e.rosterId} className="flex items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-700">{e.name}</span>
                    <span className={cn("mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", NO_PAPER_TONE[e.status ?? "none"] ?? NO_PAPER_TONE.none)}>{NO_PAPER_LABEL[e.status ?? "none"] ?? "No paper yet"}</span>
                  </span>
                  {e.status !== "exempt" && classInfo && <Link href={`/grade-exam/batch?batch=${id}&class=${classInfo.id}`} className={actionButton}><Plus />Grade it</Link>}
                </li>
              ))}
            </ul>
            <div className="mt-6 hidden overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10 sm:block">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Marks</th><th className="px-4 py-3">Percent</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-2 py-1.5">
                        <input
                          key={r.student_name}
                          defaultValue={r.student_name}
                          onBlur={(e) => rename(r, e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur() }}
                          aria-label="Student name"
                          className="w-full rounded-md border border-transparent bg-transparent px-2 py-1.5 font-medium text-slate-900 hover:border-slate-200 focus:border-blue-400 focus:bg-white focus:outline-none"
                        />
                        {(() => {
                          const e = r.roster_id ? roster.find((x) => x.rosterId === r.roster_id) : undefined
                          if (e?.status !== "late") return null
                          return <span className="ml-2 inline-block rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-200">Late{e.daysLate ? ` · ${dayCount(e.daysLate)}` : ""}</span>
                        })()}
                        {checksFor(r) > 0 && <span className="ml-2 inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300" title="The grader wasn't sure it read these answers right">{checksFor(r)} to check</span>}
                        {r.group_id && r.group_members && r.group_members.length > 1 && (
                          <span className="ml-2 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700" title={`Group work: ${r.group_members.map((m) => m.name).join(", ")}`}>Group of {r.group_members.length}</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{r.total_marks}/{r.total_possible_marks}</td>
                      <td className="px-4 py-3"><span className={cn("rounded-lg px-2 py-1 font-semibold tabular-nums", Number(r.percentage) >= 80 ? "bg-emerald-50 text-emerald-800" : Number(r.percentage) >= 65 ? "bg-blue-50 text-blue-800" : Number(r.percentage) >= 50 ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-800")}>{Number(r.percentage).toFixed(1)}%</span>{changeChip(r)}</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.grade}</td>
                      <td className="px-4 py-2 text-right"><Link href={`/grade-report/${r.id}`} className={cn(actionButton, "text-blue-700")}><FileText />Open report</Link></td>
                    </tr>
                  ))}
                  {noPaperRows.map((e) => (
                    <tr key={e.rosterId} className="bg-slate-50/60">
                      <td className="px-4 py-3">
                        {classInfo ? <Link href={`/teacher/classes/${classInfo.id}/students/${e.rosterId}`} className="font-medium text-slate-700 hover:text-blue-700">{e.name}</Link> : <span className="font-medium text-slate-700">{e.name}</span>}
                        <span className={cn("ml-2 inline-block whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset", NO_PAPER_TONE[e.status ?? "none"] ?? NO_PAPER_TONE.none)}>{NO_PAPER_LABEL[e.status ?? "none"] ?? "No paper yet"}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-400">-</td>
                      <td className="px-4 py-3 text-slate-400">-</td>
                      <td className="px-4 py-3 text-slate-400">-</td>
                      <td className="px-4 py-2 text-right">
                        {e.status !== "exempt" && classInfo && <Link href={`/grade-exam/batch?batch=${id}&class=${classInfo.id}`} className={actionButton}><Plus /><span className="whitespace-nowrap">Grade their paper</span></Link>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {groups.length > 0 && (
              <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-1 flex items-center gap-2 font-semibold text-slate-900"><Diff className="h-5 w-5 text-blue-700" />Extra credit and points off</h2>
                <p className="mb-3 text-sm text-slate-600">Scores above, reports and gradebook files include these. Each reason goes on the student&apos;s report and in the gradebook comment.</p>
                <ul className="space-y-2">
                  {groups.map(({ adjustment, paperIds }) => (
                    <li key={adjustment.id} className="flex flex-wrap items-center gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
                      <span className="min-w-[12rem] flex-1">
                        <span className={cn("block font-semibold", adjustment.kind === "extra" ? "text-emerald-800" : "text-rose-800")}>{adjustmentLine(adjustment)}</span>
                        <span className="block text-sm text-slate-600">{paperIds.length} student{paperIds.length === 1 ? "" : "s"}: {paperIds.map((p) => nameOf.get(p)).filter(Boolean).slice(0, 8).join(", ")}{paperIds.length > 8 ? "…" : ""}</span>
                      </span>
                      {confirmRemove === adjustment.id ? (
                        <span className="flex items-center gap-2">
                          <span className="text-sm text-slate-700">Remove for all {paperIds.length}?</span>
                          <button type="button" className="inline-flex h-10 items-center rounded-xl bg-red-700 px-3 text-sm font-semibold text-white hover:bg-red-800" onClick={() => void removeAdjustment(adjustment)}>Remove</button>
                          <button type="button" className={actionButton} onClick={() => setConfirmRemove(null)}>Keep</button>
                        </span>
                      ) : (
                        <span className="flex gap-2">
                          <button type="button" className={actionButton} onClick={() => { setEditingAdjustment({ adjustment, paperIds }); setAdjustOpen(true) }}><Pencil />Change</button>
                          <button type="button" className={actionButton} onClick={() => setConfirmRemove(adjustment.id)} aria-label={`Remove ${adjustmentLine(adjustment)}`}><Trash2 /><span className="max-sm:hidden">Remove</span></button>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            <AdjustmentDialog open={adjustOpen} onOpenChange={setAdjustOpen} papers={adjustable} editing={editingAdjustment} onSave={saveAdjustment} />
            <AcceptAnswerDialog open={acceptOpen} onOpenChange={setAcceptOpen} questions={questionLabels} preview={previewAccept} onSave={saveAccept} />
            <p className="mt-3 text-xs text-slate-500" aria-live="polite">{notice || "Click a name to fix it. Open a report to read the feedback, change a mark or print it."}</p>
            <BatchClassPanel batchId={id} rows={rows} roster={roster} examTitle={first?.exam_title ?? null} onChanged={() => void load()} />
            <GradebookExportDialog
              open={exportOpen}
              onOpenChange={setExportOpen}
              title={title}
              rows={exportRows}
              classroomSync={classInfo?.googleCourseId ? <GoogleClassroomSync batchId={id} title={title} /> : undefined}
            />
            <ClassReport
              batchId={id}
              papers={reportPapers}
              saved={saved}
              actions={<Link href={`/grade-exam/batch/${id}/reteach`} className={cn(actionButton, "bg-indigo-50 text-indigo-800 ring-indigo-200 hover:bg-indigo-100 hover:ring-indigo-300")}><ClipboardList />Reteach plan</Link>}
            />
          </>
        )}
      </main>
    </div>
  )
}
