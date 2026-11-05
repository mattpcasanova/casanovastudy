"use client"

// On a teacher's own quiz / practice / adaptive guide: "Assign to students",
// plus where it's already assigned and how many have done it. Opens the
// dialog straight away when the guide was just made for a reteach group.

import { useEffect, useState } from "react"
import Link from "next/link"
import { CalendarClock, ChevronRight, ClipboardCheck, Send } from "lucide-react"
import { actionButtonPrimary, buttonRow } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { ASSIGNABLE_FORMATS } from "@/lib/practice/assignments"
import { sortClasses } from "@/lib/classes/sort"
import { assignPresetFor, clearAssignPreset, type AssignPreset } from "@/lib/practice/preset"
import { AssignDialog } from "./assign-dialog"
import { ShareWithClassButton } from "./share-class"

interface Listed { id: string; title: string; due_at: string | null; created_at?: string; className: string | null; period: string | null; students: Array<{ status: string }> }

const isDone = (s: { status: string }) => s.status === "done" || s.status === "late"

export function AssignBar({ guide }: { guide: { id: string; title: string; format: string; created_at?: string } }) {
  const [open, setOpen] = useState(false)
  const [preset, setPreset] = useState<AssignPreset | null>(null)
  const [list, setList] = useState<Listed[]>([])
  const assignable = (ASSIGNABLE_FORMATS as readonly string[]).includes(guide.format)

  const load = async () => {
    const res = await authFetch(`/api/practice-assignments?guideId=${guide.id}`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setList(data.assignments ?? [])
  }
  useEffect(() => {
    if (!assignable) return
    void load()
    const p = assignPresetFor(guide.created_at)
    if (p) { setPreset(p); setOpen(true); clearAssignPreset() }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide.id, assignable])

  if (!assignable) return null
  // One card per class, in period order (the same guide usually goes to several periods).
  const ordered = sortClasses(list.map((a) => ({ ...a, name: a.className ?? a.title })))
  const sameClassTwice = new Set(ordered.map((a) => `${a.className}|${a.period}`)).size < ordered.length
  return (
    <div className="mx-auto mb-6 max-w-3xl rounded-2xl border border-slate-200 bg-white p-3 shadow-sm print:hidden">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-5 w-5" /></span>
        <p className="min-w-[11.5rem] flex-1 text-sm text-slate-700">
          {list.length ? (
            <><span className="font-semibold text-slate-900">Assigned to {list.length === 1 ? "1 class" : `${list.length} classes`}.</span> Open one to see who has done it.</>
          ) : (
            <><span className="font-semibold text-slate-900">Give this to students.</span> Assign it to a group or a class and get their scores back.</>
          )}
        </p>
        <div className={buttonRow}>
          <ShareWithClassButton guide={guide} />
          <button type="button" className={actionButtonPrimary} onClick={() => { setPreset(null); setOpen(true) }}><Send />Assign to students</button>
        </div>
      </div>
      {ordered.length > 0 && (
        <ul className="mt-3 grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 sm:grid-cols-2">
          {ordered.map((a) => {
            const done = a.students.filter(isDone).length
            const total = a.students.length
            const pct = total ? Math.round((done / total) * 100) : 0
            // A renamed assignment, or a second one for the same class (a reteach group), shows its own title too.
            const ownTitle = a.title.trim() !== guide.title.trim() || sameClassTwice
            return (
              <li key={a.id}>
                <Link href={`/teacher/practice/${a.id}`} className="group flex h-full items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm">
                  <span className="flex h-11 min-w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-slate-100 px-2 text-slate-700">
                    {a.period ? (
                      <><span className="text-[0.6rem] font-semibold uppercase leading-none tracking-wide text-slate-500">Period</span><span className="text-base font-bold leading-tight text-slate-900">{a.period}</span></>
                    ) : (
                      <ClipboardCheck className="h-5 w-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-900 group-hover:text-blue-700">{a.className ?? a.title}</span>
                    {ownTitle && a.className && <span className="block truncate text-xs text-slate-500">{a.title}</span>}
                    <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-600">
                      <span className="font-medium">{done} of {total} done</span>
                      {a.due_at && <span className="inline-flex items-center gap-1"><CalendarClock className="h-3.5 w-3.5" />due {new Date(a.due_at).toLocaleDateString([], { month: "short", day: "numeric" })}</span>}
                    </span>
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><span className="block h-full rounded-full bg-emerald-600" style={{ width: `${pct}%` }} /></span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-blue-700" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <AssignDialog key={preset?.at ?? "none"} open={open} onOpenChange={(o) => { setOpen(o); if (!o) void load() }} guide={guide} preset={preset} />
    </div>
  )
}
