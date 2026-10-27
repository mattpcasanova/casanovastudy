"use client"

// "Assigned to you" for students (Progress page): practice their teachers
// assigned, open ones first, with due dates and their best score.

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, ChevronRight, ClipboardCheck } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { dayCount } from "@/lib/practice/assignments"

interface Mine { id: string; title: string; grading: string; dueAt: string | null; guideId: string; status: string; daysLate?: number; best: { pct: number; correct: number; total: number } | null }

const LABEL: Record<string, [string, string]> = {
  done: ["Done", "bg-emerald-50 text-emerald-800 ring-emerald-200"],
  late: ["Turned in late", "bg-amber-50 text-amber-900 ring-amber-200"],
  missing: ["Missing", "bg-rose-50 text-rose-800 ring-rose-200"],
  not_started: ["To do", "bg-blue-50 text-blue-800 ring-blue-200"],
  incomplete: ["Sent unfinished · finish it", "bg-orange-50 text-orange-900 ring-orange-200"],
}

export function MyAssignments() {
  const [list, setList] = useState<Mine[]>([])
  useEffect(() => {
    void (async () => {
      const res = await authFetch("/api/practice-assignments/mine", { cache: "no-store" })
      if (res.ok) setList((await res.json()).assignments ?? [])
    })()
  }, [])
  if (!list.length) return null
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-xl shadow-blue-900/10">
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-slate-900"><ClipboardCheck className="h-5 w-5 text-emerald-700" />Assigned to you</h2>
      <ul className="space-y-2">
        {list.map((a) => {
          const [base, cls] = LABEL[a.status] ?? LABEL.not_started
          const label = a.daysLate ? (a.status === "late" ? `Turned in ${dayCount(a.daysLate)} late` : `Missing · ${dayCount(a.daysLate)} overdue`) : base
          return (
            <li key={a.id}>
              <Link href={`/study-guide/${a.guideId}?assignment=${a.id}`} className="group flex items-center gap-3 rounded-2xl border border-slate-200 p-3 transition hover:border-blue-300 hover:bg-blue-50/40">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">{a.title}</span>
                  <span className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                    {a.dueAt && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />Due {new Date(a.dueAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
                    {a.best && <span>Best: {a.grading === "mastery" ? `${a.best.correct} of ${a.best.total} topics mastered` : `${Math.round(a.best.pct)}%`}</span>}
                  </span>
                </span>
                <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset", cls)}>{label}</span>
                <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600" />
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
