"use client"

// One course this year: what to focus on, each period side by side, areas by
// period, students to watch, assigned practice, their own studying, and the
// course across past years (folded).

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ChevronDown, ChevronRight, ClipboardList, Loader2, Users } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { actionButton, actionButtonPrimary, backLink, selectBox } from "@/components/grading/grading-ui"
import { FocusList } from "@/components/teacher/progress/focus-list"
import { AreasGrid } from "@/components/teacher/progress/areas-grid"
import { cellTone, periodLabel, scoreBg, scoreTone, TrendChip } from "@/components/teacher/progress/parts"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import type { CourseProgress, TeacherProgress } from "@/lib/teacher/progress-server"
import type { StudentTrend } from "@/lib/teacher/progress"
import { compareNames, parseName } from "@/lib/grading/names"
import { useNameOrder } from "@/lib/use-name-order"
import { cn } from "@/lib/utils"

interface PastYears {
  years: Array<{ year: string; sets: number; students: number; classes: Array<{ id: string; name: string; period: string | null }> }>
  areas: Array<{ name: string; byYear: Record<string, { pct: number; sets: number } | undefined> }>
}

export default function CourseProgressPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  return (
    <AuthGate>
      <Course courseKey={decodeURIComponent(key)} />
    </AuthGate>
  )
}

