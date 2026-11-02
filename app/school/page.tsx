"use client"

// School overview (2026-10-20, migration 064) for a principal or department
// head: how the school's teachers use Casanova Study. Counts per teacher only,
// never student names. Admins are set with scripts/teachers.ts.
//
// 2026-11-01: the server sends the raw activity (ids and dates), and this page
// recomputes the numbers for the range the administrator picks (school year /
// 12 weeks / 30 days), compares with the period before, charts the weeks as
// stacked bars or lines with each series switchable, breaks papers down by
// course, and gives a sortable teacher table with an expandable row per
// teacher and a CSV download.

import { useEffect, useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, BadgeCheck, BarChart3, ChevronDown, ChevronUp, ClipboardCheck, Download, FileCheck, LineChart, Loader2, NotebookPen, School, Target, Users } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { actionButton, selectBox } from "@/components/grading/grading-ui"
import { RECENT_DAYS, WEEKS, schoolOverview, weeksBetween, type SchoolActivity, type SchoolOverview, type SchoolWeek, type TeacherStats } from "@/lib/school/overview"
import { AGREEMENT_MIN_MARKS, enoughMarks, share, type Agreement } from "@/lib/grading/agreement"

interface Data extends SchoolOverview {
  school: { domain: string; schoolName: string | null }
  schools: Array<{ domain: string; schoolName: string | null }>
  year: string
  since: string
  agreement: { overall: Agreement; byTeacher: Record<string, Agreement> }
  activity: SchoolActivity
}

export default function SchoolPage() {
  return (
    <AuthGate>
      <SchoolOverviewPage />
    </AuthGate>
  )
}

const DAY = 86400000
const n = (x: number) => x.toLocaleString()
const pct = (a: number, b: number) => (b ? `${Math.round((a / b) * 100)}%` : "–")
const shortDate = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString([], { month: "short", day: "numeric" })

function ago(iso: string | null): string {
  if (!iso) return "Not yet"
  const days = Math.floor((Date.now() - Date.parse(iso)) / DAY)
  if (days <= 0) return "Today"
  if (days === 1) return "Yesterday"
  if (days < 7) return `${days} days ago`
  if (days < 60) return `${Math.floor(days / 7)} week${days < 14 ? "" : "s"} ago`
  return shortDate(iso)
}

type RangeKey = "year" | "12w" | "30d"
const RANGES: Array<{ key: RangeKey; label: string; short: string }> = [
  { key: "year", label: "This school year", short: "Year" },
  { key: "12w", label: "Last 12 weeks", short: "12 weeks" },
  { key: "30d", label: "Last 30 days", short: "30 days" },
]

/** The window a range stands for, and the equal window before it (for "vs the previous period"). */
function windowFor(range: RangeKey, since: string, now: number) {
  if (range === "year") {
    const from = Date.parse(since)
    return { from, weeks: Math.min(53, weeksBetween(from, now)), previous: null as { from: number; to: number } | null, periodLabel: "this school year" }
  }
  const span = range === "12w" ? 12 * 7 * DAY : 30 * DAY
  const from = now - span
  return { from, weeks: range === "12w" ? WEEKS : 5, previous: { from: from - span, to: from }, periodLabel: range === "12w" ? "the last 12 weeks" : "the last 30 days" }
}

