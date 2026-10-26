"use client"

// My classes (light version, 2026-10-13): one card per class with its roster
// size. A class is a roster of names for grading plus a join code; it lives in
// the teacher Grading menu, not the homepage. The old assignments/gradebook
// pages stay hidden behind CLASSES_ENABLED.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CalendarPlus, ChevronRight, FileUp, Loader2, Plus, Users } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CLASS_SORTS, sortClasses, type ClassSort } from "@/lib/classes/sort"
import { courseKey, courseName, nextSchoolYear, schoolYearFor, sortYears } from "@/lib/classes/years"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import ClassFormDialog from "@/components/teacher-classes/class-form-dialog"
import { ImportClassesDialog } from "@/components/classes/import-classes-dialog"
import { GoogleClassroomDialog, connectGoogleClassroom } from "@/components/classes/google-classroom-dialog"
import { authFetch } from "@/lib/auth-fetch"
import { useAuth } from "@/lib/auth"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { actionButton, actionButtonPrimary, buttonRow } from "@/components/grading/grading-ui"
import { TeacherVerificationCard } from "@/components/teacher/verification-card"

interface ClassRecord {
  id: string
  name: string
  period: string | null
  subject: string | null
  enrollment_code: string
  roster_count: number
  student_count: number
  school_year: string
  course: string | null
  created_at: string
}

function ClassCard({ c, muted = false }: { c: ClassRecord; muted?: boolean }) {
  return (
    <li>
      <Link href={`/teacher/classes/${c.id}`} className={cn("group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md", muted && "bg-slate-50 shadow-none")}>
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", muted ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700")}><Users className="h-6 w-6" /></span>
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-slate-900">{c.name}</span>
          <span className="block text-sm text-slate-600">
            {[c.period && `Period ${c.period}`, `${c.roster_count} name${c.roster_count === 1 ? "" : "s"}`, c.student_count ? `${c.student_count} joined` : null].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
      </Link>
    </li>
  )
}

export default function TeacherClassesPage() {
  return (
    <AuthGate>
      <Classes />
    </AuthGate>
  )
}

function Classes() {
  const { user } = useAuth()
  const router = useRouter()
  const [classes, setClasses] = useState<ClassRecord[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [notice, setNotice] = useState("")
  const [googleReady, setGoogleReady] = useState(false)
  const [googleOpen, setGoogleOpen] = useState(false)

  // Google Classroom import shows only when it's set up; ?google= is the OAuth return.
  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/google/classroom")
      if (res.ok) setGoogleReady((await res.json()).configured)
    })()
    const result = new URLSearchParams(window.location.search).get("google")
    if (!result) return
    window.history.replaceState(null, "", "/teacher/classes")
    if (result === "connected") setGoogleOpen(true)
    else if (result === "denied") setNotice("Google Classroom wasn't connected. You can try again any time.")
    else if (result === "scopes") setNotice("Google Classroom needs permission to read your class rosters. Try again and leave every box ticked.")
    else setNotice("Something went wrong connecting Google Classroom. Try again.")
  }, [])

  const load = useCallback(async () => {
    const res = await fetch("/api/classes")
    const data = await res.json().catch(() => ({}))
    if (!res.ok) setError(data.error || "Could not load your classes")
    else setClasses(data.classes ?? [])
  }, [])

  useEffect(() => { void load() }, [load])

  if (user && user.user_type !== "teacher") {
    return <Shell><p className="rounded-xl bg-amber-50 p-6 text-amber-900">Classes are for teacher accounts.</p></Shell>
  }

  return (
    <Shell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>My classes</h1>
          <p className="mt-1 max-w-xl text-slate-600">A class is your list of names. Grading matches each paper to a name on it, and students can join with the class code to see the reports you release.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className={cn(actionButtonPrimary, "h-11 w-full bg-blue-600 px-5 hover:bg-blue-700 sm:w-auto")}><Plus className="mr-2 h-4 w-4" />New class</Button>
      </div>
      <div className="mt-4 flex flex-col gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-200 sm:flex-row sm:items-center">
        <div className={buttonRow}>
          <Button variant="ghost" onClick={() => setImportOpen(true)} className={actionButton}><FileUp className="mr-2 h-4 w-4" />Import from a file</Button>
          {googleReady && <Button variant="ghost" onClick={async () => { const err = await connectGoogleClassroom(); if (err) setNotice(err) }} className={actionButton}>Import from Google Classroom</Button>}
        </div>
      </div>
      <TeacherVerificationCard className="mt-6" />
      {notice && <p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm text-slate-800" aria-live="polite">{notice}</p>}

      {error ? (
        <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
      ) : !classes ? (
        <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
      ) : classes.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <Users className="mx-auto h-10 w-10 text-slate-400" />
          <p className="mt-3 font-semibold text-slate-900">No classes yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Import all your classes at once from a gradebook CSV, or make one and paste the names. You can also save the names from a graded class set on its results page.</p>
          <div className="mt-5 flex justify-center gap-2">
            <Button onClick={() => setImportOpen(true)} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}><FileUp className="mr-2 h-4 w-4" />Import from a file</Button>
            <Button variant="ghost" onClick={() => setCreateOpen(true)} className={actionButton}><Plus className="mr-2 h-4 w-4" />New class</Button>
          </div>
        </div>
      ) : (
        <YearSections classes={classes} onRolledOver={(summary) => { setNotice(summary); void load() }} />
      )}

      <GoogleClassroomDialog open={googleOpen} onOpenChange={setGoogleOpen} onImported={(summary) => { setNotice(summary); void load() }} />
      <ImportClassesDialog open={importOpen} onOpenChange={setImportOpen} onImported={(summary) => { setNotice(summary); void load() }} />
      <ClassFormDialog open={createOpen} onOpenChange={setCreateOpen} mode="create" onSaved={(cls) => router.push(`/teacher/classes/${cls.id}`)} />
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

