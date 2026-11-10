"use client"

// Students in a class (2026-10-21): the data behind "My Classes" (assigned
// practice, released reports, their classes), the nav check, and the strip at
// the top of the guide maker so assigned work is never hard to find.

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, BookOpen, CheckCircle2, CalendarClock, ChevronRight, ClipboardCheck, Clock, ExternalLink, FileText, Presentation } from "lucide-react"
import { openHomeWithPrefill } from "@/lib/prefill"
import { materialTitle } from "@/lib/classes/materials"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { dayCount } from "@/lib/practice/assignments"
import { lateLabel } from "@/lib/grading/late"
import { seenReports } from "@/lib/student/seen-reports"
import { dueLabel, isOpenWork, stripCards, type MissingTest } from "@/lib/student/classwork-rules"
import type { StudentClass, StudentMaterial, StudentPractice, StudentReportRow, StudentSharedGuide } from "@/lib/student/classwork"

export interface Classwork { classes: StudentClass[]; assignments: StudentPractice[]; reports: StudentReportRow[]; missingTests: MissingTest[]; shared?: StudentSharedGuide[]; materials?: StudentMaterial[]; /** Classes this request just connected them to (by their sign-in email). */ linkedNow?: string[] }

const hasAny = (d: Classwork) => d.classes.length > 0 || d.assignments.length > 0 || d.reports.length > 0 || (d.missingTests?.length ?? 0) > 0 || (d.shared?.length ?? 0) > 0 || (d.materials?.length ?? 0) > 0
const flagKey = (userId: string) => `cs:classwork:${userId}`

/** Forget the cached "in a class" answer (after joining a class). */
export function forgetClassworkFlag(userId: string) {
  try { sessionStorage.removeItem(flagKey(userId)); sessionStorage.removeItem(dataKey(userId)) } catch {}
}

// Only "in a class" is remembered for the tab: a "not yet" answer is asked again,
// since a teacher's class list can connect them at any moment.
function remember(userId: string, d: Classwork) {
  try {
    if (hasAny(d)) sessionStorage.setItem(flagKey(userId), "1")
    else sessionStorage.removeItem(flagKey(userId))
  } catch {}
  if (hasAny(d)) window.dispatchEvent(new CustomEvent("cs:classwork", { detail: userId }))
}

const dataKey = (userId: string) => `cs:classwork-data:${userId}`

// The nav check and the homepage strip both ask on the same page load: one request serves both.
let inflight: { userId: string; promise: Promise<Classwork | null> } | null = null
function fetchClasswork(userId: string): Promise<Classwork | null> {
  if (inflight?.userId === userId) return inflight.promise
  const promise = (async () => {
    try {
      const res = await authFetch("/api/student/classwork", { cache: "no-store" })
      if (!res.ok) return null
      const json = (await res.json()) as Classwork
      remember(userId, json)
      try { sessionStorage.setItem(dataKey(userId), JSON.stringify({ ...json, linkedNow: [] })) } catch {}
      return json
    } catch { return null } finally { inflight = null }
  })()
  inflight = { userId, promise }
  return promise
}

/** Runs `check` when the tab comes back into view (at most every `gapMs`). */
function useOnReturn(check: () => void, enabled: boolean, gapMs = 20_000) {
  useEffect(() => {
    if (!enabled) return
    let last = Date.now()
    const onReturn = () => {
      if (document.visibilityState !== "visible" || Date.now() - last < gapMs) return
      last = Date.now()
      check()
    }
    document.addEventListener("visibilitychange", onReturn)
    window.addEventListener("focus", onReturn)
    return () => { document.removeEventListener("visibilitychange", onReturn); window.removeEventListener("focus", onReturn) }
  }, [check, enabled, gapMs])
}

