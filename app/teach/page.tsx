"use client"

// Teacher home (2026-10-13): teachers land here from "/" (students keep the
// guide maker). One job first: grade a class. Then scans waiting in the
// scanner inbox, recent graded sets and this year's classes. Making a study
// guide stays one click away.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BookOpen, Check, CheckCheck, ChevronRight, ClipboardCheck, EyeOff, FileCheck, Inbox, ListChecks, PencilLine, Plus, ScanSearch, TrendingUp, Undo2, Users } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { actionButton } from "@/components/grading/grading-ui"
import { TeacherVerificationCard } from "@/components/teacher/verification-card"
import { Skeleton } from "@/components/ui/skeleton"
import { dueLabel } from "@/lib/student/classwork-rules"
import { HOME_RULES, type Attention, type HomePractice } from "@/lib/teacher/home"

interface HomeData {
  firstName: string | null
  year: string
  recent: Array<{ batchId: string; title: string | null; className: string | null; period: string | null; classId: string | null; papers: number; average: number; date: string; released: boolean; toMark?: number; toCheck?: number }>
  attention: { items: Attention[]; more: number }
  practice: HomePractice[]
  practiceOpen: number
  practiceTotal: number
  week: { papers: number; sets: number }
  classes: Array<{ id: string; name: string; period: string | null; students: number }>
  scansWaiting: number
}

// One look per kind of thing waiting: icon and tint (the row itself is the link).
const ATTENTION_LOOK: Record<Attention["kind"], { icon: typeof Inbox; tile: string }> = {
  scans: { icon: Inbox, tile: "bg-amber-100 text-amber-800" },
  mark: { icon: PencilLine, tile: "bg-blue-100 text-blue-800" },
  check: { icon: ScanSearch, tile: "bg-amber-100 text-amber-800" },
  release: { icon: EyeOff, tile: "bg-slate-100 text-slate-700" },
  practice: { icon: ListChecks, tile: "bg-violet-100 text-violet-800" },
}

