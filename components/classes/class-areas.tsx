"use client"

// Class page: what the class struggles with across every graded set, by area
// (lib/classes/areas.ts). Weakest first, with the trend since earlier sets,
// the students lowest in each area, a students-by-areas grid, and "Make
// practice" (a homepage request built from the questions they lost marks on).

import { useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowDownRight, ArrowUpRight, Sparkles } from "lucide-react"
import type { ClassArea } from "@/lib/classes/areas"
import { openHomeWithPrefill } from "@/lib/prefill"
import { cn } from "@/lib/utils"

const tone = (pct: number) => (pct >= 80 ? "bg-emerald-500" : pct >= 65 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500")
const cellTone = (pct: number) => (pct >= 80 ? "bg-emerald-100 text-emerald-900" : pct >= 65 ? "bg-blue-100 text-blue-900" : pct >= 50 ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900")

export function practiceRequest(area: ClassArea, className: string): string {
  const missed = area.questions.slice(0, 6).map((q) => `${q.set} question ${q.label} (class scored ${Math.round(q.pct)}%)`).join('; ')
  return `Practice on "${area.name}" for my ${className} class. The class averaged ${Math.round(area.pct)}% on this area across ${area.sets} graded test${area.sets === 1 ? '' : 's'}. The questions they lost the most marks on: ${missed}. Write questions that build up to the same skills, from the basics to exam level, with worked explanations.`
}

export function ClassAreas({ areas, className, setsWithoutReport, tests = [], test = "", onTest }: {
  areas: ClassArea[]
  className: string
  setsWithoutReport: number
  tests?: Array<{ batchId: string; title: string }>
  test?: string
  onTest?: (batchId: string) => void
}) {
  const router = useRouter()
  const [view, setView] = useState<"areas" | "students">("areas")

  const grid = useMemo(() => {
    const students = new Map<string, string>()
    for (const a of areas) for (const s of a.students) students.set(s.key, s.name)
    return [...students.entries()].map(([key, name]) => ({ key, name, cells: areas.map((a) => a.students.find((s) => s.key === key) ?? null) })).sort((a, b) => a.name.localeCompare(b.name))
  }, [areas])

  const makePractice = (area: ClassArea) => {
    router.push(openHomeWithPrefill({
      source: "class-area",
      sourceTitle: className,
      studyRequest: practiceRequest(area, className),
      studyGuideName: `${area.name}: practice`,
      format: "practice",
      detail: area.name,
    }))
  }

  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-semibold text-slate-900">Where the class is struggling</h2>
          <p className="text-xs text-slate-500">By area, across every graded set for this class{setsWithoutReport > 0 ? `. ${setsWithoutReport} set${setsWithoutReport === 1 ? " has" : "s have"} no class report yet; open ${setsWithoutReport === 1 ? "it" : "them"} to include ${setsWithoutReport === 1 ? "it" : "them"}.` : "."}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        {tests.length > 1 && onTest && (
          <select value={test} onChange={(e) => onTest(e.target.value)} className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs" aria-label="Which test">
            <option value="">All tests</option>
            {tests.map((t) => <option key={t.batchId} value={t.batchId}>{t.title}</option>)}
          </select>
        )}
        {areas.length > 0 && (
          <div className="flex rounded-lg bg-slate-100 p-0.5 text-xs">
            {(["areas", "students"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={cn("rounded-md px-2.5 py-1", view === v ? "bg-white font-semibold text-slate-900 shadow-sm" : "text-slate-600")}>
                {v === "areas" ? "Areas" : "By student"}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {areas.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Shows once a graded set for this class has its class report (open the set&apos;s results page).</p>
      ) : view === "areas" ? (
        <ul className="mt-3 divide-y divide-slate-100">
          {areas.map((a) => {
            const low = a.students.filter((s) => s.pct < 60)
            return (
              <li key={a.name} className="py-3">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="min-w-0 flex-1 font-medium text-slate-900">{a.name}</span>
                  {a.trend != null && Math.abs(a.trend) >= 3 && (
                    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", a.trend > 0 ? "text-emerald-700" : "text-rose-700")} title="Latest set compared with the earlier ones">
                      {a.trend > 0 ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}{Math.abs(Math.round(a.trend))} pts
                    </span>
                  )}
                  <span className="w-12 text-right text-sm font-semibold text-slate-900">{Math.round(a.pct)}%</span>
                  <button type="button" onClick={() => makePractice(a)} className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100">
                    <Sparkles className="h-3.5 w-3.5" />Make practice
                  </button>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full", tone(a.pct))} style={{ width: `${Math.max(2, Math.min(100, a.pct))}%` }} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {a.sets} set{a.sets === 1 ? "" : "s"} · {a.questions.length} question{a.questions.length === 1 ? "" : "s"}
                  {low.length > 0 && <> · under 60%: {low.slice(0, 5).map((s) => s.name).join(", ")}{low.length > 5 ? ` and ${low.length - 5} more` : ""}</>}
                </p>
              </li>
            )
          })}
        </ul>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-2 py-1 text-left font-semibold text-slate-600">Student</th>
                {areas.map((a) => <th key={a.name} className="max-w-[7rem] px-1 py-1 text-left font-semibold text-slate-600"><span className="line-clamp-2">{a.name}</span></th>)}
              </tr>
            </thead>
            <tbody>
              {grid.map((row) => (
                <tr key={row.key}>
                  <td className="sticky left-0 whitespace-nowrap bg-white px-2 py-1 font-medium text-slate-800">{row.name}</td>
                  {row.cells.map((c, i) => (
                    <td key={i} className="px-1 py-0.5">
                      {c ? <span className={cn("block rounded px-1.5 py-1 text-center font-semibold", cellTone(c.pct))}>{Math.round(c.pct)}</span> : <span className="block text-center text-slate-300">-</span>}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
