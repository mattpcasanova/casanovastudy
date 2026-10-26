"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react"
import { applyTags, type GradedQuestion } from "@/lib/grading/parse"
import type { MarkingStyle } from "@/lib/grading/marking-style"
import type { ReportSettings } from "@/lib/grading/report-settings"
import { hasGrades, percentOf, type GradeScale } from "@/lib/grading/scale"
import { adjustedTotals, adjustmentLine, MAX_ADJUSTMENTS, type GradeAdjustment } from "@/lib/grading/adjustments"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

export interface ReportDraft {
  firstName: string
  lastName: string
  examTitle: string
  className: string
  classPeriod: string
  comment: string
  breakdown: GradedQuestion[]
  scale: GradeScale | null
  markingStyle: MarkingStyle
  /** Extra credit / points off for this student (lib/grading/adjustments.ts). */
  adjustments: GradeAdjustment[]
}

/** Final totals: the question marks plus extra credit / points off. */
export function reportTotals(draft: ReportDraft) {
  const raw = draft.breakdown.reduce((s, q) => s + q.marksAwarded, 0)
  const possible = draft.breakdown.reduce((s, q) => s + q.marksPossible, 0)
  const t = adjustedTotals(raw, possible, draft.adjustments, draft.scale)
  return { marks: t.marks, raw, possible, percentage: t.percentage, rawPercentage: percentOf(raw, possible), grade: t.grade }
}

/** Add one extra credit / points off for just this student (report edit mode). */
function AddAdjustment({ onAdd }: { onAdd: (a: GradeAdjustment) => void }) {
  const [kind, setKind] = useState<'extra' | 'deduct'>('extra')
  const [amount, setAmount] = useState('')
  const [unit, setUnit] = useState<'percent' | 'marks'>('percent')
  const [reason, setReason] = useState('')
  const n = Number(amount)
  const ready = n > 0 && reason.trim().length > 0
  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm">
      <select value={kind} onChange={(e) => setKind(e.target.value as 'extra' | 'deduct')} aria-label="Extra credit or points off" className="h-9 rounded-lg border border-slate-300 bg-white px-2">
        <option value="extra">Extra credit</option>
        <option value="deduct">Take off</option>
      </select>
      <input type="number" min={0} step="0.5" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="5" aria-label="Amount" className="h-9 w-20 rounded-lg border border-slate-300 px-2" />
      <select value={unit} onChange={(e) => setUnit(e.target.value as 'percent' | 'marks')} aria-label="Unit" className="h-9 rounded-lg border border-slate-300 bg-white px-2">
        <option value="percent">% of the test</option>
        <option value="marks">marks</option>
      </select>
      <input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Reason, e.g. Accommodation: extra time" aria-label="Reason" className="h-9 min-w-[12rem] flex-1 rounded-lg border border-slate-300 px-2" />
      <button
        type="button"
        disabled={!ready}
        onClick={() => { onAdd({ id: `adj-${Math.random().toString(36).slice(2, 10)}`, kind, amount: Math.round(n * 100) / 100, unit, reason: reason.trim() }); setAmount(''); setReason('') }}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-blue-600 px-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />Add
      </button>
    </div>
  )
}

const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))
const label = (q: string) => (/^(Question|Section|Q\d)/i.test(q) ? q : `Question ${q}`)

function pillClass(q: GradedQuestion) {
  if (q.marksAwarded === q.marksPossible) return "bg-green-100 text-green-700"
  if (q.marksAwarded >= q.marksPossible * 0.7) return "bg-blue-100 text-blue-700"
  if (q.marksAwarded >= q.marksPossible * 0.5) return "bg-yellow-100 text-yellow-700"
  return "bg-red-100 text-red-700"
}

function aoTotals(breakdown: GradedQuestion[]): Array<[string, number]> {
  const totals: Record<string, number> = {}
  for (const q of breakdown) for (const [k, v] of Object.entries(q.ao ?? {})) totals[k] = (totals[k] ?? 0) + v
  return Object.entries(totals).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }))
}

const aoText = (ao?: Record<string, number>) => Object.entries(ao ?? {}).map(([k, v]) => `${k} ${v}`).join(', ')

