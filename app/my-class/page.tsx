"use client"

// My Class (2026-10-21): the student side of classes, in the nav spot where
// teachers have Grading. Work their teacher assigned (to do first), reports
// the teacher released, and their classes. The guide maker stays their home.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ChevronDown, ClipboardCheck, FileCheck, Loader2, Plus, Users } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { useAuth } from "@/lib/auth"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { actionButton } from "@/components/grading/grading-ui"
import { AssignmentRow, MissingTestRow, ReportRow, useClasswork } from "@/components/student/classwork"
import { openWork } from "@/lib/student/classwork-rules"

export default function MyClassPage() {
  return (
    <AuthGate>
      <MyClass />
    </AuthGate>
  )
}

function MyClass() {
  const { user } = useAuth()
  const router = useRouter()
  const data = useClasswork()
  const [showDone, setShowDone] = useState(false)

  useEffect(() => {
    if (user?.user_type === "teacher") router.replace("/teacher/classes")
  }, [user, router])

  const classNameOf = (id: string) => {
    const c = data?.classes.find((x) => x.id === id)
    return c ? c.name : null
  }
  const open = data ? openWork(data.assignments) : []
  const tests = data?.missingTests ?? []
  const todo = open.length + tests.length
  const done = data ? data.assignments.filter((a) => a.status === "done" || a.status === "late") : []
  const many = (data?.classes.length ?? 0) > 1

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-40 pt-14 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        </div>
        <div className="container relative mx-auto max-w-5xl px-4">
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight sm:text-5xl")}>{many ? "My Classes" : "My Class"}</h1>
          <p className="mt-2 text-lg text-blue-50">
            {!data ? " " : open.length ? `You have ${open.length} thing${open.length === 1 ? "" : "s"} to do.` : "You're all caught up."}
          </p>
        </div>
      </section>

      <main className="container relative mx-auto -mt-28 max-w-5xl px-4 pb-20">
        {!data ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl bg-white py-16 text-slate-500 shadow-2xl shadow-blue-900/10 ring-1 ring-slate-200"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-blue-900/10">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><ClipboardCheck className="h-5 w-5 text-emerald-700" />Assigned to you</h2>
                {tests.length > 0 && (
                  <ul className="mb-2 space-y-2">
                    {tests.map((t) => <li key={t.batchId}><MissingTestRow t={t} className={many ? classNameOf(t.classId) : null} /></li>)}
                  </ul>
                )}
                {open.length === 0 && tests.length > 0 ? null : open.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-600">
                    {data.assignments.length ? "Nothing left to do. Nice work." : "Nothing assigned yet. When your teacher assigns practice, it shows up here and on your home page."}
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {open.map((a) => <li key={a.id}><AssignmentRow a={a} className={many ? classNameOf(a.classId) : null} /></li>)}
                  </ul>
                )}
                {done.length > 0 && (
                  <div className="mt-3">
                    <button type="button" onClick={() => setShowDone((v) => !v)} aria-expanded={showDone} className={actionButton}>
                      <ChevronDown className={cn("transition", showDone && "rotate-180")} />Done ({done.length})
                    </button>
                    {showDone && (
                      <ul className="mt-2 space-y-2">
                        {done.map((a) => <li key={a.id}><AssignmentRow a={a} className={many ? classNameOf(a.classId) : null} /></li>)}
                      </ul>
                    )}
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><FileCheck className="h-5 w-5 text-blue-700" />Reports from your teacher</h2>
                {data.reports.length === 0 ? (
                  <p className="rounded-2xl bg-slate-50 p-5 text-center text-sm text-slate-600">No reports yet. When your teacher grades a test and shares it, you&apos;ll see your marks and feedback here.</p>
                ) : (
                  <ul className="space-y-2">
                    {data.reports.map((r) => <li key={r.id}><ReportRow r={r} /></li>)}
                  </ul>
                )}
              </section>
            </div>

            <section className="h-fit rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><Users className="h-5 w-5 text-blue-700" />{many ? "Your classes" : "Your class"}</h2>
              {data.classes.length === 0 ? (
                <p className="mb-3 text-sm text-slate-600">You&apos;re not in a class yet. Ask your teacher for the class code.</p>
              ) : (
                <ul className="mb-3 space-y-1.5">
                  {data.classes.map((c) => (
                    <li key={c.id} className="flex items-center gap-3 rounded-xl px-2 py-2">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{c.period ? `P${c.period}` : <Users className="h-4 w-4" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{c.name}</span>
                        {c.teacherName && <span className="block truncate text-xs text-slate-500">{c.teacherName}</span>}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
              <Link href="/classes/join" className={cn(actionButton, "w-full justify-center")}><Plus />{data.classes.length ? "Join another class" : "Join a class"}</Link>
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
