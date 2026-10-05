"use client"

// Class results for one batch (/grade-exam/batch): every student's score, a
// class average, links to each report (where marks can be adjusted), CSV, and
// the class report (components/grading/class-report.tsx).

import { use, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, Download, Loader2 } from "lucide-react"
import NavigationHeader from "@/components/navigation-header"
import AuthGate from "@/components/auth-gate"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth-fetch"
import { resultsCsv } from "@/lib/grading/batch"
import { ClassReport, type SavedInsights } from "@/components/grading/class-report"
import type { GradedQuestion } from "@/lib/grading/parse"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

interface Row {
  id: string
  student_name: string
  total_marks: number
  total_possible_marks: number
  percentage: number
  grade: string
  exam_title: string | null
  class_name: string | null
  class_period: string | null
  created_at: string
  grade_breakdown: GradedQuestion[] | null
}

export default function BatchResultsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <AuthGate>
      <BatchResults id={id} />
    </AuthGate>
  )
}

function BatchResults({ id }: { id: string }) {
  const [rows, setRows] = useState<Row[] | null>(null)
  const [saved, setSaved] = useState<SavedInsights | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sort, setSort] = useState<"name" | "score">("name")

  useEffect(() => {
    void (async () => {
      const res = await authFetch(`/api/grade-batch/${id}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) setError(data.error || "Could not load these results")
      else { setRows(data.results); setSaved(data.insights ?? null) }
    })()
  }, [id])

  const sorted = useMemo(() => {
    if (!rows) return []
    return [...rows].sort((a, b) => (sort === "name" ? a.student_name.localeCompare(b.student_name) : Number(b.percentage) - Number(a.percentage)))
  }, [rows, sort])

  const reportPapers = useMemo(() => (rows ?? []).map((r) => ({ id: r.id, name: r.student_name, breakdown: r.grade_breakdown ?? [] })), [rows])

  const first = rows?.[0]
  const average = rows?.length ? rows.reduce((s, r) => s + Number(r.percentage), 0) / rows.length : 0
  const title = first?.exam_title || "Class results"
  const subtitle = [first?.class_name, first?.class_period && `Period ${first.class_period}`].filter(Boolean).join(" · ")

  const downloadCsv = () => {
    const csv = resultsCsv(sorted.map((r) => ({ name: r.student_name, marks: r.total_marks, possible: r.total_possible_marks, percentage: Number(r.percentage), grade: r.grade })))
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }))
    a.download = `${title.replace(/[^\w-]+/g, "_")}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50")}>
      <NavigationHeader />
      <main className="container mx-auto max-w-5xl px-4 py-10">
        <Link href="/grade-exam/batch" className="text-sm text-blue-700 hover:underline">← Grade another class</Link>
        {error ? (
          <p className="mt-6 rounded-xl bg-rose-50 p-4 text-rose-800">{error}</p>
        ) : !rows ? (
          <p className="mt-10 flex items-center justify-center gap-2 text-slate-500"><Loader2 className="h-5 w-5 animate-spin" />Loading results…</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className={cn(fontDisplay, "text-4xl font-semibold tracking-tight text-slate-900")}>{title}</h1>
                <p className="text-slate-600">{subtitle ? `${subtitle} · ` : ""}{rows.length} student{rows.length === 1 ? "" : "s"} · class average {average.toFixed(1)}%</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setSort(sort === "name" ? "score" : "name")}><ArrowUpDown className="mr-2 h-4 w-4" />Sort by {sort === "name" ? "score" : "name"}</Button>
                <Button onClick={downloadCsv} className="bg-blue-600 hover:bg-blue-700"><Download className="mr-2 h-4 w-4" />CSV</Button>
              </div>
            </div>
            <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">Student</th><th className="px-4 py-3">Marks</th><th className="px-4 py-3">Percent</th><th className="px-4 py-3">Grade</th><th className="px-4 py-3" /></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">{r.student_name}</td>
                      <td className="px-4 py-3 text-slate-700">{r.total_marks}/{r.total_possible_marks}</td>
                      <td className="px-4 py-3 text-slate-700">{Number(r.percentage).toFixed(1)}%</td>
                      <td className="px-4 py-3 font-semibold text-slate-900">{r.grade}</td>
                      <td className="px-4 py-3 text-right"><Link href={`/grade-report/${r.id}`} className="font-semibold text-blue-700 hover:underline">Report</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-slate-500">Open a report to read the feedback or change a mark.</p>
            <ClassReport batchId={id} papers={reportPapers} saved={saved} />
          </>
        )}
      </main>
    </div>
  )
}
