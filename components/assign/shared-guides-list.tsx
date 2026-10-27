"use client"

// "Shared with this class" on a class page: guides the teacher gave the class with no grading.

import { useEffect, useState } from "react"
import Link from "next/link"
import { BookOpen, ChevronRight, X } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

interface Share { id: string; guideId: string; title: string; format: string; note: string | null; createdAt: string }

export function SharedGuidesList({ classId }: { classId: string }) {
  const [list, setList] = useState<Share[] | null>(null)
  const load = async () => {
    const res = await authFetch(`/api/shared-guides?classId=${classId}`, { cache: "no-store" })
    const data = await res.json().catch(() => ({}))
    if (res.ok) setList(data.shares ?? [])
  }
  useEffect(() => { void load() }, [classId]) // eslint-disable-line react-hooks/exhaustive-deps
  if (!list || list.length === 0) return null
  return (
    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}>Shared with this class</h2>
      <p className="text-xs text-slate-500">Guides you gave them to study, no grading. Open any of your guides and press Share with a class to add one.</p>
      <ul className="mt-3 space-y-2">
        {list.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700"><BookOpen className="h-5 w-5" /></span>
            <Link href={`/study-guide/${s.guideId}`} className="group min-w-0 flex-1">
              <span className="block truncate font-medium text-slate-900 group-hover:text-blue-700">{s.title}</span>
              <span className="block truncate text-xs text-slate-500">{s.format}{s.note ? ` · ${s.note}` : ""} · {new Date(s.createdAt).toLocaleDateString([], { month: "short", day: "numeric" })}</span>
            </Link>
            <button type="button" onClick={async () => { await authFetch("/api/shared-guides", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: s.id }) }); void load() }} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label={`Stop sharing ${s.title}`}><X className="h-4 w-4" /></button>
            <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
          </li>
        ))}
      </ul>
    </section>
  )
}