// Items the teacher ticked off, kept in this browser. The key carries the item's
// wording, so a set comes back when something about it changes (more flags, more papers to mark).
const DONE_KEY = "cs:teach:done"
const doneId = (item: Attention) => `${item.key}|${item.detail}`
function readDone(): string[] {
  try { const list = JSON.parse(localStorage.getItem(DONE_KEY) || "[]"); return Array.isArray(list) ? list : [] } catch { return [] }
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

  const [done, setDone] = useState<string[]>([])
  const [undo, setUndo] = useState<string[] | null>(null)
  useEffect(() => { setDone(readDone()) }, [])
  const tickOff = (ids: string[]) => {
    const next = [...new Set([...done, ...ids])].slice(-200)
    setDone(next)
    setUndo(ids)
    try { localStorage.setItem(DONE_KEY, JSON.stringify(next)) } catch {}
  }
  const bringBack = () => {
    const next = done.filter((d) => !undo?.includes(d))
    setDone(next)
    setUndo(null)
    try { localStorage.setItem(DONE_KEY, JSON.stringify(next)) } catch {}
  }
  const waiting = (data?.attention.items ?? []).filter((item) => !done.includes(doneId(item)))
  const waitingShown = waiting.slice(0, HOME_RULES.max)

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
          <p className="mt-2 text-lg text-blue-50">
            {data && data.week.papers > 0
              ? <>This week: <strong className="font-semibold text-white">{data.week.papers} paper{data.week.papers === 1 ? "" : "s"}</strong> graded{data.week.sets > 1 ? ` across ${data.week.sets} class sets` : ""}.</>
              : "What are we doing today?"}
          </p>
        </div>
      </section>

      <main className="container relative mx-auto -mt-28 max-w-5xl space-y-6 px-4 pb-20">
        {/* The main jobs */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link href="/grade-exam/batch" className="group relative overflow-hidden rounded-3xl bg-white p-6 shadow-2xl shadow-blue-900/15 ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:ring-blue-300 md:col-span-2">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-700 to-cyan-500 text-white"><Users className="h-6 w-6" /></span>
            <h2 className={cn(fontDisplay, "mt-4 text-2xl font-semibold text-slate-900")}>Grade a class</h2>
            <p className="mt-1 max-w-md text-slate-600">Drop in the whole stack (or scan it on the copier). We sort it into students, you check it, and every paper is marked against your answer key.</p>
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

        {/* Classes sit right under the main jobs: the most clicked part of the page. */}
        {data && (
          <section aria-labelledby="classes-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <h2 id="classes-heading" className="font-semibold text-slate-900">Your classes <span className="ml-1 text-sm font-normal text-slate-500">{data.year}</span></h2>
              <div className="flex flex-wrap gap-2">
                <Link href="/teacher/progress" className={actionButton}><TrendingUp /><span className="sm:hidden">Progress</span><span className="hidden sm:inline">How they&apos;re doing</span></Link>
                <Link href="/teacher/classes" className={actionButton}><Users /><span className="sm:hidden">Manage</span><span className="hidden sm:inline">Manage classes</span></Link>
              </div>
            </div>
            {data.classes.length === 0 ? (
              <Link href="/teacher/classes" className="flex items-center gap-2 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700 hover:bg-blue-50">
                <Plus className="h-4 w-4 shrink-0 text-blue-700" />Add your classes (import a CSV or Google Classroom) so names match automatically.
              </Link>
            ) : (
              <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {data.classes.map((c) => (
                  <li key={c.id}>
                    <Link href={`/teacher/classes/${c.id}`} className="group flex items-center gap-3 rounded-2xl p-3 ring-1 ring-inset ring-slate-200 transition hover:bg-blue-50/50 hover:ring-blue-300">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-sm font-bold text-blue-700 group-hover:bg-white">{c.period ? `P${c.period}` : <Users className="h-5 w-5" />}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{c.name}</span>
                        <span className="block text-sm text-slate-500">{c.students} student{c.students === 1 ? "" : "s"}</span>
                      </span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {data && waitingShown.length === 0 && (
          <section role="status" className="animate-fade-up flex flex-col gap-3 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white"><Check className="h-6 w-6" /></span>
              <div className="min-w-0">
                <p className="font-semibold text-emerald-950">Nothing waiting on you</p>
                <p className="text-sm text-emerald-900">{undo ? `You ticked off ${undo.length === 1 ? "the last item" : `${undo.length} items`}. Anything that changes shows up here again.` : "Scans, papers to mark, answers to check and sets to release show up here."}</p>
              </div>
            </div>
            {undo && <button type="button" onClick={bringBack} className={cn(actionButton, "w-full sm:w-auto")}><Undo2 />Bring {undo.length === 1 ? "it" : "them"} back</button>}
          </section>
        )}

        {waitingShown.length > 0 && (
          <section aria-labelledby="waiting-heading" className="animate-fade-up rounded-3xl border border-slate-200 bg-white p-2 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 px-3 pb-1 pt-2">
              <h2 id="waiting-heading" className="flex items-center gap-2 font-semibold text-slate-900">
                Waiting on you
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-xs font-bold text-white">{waiting.length}</span>
              </h2>
              {waiting.length > 1 && <button type="button" className={actionButton} onClick={() => tickOff(waiting.map(doneId))}><CheckCheck />Tick off all</button>}
            </div>
            <ul>
              {waitingShown.map((item) => {
                const look = ATTENTION_LOOK[item.kind]
                return (
                  <li key={item.key} className="flex items-center gap-1">
                    <Link href={item.href} className="group flex min-w-0 flex-1 items-center gap-3 rounded-2xl p-3 transition hover:bg-slate-50">
                      <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl", look.tile)}><look.icon className="h-5 w-5" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">{item.title}</span>
                        <span className="block text-sm text-slate-600">{item.detail}</span>
                      </span>
                      <span className="hidden shrink-0 items-center gap-1 text-sm font-semibold text-blue-700 sm:inline-flex">{item.action}<ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                    </Link>
                    <button type="button" onClick={() => tickOff([doneId(item)])} aria-label={`Tick off: ${item.title}`} title="Tick off: I've seen this" className="mr-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 ring-1 ring-inset ring-slate-300 transition hover:bg-emerald-50 hover:text-emerald-700 hover:ring-emerald-300">
                      <Check className="h-5 w-5" />
                    </button>
                  </li>
                )
              })}
            </ul>
            {waiting.length > waitingShown.length && <p className="px-3 pb-2 pt-1 text-sm text-slate-500">And {waiting.length - waitingShown.length} more after these.</p>}
            {undo && (
              <p role="status" className="mx-1 mb-1 mt-1 flex items-center justify-between gap-3 rounded-2xl bg-slate-50 py-1.5 pl-3 pr-1.5 text-sm text-slate-600">
                <span>{undo.length === 1 ? "1 item" : `${undo.length} items`} ticked off.</span>
                <button type="button" onClick={bringBack} className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 font-semibold text-blue-700 hover:bg-blue-50"><Undo2 className="h-4 w-4" />Undo</button>
              </p>
            )}
          </section>
        )}

        {!data ? (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2" role="status" aria-label="Loading your classes and recent sets">
            {[4, 3].map((rows, i) => (
              <div key={i} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <Skeleton className="mb-5 h-5 w-36 rounded-full" />
                <div className="space-y-4">
                  {Array.from({ length: rows }, (_, r) => (
                    <div key={r} className="flex items-center gap-3">
                      <Skeleton className="h-11 w-11 shrink-0 rounded-xl" />
                      <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3 rounded-full" /><Skeleton className="h-3 w-1/3 rounded-full" /></div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={cn("grid grid-cols-1 items-start gap-6", data.practiceTotal > 0 && "lg:grid-cols-2")}>
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
                        <span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold", s.toMark ? "bg-amber-50 text-amber-800" : s.average >= 80 ? "bg-emerald-50 text-emerald-700" : s.average >= 65 ? "bg-blue-50 text-blue-700" : s.average >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")}>{s.toMark ? <PencilLine className="h-5 w-5" aria-label="Still marking" /> : `${Math.round(s.average)}%`}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{s.title || "Untitled"}</span>
                          <span className="block text-xs text-slate-500 lg:truncate">{[s.className, s.period && `P${s.period}`].filter(Boolean).join(" · ")}{s.className ? " · " : ""}{s.papers} paper{s.papers === 1 ? "" : "s"}{s.toMark ? ` · ${s.toMark} to mark` : ""} · {new Date(s.date).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
                        </span>
                        {!s.toMark && s.classId && (
                          <span className={cn("hidden shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold sm:inline", s.released ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-600")}>{s.released ? "Released" : "Not released"}</span>
                        )}
                        <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-blue-600" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {data.practiceTotal > 0 && (
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h2 className="font-semibold text-slate-900">Assigned practice{data.practiceOpen > data.practice.length && <span className="ml-2 text-sm font-normal text-slate-600">{data.practice.length} of {data.practiceOpen} open</span>}</h2>
                  <Link href="/teacher/practice" className={actionButton}><ListChecks />All practice</Link>
                </div>
                {data.practice.length === 0 && (
                  <div className="rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-600">
                    <ListChecks className="mx-auto mb-2 h-6 w-6 text-violet-700" />
                    Nothing is open right now. Everything you assigned before is under All practice.
                  </div>
                )}
                <ul className="divide-y divide-slate-100">
                  {data.practice.map((p) => {
                    const pct = Math.round((p.done / Math.max(1, p.assigned)) * 100)
                    return (
                      <li key={p.id}>
                        <Link href={`/teacher/practice/${p.id}`} className="group flex items-center gap-3 py-3">
                          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700"><ListChecks className="h-5 w-5" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{p.title}</span>
                            <span className="block text-xs text-slate-500 lg:truncate">{[dueLabel(p.dueAt), p.className, p.period && `P${p.period}`].filter(Boolean).join(" · ")}<span className="sm:hidden"> · {p.done} of {p.assigned} done</span></span>
                          </span>
                          <span className="hidden w-28 shrink-0 text-right sm:block">
                            <span className="block text-xs font-medium tabular-nums text-slate-700">{p.done} of {p.assigned} done</span>
                            <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className={cn("block h-full rounded-full", pct === 100 ? "bg-emerald-500" : "bg-violet-500")} style={{ width: `${pct}%` }} /></span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              </section>
            )}

          </div>
        )}
      </main>
    </div>
  )
}
