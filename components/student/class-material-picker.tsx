"use client"

// "From your teacher" in the guide maker's attach step: slides and notes the
// teacher put on the student's classes (migration 080). Nothing is downloaded;
// the guide route reads the prepared text by id after a class check.

import { useEffect, useState } from "react"
import { Check, ChevronDown, FileText, Presentation, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { MATERIAL_LIMITS, materialTitle } from "@/lib/classes/materials"
import { SHELF_RULES, shelfGroups } from "@/lib/classes/material-shelf"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import type { StudentMaterial } from "@/lib/student/classwork"

export interface MaterialShelf { classes: Array<{ id: string; name: string; period: string | null }>; materials?: StudentMaterial[] }

/** A teacher's own class materials (all of this year's classes), for the guide maker. Null for students. */
export function useTeacherMaterials(): MaterialShelf | null {
  const { user } = useAuth()
  const [data, setData] = useState<MaterialShelf | null>(null)
  useEffect(() => {
    if (user?.user_type !== "teacher") return
    let live = true
    void (async () => {
      const res = await authFetch("/api/class-materials", { cache: "no-store" })
      if (res.ok && live) setData(await res.json())
    })()
    return () => { live = false }
  }, [user])
  return data
}

export interface PickedMaterial { id: string; name: string }

export function ClassMaterialPicker({ data, picked, onChange, disabled, mine, hidePicked }: {
  data: MaterialShelf | null
  /** The teacher's own materials (labels say "your", not "your teacher's"). */
  mine?: boolean
  /** The caller shows the picked ones itself (the homepage's Attached row). */
  hidePicked?: boolean
  picked: PickedMaterial[]
  onChange: (next: PickedMaterial[]) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  // One entry per file, even when it's on two of their classes.
  const all = (data?.materials ?? []).filter((m, i, list) => list.findIndex((x) => x.materialId === m.materialId) === i)
  const classes = data?.classes ?? []
  const isPicked = (id: string) => picked.some((p) => p.id === id)
  const toggle = (id: string, name: string) => {
    if (isPicked(id)) onChange(picked.filter((p) => p.id !== id))
    else if (picked.length < MATERIAL_LIMITS.maxPerGuide) onChange([...picked, { id, name }])
  }
  // With 2+ classes that have files, chips narrow the list to one class. Each
  // class shows its newest few with "Show all"; a search box appears once the
  // list is long (lib/classes/material-shelf.ts).
  const withFiles = classes.filter((c) => (data?.materials ?? []).some((m) => m.classId === c.id))
  const [only, setOnly] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const showSearch = all.length >= SHELF_RULES.searchFrom
  const groups = shelfGroups(only ? (data?.materials ?? []) : all, withFiles.map((c) => c.id), { only, query: showSearch ? query : "", expanded })
  const classOf = new Map(withFiles.map((c) => [c.id, c]))
  const chipLabel = (c: { name: string; period: string | null }) => (c.period ? `${c.name} · P${c.period}` : c.name)

  return (
    <div className="mt-3">
      {picked.length > 0 && !hidePicked && (
        <ul className="mb-2 space-y-2">
          {picked.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl bg-orange-50 px-3 py-2.5 ring-1 ring-orange-200">
              <Presentation className="h-5 w-5 shrink-0 text-orange-700" />
              <span className="min-w-0 flex-1 text-sm text-slate-700">
                <span className="block font-semibold text-slate-900">{mine ? "Class material" : "From your teacher"}</span>
                <span className="block truncate">{materialTitle(p.name)}</span>
              </span>
              <button type="button" onClick={() => onChange(picked.filter((x) => x.id !== p.id))} disabled={disabled} aria-label={`Don't use ${p.name}`} className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {all.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            disabled={disabled}
            className="flex h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-left text-sm font-semibold text-slate-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50/50"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-100 text-orange-700"><Presentation className="h-4 w-4" /></span>
            <span className="min-w-0 flex-1 truncate">{mine ? "From your class materials" : <>From your teacher&apos;s class materials</>}</span>
            <span className="shrink-0 text-xs font-medium text-slate-500">{all.length} file{all.length === 1 ? "" : "s"}</span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-slate-500 transition", open && "rotate-180")} />
          </button>
          {open && (
            <div className="mt-2 max-h-96 space-y-3 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2">
              {showSearch && (
                <div className="relative px-1 pt-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, e.g. unit 4"
                    aria-label="Search class materials"
                    className="h-10 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              )}
              {withFiles.length > 1 && (
                <div role="group" aria-label="Show one class" className="flex flex-wrap gap-1.5 px-1 pt-1">
                  {[{ id: null as string | null, label: "All classes" }, ...withFiles.map((c) => ({ id: c.id as string | null, label: chipLabel(c) }))].map((c) => (
                    <button
                      key={c.id ?? "all"}
                      type="button"
                      onClick={() => setOnly(c.id)}
                      aria-pressed={only === c.id}
                      className={cn("inline-flex h-9 max-w-full items-center rounded-full px-3 text-sm font-semibold transition", only === c.id ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}
                    >
                      <span className="truncate">{c.label}</span>
                    </button>
                  ))}
                </div>
              )}
              {groups.length === 0 && <p className="px-2 py-3 text-center text-sm text-slate-500">Nothing matches &ldquo;{query.trim()}&rdquo;.</p>}
              {groups.map(({ classId, items, hidden }) => (
                <div key={classId}>
                  {(groups.length > 1 || only) && <p className="px-2 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-slate-500">{chipLabel(classOf.get(classId)!)}</p>}
                  <ul className="space-y-1">
                    {items.map((m) => {
                      const on = isPicked(m.materialId)
                      const full = !on && picked.length >= MATERIAL_LIMITS.maxPerGuide
                      const Icon = m.kind === "slides" ? Presentation : FileText
                      return (
                        <li key={m.id}>
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={on}
                            onClick={() => toggle(m.materialId, m.name)}
                            disabled={disabled || full}
                            className={cn("flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition", on ? "bg-blue-50 ring-1 ring-inset ring-blue-200" : "hover:bg-slate-50", full && "opacity-50")}
                          >
                            <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded border", on ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 bg-white")}>{on && <Check className="h-3.5 w-3.5" />}</span>
                            <Icon className="h-4 w-4 shrink-0 text-orange-700" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium text-slate-900">{materialTitle(m.name)}</span>
                              {m.note && <span className="block truncate text-xs text-slate-500">{m.note}</span>}
                            </span>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                  {hidden > 0 && (
                    <button type="button" onClick={() => setExpanded((prev) => new Set(prev).add(classId))} className="mt-0.5 inline-flex h-9 items-center rounded-lg px-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
                      Show all {items.length + hidden}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
