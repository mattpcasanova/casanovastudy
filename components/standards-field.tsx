"use client"

// The standards box with a Florida standards search under it (GET /api/standards/search,
// the CPALMS export in data/standards/fl-cpalms.json). Type a code ("MA.8.AR.3") or words
// ("slope", "atomic theory"); picking a result adds "CODE: official wording" as its own line.
// Free text still works for anything not on the list (other states, Common Core, NGSS).
// Used on the homepage (More options), the guide Edit page and the graded set's Standards dialog.

import { useEffect, useId, useRef, useState } from "react"
import { ExternalLink, Loader2, Plus, Search } from "lucide-react"
import { authFetch } from "@/lib/auth-fetch"
import { STANDARDS_MAX, normalizeStandards, standardCodes } from "@/lib/standards"
import { standardLine, type StandardHit } from "@/lib/standards-search"
import { cn } from "@/lib/utils"

export function StandardsField({ id, value, onChange, grade, subject, disabled, rows = 2, className, textareaClassName, help }: {
  id: string
  value: string
  onChange: (next: string) => void
  /** The guide's grade level and subject (app picker values), to rank the list. */
  grade?: string | null
  subject?: string | null
  disabled?: boolean
  rows?: number
  className?: string
  textareaClassName?: string
  /** Help text under the box (a sentence). */
  help?: string
}) {
  const [query, setQuery] = useState("")
  const [hits, setHits] = useState<StandardHit[]>([])
  const [busy, setBusy] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState("")
  const listId = useId()
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const latest = useRef(0)

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current)
    const q = query.trim()
    if (q.length < 2) { setHits([]); setBusy(false); return }
    timer.current = setTimeout(async () => {
      const n = ++latest.current
      setBusy(true)
      setError("")
      try {
        const params = new URLSearchParams({ q })
        if (grade) params.set("grade", grade)
        if (subject) params.set("subject", subject)
        const res = await authFetch(`/api/standards/search?${params}`)
        const data = await res.json().catch(() => ({}))
        if (n !== latest.current) return
        if (!res.ok) throw new Error(data.error || "Search failed")
        setHits(data.results ?? [])
        setOpen(true)
      } catch (e) {
        if (n === latest.current) setError(e instanceof Error ? e.message : "Search failed")
      } finally {
        if (n === latest.current) setBusy(false)
      }
    }, 250)
    return () => { if (timer.current) clearTimeout(timer.current) }
  }, [query, grade, subject])

  const picked = new Set(standardCodes(value))
  const add = (hit: StandardHit) => {
    if (picked.has(hit.code)) return
    const next = normalizeStandards([value.trim(), standardLine(hit)].filter(Boolean).join("\n"))
    if (next.length >= STANDARDS_MAX && !next.includes(hit.code)) { setError("That is all the standards box can hold."); return }
    onChange(next)
    setQuery("")
    setHits([])
    setOpen(false)
  }

  return (
    <div className={className}>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, STANDARDS_MAX))}
        rows={rows}
        disabled={disabled}
        placeholder="e.g. MA.8.AR.2.1, or paste the standard's wording"
        aria-describedby={help ? `${id}-help` : undefined}
        className={cn("w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-60", textareaClassName)}
      />
      {help && <p id={`${id}-help`} className="mt-1.5 text-sm text-slate-500">{help}</p>}

      <div className="relative mt-2">
        <label htmlFor={`${id}-search`} className="sr-only">Search Florida standards</label>
        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 focus-within:border-blue-400 focus-within:bg-white">
          {busy ? <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-400" aria-hidden /> : <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />}
          <input
            id={`${id}-search`}
            type="search"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value.slice(0, 120))}
            onFocus={() => { if (hits.length) setOpen(true) }}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            onKeyDown={(e) => { if (e.key === "Escape") setOpen(false) }}
            placeholder="Search Florida standards: a code like MA.8.AR.3, or words like slope"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && hits.length > 0}
            aria-controls={listId}
            aria-label="Search Florida standards"
            className="h-10 w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
        </div>
        {error && <p className="mt-1 text-xs text-rose-700">{error}</p>}
        {!error && query.trim().length >= 2 && !busy && !hits.length && <p className="mt-1 text-xs text-slate-500">Nothing on the Florida list matches. You can type the standard in the box above.</p>}
        {open && hits.length > 0 && (
          <ul id={listId} role="listbox" className="absolute left-0 right-0 z-20 mt-1 max-h-80 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
            {hits.map((h) => {
              const has = picked.has(h.code)
              return (
                <li key={h.code} role="option" aria-selected={false}>
                  <div className={cn("flex items-start gap-2 rounded-lg px-2 py-2 text-left", has ? "opacity-60" : "hover:bg-blue-50")}>
                    <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => add(h)} disabled={has} className="flex min-w-0 flex-1 items-start gap-2 text-left">
                      <span className="mt-0.5 shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-semibold tabular-nums text-slate-800">{h.code}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug text-slate-800">{h.text}</span>
                        <span className="block truncate text-xs text-slate-500">{[h.subject, h.grade === "912" ? "Grades 9-12" : h.grade === "68" ? "Grades 6-8" : h.grade === "K12" ? "K-12" : `Grade ${h.grade}`, h.strand].filter(Boolean).join(" · ")}</span>
                      </span>
                      {!has && <Plus className="mt-1 h-4 w-4 shrink-0 text-blue-700" aria-hidden />}
                      {has && <span className="mt-0.5 shrink-0 text-xs font-medium text-slate-500">Added</span>}
                    </button>
                    {h.url && <a href={h.url} target="_blank" rel="noreferrer" onMouseDown={(e) => e.preventDefault()} className="mt-0.5 shrink-0 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-blue-700" aria-label={`Open ${h.code} on CPALMS`}><ExternalLink className="h-4 w-4" /></a>}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
