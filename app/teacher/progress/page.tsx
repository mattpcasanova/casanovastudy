"use client"

// Progress for teachers: how their classes are doing this year, by course
// (AP Chem across its periods), with what to focus on next. Students keep
// /progress (their own studying); this page drills course -> class -> student.

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ClipboardList, Loader2, Users } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { actionButtonPrimary, selectBox } from "@/components/grading/grading-ui"
import { FocusList } from "@/components/teacher/progress/focus-list"
import { CourseCard } from "@/components/teacher/progress/course-card"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import type { TeacherProgress } from "@/lib/teacher/progress-server"
import { cn } from "@/lib/utils"

export default function TeacherProgressPage() {
  return (
    <AuthGate>
      <Overview />
    </AuthGate>
  )
}

function Overview() {
  const { user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<TeacherProgress | null>(null)
  const [year, setYear] = useState<string>("")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && user.user_type !== "teacher") router.replace("/progress")
  }, [user, router])

  useEffect(() => {
    if (!user || user.user_type !== "teacher") return
    let cancelled = false
    void (async () => {
      const res = await authFetch(`/api/teacher/progress${year ? `?year=${encodeURIComponent(year)}` : ""}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (cancelled) return
      if (!res.ok) setError(json.error || "Could not load your classes")
      else setData(json)
    })()
    return () => { cancelled = true }
  }, [user, year])

  const shownYear = data?.year ?? year
  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>How your classes are doing</h1>
            <p className="text-slate-600">Trends by course, period and student from the sets you grade, the practice you assign, and what students study on their own.</p>
          </div>
          <Link href="/grade-exam/batch" className={cn(actionButtonPrimary, "h-11 w-full px-5 sm:w-auto")}><ClipboardList />Grade a class</Link>
        </div>
        {data && data.years.length > 1 && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white p-2 ring-1 ring-slate-200">
            <label htmlFor="progress-year" className="pl-2 text-sm font-medium text-slate-700">School year</label>
            <select id="progress-year" value={shownYear} onChange={(e) => setYear(e.target.value)} className={cn(selectBox, "pr-9")}>
              {data.years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        )}

        {error ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
        ) : !data ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
        ) : data.courses.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <Users className="mx-auto mb-2 h-7 w-7 text-blue-600" />
            <p className="font-semibold text-slate-900">No classes for {data.year} yet</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">Add your classes (import a file or Google Classroom), then grade a set for one. Trends and areas build up from there.</p>
            <Link href="/teacher/classes" className={cn(actionButtonPrimary, "mt-4")}><Users />My classes</Link>
          </div>
        ) : (
          <>
            {data.suggestions.length > 0 && (
              <section className="mt-8">
                <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>What to focus on</h2>
                <p className="mb-3 text-xs text-slate-500">From the numbers: weak or falling areas, periods behind the others, students slipping, practice not done.</p>
                <FocusList
                  suggestions={data.suggestions}
                  courseLabel
                  ctx={(s) => {
                    const c = data.courses.find((x) => x.key === (s as { course?: string }).course) ?? data.courses[0]
                    return { name: c.name, classes: c.classes, areas: c.areas, studentsHref: `/teacher/progress/${encodeURIComponent(c.key)}#students` }
                  }}
                />
              </section>
            )}
            <section className="mt-8">
              <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Your courses <span className="font-normal text-slate-500">{data.year}</span></h2>
              <p className="mb-3 text-xs text-slate-500">Average and trend over graded sets, weakest areas first. Open a course for each period and student.</p>
              {data.courses.every((c) => !c.sets) && (
                <p className="mb-3 rounded-xl bg-blue-50 p-3 text-sm text-blue-900">Nothing graded yet this year. Grade a class set and its results come here, with areas once its class report is written.</p>
              )}
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {data.courses.map((c) => <CourseCard key={c.key} course={c} />)}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  )
}
