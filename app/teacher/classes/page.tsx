"use client"

// My classes (light version, 2026-10-13): one card per class with its roster
// size. A class is a roster of names for grading plus a join code; it lives in
// the teacher Grading menu, not the homepage. The old assignments/gradebook
// pages stay hidden behind CLASSES_ENABLED.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronRight, FileUp, Loader2, Plus, Users } from "lucide-react"
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

interface ClassRecord {
  id: string
  name: string
  period: string | null
  subject: string | null
  enrollment_code: string
  roster_count: number
  student_count: number
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
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>My classes</h1>
          <p className="mt-1 max-w-xl text-slate-600">A class is your list of names. Grading matches each paper to a name on it, and students can join with the class code to see the reports you release.</p>
        </div>
        <div className="flex gap-2">
          {googleReady && <Button variant="outline" onClick={async () => { const err = await connectGoogleClassroom(); if (err) setNotice(err) }}>Import from Google Classroom</Button>}
          <Button variant="outline" onClick={() => setImportOpen(true)}><FileUp className="mr-2 h-4 w-4" />Import from a file</Button>
          <Button onClick={() => setCreateOpen(true)} className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" />New class</Button>
        </div>
      </div>
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
            <Button onClick={() => setImportOpen(true)} className="bg-blue-600 hover:bg-blue-700"><FileUp className="mr-2 h-4 w-4" />Import from a file</Button>
            <Button variant="outline" onClick={() => setCreateOpen(true)}><Plus className="mr-2 h-4 w-4" />New class</Button>
          </div>
        </div>
      ) : (
        <ul className="mt-8 grid gap-4 sm:grid-cols-2">
          {classes.map((c) => (
            <li key={c.id}>
              <Link href={`/teacher/classes/${c.id}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Users className="h-6 w-6" /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900">{c.name}</span>
                  <span className="block text-sm text-slate-600">
                    {[c.period && `Period ${c.period}`, `${c.roster_count} name${c.roster_count === 1 ? "" : "s"}`, c.student_count ? `${c.student_count} joined` : null].filter(Boolean).join(" · ")}
                  </span>
                </span>
                <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
              </Link>
            </li>
          ))}
        </ul>
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
