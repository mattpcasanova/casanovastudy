"use client"

// One course on /teacher/progress: its periods, average and trend, the three
// weakest areas, practice done, and students to watch. The card is the link.

import Link from "next/link"
import { ChevronRight, Users } from "lucide-react"
import type { CourseProgress } from "@/lib/teacher/progress-server"
import { bar, scoreBg, TrendChip } from "./parts"
import { cn } from "@/lib/utils"

export function CourseCard({ course }: { course: CourseProgress }) {
  const assigned = course.practice.reduce((s, p) => s + p.assigned, 0)
  const done = course.practice.reduce((s, p) => s + p.done, 0)
  const watch = course.studentsToWatch.length
  return (
    <Link href={`/teacher/progress/${encodeURIComponent(course.key)}`} className="group block rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <div className="flex items-start gap-3">
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-bold", course.average === null ? "bg-slate-100 text-slate-500" : scoreBg(course.average))}>
          {course.average === null ? "–" : `${Math.round(course.average)}%`}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-semibold text-slate-900 group-hover:text-blue-700">{course.name}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            {course.classes.map((c) => <span key={c.id} className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-700">{c.period ? `P${c.period}` : c.name}</span>)}
            <span>· {course.sets} graded set{course.sets === 1 ? "" : "s"}</span>
            <TrendChip trend={course.trend} />
          </p>
        </div>
        <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-slate-300 group-hover:text-blue-600" />
      </div>

      {course.areas.length > 0 ? (
        <ul className="mt-4 space-y-2">
          {course.areas.slice(0, 3).map((a) => (
            <li key={a.name} className="text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-slate-800">{a.name}</span>
                <span className="shrink-0 font-semibold text-slate-700">{Math.round(a.pct)}%</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100"><div className={cn("h-full rounded-full", bar(a.pct))} style={{ width: `${Math.max(2, Math.min(100, a.pct))}%` }} /></div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-slate-500">{course.sets ? "Open a graded set's class report to see its areas here." : "No graded sets yet this year."}</p>
      )}

      <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
        {assigned > 0 && <span>Practice: {Math.round((done / assigned) * 100)}% done</span>}
        {watch > 0 && <span className="inline-flex items-center gap-1 font-semibold text-amber-800"><Users className="h-3.5 w-3.5" />{watch} student{watch === 1 ? "" : "s"} to watch</span>}
        {course.weakSpots.length > 0 && <span>{course.weakSpots.length} weak spot{course.weakSpots.length === 1 ? "" : "s"} on assigned practice</span>}
      </p>
    </Link>
  )
}