/** The student's classwork. Null while loading; students only. The last copy this tab saw shows at once, then refreshes (and again when they come back to the tab). */
export function useClasswork(skip = false): Classwork | null {
  const { user } = useAuth()
  const [data, setData] = useState<Classwork | null>(null)
  const [tick, setTick] = useState(0)
  const active = !skip && !!user && user.user_type !== "teacher"
  useEffect(() => {
    if (!active || !user) return
    if (tick === 0) {
      try {
        const cached = sessionStorage.getItem(dataKey(user.id))
        if (cached) setData(JSON.parse(cached) as Classwork)
      } catch {}
    }
    let live = true
    void fetchClasswork(user.id).then((json) => {
      if (!json || !live) return
      // Keep a "just connected" note on screen until the next real change.
      setData((prev) => ({ ...json, linkedNow: json.linkedNow?.length ? json.linkedNow : prev?.linkedNow ?? [] }))
    })
    return () => { live = false }
  }, [user, active, tick])
  const refresh = useCallback(() => setTick((t) => t + 1), [])
  useOnReturn(refresh, active)
  return data
}

/** Whether to show the My Classes tab: a student with any class, assignment or report. */
export function useInClass(): boolean {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  const [tick, setTick] = useState(0)
  const student = !!user && user.user_type !== "teacher"
  useEffect(() => {
    if (!user || !student) { setShow(false); return }
    let cached: string | null = null
    try { cached = sessionStorage.getItem(flagKey(user.id)) } catch {}
    if (cached === "1") { setShow(true); return }
    let live = true
    void fetchClasswork(user.id).then((json) => { if (json && live) setShow(hasAny(json)) })
    return () => { live = false }
  }, [user, student, tick])
  // Not in a class yet: ask again when they come back to the tab, and right away when another part of the page finds one.
  const recheck = useCallback(() => setTick((t) => t + 1), [])
  useOnReturn(recheck, student && !show)
  useEffect(() => {
    if (!user || show) return
    const onFound = (e: Event) => { if ((e as CustomEvent).detail === user.id) setShow(true) }
    window.addEventListener("cs:classwork", onFound)
    return () => window.removeEventListener("cs:classwork", onFound)
  }, [user, show])
  return show
}

export const STATUS: Record<string, [string, string]> = {
  done: ["Done", "bg-emerald-50 text-emerald-800 ring-emerald-200"],
  late: ["Turned in late", "bg-amber-50 text-amber-900 ring-amber-200"],
  missing: ["Missing", "bg-rose-50 text-rose-800 ring-rose-200"],
  not_started: ["To do", "bg-blue-50 text-blue-800 ring-blue-200"],
  incomplete: ["Sent unfinished · finish it", "bg-orange-50 text-orange-900 ring-orange-200"],
}

export function statusLabel(a: StudentPractice): string {
  const [base] = STATUS[a.status] ?? STATUS.not_started
  if (!a.daysLate || a.status === "incomplete") return base
  return a.status === "late" ? `Turned in ${dayCount(a.daysLate)} late` : `Missing · ${dayCount(a.daysLate)} overdue`
}

const FORMAT_NAME: Record<string, string> = {
  outline: "Outline", summary: "Summary", flashcards: "Flashcards", quiz: "Quiz", practice: "Practice", adaptive: "Adaptive practice",
  plan: "Study plan", cheatsheet: "Cheat sheet", timeline: "Timeline", custom: "Custom guide",
}

export const practiceHref = (a: StudentPractice) => `/study-guide/${a.guideId}?assignment=${a.id}`

