"use client"

// Students in a class (2026-10-21): the data behind "My Classes" (assigned
// practice, released reports, their classes), the nav check, and the strip at
// the top of the guide maker so assigned work is never hard to find.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowRight, BookOpen, CalendarClock, ChevronRight, ClipboardCheck, Clock, ExternalLink, FileCheck } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { dayCount } from "@/lib/practice/assignments"
import { lateLabel } from "@/lib/grading/late"
import { dueLabel, homeStrip, type MissingTest } from "@/lib/student/classwork-rules"
import type { StudentClass, StudentPractice, StudentReportRow, StudentSharedGuide } from "@/lib/student/classwork"

export interface Classwork { classes: StudentClass[]; assignments: StudentPractice[]; reports: StudentReportRow[]; missingTests: MissingTest[]; shared?: StudentSharedGuide[] }

const hasAny = (d: Classwork) => d.classes.length > 0 || d.assignments.length > 0 || d.reports.length > 0 || (d.missingTests?.length ?? 0) > 0 || (d.shared?.length ?? 0) > 0
const flagKey = (userId: string) => `cs:classwork:${userId}`

/** Forget the cached "in a class" answer (after joining a class). */
export function forgetClassworkFlag(userId: string) {
  try { sessionStorage.removeItem(flagKey(userId)) } catch {}
}

function remember(userId: string, d: Classwork) {
  try {
    sessionStorage.setItem(flagKey(userId), hasAny(d) ? "1" : "0")
  } catch {}
}

/** The student's classwork, loaded once. Null while loading; students only. */
export function useClasswork(): Classwork | null {
  const { user } = useAuth()
  const [data, setData] = useState<Classwork | null>(null)
  useEffect(() => {
    if (!user || user.user_type === "teacher") return
    let live = true
    void (async () => {
      const res = await authFetch("/api/student/classwork", { cache: "no-store" })
      if (!res.ok || !live) return
      const json = (await res.json()) as Classwork
      remember(user.id, json)
      setData(json)
    })()
    return () => { live = false }
  }, [user])
  return data
}

/** Whether to show the My Classes tab: a student with any class, assignment or report (asked once per tab session). */
export function useInClass(): boolean {
  const { user } = useAuth()
  const [show, setShow] = useState(false)
  useEffect(() => {
    if (!user || user.user_type === "teacher") { setShow(false); return }
    let cached: string | null = null
    try { cached = sessionStorage.getItem(flagKey(user.id)) } catch {}
    if (cached !== null) { setShow(cached === "1"); return }
    void (async () => {
      const res = await authFetch("/api/student/classwork", { cache: "no-store" })
      if (!res.ok) return
      const json = (await res.json()) as Classwork
      remember(user.id, json)
      setShow(hasAny(json))
    })()
  }, [user])
  return show
}

export const STATUS: Record<string, [string, string]> = {
  done: ["Done", "bg-emerald-50 text-emerald-800 ring-emerald-200"],
  late: ["Turned in late", "bg-amber-50 text-amber-900 ring-amber-200"],
  missing: ["Missing", "bg-rose-50 text-rose-800 ring-rose-200"],
  not_started: ["To do", "bg-blue-50 text-blue-800 ring-blue-200"],
}

export function statusLabel(a: StudentPractice): string {
  const [base] = STATUS[a.status] ?? STATUS.not_started
  if (!a.daysLate) return base
  return a.status === "late" ? `Turned in ${dayCount(a.daysLate)} late` : `Missing · ${dayCount(a.daysLate)} overdue`
}

export const practiceHref = (a: StudentPractice) => `/study-guide/${a.guideId}?assignment=${a.id}`

/** One assigned practice row (My Classes page). */
export function AssignmentRow({ a, className }: { a: StudentPractice; className?: string | null }) {
  const [, cls] = STATUS[a.status] ?? STATUS.not_started
  const open = a.status === "not_started" || a.status === "missing"
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

/** Top of the guide maker for students in a class: what's due next and new reports. */
export function ClassworkStrip() {
  const data = useClasswork()
  if (!data) return null
  const { next, moreOpen, openCount, newReports, newShared } = homeStrip(data.assignments, data.reports, new Date(), 2, data.missingTests ?? [], data.shared ?? [])
  if (!next.length && !newReports.length && !newShared.length) return null
  const shownReports = newReports.slice(0, 2 - next.length)
  const moreReports = newReports.length - shownReports.length
  const shownShared = newShared.slice(0, Math.max(0, 2 - next.length - shownReports.length))
  const moreShared = newShared.length - shownShared.length
  const footer = [moreOpen > 0 && `${moreOpen} more to do`, moreReports > 0 && `${moreReports} new report${moreReports === 1 ? "" : "s"}`, moreShared > 0 && `${moreShared} more from your teacher`].filter(Boolean)
  return (
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
        {next.map((item) => item.kind === "test" ? (
          <div key={item.t.batchId} className="flex items-center gap-3 rounded-2xl bg-rose-50/60 p-3.5 ring-1 ring-inset ring-rose-200">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-slate-900">{item.t.title}</span>
              <span className="text-sm font-medium text-rose-700">{testStatusText(item.t)}</span>
            </span>
            {item.t.classroomUrl && <ClassroomLink href={item.t.classroomUrl} compact />}
          </div>
        ) : (
          <Link key={item.a.id} href={practiceHref(item.a)} className={cn("group flex items-center gap-3 rounded-2xl p-3.5 ring-1 ring-inset transition", item.a.status === "missing" ? "bg-rose-50/60 ring-rose-200 hover:bg-rose-50" : "bg-blue-50/50 ring-blue-200 hover:bg-blue-50")}>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{item.a.title}</span>
              <span className={cn("flex items-center gap-1 text-sm", item.a.status === "missing" ? "font-medium text-rose-700" : "text-slate-600")}>
                <CalendarClock className="h-3.5 w-3.5" />{dueLabel(item.a.dueAt)}
              </span>
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-blue-700">Start <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
          </Link>
        ))}
        {shownReports.map((r) => (
          <Link key={r.id} href={`/grade-report/${r.id}`} className="group flex items-center gap-3 rounded-2xl bg-emerald-50/50 p-3.5 ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-50">
            <FileCheck className="h-5 w-5 shrink-0 text-emerald-700" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{r.title}</span>
              <span className="text-sm text-slate-600">New report · {Math.round(r.pct)}%</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue-700" />
          </Link>
        ))}
        {shownShared.map((g) => (
          <Link key={g.id} href={`/study-guide/${g.guideId}`} className="group flex items-center gap-3 rounded-2xl bg-blue-50/50 p-3.5 ring-1 ring-inset ring-blue-200 transition hover:bg-blue-50">
            <BookOpen className="h-5 w-5 shrink-0 text-blue-700" />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-semibold text-slate-900 group-hover:text-blue-700">{g.title}</span>
              <span className="block truncate text-sm text-slate-600">{g.note || "From your teacher"}</span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-blue-700" />
          </Link>
        ))}
      </div>
      {footer.length > 0 && <p className="mt-2 text-sm text-slate-500">{footer.join(" · ")}</p>}
    </section>
  )
}

/** A guide the teacher shared with the class (no grading), on My Classes. */
export function SharedGuideRow({ g, className }: { g: StudentSharedGuide; className?: string | null }) {
  return (
    <Link href={`/study-guide/${g.guideId}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/40">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="h-5 w-5" /></span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{g.title}</span>
        <span className="block truncate text-xs text-slate-500">{[g.format, className, g.note].filter(Boolean).join(" · ")}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
    </Link>
  )
}
