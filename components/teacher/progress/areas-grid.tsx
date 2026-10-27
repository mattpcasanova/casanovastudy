"use client"

// Areas across a course: rows = areas (weakest first), columns = all periods
// plus each period, with Make practice and the reteach plan per row.

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ClipboardList, PencilLine } from "lucide-react"
import { actionButton } from "@/components/grading/grading-ui"
import { practiceRequest } from "@/components/classes/class-areas"
import { openHomeWithPrefill } from "@/lib/prefill"
import { rememberAssignPreset } from "@/lib/practice/preset"
import type { CourseArea } from "@/lib/teacher/progress"
import { cellTone, periodLabel, TrendChip } from "./parts"
import { cn } from "@/lib/utils"

export function AreasGrid({ areas, classes, courseName }: { areas: CourseArea[]; classes: Array<{ id: string; name: string; period: string | null }>; courseName: string }) {
  const router = useRouter()
  const many = classes.length > 1

  const makePractice = (a: CourseArea) => {
    // The period that needs it most gets the assignment preset.
    const worst = classes.map((c) => ({ c, pct: a.byClass[c.id] })).filter((x) => x.pct !== undefined).sort((x, y) => (x.pct as number) - (y.pct as number))[0]?.c ?? classes[0]
    const className = many && worst?.period ? `${courseName} (Period ${worst.period})` : courseName
    if (worst) rememberAssignPreset({ classId: worst.id, rosterIds: [], title: `${a.name}: practice` })
    router.push(openHomeWithPrefill({ source: "class-area", sourceTitle: className, studyRequest: practiceRequest(a, className), studyGuideName: `${a.name}: practice`, format: "practice", detail: a.name }))
  }

  if (!areas.length) return <p className="mt-3 text-sm text-slate-500">Areas show once a graded set in this course has a class report (open the set&apos;s results page to write one).</p>

  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-slate-500">
            <th className="px-2 py-2 font-semibold">Area</th>
            <th className="px-2 py-2 font-semibold">All</th>
            {many && classes.map((c) => <th key={c.id} className="px-2 py-2 font-semibold"><Link href={`/teacher/classes/${c.id}`} className="hover:text-blue-700">{periodLabel(c, many)}</Link></th>)}
            <th className="px-2 py-2 font-semibold">Trend</th>
            <th className="px-2 py-2" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {areas.map((a) => (
            <tr key={a.name}>
              <td className="px-2 py-2 font-medium text-slate-900">{a.name}<span className="block text-xs font-normal text-slate-500">{a.sets} set{a.sets === 1 ? "" : "s"}</span></td>
              <td className="px-1 py-2"><span className={cn("block min-w-[3.25rem] rounded-md px-2 py-1 text-center font-semibold", cellTone(a.pct))}>{Math.round(a.pct)}%</span></td>
              {many && classes.map((c) => {
                const p = a.byClass[c.id]
                return <td key={c.id} className="px-1 py-2">{p === undefined ? <span className="block text-center text-slate-300">-</span> : <span className={cn("block min-w-[3.25rem] rounded-md px-2 py-1 text-center font-semibold", cellTone(p))}>{Math.round(p)}%</span>}</td>
              })}
              <td className="px-2 py-2"><TrendChip trend={a.trend} /></td>
              <td className="px-2 py-2">
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => makePractice(a)} className={actionButton}><PencilLine /><span className="hidden sm:inline">Make practice</span></button>
                  {a.latestBatchId && <Link href={`/grade-exam/batch/${a.latestBatchId}/reteach`} className={actionButton} aria-label={`Reteach plan for ${a.name}`}><ClipboardList /><span className="hidden sm:inline">Reteach plan</span></Link>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
