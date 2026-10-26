"use client"

// One class (light version, 2026-10-13): the roster of names grading matches
// against, the join code, this class's graded sets, and its top weak spots.
// Deliberately nothing else (no assignments, calendar or gradebook).

import { AssignedPracticeList } from "@/components/assign/assigned-practice-list"
import { backLink, actionButton, actionButtonPrimary, buttonRow } from "@/components/grading/grading-ui"
import { use, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowLeft, CalendarDays, Check, ChevronRight, ClipboardList, ClipboardPaste, Copy, Link2, Loader2, Pencil, RefreshCw, Trash2, Unlink, UserPlus } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import ClassFormDialog from "@/components/teacher-classes/class-form-dialog"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import type { RosterRow } from "@/lib/classes/server"
import type { ClassWeakSpot } from "@/lib/classes/weak-spots"
import type { ClassArea } from "@/lib/classes/areas"
import { ClassAreas } from "@/components/classes/class-areas"
import { NoEmailNote, RosterFileHelp } from "@/components/classes/roster-file-help"
import { parseRosterPaste } from "@/lib/classes/roster"
import { ClassGradebook } from "@/components/classes/class-gradebook"
import type { GradebookRow, GradebookTest } from "@/lib/classes/gradebook"
import { courseKey, courseName, nextSchoolYear, schoolYearFor } from "@/lib/classes/years"
import { TeacherVerificationCard } from "@/components/teacher/verification-card"
import { DeleteClassDialog } from "@/components/classes/delete-class-dialog"

interface ClassInfo { id: string; name: string; period: string | null; subject: string | null; enrollment_code: string; school_year: string; course: string | null }
interface BatchSummary { id: string; title: string | null; createdAt: string; papers: number; average: number; released: boolean }

/** Names shown before "Show all": enough to see the class, short enough to keep the gradebook near. */
const ROSTER_PREVIEW = 8

export default function ClassPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <ClassView id={id} />
    </AuthGate>
  )
}