/** One assigned practice row (My Classes page). */
export function AssignmentRow({ a, className }: { a: StudentPractice; className?: string | null }) {
  const [, cls] = STATUS[a.status] ?? STATUS.not_started
  const open = isOpenWork(a.status)
  return (
    <Link href={practiceHref(a)} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition hover:border-blue-300 hover:bg-blue-50/40">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">{a.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
          {className && <span>{className}</span>}
          {a.dueAt && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />{open ? dueLabel(a.dueAt) : `Due ${new Date(a.dueAt).toLocaleDateString([], { month: "short", day: "numeric" })}`}</span>}
          {a.best && <span>Best: {a.grading === "mastery" ? `${a.best.correct} of ${a.best.total} topics mastered` : `${Math.round(a.best.pct)}%`}</span>}
        </span>
      </span>
      <span className={cn("shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", cls)}>{statusLabel(a)}</span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
    </Link>
  )
}

/** One released report row (My Classes page). */
export function ReportRow({ r }: { r: StudentReportRow }) {
  const band = r.pct >= 80 ? "bg-emerald-50 text-emerald-700" : r.pct >= 65 ? "bg-blue-50 text-blue-700" : r.pct >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700"
  return (
    <Link href={`/grade-report/${r.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3.5 transition hover:border-blue-300 hover:bg-blue-50/40">
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums", band)}>{Math.round(r.pct)}%</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">{r.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
          <span>{r.marks} / {r.possible} marks{r.grade ? ` · ${r.grade}` : ""}</span>
          {r.className && <span>{r.className}</span>}
          <span>{new Date(r.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
        </span>
      </span>
      {r.daysLate != null && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-200"><Clock className="h-3 w-3" />{lateLabel(r.daysLate)}</span>}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-blue-600" />
    </Link>
  )
}

/** "Not turned in · graded Oct 19" (or Missing / Absent when the teacher marked it). */
export function testStatusText(t: MissingTest): string {
  const word = t.status === "absent" ? "Absent" : t.status === "missing" ? "Missing" : "Not turned in"
  return `${word} · graded ${new Date(t.firstGraded).toLocaleDateString([], { month: "short", day: "numeric" })}`
}

/** Opens the assignment in Google Classroom (new tab). */
function ClassroomLink({ href, compact }: { href: string; compact?: boolean }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={cn("inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-sm font-semibold text-blue-700 ring-1 ring-inset ring-blue-200 transition hover:bg-blue-50", compact && "px-2.5")}>
      {compact ? "Turn it in" : "Turn it in on Classroom"} <ExternalLink className="h-4 w-4" />
    </a>
  )
}

/** A graded test the student has no paper for (My Classes page). Links to Classroom when the set came from there. */
export function MissingTestRow({ t, className }: { t: MissingTest; className?: string | null }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50/40 p-3.5">
      <span className="min-w-0 flex-1">
        <span className="block truncate text-base font-semibold text-slate-900">{t.title}</span>
        <span className="flex flex-wrap items-center gap-x-2 text-sm text-slate-600">
          {className && <span>{className}</span>}
          <span>{t.classroomUrl ? "Your teacher has graded this and has nothing from you. Turn it in on Google Classroom." : "Your teacher has graded this and has no paper from you. Hand it in or ask them about it."}</span>
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 ring-1 ring-inset ring-rose-200">{testStatusText(t).split(" · ")[0]}</span>
      {t.classroomUrl && <ClassroomLink href={t.classroomUrl} />}
    </div>
  )
}

/** Whether this device holds an unfinished run of the guide (quiz, practice or adaptive). */
function hasSavedRun(guideId: string): boolean {
  try {
    return ["quiz", "practice", "adaptive"].some((kind) => {
      const raw = localStorage.getItem(`cs:${kind}:${guideId}`)
      if (!raw) return false
      const saved = JSON.parse(raw)
      if (kind === "adaptive") return Array.isArray(saved) ? saved.length > 0 : !!saved && Object.keys(saved).length > 0
      return !!saved?.run
    })
  } catch { return false }
}

const stripCard = "group flex min-w-0 items-center gap-3 rounded-2xl p-3.5 text-left ring-1 ring-inset transition"
const stripGo = "inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700"

/** Top of the guide maker for students in a class: what's due next, reports they haven't opened, and what the teacher added this week. */
export function ClassworkStrip({ data: given }: { data?: Classwork | null } = {}) {
  const own = useClasswork(given !== undefined)
  const data = given !== undefined ? given : own
  const router = useRouter()
  // Read after mount: both live in this browser only.
  const [seen, setSeen] = useState<string[] | null>(null)
  const [started, setStarted] = useState<Set<string>>(new Set())
  useEffect(() => {
    setSeen(seenReports())
    setStarted(new Set((data?.assignments ?? []).filter((a) => isOpenWork(a.status) && hasSavedRun(a.guideId)).map((a) => a.id)))
  }, [data])
  if (!data) return null
  const connected = <JustConnected data={data} />
  if (!seen) return connected
  const { cards, openCount, more } = stripCards({ assignments: data.assignments, reports: data.reports, tests: data.missingTests ?? [], shared: data.shared ?? [], materials: data.materials ?? [], seenReports: seen })
  if (!cards.length) return connected
  // With two or more classes, each card says which one it is from.
  const classOf = (id: string | null) => (data.classes.length > 1 && id ? data.classes.find((c) => c.id === id)?.name ?? null : null)
  const teacherOf = (id: string) => data.classes.find((c) => c.id === id)?.teacherName ?? null
  const footer = [more.open > 0 && `${more.open} more to do`, more.reports > 0 && `${more.reports} more new report${more.reports === 1 ? "" : "s"}`, more.fromTeacher > 0 && `${more.fromTeacher} more from your teacher`].filter(Boolean)
  return (
    <>
    {connected}
    <section aria-label="From your class" className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl shadow-blue-900/10 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold text-slate-900">
          <ClipboardCheck className="h-5 w-5 text-emerald-700" />
          {openCount ? `Assigned to you · ${openCount} to do` : "From your class"}
        </h2>
        <Link href="/my-class" className="inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50">
          See all in My Classes <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {cards.map((card) => {
          if (card.kind === "test") return (
            <div key={card.t.batchId} className={cn(stripCard, "bg-rose-50/60 ring-rose-200")}>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900">{card.t.title}</span>
                <span className="block truncate text-sm font-medium text-rose-700">{[testStatusText(card.t), classOf(card.t.classId)].filter(Boolean).join(" · ")}</span>
              </span>
              {card.t.classroomUrl && <ClassroomLink href={card.t.classroomUrl} compact />}
            </div>
          )
          if (card.kind === "practice") {
            const a = card.a
            const overdue = a.status === "missing"
            return (
              <Link key={a.id} href={practiceHref(a)} className={cn(stripCard, overdue ? "bg-rose-50/60 ring-rose-200 hover:bg-rose-50" : "bg-blue-50/50 ring-blue-200 hover:bg-blue-50")}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{a.title}</span>
                  <span className={cn("flex min-w-0 items-center gap-1 text-sm", overdue ? "font-medium text-rose-700" : "text-slate-600")}>
                    <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{[a.status === "incomplete" ? "Sent unfinished" : dueLabel(a.dueAt), classOf(a.classId)].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
                <span className={stripGo}>{a.status === "incomplete" ? "Finish it" : started.has(a.id) ? "Continue" : "Start"} <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
              </Link>
            )
          }
          if (card.kind === "report") return (
            <Link key={card.r.id} href={`/grade-report/${card.r.id}`} className={cn(stripCard, "bg-emerald-50/50 ring-emerald-200 hover:bg-emerald-50")}>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white text-sm font-bold tabular-nums text-emerald-800 ring-1 ring-inset ring-emerald-200">{Math.round(card.r.pct)}%</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{card.r.title}</span>
                <span className="block truncate text-sm text-slate-600">{["New report", classOf(card.r.classId)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={stripGo}>See it <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          )
          if (card.kind === "material") {
            const Icon = card.m.kind === "slides" ? Presentation : FileText
            return (
              <button key={card.m.id} type="button" onClick={() => router.push(materialPrefillHref(card.m, teacherOf(card.m.classId)))} className={cn(stripCard, "bg-orange-50/50 ring-orange-200 hover:bg-orange-50")}>
                <Icon className="h-5 w-5 shrink-0 text-orange-700" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{materialTitle(card.m.name)}</span>
                  <span className="block truncate text-sm text-slate-600">{["New from your teacher", classOf(card.m.classId)].filter(Boolean).join(" · ")}</span>
                </span>
                <span className={stripGo}>Make a guide <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
              </button>
            )
          }
          return (
            <Link key={card.g.id} href={`/study-guide/${card.g.guideId}`} className={cn(stripCard, "bg-blue-50/50 ring-blue-200 hover:bg-blue-50")}>
              <BookOpen className="h-5 w-5 shrink-0 text-blue-700" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{card.g.title}</span>
                <span className="block truncate text-sm text-slate-600">{card.g.note || ["From your teacher", classOf(card.g.classId)].filter(Boolean).join(" · ")}</span>
              </span>
              <span className={stripGo}>Open <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
            </Link>
          )
        })}
      </div>
      {footer.length > 0 && <p className="mt-2 text-sm text-slate-500">{footer.join(" · ")}</p>}
    </section>
    </>
  )
}

/** A guide the teacher shared with the class (no grading), on My Classes. */
export function SharedGuideRow({ g, className }: { g: StudentSharedGuide; className?: string | null }) {
  return (
    <Link href={`/study-guide/${g.guideId}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{g.title}</span>
        <span className="block truncate text-xs text-slate-500">{[FORMAT_NAME[g.format] ?? g.format, className, g.note].filter(Boolean).join(" · ")}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
    </Link>
  )
}

/** The homepage, filled in to build a guide from one of the class's materials (the student picks the format). */
export function materialPrefillHref(m: StudentMaterial, teacherName?: string | null): string {
  const title = materialTitle(m.name)
  return openHomeWithPrefill({
    source: "class-material",
    sourceTitle: teacherName || "your teacher",
    studyRequest: "",
    studyGuideName: title,
    format: "",
    detail: title,
    classMaterials: [{ id: m.materialId, name: m.name }],
    autoStart: false,
  })
}

/** Slides or notes the teacher put on the class, on My Classes: the whole card makes a guide from it. */
export function MaterialRow({ m, className, teacherName }: { m: StudentMaterial; className?: string | null; teacherName?: string | null }) {
  const router = useRouter()
  const Icon = m.kind === "slides" ? Presentation : FileText
  return (
    <button type="button" onClick={() => router.push(materialPrefillHref(m, teacherName))} className="group flex w-full items-center gap-3 rounded-2xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><Icon className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{materialTitle(m.name)}</span>
        <span className="block truncate text-xs text-slate-500">{[className, m.note].filter(Boolean).join(" · ") || "From your teacher"}</span>
      </span>
      <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700">
        <span className="hidden sm:inline">Make a guide from this</span><span className="sm:hidden">Make a guide</span>
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
      </span>
    </button>
  )
}

/** "You're now connected to AP Statistics (Ms. Rosario)": shown once, the visit a class list linked them by email. */
export function JustConnected({ data }: { data: Classwork }) {
  const classes = data.classes.filter((c) => data.linkedNow?.includes(c.id))
  if (!classes.length) return null
  const names = classes.map((c) => `${c.name}${c.period && !c.name.includes(c.period) ? ` (period ${c.period})` : ""}${c.teacherName ? ` with ${c.teacherName}` : ""}`)
  return (
    <div role="status" className="mb-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-emerald-950 ring-1 ring-inset ring-emerald-200">
      <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-700" />
      <p className="min-w-0 flex-1 text-sm"><span className="font-semibold">You&apos;re connected to your class.</span> {names.join(", ")}. Your teacher&apos;s assignments show up in My Classes.</p>
      <Link href="/my-class" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-emerald-700 px-3 text-sm font-semibold text-white hover:bg-emerald-800">My Classes <ArrowRight className="h-4 w-4" /></Link>
    </div>
  )
}
