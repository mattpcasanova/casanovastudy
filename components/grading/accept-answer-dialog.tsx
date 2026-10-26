"use client"

// After grading a class set: "also accept B on question 5" or "everyone gets
// question 12". Re-marks that question on every report in the set from what
// the grader read as each student's answer (lib/grading/accept-answer.ts),
// with a preview of who gains before anything is saved.

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { actionButton, actionButtonPrimary, selectBox } from "@/components/grading/grading-ui"
import type { AcceptPlanRow } from "@/lib/grading/accept-answer"
import { cn } from "@/lib/utils"

export function AcceptAnswerDialog({ open, onOpenChange, questions, preview, onSave }: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Question labels in the set, in order. */
  questions: string[]
  preview: (accept: { question: string; answers: string; everyone: boolean }) => Promise<AcceptPlanRow[]>
  onSave: (accept: { question: string; answers: string; everyone: boolean; reason: string }) => Promise<void>
}) {
  const [question, setQuestion] = useState("")
  const [mode, setMode] = useState<"also" | "everyone">("also")
  const [answers, setAnswers] = useState("")
  const [reason, setReason] = useState("")
  const [plan, setPlan] = useState<AcceptPlanRow[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => { if (open) { setQuestion(questions[0] ?? ""); setMode("also"); setAnswers(""); setReason(""); setPlan(null); setError("") } }, [open, questions])

  // Live preview of who gains.
  useEffect(() => {
    if (!open || !question || (mode === "also" && !answers.trim())) { setPlan(null); return }
    let alive = true
    const t = setTimeout(() => {
      void preview({ question, answers, everyone: mode === "everyone" }).then((p) => { if (alive) setPlan(p) }).catch(() => { if (alive) setPlan(null) })
    }, 300)
    return () => { alive = false; clearTimeout(t) }
  }, [open, question, mode, answers, preview])

  const gains = plan?.filter((r) => r.changed) ?? []
  const unread = plan?.filter((r) => !r.changed && r.given === null && mode === "also") ?? []
  const save = async () => {
    setBusy(true); setError("")
    try { await onSave({ question, answers, everyone: mode === "everyone", reason: reason.trim() }); onOpenChange(false) }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save") }
    finally { setBusy(false) }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Accept another answer</DialogTitle>
          <DialogDescription>Re-marks one question for the whole set from what each student wrote. The change shows on their reports.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Question</span>
            <select value={question} onChange={(e) => setQuestion(e.target.value)} className={cn(selectBox, "mt-1 w-full")} aria-label="Question">
              {questions.map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {([["also", "Also accept these answers"], ["everyone", "Full marks for everyone"]] as const).map(([k, label]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={cn("rounded-xl px-3 py-2 text-sm font-semibold ring-1", mode === k ? "bg-blue-50 text-blue-900 ring-blue-300" : "bg-white text-slate-700 ring-slate-300 hover:bg-slate-50")} aria-pressed={mode === k}>{label}</button>
            ))}
          </div>
          {mode === "also" && (
            <label className="block text-sm">
              <span className="font-medium text-slate-800">Answers to accept as well</span>
              <input value={answers} onChange={(e) => setAnswers(e.target.value)} placeholder="e.g. B, or B and D" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-base" />
              <span className="mt-1 block text-slate-500">Letters for multiple choice. Students who picked one of these get full marks on the question.</span>
            </label>
          )}
          <label className="block text-sm">
            <span className="font-medium text-slate-800">Reason (optional, goes on the reports)</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. the question could be read either way" className="mt-1 h-11 w-full rounded-xl border border-slate-300 px-3 text-base" />
          </label>
          {plan && (
            <div className="rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200">
              <p className="font-semibold text-slate-900">{gains.length ? `${gains.length} student${gains.length === 1 ? "" : "s"} gain marks` : "No one gains marks from this"}</p>
              {gains.length > 0 && <p className="mt-1 text-slate-700">{gains.map((r) => `${r.name} (${r.before} → ${r.after})`).join(", ")}</p>}
              {unread.length > 0 && <p className="mt-2 text-amber-900">Couldn&apos;t tell what {unread.length} student{unread.length === 1 ? "" : "s"} answered ({unread.map((r) => r.name).join(", ")}): check their reports.</p>}
            </div>
          )}
          {error && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{error}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={actionButton} onClick={() => onOpenChange(false)}>Cancel</button>
            <button type="button" className={actionButtonPrimary} disabled={busy || !plan || !gains.length} onClick={() => void save()}>
              {busy ? <><Loader2 className="animate-spin" />Saving…</> : `Apply to ${gains.length} student${gains.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
