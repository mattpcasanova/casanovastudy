"use client"

// Class page gradebook: students × graded sets and assigned practice (own
// average, kept apart from tests), sortable by name, average or
// any test; a cell opens the student's report. Students who left are hidden
// unless asked for. CSV includes student IDs for gradebook imports.

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowUp, Download } from "lucide-react"
import type { GradebookRow, GradebookTest } from "@/lib/classes/gradebook"
import { resultsCsvTable } from "@/lib/classes/gradebook-csv"
import { cn } from "@/lib/utils"
import { actionButton } from "@/components/grading/grading-ui"
import { dayCount } from "@/lib/practice/assignments"

const tone = (pct: number) => (pct >= 80 ? "bg-emerald-50 text-emerald-900" : pct >= 65 ? "bg-blue-50 text-blue-900" : pct >= 50 ? "bg-amber-50 text-amber-900" : "bg-rose-50 text-rose-900")
const STATUS_LABEL: Record<string, string> = { absent: "Absent", missing: "Missing", exempt: "Exempt", late: "Late" }

type Sort = { by: "name" | "average" | "practiceAverage" | string; dir: 1 | -1 }

export function ClassGradebook({ tests, rows, className, classId }: { tests: GradebookTest[]; rows: GradebookRow[]; className: string; classId?: string }) {
  const [sort, setSort] = useState<Sort>({ by: "name", dir: 1 })
  const [showLeft, setShowLeft] = useState(false)
  const leftCount = rows.filter((r) => r.left).length
  const hasPractice = tests.some((t) => t.kind === "practice")

  const sorted = useMemo(() => {
    const value = (r: GradebookRow): number | string | null => {
      if (sort.by === "name") return r.name.toLowerCase()
      if (sort.by === "average") return r.average
      if (sort.by === "practiceAverage") return r.practiceAverage
      const c = r.cells[sort.by]
      return c && c.kind !== "status" ? c.pct : null
    }
    return rows
      .filter((r) => showLeft || !r.left)
      .sort((a, b) => {
        const va = value(a), vb = value(b)
        if (va === null && vb === null) return a.name.localeCompare(b.name)
        if (va === null) return 1 // blanks last either way
        if (vb === null) return -1
        return (va < vb ? -1 : va > vb ? 1 : 0) * sort.dir
      })
  }, [rows, sort, showLeft])

  const toggle = (by: string) => setSort((s) => (s.by === by ? { by, dir: (s.dir * -1) as 1 | -1 } : { by, dir: by === "name" ? 1 : -1 }))
  const arrow = (by: string) => (sort.by === by ? (sort.dir === 1 ? <ArrowUp className="inline h-3 w-3" /> : <ArrowDown className="inline h-3 w-3" />) : null)

  const downloadCsv = () => {
    const a = document.createElement("a")
    a.href = URL.createObjectURL(new Blob([resultsCsvTable(tests, sorted)], { type: "text/csv" }))
    a.download = `${className.replace(/[^\w-]+/g, "_")}_gradebook.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (!tests.length) return null

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Gradebook</h2>
          <p className="text-xs text-slate-500">Click a column to sort; click a score to open the report. Practice columns are assigned practice (best attempt), averaged separately from tests.</p>
        </div>
        <div className="flex items-center gap-3 text-sm">
          {leftCount > 0 && (
            <label className="flex items-center gap-1.5 text-slate-600">
              <input type="checkbox" checked={showLeft} onChange={(e) => setShowLeft(e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              Show {leftCount} who left
            </label>
          )}
          <button type="button" onClick={downloadCsv} className={actionButton}><Download />Download CSV</button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-500">
              <th className="sticky left-0 z-10 bg-white px-2 py-2"><button type="button" onClick={() => toggle("name")} className="font-semibold hover:text-slate-900">Student {arrow("name")}</button></th>
              <th className="px-2 py-2"><button type="button" onClick={() => toggle("average")} className="font-semibold hover:text-slate-900">{hasPractice ? "Tests" : "Average"} {arrow("average")}</button></th>
              {hasPractice && <th className="px-2 py-2"><button type="button" onClick={() => toggle("practiceAverage")} className="font-semibold text-emerald-800 hover:text-emerald-950">Practice {arrow("practiceAverage")}</button></th>}
              {tests.map((t) => (
                <th key={t.batchId} className="min-w-[6.5rem] px-2 py-2 align-bottom">
                  <button type="button" onClick={() => toggle(t.batchId)} className="text-left font-semibold hover:text-slate-900">
                    {t.kind === "practice" && <span className="mb-0.5 inline-block rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">Practice</span>}
                    <span className="line-clamp-2">{t.title}</span>
                    <span className="block font-normal text-slate-400">{new Date(t.date).toLocaleDateString([], { month: "short", day: "numeric" })} · avg {Math.round(t.average)}% {arrow(t.batchId)}</span>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((r) => (
              <tr key={r.key} className={cn(r.left && "text-slate-400")}>
                <td className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-1.5 font-medium">
                  {r.rosterId && classId ? <Link href={`/teacher/classes/${classId}/students/${r.rosterId}`} className="hover:text-blue-700 hover:underline">{r.name}</Link> : r.name}{r.left && <span className="ml-1.5 text-xs font-normal">(left)</span>}{!r.rosterId && <span className="ml-1.5 text-xs font-normal text-amber-700" title="Not matched to a roster name">?</span>}
                </td>
                <td className="px-2 py-1.5 font-semibold">{r.average === null ? "-" : `${Math.round(r.average)}%`}</td>
                {hasPractice && <td className="px-2 py-1.5 font-semibold text-emerald-900">{r.practiceAverage === null ? "-" : `${Math.round(r.practiceAverage)}%`}</td>}
                {tests.map((t) => {
                  const c = r.cells[t.batchId]
                  return (
                    <td key={t.batchId} className="px-1 py-1">
                      {!c ? <span className="block px-2 text-slate-300">-</span>
                        : c.kind === "status" ? <span className="block rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-600" title={c.daysLate ? `${dayCount(c.daysLate)} past the due date` : undefined}>{STATUS_LABEL[c.status] ?? c.status}{c.daysLate ? <span className="ml-1 opacity-80">· {c.daysLate}d</span> : null}</span>
                        : c.kind === "practice" ? <Link href={`/teacher/practice/${c.assignmentId}`} className={cn("block rounded-md px-2 py-1 hover:ring-2 hover:ring-blue-300", tone(c.pct))}>{Math.round(c.pct)}%{c.late && <LateMark days={c.daysLate} />}</Link>
                        : <Link href={`/grade-report/${c.gradingId}`} className={cn("block rounded-md px-2 py-1 hover:ring-2 hover:ring-blue-300", tone(c.pct))}>{Math.round(c.pct)}%{c.grade && <span className="ml-1 text-xs opacity-70">{c.grade}</span>}{c.daysLate !== undefined && <LateMark days={c.daysLate} />}</Link>}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

/** "late" / "3d late" in a gradebook cell, with the full wording on hover. */
function LateMark({ days }: { days?: number }) {
  return (
    <span className="ml-1 text-xs font-semibold text-amber-800" title={days ? `Turned in ${dayCount(days)} late` : "Turned in late"}>
      {days ? `${days}d late` : "late"}
    </span>
  )
}