function ClassView({ id }: { id: string }) {
  const [cls, setCls] = useState<ClassInfo | null>(null)
  const [roster, setRoster] = useState<RosterRow[] | null>(null)
  const [batches, setBatches] = useState<BatchSummary[]>([])
  const [weakSpots, setWeakSpots] = useState<ClassWeakSpot[]>([])
  const [linkedStudents, setLinkedStudents] = useState(0)
  const [areas, setAreas] = useState<ClassArea[]>([])
  const [setsWithoutReport, setSetsWithoutReport] = useState(0)
  const [gradebook, setGradebook] = useState<{ tests: GradebookTest[]; rows: GradebookRow[] } | null>(null)
  const [areaTest, setAreaTest] = useState("")
  const [showLeft, setShowLeft] = useState(false)
  const [showAll, setShowAll] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paste, setPaste] = useState("")
  const [pasteOpen, setPasteOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState("")
  const [editOpen, setEditOpen] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    const [rosterRes, summaryRes, gradebookRes] = await Promise.all([
      authFetch(`/api/classes/${id}/roster`, { cache: "no-store" }),
      authFetch(`/api/classes/${id}/summary`, { cache: "no-store" }),
      authFetch(`/api/classes/${id}/gradebook`, { cache: "no-store" }),
    ])
    if (gradebookRes.ok) setGradebook(await gradebookRes.json())
    const rosterData = await rosterRes.json().catch(() => ({}))
    if (!rosterRes.ok) { setError(rosterData.error || "Could not load this class"); return }
    setCls(rosterData.class)
    setRoster(rosterData.roster)
    if (rosterData.roster.length === 0) setPasteOpen(true)
    const summary = await summaryRes.json().catch(() => ({}))
    if (summaryRes.ok) {
      setBatches(summary.batches ?? [])
      setWeakSpots(summary.weakSpots ?? [])
      setLinkedStudents(summary.linkedStudents ?? 0)
      setAreas(summary.areas ?? [])
      setSetsWithoutReport(summary.setsWithoutReport ?? 0)
    }
  }, [id])

  useEffect(() => { void load() }, [load])

  // Areas for one test (or all of them).
  const pickAreaTest = async (batch: string) => {
    setAreaTest(batch)
    const res = await authFetch(`/api/classes/${id}/summary${batch ? `?batch=${batch}` : ""}`, { cache: "no-store" })
    if (res.ok) setAreas((await res.json()).areas ?? [])
  }

  const saveDetails = async (schoolYear: string, course: string) => {
    const res = await fetch(`/api/classes/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ school_year: schoolYear, course }) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setNotice(data.error || "Could not save"); return }
    setCls((c) => (c ? { ...c, school_year: schoolYear, course: course || null } : c))
    setDetailsOpen(false)
  }

  const [clearing, setClearing] = useState(false)
  const clearRoster = async () => {
    const res = await authFetch(`/api/classes/${id}/roster`, { method: "DELETE" })
    setClearing(false)
    if (!res.ok) { setNotice("Could not clear the list"); return }
    setRoster([])
    setPasteOpen(true)
    setNotice("List cleared. Add the names again.")
  }
  const pastePreview = useMemo(() => (paste.trim() ? parseRosterPaste(paste) : null), [paste])

  const addNames = async () => {
    if (!paste.trim()) return
    setBusy(true)
    try {
      const res = await authFetch(`/api/classes/${id}/roster`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: paste }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not add those names")
      setRoster(data.roster)
      setPaste("")
      setPasteOpen(false)
      setNotice(`Added ${data.added} name${data.added === 1 ? "" : "s"}${data.skipped ? `, ${data.skipped} already on the list` : ""}.${data.filled ? ` Filled in the student ID or email for ${data.filled}.` : ""}`)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not add those names")
    } finally {
      setBusy(false)
    }
  }

  const patchRow = async (row: RosterRow, body: Record<string, unknown>) => {
    const res = await authFetch(`/api/classes/${id}/roster/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setNotice(data.error || "Could not save"); return false }
    return true
  }

  const removeRow = async (row: RosterRow) => {
    setRoster((r) => r?.filter((x) => x.id !== row.id) ?? null)
    await authFetch(`/api/classes/${id}/roster/${row.id}`, { method: "DELETE" })
  }

  const joinUrl = cls && typeof window !== "undefined" ? `${window.location.origin}/classes/join?code=${cls.enrollment_code}` : ""

  const copyLink = async () => {
    await navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const newCode = async () => {
    const res = await fetch(`/api/classes/${id}/regenerate-code`, { method: "POST" })
    const data = await res.json().catch(() => ({}))
    if (res.ok && data.class?.enrollment_code) setCls((c) => (c ? { ...c, enrollment_code: data.class.enrollment_code } : c))
    else if (res.ok && data.enrollment_code) setCls((c) => (c ? { ...c, enrollment_code: data.enrollment_code } : c))
    else setNotice(data.error || "Could not make a new code")
  }

  if (error) return <Shell><p className="rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p></Shell>
  if (!cls || !roster) return <Shell><p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p></Shell>

  return (
    <Shell>
      <DeleteClassDialog classId={cls.id} label={`${cls.name}${cls.period ? ` (Period ${cls.period})` : ""}`} open={deleteOpen} onOpenChange={setDeleteOpen} />
      <Link href="/teacher/classes" className={backLink}><ArrowLeft />My classes</Link>
      {/* Title row: the class, and the one thing to do with it. */}
      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{cls.name}</h1>
          <p className="text-slate-600">
            {[cls.school_year, cls.period && `Period ${cls.period}`, `${roster.filter((r) => !r.left).length} student${roster.filter((r) => !r.left).length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}
            {" · "}<Link href={`/teacher/courses/${encodeURIComponent(courseKey(cls.name, cls.course))}`} className="font-medium text-blue-700 hover:underline">{courseName(cls.name, cls.course)} across years</Link>
          </p>
        </div>
        <Button asChild className={cn(actionButtonPrimary, "h-11 w-full bg-blue-600 px-5 hover:bg-blue-700 sm:w-auto")}><Link href={`/grade-exam/batch?class=${cls.id}`}><ClipboardList className="mr-2 h-4 w-4" />Grade this class</Link></Button>
      </div>
      {/* Toolbar: settings on the left, the one dangerous thing on the right. */}
      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:flex-row sm:items-center sm:justify-between">
        <div className={buttonRow}>
          <Button variant="ghost" onClick={() => setEditOpen(true)} className={actionButton}><Pencil className="mr-2 h-4 w-4" />Edit class</Button>
          <Button variant="ghost" onClick={() => setDetailsOpen((o) => !o)} aria-pressed={detailsOpen} className={cn(actionButton, detailsOpen && "bg-blue-50 text-blue-800 ring-blue-300")}><CalendarDays className="mr-2 h-4 w-4" />Year &amp; course</Button>
        </div>
        <Button variant="ghost" onClick={() => setDeleteOpen(true)} className={cn(actionButton, "w-full text-rose-700 hover:bg-rose-50 hover:text-rose-800 sm:w-auto")}><Trash2 className="mr-2 h-4 w-4" />Delete class</Button>
      </div>
      {/* Below the header row, so opening it doesn't push the buttons onto new rows. */}
      {detailsOpen && <DetailsForm cls={cls} onSave={saveDetails} onCancel={() => setDetailsOpen(false)} />}

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* Roster */}
        <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Roster</h2>
            {roster.length > 0 && !pasteOpen && (
              clearing
                ? <span className="ml-auto mr-2 flex items-center gap-1 text-xs">Remove all {roster.length} names?
                    <button type="button" onClick={() => void clearRoster()} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Remove all</button>
                    <button type="button" onClick={() => setClearing(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Keep</button>
                  </span>
                : <button type="button" onClick={() => setClearing(true)} className={cn(actionButton, "ml-auto mr-2 text-slate-600 hover:bg-rose-50 hover:text-rose-700")}>Remove all names</button>
            )}
            {!pasteOpen && <Button variant="ghost" onClick={() => setPasteOpen(true)} className={actionButton}><UserPlus className="mr-1.5 h-4 w-4" />Add names</Button>}
          </div>

          {pasteOpen && (
            <div className="mb-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
              <p className="mb-2 text-sm text-slate-700">Paste your class list, one student per line, or choose a CSV from your gradebook. &quot;Last, First&quot;, student IDs and columns copied from a spreadsheet all work.</p>
              <RosterFileHelp className="mb-3" />
              <textarea
                value={paste}
                onChange={(e) => setPaste(e.target.value)}
                rows={8}
                placeholder={"Sean Miller\nLee, Mary Ann\nAva Kim"}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                aria-label="Class list"
              />
              {pastePreview && (
                <p className={cn("mt-2 text-xs", pastePreview.length ? "text-slate-600" : "text-amber-800")}>
                  {pastePreview.length
                    ? <>Found {pastePreview.length} student{pastePreview.length === 1 ? "" : "s"}{pastePreview.some((p) => p.studentNumber) ? " with IDs" : ""}: {pastePreview.slice(0, 5).map((p) => `${p.firstName} ${p.lastName}`.trim()).join(", ")}{pastePreview.length > 5 ? ", …" : ""}</>
                    : "No student names found. The file needs a name column (Student, Name, or First and Last)."}
                </p>
              )}
              {pastePreview && <NoEmailNote students={pastePreview} className="mt-2" />}
              <div className="mt-2 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Choose a CSV
                  <input type="file" accept=".csv,.tsv,.txt,text/csv,text/plain" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (f) setPaste(await f.text()) }} />
                </label>
                <Button onClick={addNames} disabled={busy || !paste.trim() || pastePreview?.length === 0} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}><ClipboardPaste className="mr-2 h-4 w-4" />{busy ? "Adding…" : pastePreview?.length ? `Add ${pastePreview.length} student${pastePreview.length === 1 ? "" : "s"}` : "Add to roster"}</Button>
                {roster.length > 0 && <Button variant="ghost" onClick={() => setPasteOpen(false)} className={actionButton}>Cancel</Button>}
              </div>
            </div>
          )}

          {notice && <p className="mb-3 text-sm text-slate-600" aria-live="polite">{notice}</p>}

          {roster.length === 0 ? (
            <p className="text-sm text-slate-500">No names yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {roster.filter((r) => showLeft || !r.left).slice(0, showAll ? undefined : ROSTER_PREVIEW).map((row) => (
                <RosterItem
                  key={row.id}
                  row={row}
                  classId={id}
                  onSave={async (fields) => {
                    if (await patchRow(row, fields)) await load() // reload: a new email may have linked their account
                  }}
                  onUnlink={async () => {
                    if (await patchRow(row, { unlink: true })) setRoster((r) => r?.map((x) => (x.id === row.id ? { ...x, linked: false, studentUserId: null, account: undefined } : x)) ?? null)
                  }}
                  onRemove={() => void removeRow(row)}
                />
              ))}
            </ul>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {/* A long roster is folded so the gradebook and sets stay close by. */}
            {roster.filter((r) => showLeft || !r.left).length > ROSTER_PREVIEW && (
              <button type="button" onClick={() => setShowAll((v) => !v)} className={actionButton}>
                {showAll ? "Show fewer" : `Show all ${roster.filter((r) => showLeft || !r.left).length} names`}
              </button>
            )}
            {roster.some((r) => r.left) && (
              <button type="button" onClick={() => setShowLeft((v) => !v)} className={actionButton}>
                {showLeft ? "Hide students who left" : `Show ${roster.filter((r) => r.left).length} who left`}
              </button>
            )}
          </div>
        </section>

        <div className="space-y-6">
          {/* Join code */}
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Join code</h2>
            <p className="mt-1 text-xs text-slate-500">Optional. Students who join are linked to their name, so you can release reports to them and see their weak spots.</p>
            <TeacherVerificationCard compact className="mt-3" />
            <p className="my-3 text-center font-mono text-3xl font-bold tracking-[0.3em] text-slate-900">{cls.enrollment_code}</p>
            <div className="flex gap-2">
              <Button variant="ghost" className={cn(actionButton, "flex-1")} onClick={copyLink}>{copied ? <><Check className="mr-1.5 h-4 w-4" />Copied</> : <><Copy className="mr-1.5 h-4 w-4" />Copy link</>}</Button>
              <Button variant="ghost" onClick={newCode} title="Make a new code (the old one stops working)" className={actionButton}><RefreshCw className="h-4 w-4" /></Button>
            </div>
          </section>

          {/* Weak spots: a card once there are some, otherwise one quiet line under the join code. */}
          {weakSpots.length === 0 ? (
            <p className="px-1 text-sm text-slate-500">
              {linkedStudents === 0 ? "Weak spots show here once students join with the code and study." : `No weak spots yet across ${linkedStudents} linked student${linkedStudents === 1 ? "" : "s"}.`}
            </p>
          ) : (
          <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Top weak spots</h2>
            {(
              <ul className="mt-2 space-y-2">
                {weakSpots.map((s) => (
                  <li key={s.key} className="text-sm">
                    <span className="font-medium text-slate-900">{s.topic}</span>
                    <span className="block text-xs text-slate-500">{s.students} student{s.students === 1 ? "" : "s"} · {Math.round(s.accuracy * 100)}% right lately</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}
        </div>
      </div>

      {gradebook && <ClassGradebook tests={gradebook.tests} rows={gradebook.rows} className={cls.name} classId={cls.id} />}

      {batches.length > 0 && (
        <ClassAreas
          areas={areas.map((a) => ({ ...a, students: a.students.filter((st) => !roster.find((r) => r.id === st.key)?.left) }))}
          className={cls.name}
          setsWithoutReport={setsWithoutReport}
          tests={gradebook?.tests ?? []}
          test={areaTest}
          onTest={(b) => void pickAreaTest(b)}
        />
      )}

      <AssignedPracticeList classId={cls.id} />

      {/* Graded work */}
      <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Graded class sets</h2>
        {batches.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">Nothing graded for this class yet. Pick this class when you grade a stack.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {batches.map((b) => (
              <li key={b.id}>
                <Link href={`/grade-exam/batch/${b.id}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm">
                  <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold", b.average >= 80 ? "bg-emerald-50 text-emerald-700" : b.average >= 65 ? "bg-blue-50 text-blue-700" : b.average >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")}>{Math.round(b.average)}%</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">{b.title || "Untitled"}</span>
                    <span className="block text-sm text-slate-500">{new Date(b.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} · {b.papers} paper{b.papers === 1 ? "" : "s"} · class average</span>
                  </span>
                  {b.released && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">Released</span>}
                  <span className="hidden items-center gap-1 text-sm font-semibold text-blue-700 sm:inline-flex">Open<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ClassFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        classId={cls.id}
        initialValues={{ name: cls.name, period: cls.period, subject: cls.subject }}
        onSaved={(c) => setCls((prev) => (prev ? { ...prev, name: c.name, period: c.period, subject: c.subject } : prev))}
      />
    </Shell>
  )
}

function DetailsForm({ cls, onSave, onCancel }: { cls: ClassInfo; onSave: (year: string, course: string) => void; onCancel: () => void }) {
  const now = schoolYearFor()
  const years = [...new Set([nextSchoolYear(now), now, cls.school_year, `${Number(now.slice(0, 4)) - 1}-${now.slice(2, 4)}`])].sort().reverse()
  const [year, setYear] = useState(cls.school_year)
  const [course, setCourse] = useState(cls.course ?? courseName(cls.name))
  return (
    <div className="mt-3 flex flex-wrap items-end gap-3 rounded-2xl bg-slate-50 p-3 ring-1 ring-inset ring-slate-200">
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-600">School year</span>
        <select value={year} onChange={(e) => setYear(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1.5">
          {years.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs font-medium text-slate-600">Course (links this class with other periods and years)</span>
        <input value={course} onChange={(e) => setCourse(e.target.value)} className="w-64 rounded-lg border border-slate-200 bg-white px-2 py-1.5" />
      </label>
      <Button onClick={() => onSave(year, course.trim())} className={actionButtonPrimary}>Save</Button>
      <Button variant="ghost" onClick={onCancel} className={actionButton}>Cancel</Button>
    </div>
  )
}

function RosterItem({ row, classId, onSave, onUnlink, onRemove }: {
  row: RosterRow
  classId: string
  onSave: (fields: { firstName: string; lastName: string; email: string; studentNumber: string }) => void
  onUnlink: () => void
  onRemove: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [first, setFirst] = useState(row.firstName)
  const [last, setLast] = useState(row.lastName)
  const [email, setEmail] = useState(row.email ?? "")
  const [number, setNumber] = useState(row.studentNumber ?? "")
  const [confirm, setConfirm] = useState(false)

  if (editing) {
    return (
      <li className="space-y-2 py-2">
        <div className="flex flex-wrap items-center gap-2">
          <input value={first} onChange={(e) => setFirst(e.target.value)} className="w-36 rounded-md border px-2 py-1 text-sm" aria-label="First name" placeholder="First name" autoFocus />
          <input value={last} onChange={(e) => setLast(e.target.value)} className="w-40 rounded-md border px-2 py-1 text-sm" aria-label="Last name" placeholder="Last name" />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" className="w-60 rounded-md border px-2 py-1 text-sm" aria-label="School email" placeholder="School email (links their account)" />
          <input value={number} onChange={(e) => setNumber(e.target.value)} className="w-32 rounded-md border px-2 py-1 text-sm" aria-label="Student ID" placeholder="Student ID" />
          <Button onClick={() => { onSave({ firstName: first.trim(), lastName: last.trim(), email: email.trim(), studentNumber: number.trim() }); setEditing(false) }} className={actionButtonPrimary}>Save</Button>
          <Button variant="ghost" onClick={() => { setFirst(row.firstName); setLast(row.lastName); setEmail(row.email ?? ""); setNumber(row.studentNumber ?? ""); setEditing(false) }} className={actionButton}>Cancel</Button>
        </div>
      </li>
    )
  }

  return (
    <li className="group flex flex-wrap items-center gap-2 py-2">
      <Link href={`/teacher/classes/${classId}/students/${row.id}`} className="min-w-0 flex-1 rounded-md text-sm text-slate-900 hover:text-blue-700">
        <span className="group-hover:underline">{row.lastName ? <><span className="font-medium">{row.lastName}</span>, {row.firstName}</> : <span className="font-medium">{row.firstName}</span>}</span>
        {row.studentNumber && <span className="ml-2 text-xs text-slate-400">ID {row.studentNumber}</span>}
        {row.email && <span className="ml-2 hidden text-xs text-slate-400 sm:inline">{row.email}</span>}
        {row.left && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">Left</span>}
      </Link>
      {row.linked && row.account?.matches !== false && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700" title={row.account?.name ? `Signed in as ${row.account.name}` : "Linked to the student's Casanova Study account"}><Link2 className="h-3 w-3" />Linked</span>}
      {confirm ? (
        <span className="flex items-center gap-1 text-xs">
          <button type="button" onClick={onRemove} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
          <button type="button" onClick={() => setConfirm(false)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Keep</button>
        </span>
      ) : (
        <span className="flex items-center opacity-60 group-hover:opacity-100">
          <button type="button" onClick={() => setEditing(true)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label={`Edit ${row.firstName}`} title="Edit name, email or ID"><Pencil className="h-3.5 w-3.5" /></button>
          {row.linked && <button type="button" onClick={onUnlink} className="rounded p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Unlink account" title="Unlink this student's account"><Unlink className="h-3.5 w-3.5" /></button>}
          <button type="button" onClick={() => setConfirm(true)} className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600" aria-label={`Remove ${row.firstName}`}><Trash2 className="h-3.5 w-3.5" /></button>
        </span>
      )}
      {row.linked && row.account?.matches === false && (
        <div className="flex w-full flex-wrap items-center gap-2 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span className="min-w-[12rem] flex-1">Signed in as <span className="font-semibold">{row.account.name || "a student with no name"}</span>. Is that {row.firstName}?</span>
          <button type="button" onClick={onUnlink} className="h-9 rounded-lg bg-white px-3 text-sm font-semibold text-amber-900 ring-1 ring-amber-300 hover:bg-amber-100">Not them</button>
        </div>
      )}
    </li>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">{children}</main>
    </div>
  )
}
