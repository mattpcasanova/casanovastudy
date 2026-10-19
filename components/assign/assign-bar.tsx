"use client"

// On a teacher's own quiz / practice / adaptive guide: "Assign to students",
// plus where it's already assigned and how many have done it. Opens the
// dialog straight away when the guide was just made for a reteach group.

import { useEffect, useState } from "react"
import Link from "next/link"
import { ClipboardCheck, Send } from "lucide-react"
import { actionButtonPrimary } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { ASSIGNABLE_FORMATS } from "@/lib/practice/assignments"
import { assignPresetFor, clearAssignPreset, type AssignPreset } from "@/lib/practice/preset"
import { AssignDialog } from "./assign-dialog"

interface Listed { id: string; title: string; due_at: string | null; students: Array<{ status: string }> }

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
  return (
    <div className="mx-auto mb-6 flex max-w-3xl flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm print:hidden">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700"><ClipboardCheck className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1 text-sm">
        {list.length ? (
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {list.map((a) => (
              <Link key={a.id} href={`/teacher/practice/${a.id}`} className="font-semibold text-slate-900 hover:text-blue-700">
                {a.title} <span className="font-normal text-slate-500">· {a.students.filter((s) => s.status === "done" || s.status === "late").length} of {a.students.length} done</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-slate-700"><span className="font-semibold text-slate-900">Give this to students.</span> Assign it to a group or a class and get their scores back.</p>
        )}
      </div>
      <button type="button" className={actionButtonPrimary} onClick={() => { setPreset(null); setOpen(true) }}><Send />Assign to students</button>
      <AssignDialog key={preset?.at ?? "none"} open={open} onOpenChange={(o) => { setOpen(o); if (!o) void load() }} guide={guide} preset={preset} />
    </div>
  )
}