function SchoolOverviewPage() {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")
  const [domain, setDomain] = useState<string | null>(null)
  const [range, setRange] = useState<RangeKey>("year")
  const [now] = useState(() => Date.now())

  useEffect(() => {
    void (async () => {
      setData(null)
      const res = await authFetch(`/api/school/overview${domain ? `?domain=${encodeURIComponent(domain)}` : ""}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (res.ok) setData(json)
      else setError(json.error || "Couldn't load the school overview.")
    })()
  }, [domain])

  const win = useMemo(() => (data ? windowFor(range, data.since, now) : null), [data, range, now])
  const view = useMemo(() => (data && win ? schoolOverview({ ...data.activity, now, from: win.from, weeks: win.weeks }) : null), [data, win, now])
  const previous = useMemo(() => (data && win?.previous ? schoolOverview({ ...data.activity, now, from: win.previous.from, to: win.previous.to, weeks: 1 }) : null), [data, win, now])

  const name = data?.school.schoolName || data?.school.domain || "Your school"
  // Teachers with any activity inside the range (for the year: in the last 30 days, as before).
  const activeNow = view ? (range === "year" ? view.totals.activeTeachers : view.teachers.filter((t) => t.papers + t.guides + t.practiceAssigned > 0).length) : 0
  const activeBefore = previous ? previous.teachers.filter((t) => t.papers + t.guides + t.practiceAssigned > 0).length : null

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-36 pt-14 text-white">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-32 right-[8%] h-96 w-96 rounded-full bg-cyan-300/30 blur-3xl" />
          <div className="absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        </div>
        <div className="container relative mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-4 px-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-100">School overview{data ? ` · ${data.year}` : ""}</p>
            <h1 className={cn(fontDisplay, "mt-2 text-4xl font-semibold tracking-tight sm:text-5xl")}>{name}</h1>
            <p className="mt-2 max-w-2xl text-blue-50">How your teachers are using Casanova Study. Teacher totals only; student names stay with their teachers.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {data && data.schools.length > 1 && (
              <select value={data.school.domain} onChange={(e) => setDomain(e.target.value)} aria-label="School" className={cn(selectBox, "w-64 text-slate-800")}>
                {data.schools.map((s) => <option key={s.domain} value={s.domain}>{s.schoolName || s.domain}</option>)}
              </select>
            )}
            <div role="group" aria-label="Time range" className="inline-flex rounded-xl bg-white/15 p-1 ring-1 ring-inset ring-white/30">
              {RANGES.map((r) => (
                <button key={r.key} type="button" onClick={() => setRange(r.key)} aria-pressed={range === r.key}
                  className={cn("h-9 rounded-lg px-3 text-sm font-semibold transition-colors", range === r.key ? "bg-white text-blue-800 shadow-sm" : "text-white hover:bg-white/15")}>
                  <span className="hidden sm:inline">{r.label}</span><span className="sm:hidden">{r.short}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <main className="container relative mx-auto -mt-24 max-w-6xl space-y-6 px-4 pb-20">
        {error ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl">
            <School className="mx-auto h-8 w-8 text-blue-600" />
            <p className="mt-3 font-semibold text-slate-900">{error}</p>
            <p className="mt-1 text-sm text-slate-600">School overviews are set up for principals and department heads. Email hello@casanovastudy.com to add one for your school.</p>
          </div>
        ) : !data || !view || !win ? (
          <div className="flex items-center justify-center gap-2 rounded-3xl border border-slate-200 bg-white p-10 text-slate-600 shadow-xl"><Loader2 className="h-5 w-5 animate-spin" />Loading…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Stat icon={Users} label="Teachers using it" value={`${activeNow} of ${view.totals.teachers}`}
                note={range === "year" ? `active in the last ${RECENT_DAYS} days` : `with activity in ${win.periodLabel}`}
                delta={activeBefore === null ? null : activeNow - activeBefore} deltaWhat="teachers" />
              <Stat icon={FileCheck} label="Papers graded" value={n(view.totals.papers)} note={`${n(view.totals.sets)} class set${view.totals.sets === 1 ? "" : "s"} in ${win.periodLabel}`}
                delta={previous ? view.totals.papers - previous.totals.papers : null} deltaWhat="papers" />
              <Stat icon={Target} label="Practice assigned" value={n(view.totals.practiceAssigned)} note={view.totals.practiceStudents ? `${pct(view.totals.practiceFinished, view.totals.practiceStudents)} of students finished` : `none in ${win.periodLabel}`}
                delta={previous ? view.totals.practiceAssigned - previous.totals.practiceAssigned : null} deltaWhat="assignments" />
              <Stat icon={ClipboardCheck} label="Students on class lists" value={n(view.totals.students)} note={`${n(view.totals.classes)} class${view.totals.classes === 1 ? "" : "es"} this school year`} delta={null} deltaWhat="" />
            </div>

            <WeeklyChart weeks={view.weeks} title={range === "year" ? `Week by week since ${shortDate(data.since)}` : `Week by week, ${win.periodLabel}`} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
              <div className="lg:col-span-3"><CoursesCard courses={view.courses} periodLabel={win.periodLabel} /></div>
              <div className="lg:col-span-2"><AgreementCard a={data.agreement.overall} /></div>
            </div>

            <TeacherTable teachers={view.teachers} agreement={data.agreement.byTeacher} weeks={view.weeks} domain={data.school.domain} range={range} periodLabel={win.periodLabel} />
          </>
        )}
      </main>
    </div>
  )
}

function Stat({ icon: Icon, label, value, note, delta, deltaWhat }: { icon: typeof Users; label: string; value: string; note: string; delta: number | null; deltaWhat: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-900/5">
      <div className="flex items-start justify-between gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><Icon className="h-5 w-5" /></span>
        {delta !== null && (
          <span className={cn("inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums", delta > 0 ? "bg-emerald-50 text-emerald-800" : delta < 0 ? "bg-amber-50 text-amber-800" : "bg-slate-100 text-slate-600")} title={`Compared with the period before: ${delta > 0 ? "+" : ""}${n(delta)} ${deltaWhat}`}>
            {delta > 0 ? <ArrowUp className="h-3 w-3" /> : delta < 0 ? <ArrowDown className="h-3 w-3" /> : null}{delta === 0 ? "same" : n(Math.abs(delta))}
            <span className="sr-only"> {deltaWhat} compared with the period before</span>
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-slate-600">{label}</p>
      <p className={cn(fontDisplay, "text-3xl font-semibold text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-500">{note}</p>
    </div>
  )
}

/** How often teachers kept the AI's marks on reports they checked. */
function AgreementCard({ a }: { a: Agreement }) {
  const kept = share(a.questionsKept, a.questions)
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><BadgeCheck className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-slate-900">How often teachers keep the AI&apos;s marks</h2>
          {!a.questions ? (
            <p className="mt-1 text-sm text-slate-600">Shows once teachers check reports graded from October 20, 2026 on. A report counts as checked when the teacher edits it or opens Edit and presses Done.</p>
          ) : (
            <>
              <p className="mt-1 text-sm text-slate-600">On {n(a.papers)} report{a.papers === 1 ? "" : "s"} teachers checked ({n(a.questions)} question marks), whole school year.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                <Figure value={`${kept}%`} label="question marks kept exactly" />
                <Figure value={`${share(a.questionsWithin1, a.questions)}%`} label="within 1 mark of the teacher" />
                <Figure value={`${a.meanTotalShift.toFixed(1)} pts`} label={`average change to a paper's score (${share(a.papersUnchanged, a.papers)}% not changed at all)`} />
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  )
}

function Figure({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <p className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>{value}</p>
      <p className="mt-0.5 text-xs text-slate-600">{label}</p>
    </div>
  )
}

const COURSES_SHOWN = 6

/** Papers graded by course: the subjects where grading is happening, across teachers. */
function CoursesCard({ courses, periodLabel }: { courses: SchoolOverview["courses"]; periodLabel: string }) {
  const [all, setAll] = useState(false)
  const shown = all ? courses : courses.slice(0, COURSES_SHOWN)
  const max = Math.max(1, ...courses.map((c) => c.papers))
  return (
    <section className="h-full rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <h2 className="font-semibold text-slate-900">Papers graded by course</h2>
        <p className="text-sm text-slate-500">{courses.length ? `${courses.length} course${courses.length === 1 ? "" : "s"} in ${periodLabel}` : periodLabel}</p>
      </div>
      {courses.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-600">No papers graded in {periodLabel}.</p>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th scope="col" className="px-5 py-2.5">Course</th>
                <th scope="col" className="px-3 py-2.5 text-right">Papers</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell">Sets</th>
                <th scope="col" className="hidden px-3 py-2.5 text-right sm:table-cell">Teachers</th>
                <th scope="col" className="px-5 py-2.5 text-right">Last graded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {shown.map((c) => (
                <tr key={c.course}>
                  <td className="px-5 py-2.5">
                    <span className="block truncate font-semibold text-slate-900">{c.course}</span>
                    <span className="mt-1 block h-1.5 w-full max-w-[14rem] overflow-hidden rounded-full bg-slate-100"><span className="block h-full rounded-full bg-blue-600" style={{ width: `${Math.max(3, (c.papers / max) * 100)}%` }} /></span>
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{n(c.papers)}</td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{n(c.sets)}</td>
                  <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{n(c.teachers)}</td>
                  <td className="whitespace-nowrap px-5 py-2.5 text-right text-slate-600">{ago(c.lastGraded)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {courses.length > COURSES_SHOWN && (
            <div className="border-t border-slate-100 px-5 py-3">
              <button type="button" onClick={() => setAll((v) => !v)} className="text-sm font-semibold text-blue-700 hover:underline">{all ? "Show fewer" : `Show all ${courses.length} courses`}</button>
            </div>
          )}
        </>
      )}
    </section>
  )
}

type Metric = "papers" | "practice" | "guides"
const METRICS: Array<{ key: Metric; label: string; dot: string; stroke: string }> = [
  { key: "papers", label: "Papers graded", dot: "bg-blue-600", stroke: "#2563eb" },
  { key: "practice", label: "Practice assigned", dot: "bg-orange-600", stroke: "#ea580c" },
  { key: "guides", label: "Guides made", dot: "bg-teal-600", stroke: "#0d9488" },
]

/** Weekly activity as stacked bars or lines; each series can be switched off (click its legend chip). */
function WeeklyChart({ weeks, title }: { weeks: SchoolWeek[]; title: string }) {
  const [mode, setMode] = useState<"bars" | "lines">("bars")
  const [hidden, setHidden] = useState<Set<Metric>>(new Set())
  const shown = METRICS.filter((m) => !hidden.has(m.key))
  const sumOf = (w: SchoolWeek) => shown.reduce((s, m) => s + w[m.key], 0)
  const total = weeks.reduce((s, w) => s + sumOf(w), 0)
  const max = Math.max(1, ...weeks.map((w) => (mode === "bars" ? sumOf(w) : Math.max(0, ...shown.map((m) => w[m.key])))))
  const toggle = (key: Metric) => setHidden((prev) => {
    const next = new Set(prev)
    if (next.has(key)) next.delete(key)
    else if (next.size < METRICS.length - 1) next.add(key)
    return next
  })
  const label = weeks.map((w) => `week of ${w.start}: ${METRICS.map((m) => `${w[m.key]} ${m.label.toLowerCase()}`).join(", ")}`).join("; ")
  const dense = weeks.length > 16

  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <div className="flex flex-wrap items-center gap-2">
          {METRICS.map((m) => (
            <button key={m.key} type="button" onClick={() => toggle(m.key)} aria-pressed={!hidden.has(m.key)}
              className={cn("inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors", hidden.has(m.key) ? "border-slate-200 text-slate-500 line-through" : "border-slate-300 bg-white text-slate-700")}>
              <span className={cn("h-2.5 w-2.5 rounded-full", m.dot, hidden.has(m.key) && "opacity-30")} />{m.label}
            </button>
          ))}
          <div role="group" aria-label="Chart type" className="ml-1 inline-flex rounded-lg bg-slate-100 p-0.5">
            <button type="button" onClick={() => setMode("bars")} aria-pressed={mode === "bars"} aria-label="Stacked bars" title="Stacked bars" className={cn("flex h-7 w-8 items-center justify-center rounded-md", mode === "bars" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}><BarChart3 className="h-4 w-4" /></button>
            <button type="button" onClick={() => setMode("lines")} aria-pressed={mode === "lines"} aria-label="Lines" title="Lines" className={cn("flex h-7 w-8 items-center justify-center rounded-md", mode === "lines" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600")}><LineChart className="h-4 w-4" /></button>
          </div>
        </div>
      </div>
      {total === 0 ? (
        <p className="mt-6 rounded-2xl bg-slate-50 p-6 text-center text-sm text-slate-600"><NotebookPen className="mx-auto mb-2 h-5 w-5 text-blue-600" />No activity in these weeks yet.</p>
      ) : mode === "bars" ? (
        <div className="mt-5 flex h-48 items-end gap-1 sm:gap-2" role="img" aria-label={`Activity by week: ${label}`}>
          {weeks.map((w, i) => {
            const sum = sumOf(w)
            return (
              <div key={w.start} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`Week of ${shortDate(w.start)}: ${METRICS.map((m) => `${w[m.key]} ${m.label.toLowerCase()}`).join(", ")}`}>
                <span className={cn("text-xs font-semibold tabular-nums text-slate-600", dense && "hidden lg:block")}>{sum || ""}</span>
                <div className="flex w-full max-w-10 flex-col-reverse overflow-hidden rounded-lg bg-slate-100" style={{ height: `${Math.max(4, (sum / max) * 80)}%` }}>
                  {shown.map((m) => <div key={m.key} className={m.dot} style={{ height: `${sum ? (w[m.key] / sum) * 100 : 0}%` }} />)}
                </div>
                <span className={cn("text-[0.7rem] text-slate-500", dense && i % 2 === 1 && "invisible sm:visible")}>{shortDate(w.start)}</span>
              </div>
            )
          })}
        </div>
      ) : (
        <LinesChart weeks={weeks} shown={shown} max={max} label={label} dense={dense} />
      )}
    </section>
  )
}

function LinesChart({ weeks, shown, max, label, dense }: { weeks: SchoolWeek[]; shown: typeof METRICS; max: number; label: string; dense: boolean }) {
  const W = 1000, H = 200, pad = 8
  const x = (i: number) => (weeks.length === 1 ? W / 2 : pad + (i / (weeks.length - 1)) * (W - 2 * pad))
  const y = (v: number) => H - pad - (v / max) * (H - 2 * pad)
  const grid = [0.25, 0.5, 0.75, 1]
  return (
    <div className="mt-5">
      <div className="relative h-48" role="img" aria-label={`Activity by week: ${label}`}>
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
          {grid.map((g) => <line key={g} x1={0} x2={W} y1={y(max * g)} y2={y(max * g)} stroke="#e2e8f0" strokeWidth={1} vectorEffect="non-scaling-stroke" />)}
          {shown.map((m) => (
            <polyline key={m.key} fill="none" stroke={m.stroke} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke"
              points={weeks.map((w, i) => `${x(i)},${y(w[m.key])}`).join(" ")} />
          ))}
        </svg>
        <div className="absolute inset-0 flex">
          {weeks.map((w) => (
            <div key={w.start} className="flex-1" title={`Week of ${shortDate(w.start)}: ${METRICS.map((m) => `${w[m.key]} ${m.label.toLowerCase()}`).join(", ")}`} />
          ))}
        </div>
        <span className="absolute right-0 top-0 -translate-y-1/2 rounded bg-white px-1 text-[0.7rem] tabular-nums text-slate-500">{n(max)}</span>
      </div>
      <div className="mt-1.5 flex gap-1 sm:gap-2">
        {weeks.map((w, i) => <span key={w.start} className={cn("flex-1 text-center text-[0.7rem] text-slate-500", dense && i % 2 === 1 && "invisible sm:visible")}>{shortDate(w.start)}</span>)}
      </div>
    </div>
  )
}

type SortKey = "default" | "name" | "papers" | "papersRecent" | "sets" | "students" | "practiceAssigned" | "finished" | "guides" | "kept" | "lastActive"
interface Column { key: SortKey; label: string; title?: string; align?: "right" }

const finishedShare = (t: TeacherStats) => (t.practiceStudents ? t.practiceFinished / t.practiceStudents : -1)
const keptShare = (a?: Agreement) => (enoughMarks(a) ? a.questionsKept / a.questions : -1)

function sortTeachers(teachers: TeacherStats[], agreement: Record<string, Agreement>, key: SortKey, dir: 1 | -1): TeacherStats[] {
  if (key === "default") return teachers
  const value = (t: TeacherStats): number | string => {
    switch (key) {
      case "name": return t.name.toLowerCase()
      case "finished": return finishedShare(t)
      case "kept": return keptShare(agreement[t.id])
      case "lastActive": return t.lastActive ? Date.parse(t.lastActive) : -1
      default: return t[key]
    }
  }
  return [...teachers].sort((a, b) => {
    const va = value(a), vb = value(b)
    const c = typeof va === "string" && typeof vb === "string" ? va.localeCompare(vb) : (va as number) - (vb as number)
    return c ? c * dir : a.name.localeCompare(b.name)
  })
}

/** Hover text for the kept-marks cell: shown figures say what they rest on, hidden ones say why. */
function agreementTitle(a?: Agreement): string | undefined {
  if (!a?.questions) return undefined
  const reports = `${a.papers} checked report${a.papers === 1 ? "" : "s"}, ${a.questions} marks`
  return enoughMarks(a) ? reports : `${reports}; shown from ${AGREEMENT_MIN_MARKS} marks`
}

function csvFor(teachers: TeacherStats[], agreement: Record<string, Agreement>, periodLabel: string): string {
  const cell = (v: string | number) => { const s = String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
  const head = ["Teacher", "Email", `Papers graded (${periodLabel})`, `Papers in last ${RECENT_DAYS} days`, "Class sets", "Classes", "Students on class lists", "Practice assigned", "Practice finished %", "Guides made", "AI marks kept %", "Checked reports", "Last active"]
  const rows = teachers.map((t) => {
    const a = agreement[t.id]
    return [t.name, t.email ?? "", t.papers, t.papersRecent, t.sets, t.classes, t.students, t.practiceAssigned, t.practiceStudents ? Math.round((t.practiceFinished / t.practiceStudents) * 100) : "", t.guides, enoughMarks(a) ? share(a.questionsKept, a.questions) ?? "" : "", a?.papers ?? 0, t.lastActive ? t.lastActive.slice(0, 10) : ""]
  })
  return [head, ...rows].map((r) => r.map(cell).join(",")).join("\n")
}

function TeacherTable({ teachers, agreement, weeks, domain, range, periodLabel }: { teachers: TeacherStats[]; agreement: Record<string, Agreement>; weeks: SchoolWeek[]; domain: string; range: RangeKey; periodLabel: string }) {
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "default", dir: -1 })
  const [open, setOpen] = useState<string | null>(null)
  const sorted = useMemo(() => sortTeachers(teachers, agreement, sort.key, sort.dir), [teachers, agreement, sort])

  const columns: Column[] = [
    { key: "name", label: "Teacher" },
    { key: "papers", label: "Papers", title: "Papers graded", align: "right" },
    { key: "papersRecent", label: `${RECENT_DAYS} days`, title: `Papers graded in the last ${RECENT_DAYS} days`, align: "right" },
    { key: "sets", label: "Sets", title: "Class sets graded", align: "right" },
    { key: "students", label: "Classes", title: "Classes this school year, with students on their lists", align: "right" },
    { key: "practiceAssigned", label: "Practice", title: "Practice assignments given", align: "right" },
    { key: "finished", label: "Finished", title: "Share of assigned students who finished", align: "right" },
    { key: "guides", label: "Guides", title: "Study guides made", align: "right" },
    { key: "kept", label: "AI kept", title: `Share of AI question marks the teacher kept on reports they checked (shown from ${AGREEMENT_MIN_MARKS} marks)`, align: "right" },
    { key: "lastActive", label: "Last active", align: "right" },
  ]
  const clickSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: s.dir === 1 ? -1 : 1 } : { key, dir: key === "name" ? 1 : -1 }))
  const download = () => {
    const blob = new Blob([csvFor(sorted, agreement, periodLabel)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `school-overview-${domain}-${range}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="font-semibold text-slate-900">Teachers</h2>
          <p className="text-sm text-slate-500">Approved teachers with a school email at {domain} · counts for {periodLabel} · click a heading to sort, a row for details</p>
        </div>
        {teachers.length > 0 && <button type="button" onClick={download} className={cn(actionButton, "inline-flex items-center gap-2")}><Download className="h-4 w-4" />Download CSV</button>}
      </div>
      {teachers.length === 0 ? (
        <p className="p-8 text-center text-sm text-slate-600">No verified teachers from {domain} yet. Teachers are added when they confirm their school email.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {columns.map((c) => {
                  const active = sort.key === c.key
                  return (
                    <th key={c.key} scope="col" aria-sort={active ? (sort.dir === 1 ? "ascending" : "descending") : "none"} className={cn("py-1", c.key === "name" ? "pl-3 pr-1" : "px-1", c.align === "right" && "text-right", c.key === "lastActive" && "pr-3")}>
                      <button type="button" onClick={() => clickSort(c.key)} title={c.title} className={cn("inline-flex h-9 items-center gap-1 whitespace-nowrap rounded-lg px-2 uppercase tracking-wide hover:bg-slate-100", active && "text-blue-700")}>
                        {c.label}{active && (sort.dir === 1 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}
                      </button>
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((t) => (
                <TeacherRow key={t.id} t={t} agreement={agreement[t.id]} weeks={weeks} open={open === t.id} onToggle={() => setOpen(open === t.id ? null : t.id)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function TeacherRow({ t, agreement, weeks, open, onToggle }: { t: TeacherStats; agreement?: Agreement; weeks: SchoolWeek[]; open: boolean; onToggle: () => void }) {
  const idle = !t.lastActive
  const Chevron = open ? ChevronUp : ChevronDown
  return (
    <>
      <tr className={cn("cursor-pointer hover:bg-slate-50", idle && "text-slate-500", open && "bg-blue-50/40")} onClick={onToggle}>
        <td className="px-5 py-3">
          <button type="button" aria-expanded={open} onClick={(e) => { e.stopPropagation(); onToggle() }} className="flex items-center gap-2 text-left">
            <Chevron className="h-4 w-4 shrink-0 text-slate-400" />
            <span>
              <span className="block font-semibold text-slate-900">{t.name}</span>
              {t.email && <span className="block text-xs text-slate-500">{t.email}</span>}
            </span>
          </button>
        </td>
        <td className="px-3 py-3 text-right tabular-nums">{n(t.papers)}</td>
        <td className="px-3 py-3 text-right tabular-nums">{n(t.papersRecent)}</td>
        <td className="px-3 py-3 text-right tabular-nums">{n(t.sets)}</td>
        <td className="px-3 py-3 text-right tabular-nums">{t.classes ? `${t.classes} (${n(t.students)} students)` : "0"}</td>
        <td className="px-3 py-3 text-right tabular-nums">{n(t.practiceAssigned)}</td>
        <td className="px-3 py-3 text-right tabular-nums">{t.practiceStudents ? pct(t.practiceFinished, t.practiceStudents) : "–"}</td>
        <td className="px-3 py-3 text-right tabular-nums">{n(t.guides)}</td>
        <td className="px-3 py-3 text-right tabular-nums" title={agreementTitle(agreement)}>
          {enoughMarks(agreement) ? `${share(agreement.questionsKept, agreement.questions)}%` : "–"}
        </td>
        <td className="whitespace-nowrap px-5 py-3 text-right">{ago(t.lastActive)}</td>
      </tr>
      {open && (
        <tr className="bg-blue-50/40">
          <td colSpan={10} className="px-5 pb-5 pt-1">
            <div className="grid gap-4 lg:grid-cols-3">
              <Detail title="Papers graded, week by week">
                <Sparkline weeks={weeks} values={t.weekly} />
              </Detail>
              <Detail title="In this period">
                <ul className="space-y-1 text-sm text-slate-700">
                  <li><b className="text-slate-900">{n(t.papers)}</b> papers in <b className="text-slate-900">{n(t.sets)}</b> class set{t.sets === 1 ? "" : "s"}</li>
                  <li><b className="text-slate-900">{n(t.practiceAssigned)}</b> practice assignment{t.practiceAssigned === 1 ? "" : "s"}{t.practiceStudents ? `, ${pct(t.practiceFinished, t.practiceStudents)} of ${n(t.practiceStudents)} students finished` : ""}</li>
                  <li><b className="text-slate-900">{n(t.guides)}</b> study guide{t.guides === 1 ? "" : "s"} made</li>
                  <li><b className="text-slate-900">{n(t.classes)}</b> class{t.classes === 1 ? "" : "es"} this school year, <b className="text-slate-900">{n(t.students)}</b> students on class lists</li>
                </ul>
              </Detail>
              <Detail title="AI marks they checked (school year)">
                {agreement?.questions ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    <li><b className="text-slate-900">{n(agreement.papers)}</b> report{agreement.papers === 1 ? "" : "s"} checked, <b className="text-slate-900">{n(agreement.questions)}</b> question marks</li>
                    <li><b className="text-slate-900">{share(agreement.questionsKept, agreement.questions)}%</b> kept exactly, <b className="text-slate-900">{share(agreement.questionsWithin1, agreement.questions)}%</b> within 1 mark</li>
                    <li>Average change to a paper&apos;s score <b className="text-slate-900">{agreement.meanTotalShift.toFixed(1)} pts</b>; {share(agreement.papersUnchanged, agreement.papers)}% not changed at all</li>
                    {!enoughMarks(agreement) && <li className="text-xs text-slate-500">Fewer than {AGREEMENT_MIN_MARKS} marks, so the table leaves the percentage blank.</li>}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-600">No reports checked yet. A report counts as checked when the teacher edits it or opens Edit and presses Done.</p>
                )}
              </Detail>
            </div>
          </td>
        </tr>
      )}
    </>
  )
}

function Detail({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h3>
      <div className="mt-2">{children}</div>
    </div>
  )
}

function Sparkline({ weeks, values }: { weeks: SchoolWeek[]; values: number[] }) {
  const max = Math.max(1, ...values)
  const total = values.reduce((a, b) => a + b, 0)
  if (!total) return <p className="text-sm text-slate-600">No papers graded in these weeks.</p>
  return (
    <div>
      <div className="flex h-16 items-end gap-0.5" role="img" aria-label={weeks.map((w, i) => `week of ${w.start}: ${values[i]} papers`).join("; ")}>
        {values.map((v, i) => (
          <div key={weeks[i].start} className="flex-1 rounded-sm bg-blue-600/90" style={{ height: `${Math.max(v ? 6 : 2, (v / max) * 100)}%`, opacity: v ? 1 : 0.25 }} title={`Week of ${shortDate(weeks[i].start)}: ${v} papers`} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[0.7rem] text-slate-500"><span>{shortDate(weeks[0].start)}</span><span>{shortDate(weeks[weeks.length - 1].start)}</span></div>
    </div>
  )
}
