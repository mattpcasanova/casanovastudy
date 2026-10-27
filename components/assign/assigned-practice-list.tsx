"use client"

// "Assigned practice" on a class page (or one student's page): each
// assignment with how many are done, linking to its page.

import { cn } from "@/lib/utils"
import { fontDisplay } from "@/lib/formats/design"
import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, ChevronRight, ClipboardCheck } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"

interface Listed { id: string; title: string; grading: string; due_at: string | null; created_at: string; students: Array<{ rosterId: string; status: string; best: { pct: number; correct: number; total: number } | null }> }

export function AssignedPracticeList({ classId, rosterId }: { classId: string; rosterId?: string }) {
  const [list, setList] = useState<Listed[] | null>(null)
  useEffect(() => {
    void (async () => {
      const res = await authFetch(`/api/practice-assignments?classId=${classId}`, { cache: "no-store" })
      const data = await res.json().catch(() => ({}))
      const all = (data.assignments ?? []) as Listed[]
      setList(rosterId ? all.filter((a) => a.students.some((s) => s.rosterId === rosterId)) : all)
    })()
  }, [classId, rosterId])

  if (!list) return null
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Assigned practice</h2>
      {list.length === 0 ? (
        <p className="mt-1 text-sm text-slate-500">{rosterId ? "Nothing assigned to this student yet." : "Nothing assigned yet. Open one of your quizzes or practice sets (or make one from a reteach plan) and press Assign to students."}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {list.map((a) => {
            const me = rosterId ? a.students.find((s) => s.rosterId === rosterId) : null
            const done = a.students.filter((s) => s.status === "done" || s.status === "late").length
            return (
              <li key={a.id}>
                <Link href={`/teacher/practice/${a.id}`} className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm">
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-base font-semibold text-slate-900 group-hover:text-blue-700">{a.title}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-sm text-slate-500">
                      {me ? (me.best ? (me.status === "incomplete" ? `Incomplete · ${Math.round(me.best.pct)}%` : a.grading === "mastery" ? `${me.best.correct}/${me.best.total} topics mastered` : `Best ${Math.round(me.best.pct)}%`) : me.status === "missing" ? "Missing" : "Not done yet") : `${done} of ${a.students.length} done`}
                      {a.due_at && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />due {new Date(a.due_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                    </span>
                  </span>
                  <span className="hidden items-center gap-1 text-sm font-semibold text-blue-700 sm:inline-flex">Open<ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" /></span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