function YearSections({ classes: unsorted, onRolledOver }: { classes: ClassRecord[]; onRolledOver: (summary: string) => void }) {
  const [sortBy, setSortBy] = useState<ClassSort>("period")
  useEffect(() => {
    const saved = localStorage.getItem("cs:classes:sort")
    if (CLASS_SORTS.some((o) => o.value === saved)) setSortBy(saved as ClassSort)
  }, [])
  const changeSort = (value: ClassSort) => { setSortBy(value); localStorage.setItem("cs:classes:sort", value) }
  const classes = sortClasses(unsorted, sortBy)
  const current = schoolYearFor()
  const years = sortYears([current, ...classes.map((c) => c.school_year)])
  const thisYear = classes.filter((c) => c.school_year === current)
  const future = years.filter((y) => y > current)
  const past = years.filter((y) => y < current && classes.some((c) => c.school_year === y))
  // "Start next year" copies the most recent year's classes that aren't there yet.
  const latest = years.find((y) => classes.some((c) => c.school_year === y)) ?? current
  const [rollOpen, setRollOpen] = useState(false)
  const courses = [...new Map(classes.map((c) => [courseKey(c.name, c.course), courseName(c.name, c.course)])).entries()]

  return (
    <div className="mt-8 space-y-8">
      {future.map((y) => (
        <YearBlock key={y} title={`${y} (next year)`} classes={classes.filter((c) => c.school_year === y)} />
      ))}
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>This year <span className="text-base font-normal text-slate-500">{current}</span></h2>
          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm text-slate-600">
              Sort by
              <select value={sortBy} onChange={(e) => changeSort(e.target.value as ClassSort)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800">
                {CLASS_SORTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
            <Button variant="ghost" onClick={() => setRollOpen(true)} disabled={!classes.some((c) => c.school_year === latest)} className={actionButton}><CalendarPlus className="mr-1.5 h-4 w-4" />Start next year</Button>
          </div>
        </div>
        {thisYear.length ? <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">{thisYear.map((c) => <ClassCard key={c.id} c={c} />)}</ul> : <p className="text-sm text-slate-500">No classes for {current} yet.</p>}
      </div>
      {courses.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <p className="mb-2 text-sm font-semibold text-slate-800">Courses across years</p>
          <div className="flex flex-wrap gap-2">
            {courses.map(([key, name]) => <Link key={key} href={`/teacher/courses/${encodeURIComponent(key)}`} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-800 hover:bg-blue-100">{name}</Link>)}
          </div>
          <p className="mt-2 text-xs text-slate-500">See where each year&apos;s students struggled, side by side.</p>
        </div>
      )}
      {past.map((y) => (
        <details key={y} className="group">
          <summary className={cn(fontDisplay, "cursor-pointer text-xl font-semibold text-slate-700")}>{y} <span className="text-sm font-normal text-slate-500">({classes.filter((c) => c.school_year === y).length} classes)</span></summary>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2">{classes.filter((c) => c.school_year === y).map((c) => <ClassCard key={c.id} c={c} muted />)}</ul>
        </details>
      ))}
      <RollOverDialog open={rollOpen} onOpenChange={setRollOpen} fromYear={latest} classes={classes.filter((c) => c.school_year === latest)} onDone={onRolledOver} />
    </div>
  )
}

function YearBlock({ title, classes }: { title: string; classes: ClassRecord[] }) {
  return (
    <div>
      <h2 className={cn(fontDisplay, "mb-3 text-2xl font-semibold text-slate-900")}>{title}</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">{classes.map((c) => <ClassCard key={c.id} c={c} />)}</ul>
    </div>
  )
}

function RollOverDialog({ open, onOpenChange, fromYear, classes, onDone }: { open: boolean; onOpenChange: (o: boolean) => void; fromYear: string; classes: ClassRecord[]; onDone: (summary: string) => void }) {
  const toYear = nextSchoolYear(fromYear)
  const [picked, setPicked] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { if (open) setPicked(new Set(classes.map((c) => c.id))) }, [open, classes])

  const go = async () => {
    setBusy(true)
    setError("")
    try {
      const res = await authFetch("/api/classes/roll-over", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ classIds: [...picked], toYear }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || "Could not copy the classes")
      onDone(`Set up ${data.created.length} class${data.created.length === 1 ? "" : "es"} for ${toYear}${data.skipped ? ` (${data.skipped} already there)` : ""}. Import or paste the new rosters when you have them.`)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not copy the classes")
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start {toYear}</DialogTitle>
          <DialogDescription>Copies these classes into {toYear} with new join codes and no students. Your {fromYear} classes, grades and reports stay as they are, under Past years.</DialogDescription>
        </DialogHeader>
        <ul className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-slate-200 p-2 text-sm">
          {classes.map((c) => (
            <li key={c.id}>
              <label className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50">
                <input type="checkbox" checked={picked.has(c.id)} onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(c.id); else n.delete(c.id); return n })} className="h-4 w-4 rounded border-slate-300" />
                {c.name}{c.period ? <span className="text-slate-500"> (P{c.period})</span> : null}
              </label>
            </li>
          ))}
        </ul>
        {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className={actionButton}>Cancel</Button>
          <Button onClick={go} disabled={busy || !picked.size} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>{busy ? "Copying…" : `Copy ${picked.size} class${picked.size === 1 ? "" : "es"}`}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
