"use client"

// One course across school years (e.g. AP Chemistry 2025-26 vs 2026-27):
// where each year's students struggled, area by area, from every graded set
// of every class (all periods) in that course. Links to each year's classes.

import { use, useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Loader2 } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { authFetch } from "@/lib/auth-fetch"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

interface CourseData {
  name: string
  years: Array<{ year: string; sets: number; students: number; classes: Array<{ id: string; name: string; period: string | null }> }>
  areas: Array<{ name: string; byYear: Record<string, { pct: number; sets: number } | undefined> }>
}

const cellTone = (pct: number) => (pct >= 80 ? "bg-emerald-100 text-emerald-900" : pct >= 65 ? "bg-blue-100 text-blue-900" : pct >= 50 ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900")

export default function CoursePage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = use(params)
  return (
    <AuthGate>
      <Course courseKey={decodeURIComponent(key)} />
    </AuthGate>
  )
}

function Course({ courseKey }: { courseKey: string }) {
  const [data, setData] = useState<CourseData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      const res = await authFetch(`/api/courses?key=${encodeURIComponent(courseKey)}`, { cache: "no-store" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) setError(json.error || "Could not load this course")
      else setData(json)
    })()
  }, [courseKey])

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link href="/teacher/classes" className="inline-flex items-center gap-1 text-sm text-blue-700 hover:underline"><ArrowLeft className="h-4 w-4" />My classes</Link>
        {error ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
        ) : !data ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading…</p>
        ) : (
          <>
            <h1 className={cn(fontDisplay, "mt-3 text-4xl font-semibold tracking-tight text-slate-900")}>{data.name}</h1>
            <p className="text-slate-600">Every year you&apos;ve taught it, side by side.</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.years.map((y) => (
                <div key={y.year} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="font-semibold text-slate-900">{y.year}</p>
                  <p className="text-xs text-slate-500">{y.sets} graded set{y.sets === 1 ? "" : "s"} with a class report · {y.students} student{y.students === 1 ? "" : "s"}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {y.classes.map((c) => <Link key={c.id} href={`/teacher/classes/${c.id}`} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700 hover:bg-blue-50 hover:text-blue-800">{c.period ? `P${c.period}` : c.name}</Link>)}
                  </div>
                </div>
              ))}
            </div>

            <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="font-semibold text-slate-900">Areas, year by year</h2>
              <p className="text-xs text-slate-500">Class percent on each area across that year&apos;s graded sets. Weakest this year first. Areas are named by each test&apos;s class report.</p>
              {data.areas.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">Shows once graded sets in this course have class reports.</p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500">
                        <th className="px-2 py-2 font-semibold">Area</th>
                        {data.years.map((y) => <th key={y.year} className="px-2 py-2 font-semibold">{y.year}</th>)}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.areas.map((a) => (
                        <tr key={a.name}>
                          <td className="px-2 py-1.5 font-medium text-slate-900">{a.name}</td>
                          {data.years.map((y) => {
                            const c = a.byYear[y.year]
                            return <td key={y.year} className="px-1 py-1">{c ? <span className={cn("block rounded-md px-2 py-1 text-center font-semibold", cellTone(c.pct))} title={`${c.sets} set${c.sets === 1 ? "" : "s"}`}>{Math.round(c.pct)}%</span> : <span className="block text-center text-slate-300">-</span>}</td>
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