function Course({ courseKey }: { courseKey: string }) {
  const { user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<TeacherProgress | null>(null)
  const [year, setYear] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pastOpen, setPastOpen] = useState(false)
  const [past, setPast] = useState<PastYears | null>(null)
  const [studentSort, setStudentSort] = useState<"name" | "average" | "trend">("average")
  // Starts with the students to watch; "Show all" opens the whole course.
  const [showAll, setShowAll] = useState(false)
  const [nameOrder] = useNameOrder()

  useEffect(() => {
    if (user && user.user_type !== "teacher") router.replace("/progress")
  }, [user, router])

  useEffect(() => {
    if (!user || user.user_type !== "teacher") return
    let cancelled = false
    void (async () => {
      const res = await authFetch(`/api/teacher/progress?course=${encodeURIComponent(courseKey)}${year ? `&year=${encodeURIComponent(year)}` : ""}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) setError(json.error || "Could not load this course")
      else setData(json)
    })()
    return () => { cancelled = true }
  }, [user, courseKey, year])

  useEffect(() => {
    if (!pastOpen || past) return
    void (async () => {
      const res = await authFetch(`/api/courses?key=${encodeURIComponent(courseKey)}`, { cache: "no-store" })
      if (res.ok) setPast(await res.json())
    })()
  }, [pastOpen, past, courseKey])

  const course: CourseProgress | undefined = data?.courses[0]
  const many = (course?.classes.length ?? 0) > 1

  const studentRows = useMemo(() => {
    const list: StudentTrend[] = (course?.students ?? []).filter((s) => showAll || s.why)
    const name = (s: StudentTrend) => parseName(s.name)
    return [...list].sort((a, b) =>
      studentSort === "name" ? compareNames(name(a), name(b), nameOrder)
      : studentSort === "trend" ? (a.trend ?? 1e9) - (b.trend ?? 1e9) || a.average - b.average
      : a.average - b.average || compareNames(name(a), name(b), nameOrder))
  }, [course, showAll, studentSort, nameOrder])

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <Link href="/teacher/progress" className={backLink}><ArrowLeft />All courses</Link>
        {error ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
        ) : !data || !course ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
        ) : (
          <>
            <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{course.name}</h1>
                <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-slate-600">
                  <span>{data.year} · {course.classes.length} period{course.classes.length === 1 ? "" : "s"} · {course.graded} student{course.graded === 1 ? "" : "s"} graded · {course.sets} graded set{course.sets === 1 ? "" : "s"}</span>
                  {course.average !== null && <span className={cn("font-semibold", scoreTone(course.average))}>{Math.round(course.average)}% average</span>}
                  <TrendChip trend={course.trend} />
                </p>
              </div>
              <Link href={course.classes.length === 1 ? `/grade-exam/batch?class=${course.classes[0].id}` : "/grade-exam/batch"} className={cn(actionButtonPrimary, "h-11 w-full px-5 sm:w-auto")}><ClipboardList />Grade a set</Link>
            </div>
            {data.years.length > 1 && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-200">
                <label htmlFor="course-year" className="pl-2 text-sm font-medium text-slate-700">School year</label>
                <select id="course-year" value={data.year} onChange={(e) => setYear(e.target.value)} className={cn(selectBox, "pr-9")}>
                  {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            )}

            {course.suggestions.length > 0 && (
              <section className="mt-8">
                <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>What to focus on</h2>
                <p className="mb-3 text-xs text-slate-500">From the numbers, best first.</p>
                <FocusList suggestions={course.suggestions} ctx={() => ({ name: course.name, classes: course.classes, areas: course.areas, studentsHref: "#students" })} />
              </section>
            )}

            {/* Periods side by side; each card opens the class page. */}
            <section className="mt-8">
              <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>By period</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {course.classes.map((c) => (
                  <Link key={c.id} href={`/teacher/classes/${c.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-blue-300">
                    <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-base font-bold", c.average === null ? "bg-slate-100 text-slate-500" : scoreBg(c.average))}>{c.average === null ? "–" : `${Math.round(c.average)}%`}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2"><span className="truncate font-semibold text-slate-900 group-hover:text-blue-700">{periodLabel(c, many)}</span><TrendChip trend={c.trend} /></span>
                      <span className="block truncate text-xs text-slate-500">
                        {c.students} on the class list · {c.latest ? `Latest: ${c.latest.title || "Untitled"} (${Math.round(c.latest.average)}%)` : "Nothing graded yet"}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
                  </Link>
                ))}
              </div>
            </section>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Areas{many ? " by period" : ""}</h2>
              <p className="text-xs text-slate-500">Class percent on each area across this year&apos;s graded sets, weakest first. Areas are named by each set&apos;s class report.</p>
              <AreasGrid areas={course.areas} classes={course.classes} courseName={course.name} />
            </section>

            <section id="students" className="mt-8 scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>{showAll ? "Students" : "Students to watch"}</h2>
                  <p className="text-xs text-slate-500">{showAll ? `Everyone with a graded paper${many ? " across the periods" : ""}.` : "Averaging under 60% (from their first paper; clears once their average recovers), or down 10+ points on their latest test."} Open a name for their tests and areas.</p>
                </div>
                {showAll && (
                  <select value={studentSort} onChange={(e) => setStudentSort(e.target.value as typeof studentSort)} className={cn(selectBox, "pr-9")} aria-label="Sort students">
                    <option value="average">Lowest average first</option>
                    <option value="trend">Biggest drop first</option>
                    <option value="name">By name</option>
                  </select>
                )}
              </div>
              {studentRows.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">{!course.sets ? "Shows once a set is graded." : showAll ? "No graded papers yet." : "Nobody is slipping or struggling right now."}</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100">
                  {studentRows.map((s) => {
                    const cls = course.classes.find((c) => c.id === s.classId)
                    const inner = (
                      <>
                        <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold", scoreBg(s.average))}>{Math.round(s.average)}%</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 items-center gap-2">
                            <span className="truncate font-medium text-slate-900">{s.name || "Unnamed paper"}</span>
                            {s.why === "struggling" && <span className="shrink-0 rounded-full bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700">Under 60%</span>}
                            {s.why === "slipping" && <span className="shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Dropped {Math.round(-(s.trend ?? 0))}</span>}
                          </span>
                          <span className="block text-xs text-slate-500">{[many && cls ? periodLabel(cls, true) : null, `${s.papers} paper${s.papers === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</span>
                        </span>
                        <TrendChip trend={s.trend} what="their latest paper" />
                        {s.rosterId && <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />}
                      </>
                    )
                    return (
                      <li key={`${s.classId}:${s.key}`}>
                        {s.rosterId ? <Link href={`/teacher/classes/${s.classId}/students/${s.rosterId}`} className="flex items-center gap-3 py-2.5 hover:bg-slate-50">{inner}</Link> : <div className="flex items-center gap-3 py-2.5" title="Not matched to the class list">{inner}</div>}
                      </li>
                    )
                  })}
                </ul>
              )}
              {course.students.length > course.studentsToWatch.length && (
                <div className="mt-3">
                  <button type="button" onClick={() => setShowAll((v) => !v)} className={actionButton}>
                    <Users />{showAll ? `Show just the ${course.studentsToWatch.length} to watch` : `Show all ${course.students.length} students`}
                  </button>
                </div>
              )}
            </section>

            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Assigned practice</h2>
                {course.practice.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">Nothing assigned yet. Open one of your quiz or practice guides and use Assign.</p>
                ) : (
                  <ul className="mt-2 divide-y divide-slate-100">
                    {course.practice.map((p) => {
                      const cls = course.classes.find((c) => c.id === p.classId)
                      const pct = p.assigned ? Math.round((p.done / p.assigned) * 100) : 0
                      return (
                        <li key={p.id}>
                          <Link href={`/teacher/practice/${p.id}`} className="group flex items-center gap-3 py-2.5">
                            <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-xs font-bold", pct >= 80 ? "bg-emerald-50 text-emerald-700" : pct >= 50 ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-800")}>{pct}%</span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{p.title}</span>
                              <span className="block text-xs text-slate-500">{[many && cls ? periodLabel(cls, true) : null, `${p.done} of ${p.assigned} done`, p.missing ? `${p.missing} missing` : null].filter(Boolean).join(" · ")}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 group-hover:text-blue-600" />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>

              <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Weak spots on assigned practice</h2>
                <p className="text-xs text-slate-500">From students&apos; answers on guides you assigned to them. Their other studying stays theirs.</p>
                {course.weakSpots.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">{course.linkedStudents === 0 ? "Shows once students with linked accounts do practice you assigned." : `No weak spots yet on assigned practice across ${course.linkedStudents} linked student${course.linkedStudents === 1 ? "" : "s"}.`}</p>
                ) : (
                  <ul className="mt-2 space-y-2">
                    {course.weakSpots.map((w) => (
                      <li key={w.key} className="text-sm">
                        <span className="font-medium text-slate-900">{w.topic}</span>
                        <span className="block text-xs text-slate-500">{w.students} student{w.students === 1 ? "" : "s"} · {Math.round(w.accuracy * 100)}% right lately</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>

            <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <button type="button" onClick={() => setPastOpen((o) => !o)} aria-expanded={pastOpen} className="flex w-full items-center justify-between gap-2 text-left">
                <span>
                  <span className={cn(fontDisplay, "block text-xl font-semibold text-slate-900")}>Past years</span>
                  <span className="block text-xs text-slate-500">Every year you&apos;ve taught {course.name}, area by area.</span>
                </span>
                <ChevronDown className={cn("h-5 w-5 shrink-0 text-slate-400 transition", pastOpen && "rotate-180")} />
              </button>
              {pastOpen && (
                !past ? <p className="mt-3 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading…</p>
                : past.years.length < 2 ? <p className="mt-3 text-sm text-slate-500">Only this year so far. Past years show here once you start next year (My classes, Start next year).</p>
                : (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {past.years.map((y) => <span key={y.year} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">{y.year}: {y.sets} set{y.sets === 1 ? "" : "s"}, {y.students} student{y.students === 1 ? "" : "s"}</span>)}
                    </div>
                    <div className="mt-3 overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead><tr className="text-left text-xs text-slate-500"><th className="px-2 py-2 font-semibold">Area</th>{past.years.map((y) => <th key={y.year} className="px-2 py-2 font-semibold">{y.year}</th>)}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                          {past.areas.map((a) => (
                            <tr key={a.name}>
                              <td className="px-2 py-1.5 font-medium text-slate-900">{a.name}</td>
                              {past.years.map((y) => { const c = a.byYear[y.year]; return <td key={y.year} className="px-1 py-1">{c ? <span className={cn("block rounded-md px-2 py-1 text-center font-semibold", cellTone(c.pct))}>{Math.round(c.pct)}%</span> : <span className="block text-center text-slate-300">-</span>}</td> })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )
              )}
            </section>
            <p className="mt-6 text-xs text-slate-500"><Users className="mr-1 inline h-3.5 w-3.5" />Student names stay on this page; nothing here goes to the AI.</p>
          </>
        )}
      </main>
    </div>
  )
}
