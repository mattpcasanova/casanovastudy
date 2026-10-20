"use client"

// Teacher home (2026-10-13): teachers land here from "/" (students keep the
// guide maker). One job first: grade a class. Then scans waiting in the
// scanner inbox, recent graded sets and this year's classes. Making a study
// guide stays one click away.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BookOpen, ChevronRight, FileCheck, Inbox, Loader2, Plus, Users, ClipboardCheck } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { actionButton } from "@/components/grading/grading-ui"
import { TeacherVerificationCard } from "@/components/teacher/verification-card"

interface HomeData {
  firstName: string | null
  year: string
  recent: Array<{ batchId: string; title: string | null; className: string | null; period: string | null; classId: string | null; papers: number; average: number; date: string; released: boolean }>
  classes: Array<{ id: string; name: string; period: string | null; students: number }>
  scansWaiting: number
}

export default function TeachPage() {
  return (
    <AuthGate>
      <TeacherHome />
    </AuthGate>
  )
}

function greeting() {
  const h = new Date().getHours()
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"
}

function TeacherHome() {
  const { user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<HomeData | null>(null)

  useEffect(() => {
    if (user && user.user_type !== "teacher") router.replace("/")
  }, [user, router])

  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/teacher/home", { cache: "no-store" })
      if (res.ok) setData(await res.json())
    })()
  }, [])

  const name = data?.firstName ?? user?.first_name ?? ""

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-40 pt-14 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        </div>
        <div className="container relative mx-auto max-w-5xl px-4">
          <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight sm:text-5xl")}>{greeting()}{name ? `, ${name}` : ""}</h1>
          <p className="mt-2 text-lg text-blue-50">What are we doing today?</p>
        </div>
      </section>

      <main className="container relative mx-auto -mt-28 max-w-5xl space-y-6 px-4 pb-20">
        {/* The main jobs */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link href="/grade-exam/batch" className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/15 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-blue-300 md:col-span-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-white"><Users className="h-6 w-6" /></span>
            <h2 className={cn(fontDisplay, "mt-4 text-2xl font-semibold text-slate-900")}>Grade a class</h2>
            <p className="mt-1 max-w-md text-slate-600">Drop in the whole stack (or scan it on the copier). We sort it into students, you check it, and every paper is marked against your mark scheme.</p>
            <span className="mt-4 inline-flex items-center gap-1.5 font-semibold text-blue-700">Start grading <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
          </Link>
          <div className="grid gap-4">
            <Link href="/grade-exam" className="group flex items-center gap-3 rounded-3xl bg-white p-5 shadow-xl shadow-blue-900/10 ring-1 ring-slate-200 transition hover:ring-blue-300">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><FileCheck className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">Grade one paper</span><span className="block text-sm text-slate-500">Watch the marking live</span></span>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
            </Link>
            <Link href="/?new=1" className="group flex items-center gap-3 rounded-3xl bg-white p-5 shadow-xl shadow-blue-900/10 ring-1 ring-slate-200 transition hover:ring-blue-300">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700"><BookOpen className="h-5 w-5" /></span>
              <span className="min-w-0 flex-1"><span className="block font-semibold text-slate-900">Make a study guide</span><span className="block text-sm text-slate-500">Quizzes, practice, flashcards</span></span>
              <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600" />
            </Link>
          </div>
        </div>

        <TeacherVerificationCard />

        {data && data.scansWaiting > 0 && (
          <Link href="/grade-exam/batch" className="flex items-center gap-3 rounded-2xl bg-amber-50 p-4 text-amber-950 ring-1 ring-amber-200 hover:bg-amber-100">
            <Inbox className="h-5 w-5 shrink-0" />
            <span className="flex-1 font-medium">{data.scansWaiting} scan{data.scansWaiting === 1 ? " is" : "s are"} waiting in your scanner inbox</span>
            <span className="font-semibold">Grade {data.scansWaiting === 1 ? "it" : "them"} →</span>
          </Link>
        )}

        {!data ? (
          <p className="flex items-center justify-center gap-2 py-10 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-900">Recently graded</h2>
                <Link href="/graded-exams" className={actionButton}><FileCheck />All reports</Link>
              </div>
              {data.recent.length === 0 ? (
                <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-600">
                  <ClipboardCheck className="mx-auto mb-2 h-6 w-6 text-blue-600" />
                  Nothing graded yet. Your first class set shows up here with its average, class report and reteach plan.
                </div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {data.recent.map((s) => (
                    <li key={s.batchId}>
                      <Link href={`/grade-exam/batch/${s.batchId}`} className="group flex items-center gap-3 py-3">
                        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold", s.average >= 80 ? "bg-emerald-50 text-emerald-700" : s.average >= 65 ? "bg-blue-50 text-blue-700" : s.average >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")}>{Math.round(s.average)}%</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{s.title || "Untitled"}</span>
                          <span className="block text-xs text-slate-500">{[s.className, s.period && `P${s.period}`].filter(Boolean).join(" · ")}{s.className ? " · " : ""}{s.papers} paper{s.papers === 1 ? "" : "s"} · {new Date(s.date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="font-semibold text-slate-900">Your classes <span className="font-normal text-slate-500">{data.year}</span></h2>
                <Link href="/teacher/classes" className={actionButton}><Users />Manage classes</Link>
              </div>
              {data.classes.length === 0 ? (
                <Link href="/teacher/classes" className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-blue-50">
                  <Plus className="h-4 w-4 text-blue-700" />Add your classes (import a CSV or Google Classroom) so names match automatically.
                </Link>
              ) : (
                <ul className="space-y-1.5">
                  {data.classes.map((c) => (
                    <li key={c.id}>
                      <Link href={`/teacher/classes/${c.id}`} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-xs font-bold text-blue-700">{c.period ? `P${c.period}` : <Users className="h-4 w-4" />}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-slate-900">{c.name}</span>
                          <span className="block text-xs text-slate-500">{c.students} student{c.students === 1 ? "" : "s"}</span>
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}
      </main>
    </div>
  )
}
