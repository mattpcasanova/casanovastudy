"use client"

// The standards a graded class set assesses (grading_batches.standards, migration 087):
// a toolbar button + dialog to type them, and the chips shown under "How the class did".
// With two or more codes the class report groups every question by standard instead of
// by topic, so the teacher (or a principal) can read "58% on MA.8.AR.3.2". Only ever
// what the teacher typed: there is no standards database on purpose (lib/standards.ts).

import { useEffect, useState } from "react"
import { Pencil, Tag } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { actionButton, actionButtonPrimary } from "@/components/grading/grading-ui"
import { STANDARDS_MAX, standardCodes, standardEntries } from "@/lib/standards"
import { cn } from "@/lib/utils"

export function StandardsDialog({ open, onOpenChange, value, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: string
  onSave: (standards: string) => Promise<void>
}) {
  const [text, setText] = useState(value)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  useEffect(() => { if (open) { setText(value); setError("") } }, [open, value])
  const codes = standardCodes(text).length

  const save = async () => {
    setBusy(true)
    setError("")
    try { await onSave(text); onOpenChange(false) } catch (e) { setError(e instanceof Error ? e.message : "Could not save") } finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Standards this test assesses</DialogTitle>
          <DialogDescription>Type the standards codes, one per line or separated by commas. With two or more, the class report groups the questions by standard, so you can see how the class did on each one.</DialogDescription>
        </DialogHeader>
        <label htmlFor="batch-standards" className="sr-only">Standards</label>
        <textarea
          id="batch-standards"
          value={text}
          onChange={(e) => setText(e.target.value.slice(0, STANDARDS_MAX))}
          placeholder={"e.g. MA.8.AR.2.1, MA.8.AR.3.2\nor a code followed by its wording"}
          rows={4}
          className="w-full resize-y rounded-xl border border-slate-300 px-3 py-2 text-sm leading-relaxed text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        />
        <p className="text-xs text-slate-500">
          {codes >= 2 ? `${codes} standards: the class report will show results by standard.` : codes === 1 ? "One standard: add a second to see results by standard." : "The report keeps grouping by topic until you add two or more codes."}
        </p>
        {error && <p className="text-sm text-rose-700">{error}</p>}
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className={actionButton}>Cancel</Button>
          <Button onClick={() => void save()} disabled={busy} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>{busy ? "Saving…" : "Save"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** The set's standards as chips, with an Edit button; nothing when none are set. */
export function StandardsChips({ standards, onEdit }: { standards: string; onEdit: () => void }) {
  const entries = standardEntries(standards)
  if (!entries.length) return null
  return (
    <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 text-sm">
      <Tag className="h-4 w-4 text-slate-500" aria-hidden />
      <span className="font-semibold text-slate-900">{entries.filter((e) => e.code).length === 1 && entries.length <= 2 ? "Standard" : "Standards"}</span>
      {entries.map((e, i) => e.code
        ? <span key={i} className="rounded-lg bg-white px-2 py-0.5 font-semibold tabular-nums text-slate-800 ring-1 ring-inset ring-slate-200">{e.text}</span>
        : <span key={i} className="text-slate-700">{e.text}</span>)}
      <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 rounded-lg px-2 py-0.5 font-medium text-blue-700 hover:bg-blue-50" aria-label="Edit standards"><Pencil className="h-3.5 w-3.5" />Edit</button>
    </div>
  )
}