/** "AO1 2, AO2 1" typed freely; parsed when the box loses focus. */
function AoInput({ value, onChange }: { value?: Record<string, number>; onChange: (ao: Record<string, number> | undefined) => void }) {
  const [text, setText] = useState(aoText(value))
  const commit = () => {
    const q: GradedQuestion = { questionNumber: '', marksAwarded: 0, marksPossible: 0, explanation: '' }
    applyTags(q, `AO: ${text}`)
    onChange(q.ao)
    setText(aoText(q.ao))
  }
  return (
    <label className="flex items-center gap-1.5 text-slate-600">
      AOs
      <input value={text} onChange={(e) => setText(e.target.value)} onBlur={commit} placeholder="AO1 2, AO2 1" className="w-40 rounded border bg-white px-2 py-1" />
    </label>
  )
}

/** Text that is an input while editing and plain text otherwise. */
function Editable({ value, onChange, editing, placeholder, className }: {
  value: string
  onChange: (v: string) => void
  editing: boolean
  placeholder: string
  className?: string
}) {
  if (!editing) return value ? <span className={className}>{value}</span> : null
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn("rounded-md border border-dashed border-slate-300 bg-white/70 px-2 py-0.5 hover:border-blue-400 focus:border-blue-500 focus:outline-none", className)}
    />
  )
}

/**
 * The grade report itself: what the teacher edits on screen and what prints.
 * Display toggles and branding come from the teacher's report settings.
 */
