"use client"

// Extra credit or points off for chosen papers in a class set (class results
// page): "+5% for the study guide packet", "-10% a day late", accommodations.
// The reason goes on each student's report and in the gradebook comment.
// Math and storage: lib/grading/adjustments.ts.

import { useEffect, useMemo, useState } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { adjustedTotals, adjustmentAmountText, adjustmentLine, adjustmentMarks, keptWith, lateAdjustment, type GradeAdjustment } from "@/lib/grading/adjustments"
import { paperDaysLate } from "@/lib/grading/late"
import { cn } from "@/lib/utils"

export interface AdjustablePaper {
  id: string
  name: string
  createdAt: string
  rawMarks: number
  possible: number
  adjustments: GradeAdjustment[]
}

type Kind = "extra" | "deduct" | "late"

const PER_DAY_PREF = "cs:late-per-day"
const KINDS: Array<[Kind, string]> = [["extra", "Extra credit"], ["deduct", "Take off points"], ["late", "Late work"]]
const newId = () => `adj-${Math.random().toString(36).slice(2, 10)}`
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

export function AdjustmentDialog({ open, onOpenChange, papers, editing, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  papers: AdjustablePaper[]
  /** Change an adjustment already on some papers. */
  editing?: { adjustment: GradeAdjustment; paperIds: string[] } | null
  onSave: (adjustment: GradeAdjustment, paperIds: string[]) => Promise<void>
}) {
  const [kind, setKind] = useState<Kind>("extra")
  const [amount, setAmount] = useState("5")
  const [unit, setUnit] = useState<"percent" | "marks">("percent")
  const [days, setDays] = useState("1")
  const [perDay, setPerDay] = useState("10")
  const [reason, setReason] = useState("")
  const [reasonTouched, setReasonTouched] = useState(false)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [picked, setPicked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  // Which grading day each paper came in on (0 = with the first papers).
  const dayOf = useMemo(() => {
    const first = papers.map((p) => p.createdAt).sort()[0]
    return new Map(papers.map((p) => [p.id, paperDaysLate(first, p.createdAt)]))
  }, [papers])
  const dayCounts = useMemo(() => {
    const counts = new Map<number, number>()
    for (const d of dayOf.values()) counts.set(d, (counts.get(d) ?? 0) + 1)
    return [...counts.entries()].sort((a, b) => a[0] - b[0])
  }, [dayOf])

  useEffect(() => {
    if (!open) return
    setError("")
    setBusy(false)
    let savedPerDay = "10"
    try { savedPerDay = localStorage.getItem(PER_DAY_PREF) || "10" } catch {}
    if (editing) {
      const a = editing.adjustment
      setKind(a.late ? "late" : a.kind)
      setAmount(String(a.amount))
      setUnit(a.unit)
      setDays(String(a.late?.days ?? 1))
      setPerDay(String(a.late?.perDay ?? savedPerDay))
      setReason(a.reason)
      setReasonTouched(true)
      setChosen(new Set(editing.paperIds))
      setPicked(true)
    } else {
      setKind("extra")
      setAmount("5")
      setUnit("percent")
      setDays("1")
      setPerDay(savedPerDay)
      setReason("")
      setReasonTouched(false)
      setChosen(new Set())
      setPicked(false)
    }
  }, [open, editing])

  const dayNumber = Math.max(1, Math.round(Number(days) || 1))
  const lateReason = `Late: ${dayNumber} day${dayNumber === 1 ? "" : "s"}`

  // Late work: until the teacher picks students, choose the papers graded that many days after the first ones.
  useEffect(() => {
    if (!open || kind !== "late" || picked) return
    setChosen(new Set(papers.filter((p) => dayOf.get(p.id) === dayNumber).map((p) => p.id)))
  }, [open, kind, dayNumber, picked, papers, dayOf])

  const adjustment: GradeAdjustment | null = useMemo(() => {
    const id = editing?.adjustment.id ?? newId()
    if (kind === "late") {
      const rate = Number(perDay)
      if (!(rate > 0)) return null
      return lateAdjustment(id, dayNumber, rate, reasonTouched ? reason : lateReason)
    }
    const n = Number(amount)
    if (!(n > 0)) return null
    return { id, kind, amount: Math.round(n * 100) / 100, unit, reason: reason.trim() }
  }, [editing, kind, perDay, dayNumber, reason, reasonTouched, lateReason, amount, unit])

  const toggle = (id: string) => {
    setPicked(true)
    setChosen((s) => { const next = new Set(s); if (next.has(id)) next.delete(id); else next.add(id); return next })
  }
  const pickDay = (d: number) => {
    setPicked(true)
    setChosen(new Set(papers.filter((p) => dayOf.get(p.id) === d).map((p) => p.id)))
  }

  const save = async () => {
    if (!adjustment) { setError("Type an amount above 0."); return }
    if (!adjustment.reason) { setError("Add a reason. Students see it, and it goes in the gradebook comment."); return }
    if (!chosen.size && !editing) { setError("Choose at least one student."); return }
    if (kind === "late") { try { localStorage.setItem(PER_DAY_PREF, String(adjustment.late?.perDay ?? perDay)) } catch {} }
    setBusy(true)
    setError("")
    try {
      await onSave(adjustment, [...chosen])
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }

  const possible = papers[0]?.possible ?? 0
  const sorted = useMemo(() => [...papers].sort((a, b) => a.name.localeCompare(b.name)), [papers])

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-4 sm:max-w-xl [&>*]:min-w-0">
        <DialogHeader>
          <DialogTitle>{editing ? "Change extra credit or points off" : "Extra credit or points off"}</DialogTitle>
          <DialogDescription>For the students you choose. The reason shows on their report and goes in the gradebook comment.</DialogDescription>
        </DialogHeader>

        <div className="-mx-6 min-h-0 flex-1 space-y-4 overflow-y-auto px-6">
          <div role="radiogroup" aria-label="Kind" className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
            {KINDS.map(([k, label]) => (
              <button key={k} type="button" role="radio" aria-checked={kind === k} onClick={() => { setKind(k); if (!editing && !reasonTouched) setReason("") }}
                className={cn("h-10 rounded-lg px-2 text-sm font-semibold transition", kind === k ? "bg-white text-blue-700 shadow-sm ring-1 ring-slate-200" : "text-slate-600 hover:text-slate-900")}>
                {label}
              </button>
            ))}
          </div>

          {kind === "late" ? (
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">Days late</span>
                <input type="number" min={1} max={30} value={days} onChange={(e) => setDays(e.target.value)} className="h-10 w-24 rounded-xl border border-slate-300 px-3" />
              </label>
              <span className="pb-2.5 text-slate-500">×</span>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">% off per day</span>
                <input type="number" min={0} step="0.5" value={perDay} onChange={(e) => setPerDay(e.target.value)} className="h-10 w-24 rounded-xl border border-slate-300 px-3" />
              </label>
              <span className="pb-2.5 font-semibold text-rose-700">= {adjustment ? adjustmentAmountText(adjustment) : "-"}</span>
            </div>
          ) : (
            <div className="flex flex-wrap items-end gap-3 text-sm">
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">{kind === "extra" ? "Add" : "Take off"}</span>
                <input type="number" min={0} step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-10 w-24 rounded-xl border border-slate-300 px-3" />
              </label>
              <label className="block">
                <span className="mb-1 block font-medium text-slate-700">Of</span>
                <select value={unit} onChange={(e) => setUnit(e.target.value as "percent" | "marks")} className="cs-select h-10 rounded-xl border border-slate-300 bg-white px-3">
                  <option value="percent">% of the test</option>
                  <option value="marks">marks</option>
                </select>
              </label>
              {adjustment && possible > 0 && adjustment.unit === "percent" && (
                <span className="pb-2.5 text-slate-500">= {adjustmentMarks(adjustment, possible) > 0 ? "+" : ""}{fmt(adjustmentMarks(adjustment, possible))} of {fmt(possible)} marks</span>
              )}
            </div>
          )}

          <label className="block text-sm">
            <span className="mb-1 block font-medium text-slate-700">Reason</span>
            <input
              value={kind === "late" && !reasonTouched ? lateReason : reason}
              onChange={(e) => { setReason(e.target.value); setReasonTouched(true) }}
              maxLength={300}
              placeholder={kind === "extra" ? "e.g. Extra credit: study guide packet" : "e.g. No name on the paper"}
              className="h-10 w-full rounded-xl border border-slate-300 px-3"
            />
            {adjustment?.reason && <span className="mt-1 block text-xs text-slate-500">Students and the gradebook see: <span className="font-medium text-slate-700">{adjustmentLine(adjustment)}</span></span>}
          </label>

          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium text-slate-700">Students ({chosen.size} of {papers.length})</span>
              <button type="button" onClick={() => { setPicked(true); setChosen(new Set(papers.map((p) => p.id))) }} className={cn(actionButton, "h-8 px-2.5 text-xs")}>All</button>
              <button type="button" onClick={() => { setPicked(true); setChosen(new Set()) }} className={cn(actionButton, "h-8 px-2.5 text-xs")}>None</button>
              {dayCounts.length > 1 && dayCounts.map(([d, n]) => (
                <button key={d} type="button" onClick={() => pickDay(d)} className={cn(actionButton, "h-8 px-2.5 text-xs")}>
                  {d === 0 ? "Graded first day" : `Graded ${d} day${d === 1 ? "" : "s"} later`} ({n})
                </button>
              ))}
            </div>
            <ul className="max-h-64 divide-y divide-slate-100 overflow-y-auto rounded-xl border border-slate-200">
              {sorted.map((p) => {
                const on = chosen.has(p.id)
                const others = p.adjustments.filter((a) => a.id !== adjustment?.id)
                const before = adjustedTotals(p.rawMarks, p.possible, p.adjustments).percentage
                const after = adjustedTotals(p.rawMarks, p.possible, on && adjustment ? [...keptWith(p.adjustments, adjustment), adjustment] : others).percentage
                const replaced = on && adjustment?.late ? others.filter((a) => a.late) : []
                const d = dayOf.get(p.id) ?? 0
                return (
                  <li key={p.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-3 py-2 text-sm hover:bg-slate-50">
                      <input type="checkbox" checked={on} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-slate-300" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-slate-900">{p.name}</span>
                        {(d > 0 || others.length > 0) && (
                          <span className="block truncate text-xs text-slate-500">{[d > 0 && `graded ${d} day${d === 1 ? "" : "s"} later`, ...others.map((a) => (replaced.includes(a) ? `replaces ${adjustmentLine(a)}` : adjustmentLine(a)))].filter(Boolean).join(" · ")}</span>
                        )}
                      </span>
                      <span className="shrink-0 tabular-nums text-slate-600">
                        {before !== after ? <>{before.toFixed(1)}% → <span className={cn("font-semibold", after > before ? "text-emerald-700" : "text-rose-700")}>{after.toFixed(1)}%</span></> : `${before.toFixed(1)}%`}
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>

          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-4">
          <button type="button" onClick={() => onOpenChange(false)} disabled={busy} className={actionButton}>Cancel</button>
          <button type="button" onClick={() => void save()} disabled={busy} className={actionButtonPrimary}>
            {busy && <Loader2 className="animate-spin" />}
            {editing && !chosen.size ? "Remove from everyone" : `${editing ? "Save for" : "Apply to"} ${chosen.size} student${chosen.size === 1 ? "" : "s"}`}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