export function ReportDocument({ draft, onChange, editing, settings, date }: {
  draft: ReportDraft
  onChange: (patch: Partial<ReportDraft>) => void
  editing: boolean
  settings: ReportSettings
  date: string
}) {
  const totals = reportTotals(draft)
  const showGrade = settings.showGrade && hasGrades(draft.scale)
  const aos = settings.showAo ? aoTotals(draft.breakdown) : []
  const style = draft.markingStyle
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null)

  const setQuestion = (i: number, patch: Partial<GradedQuestion>) =>
    onChange({ breakdown: draft.breakdown.map((q, k) => (k === i ? { ...q, ...patch } : q)) })

  const setMarks = (i: number, value: number) => {
    const q = draft.breakdown[i]
    setQuestion(i, { marksAwarded: Math.min(Math.max(0, value), q.marksPossible) })
  }

  const studentName = `${draft.firstName} ${draft.lastName}`.trim()
  const classLine = [draft.className, draft.classPeriod && `Period ${draft.classPeriod.replace(/^p(eriod)?\s*/i, '')}`].filter(Boolean).join(' · ')

  return (
    <div className="space-y-6 [print-color-adjust:exact]">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        {(settings.schoolName || settings.teacherName) && (
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            {[settings.schoolName, settings.teacherName].filter(Boolean).join(' · ')}
          </p>
        )}
        <div className="flex flex-wrap items-baseline gap-2">
          {editing ? (
            <>
              <Editable value={draft.firstName} onChange={(v) => onChange({ firstName: v })} editing placeholder="First name" className={cn(fontDisplay, "w-40 text-2xl font-semibold")} />
              <Editable value={draft.lastName} onChange={(v) => onChange({ lastName: v })} editing placeholder="Last name" className={cn(fontDisplay, "w-48 text-2xl font-semibold")} />
            </>
          ) : (
            <h2 className={cn(fontDisplay, "text-2xl font-semibold text-slate-900")}>{studentName || 'Student'}</h2>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-slate-600">
          {editing ? (
            <>
              <Editable value={draft.examTitle} onChange={(v) => onChange({ examTitle: v })} editing placeholder="Exam title" className="w-56" />
              <Editable value={draft.className} onChange={(v) => onChange({ className: v })} editing placeholder="Class" className="w-40" />
              <Editable value={draft.classPeriod} onChange={(v) => onChange({ classPeriod: v })} editing placeholder="Period" className="w-20" />
            </>
          ) : (
            <>
              {draft.examTitle && <span className="font-medium text-slate-800">{draft.examTitle}</span>}
              {classLine && <span>{classLine}</span>}
            </>
          )}
          <span className="text-slate-400">{date}</span>
        </div>
      </div>

      {/* Summary */}
      <div className={cn("grid gap-4 rounded-2xl bg-gradient-to-br from-emerald-50 to-cyan-50 p-5 ring-1 ring-inset ring-emerald-200",
        1 + (settings.showPercentage ? 1 : 0) + (showGrade ? 1 : 0) === 3 ? "grid-cols-3" : 1 + (settings.showPercentage ? 1 : 0) + (showGrade ? 1 : 0) === 2 ? "grid-cols-2" : "grid-cols-1")}>
        <div className="text-center">
          <p className={cn(fontDisplay, "text-3xl font-semibold text-slate-900")}>{fmt(totals.marks)}/{fmt(totals.possible)}</p>
          <p className="text-sm text-muted-foreground">Total marks</p>
        </div>
        {settings.showPercentage && (
          <div className="text-center">
            <p className={cn(fontDisplay, "text-3xl font-semibold text-slate-900")}>{totals.percentage.toFixed(1)}%</p>
            <p className="text-sm text-muted-foreground">Percentage</p>
          </div>
        )}
        {showGrade && (
          <div className="text-center">
            <p className={cn(fontDisplay, "text-3xl font-semibold text-blue-700")}>{totals.grade || '-'}</p>
            <p className="text-sm text-muted-foreground">Grade</p>
          </div>
        )}
      </div>

      {(draft.adjustments.length > 0 || editing) && (
        <div className="break-inside-avoid rounded-2xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <h3 className={cn(fontDisplay, "text-lg font-semibold text-slate-900")}>Extra credit and points off</h3>
          {draft.adjustments.length > 0 && (
            <p className="mb-2 text-sm text-slate-600">As graded: {fmt(totals.raw)}/{fmt(totals.possible)} ({totals.rawPercentage.toFixed(1)}%). The totals above include these.</p>
          )}
          {draft.adjustments.length > 0 ? (
            <ul className="space-y-1.5">
              {draft.adjustments.map((a) => (
                <li key={a.id} className="flex items-center gap-2 text-sm">
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-semibold", a.kind === 'extra' ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800")}>{a.kind === 'extra' ? 'Extra credit' : 'Points off'}</span>
                  <span className="flex-1 text-slate-800">{adjustmentLine(a)}</span>
                  {editing && (
                    <button type="button" onClick={() => onChange({ adjustments: draft.adjustments.filter((x) => x.id !== a.id) })} className="rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700" aria-label={`Remove ${adjustmentLine(a)}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-2 text-sm text-slate-600">None yet. Add extra credit, a late penalty or an accommodation for this student. The reason shows here and in the gradebook comment.</p>
          )}
          {editing && draft.adjustments.length < MAX_ADJUSTMENTS && (
            <div className="mt-3"><AddAdjustment onAdd={(a) => onChange({ adjustments: [...draft.adjustments, a] })} /></div>
          )}
        </div>
      )}

      {aos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {aos.map(([k, v]) => (
            <span key={k} className="rounded-full bg-violet-50 px-3 py-1 text-sm text-violet-800 ring-1 ring-inset ring-violet-200">
              {k}: <span className="font-semibold">{fmt(v)}</span>
            </span>
          ))}
        </div>
      )}

      {/* Questions */}
      <div>
        <h3 className={cn(fontDisplay, "mb-4 text-xl font-semibold text-slate-900")}>Question breakdown</h3>
        <div className="space-y-3">
          {draft.breakdown.map((q, i) => (
            <div key={i} className={cn("rounded-lg border p-4 break-inside-avoid", editing ? "border-blue-200 bg-blue-50/40" : "bg-muted/30")}>
              <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  {editing ? (
                    <input
                      value={q.questionNumber}
                      onChange={(e) => setQuestion(i, { questionNumber: e.target.value })}
                      className="w-28 rounded-md border border-dashed border-slate-300 bg-white px-2 py-0.5 font-semibold"
                      aria-label="Question number"
                    />
                  ) : (
                    <span className="font-semibold">{label(q.questionNumber)}</span>
                  )}
                  {q.check && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 ring-1 ring-inset ring-amber-300 print:hidden" title={q.check}>Check this: {q.check}</span>
                  )}
                  {!editing && settings.showMarkCodes && q.markCodes && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs text-slate-700">{q.markCodes}</span>
                  )}
                  {!editing && settings.showLevels && q.level && (
                    <span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800 ring-1 ring-inset ring-amber-200">Level {q.level}</span>
                  )}
                  {!editing && settings.showAo && q.ao && Object.entries(q.ao).map(([k, v]) => (
                    <span key={k} className="rounded bg-violet-50 px-2 py-0.5 text-xs text-violet-800">{k} {fmt(v)}</span>
                  ))}
                </div>
                {editing ? (
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => setMarks(i, q.marksAwarded - 1)} className="rounded border border-gray-200 bg-white p-1.5 hover:bg-gray-100" aria-label="Decrease mark">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      min={0}
                      max={q.marksPossible}
                      step="0.5"
                      value={q.marksAwarded}
                      onChange={(e) => setMarks(i, Number(e.target.value) || 0)}
                      className="w-14 rounded border bg-white px-1 py-1 text-center text-sm font-medium"
                      aria-label="Marks awarded"
                    />
                    <button type="button" onClick={() => setMarks(i, q.marksAwarded + 1)} className="rounded border border-gray-200 bg-white p-1.5 hover:bg-gray-100" aria-label="Increase mark">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <span className="mx-1 text-sm text-muted-foreground">/</span>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={q.marksPossible}
                      onChange={(e) => {
                        const possible = Math.max(0, Number(e.target.value) || 0)
                        setQuestion(i, { marksPossible: possible, marksAwarded: Math.min(q.marksAwarded, possible) })
                      }}
                      className="w-14 rounded border bg-white px-1 py-1 text-center text-sm"
                      aria-label="Marks possible"
                    />
                    {confirmRemove === i ? (
                      <span className="ml-2 flex items-center gap-1 text-xs">
                        <button type="button" onClick={() => { onChange({ breakdown: draft.breakdown.filter((_, k) => k !== i) }); setConfirmRemove(null) }} className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700">Remove</button>
                        <button type="button" onClick={() => setConfirmRemove(null)} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100">Keep</button>
                      </span>
                    ) : (
                      <button type="button" onClick={() => setConfirmRemove(i)} className="ml-1 rounded p-1.5 text-red-500 hover:bg-red-50 hover:text-red-700" aria-label="Remove question">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <span className={cn("shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-sm font-medium", pillClass(q))}>
                    {fmt(q.marksAwarded)}/{fmt(q.marksPossible)} marks
                  </span>
                )}
              </div>

              {editing ? (
                <div className="space-y-2">
                  <textarea
                    value={q.explanation}
                    onChange={(e) => setQuestion(i, { explanation: e.target.value })}
                    rows={3}
                    className="w-full resize-y rounded-md border bg-white px-3 py-2 text-sm"
                    aria-label="Feedback"
                  />
                  {(style.codes || style.levels || style.ao || q.markCodes || q.level || q.ao) && (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {(style.codes || q.markCodes) && (
                        <label className="flex items-center gap-1.5 text-slate-600">
                          Codes
                          <input value={q.markCodes ?? ''} onChange={(e) => setQuestion(i, { markCodes: e.target.value || undefined })} placeholder="M1 A1 B0" className="w-36 rounded border bg-white px-2 py-1 font-mono" />
                        </label>
                      )}
                      {(style.levels || q.level) && (
                        <label className="flex items-center gap-1.5 text-slate-600">
                          Level
                          <input value={q.level ?? ''} onChange={(e) => setQuestion(i, { level: e.target.value || undefined })} placeholder="3" className="w-16 rounded border bg-white px-2 py-1" />
                        </label>
                      )}
                      {(style.ao || q.ao) && <AoInput value={q.ao} onChange={(ao) => setQuestion(i, { ao })} />}
                    </div>
                  )}
                </div>
              ) : (
                settings.showFeedback && q.explanation && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{q.explanation}</p>
              )}
            </div>
          ))}
        </div>

        {editing && (
          <button
            type="button"
            onClick={() => onChange({ breakdown: [...draft.breakdown, { questionNumber: String(draft.breakdown.length + 1), marksAwarded: 0, marksPossible: 1, explanation: '' }] })}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700"
          >
            <Plus className="h-4 w-4" /> Add a question
          </button>
        )}
      </div>

      {/* Teacher comment */}
      {(editing || draft.comment) && (
        <div className="break-inside-avoid">
          <h3 className={cn(fontDisplay, "mb-2 text-lg font-semibold text-slate-900")}>Teacher comment</h3>
          {editing ? (
            <textarea
              value={draft.comment}
              onChange={(e) => onChange({ comment: e.target.value })}
              rows={3}
              placeholder="An overall note for the student (optional)"
              className="w-full resize-y rounded-md border bg-white px-3 py-2 text-sm"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-slate-700">{draft.comment}</p>
          )}
        </div>
      )}

      {settings.showBranding && (
        <p className="border-t border-slate-200 pt-4 text-center text-xs text-slate-400">Graded with Casanova Study</p>
      )}
    </div>
  )
}
