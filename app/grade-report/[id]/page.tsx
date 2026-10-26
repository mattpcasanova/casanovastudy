"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, Clock, Download, Edit2, FileCheck, Loader2, Printer, RefreshCw, SlidersHorizontal, Users } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import NavigationHeader from "@/components/navigation-header"
import { ReportDocument, reportTotals, type ReportDraft } from "@/components/grading/report/report-document"
import type { GradeAdjustment } from "@/lib/grading/adjustments"
import { ReportOptions } from "@/components/grading/report/report-options"
import { useAuth } from "@/lib/auth"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { displaySerif } from "@/lib/formats/fonts"
import { fontDisplay } from "@/lib/formats/design"
import { parseName } from "@/lib/grading/names"
import type { GradedQuestion } from "@/lib/grading/parse"
import type { MarkingStyle } from "@/lib/grading/marking-style"
import { DEFAULT_REPORT_SETTINGS, type ReportSettings } from "@/lib/grading/report-settings"
import type { GradeScale } from "@/lib/grading/scale"
import { actionButton, actionButtonPrimary, buttonRow } from "@/components/grading/grading-ui"
import { lateLabel } from "@/lib/grading/late"

interface GradingResult {
  id: string
  studentName: string
  studentFirstName: string | null
  studentLastName: string | null
  examTitle: string | null
  className: string | null
  classPeriod: string | null
  batchId: string | null
  gradeBreakdown: GradedQuestion[]
  gradeScale: GradeScale | null
  markingStyle: MarkingStyle
  teacherComment: string | null
  adjustments?: GradeAdjustment[]
  pdfUrl: string | null
  createdAt: string
  isOwner: boolean
  /** Saved pages + the set's answer key exist, so the owner can grade it again. */
  canRegrade?: boolean
  linkedStudent: boolean
  groupId: string | null
  groupMembers: string[]
  released: boolean
  reportSettings: ReportSettings
  /** Handed in after being marked absent/missing; days after the set was first graded. */
  daysLate: number | null
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

function draftFrom(r: GradingResult): ReportDraft {
  const parsed = r.studentFirstName || r.studentLastName
    ? { firstName: r.studentFirstName ?? '', lastName: r.studentLastName ?? '' }
    : parseName(r.studentName === 'Student' ? '' : r.studentName ?? '')
  return {
    ...parsed,
    examTitle: r.examTitle ?? '',
    className: r.className ?? '',
    classPeriod: r.classPeriod ?? '',
    comment: r.teacherComment ?? '',
    breakdown: r.gradeBreakdown ?? [],
    scale: r.gradeScale,
    markingStyle: r.markingStyle ?? {},
    adjustments: r.adjustments ?? [],
  }
}

/** Debounced autosave: calls `save` 700 ms after `value` stops changing (skips the first value). */
function useAutosave<T>(value: T | null, save: (v: T) => Promise<void>, enabled: boolean) {
  const first = useRef(true)
  const saveRef = useRef(save)
  saveRef.current = save
  useEffect(() => {
    if (!enabled || value === null) return
    if (first.current) { first.current = false; return }
    const t = setTimeout(() => { void saveRef.current(value) }, 700)
    return () => clearTimeout(t)
  }, [value, enabled])
}

export default function GradeReportPage() {
  const params = useParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const id = params.id as string

  const [result, setResult] = useState<GradingResult | null>(null)
  const [draft, setDraft] = useState<ReportDraft | null>(null)
  const [settings, setSettings] = useState<ReportSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [applyToGroup, setApplyToGroup] = useState(true)
  // Regrade: a note for the grader, then the paper is graded again from its saved pages.
  const [regradeOpen, setRegradeOpen] = useState(false)
  const [regradeNote, setRegradeNote] = useState('')
  const [regrading, setRegrading] = useState(false)
  const [regradeError, setRegradeError] = useState('')
  const [regradeResult, setRegradeResult] = useState<{ totalBefore: number; totalAfter: number; changed: Array<{ question: string; before: number | null; after: number }> } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)

  const isTeacher = user?.user_type === 'teacher'
  const canEdit = !!(isTeacher && result?.isOwner)

  useEffect(() => {
    if (!id || authLoading) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await authFetch(`/api/grade-exam/${id}`)
        const data = await res.json()
        if (cancelled) return
        if (!data.success) { setError(data.error || 'Failed to load grading result'); return }
        setError(null)
        setResult(data.data)
        setDraft(draftFrom(data.data))
        setSettings(data.data.reportSettings ?? DEFAULT_REPORT_SETTINGS)
      } catch {
        if (!cancelled) setError('Failed to load grading result')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id, user?.id, authLoading, reloadKey])

  const regrade = async () => {
    setRegrading(true); setRegradeError('')
    try {
      const res = await authFetch(`/api/grade-exam/${id}/regrade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ note: regradeNote }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not regrade')
      setRegradeResult({ totalBefore: data.totalBefore, totalAfter: data.totalAfter, changed: data.changed ?? [] })
      setRegradeOpen(false)
      setEditing(false)
      setReloadKey((k) => k + 1)
    } catch (e) {
      setRegradeError(e instanceof Error ? e.message : 'Could not regrade')
    } finally {
      setRegrading(false)
    }
  }

  const applyToGroupRef = useRef(true)
  applyToGroupRef.current = applyToGroup && !!result?.groupId
  const saveDraft = useCallback(async (d: ReportDraft) => {
    setSaveState('saving')
    try {
      const res = await authFetch(`/api/grade-exam/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gradeBreakdown: d.breakdown,
          studentFirstName: d.firstName,
          studentLastName: d.lastName,
          examTitle: d.examTitle,
          className: d.className,
          classPeriod: d.classPeriod,
          teacherComment: d.comment,
          gradeScale: d.scale,
          markingStyle: d.markingStyle,
          adjustments: d.adjustments,
          applyToGroup: applyToGroupRef.current,
        }),
      })
      const data = await res.json().catch(() => ({}))
      setSaveError(data.error ?? '')
      setSaveState(res.ok && data.success ? 'saved' : 'error')
    } catch {
      setSaveError('')
      setSaveState('error')
    }
  }, [id])

  const saveSettings = useCallback(async (s: ReportSettings) => {
    setSaveState('saving')
    try {
      const res = await authFetch('/api/grading/report-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(s),
      })
      setSaveState(res.ok ? 'saved' : 'error')
    } catch {
      setSaveState('error')
    }
  }, [])

  useAutosave(draft, saveDraft, canEdit)
  useAutosave(settings, saveSettings, canEdit)

  const setReleased = async (released: boolean) => {
    setResult((r) => (r ? { ...r, released } : r))
    setSaveState('saving')
    const res = await authFetch(`/api/grade-exam/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ released }) })
    setSaveState(res.ok ? 'saved' : 'error')
  }

  // Finishing an edit: save anything still waiting, then leave edit mode.
  const finishEditing = useCallback(async () => {
    // Close right away; the last save finishes in the background (status shows in the toolbar).
    setEditing(false)
    if (draft) await saveDraft(draft)
    // Counts as checked even with no changes (teacher agreement, lib/grading/agreement.ts).
    void authFetch(`/api/grade-exam/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reviewed: true }) })
  }, [draft, saveDraft, id])

  useEffect(() => {
    if (!editing) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') void finishEditing() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [editing, finishEditing])

  const patchDraft = (patch: Partial<ReportDraft>) => setDraft((d) => (d ? { ...d, ...patch } : d))
  const patchSettings = (patch: Partial<ReportSettings>) => setSettings((s) => (s ? { ...s, ...patch } : s))

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationHeader />
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading grading report...</p>
        </div>
      </div>
    )
  }

  if (error || !result || !draft || !settings) {
    return (
      <div className="min-h-screen bg-slate-50">
        <NavigationHeader />
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <p className="mb-4 text-destructive">{error || 'Report not found'}</p>
          <Button onClick={() => router.push('/grade-exam')} className={actionButtonPrimary}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to grading
          </Button>
        </div>
      </div>
    )
  }

  const studentName = `${draft.firstName} ${draft.lastName}`.trim() || 'Student'
  const date = new Date(result.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const { possible } = reportTotals(draft)

  return (
    <div className={cn(displaySerif.variable, "min-h-screen bg-slate-50 print:bg-white")}>
      <div className="print:hidden"><NavigationHeader /></div>

      <div className="relative overflow-hidden bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 pb-24 text-white print:hidden">
        <div className="pointer-events-none absolute inset-0 opacity-[0.08]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
        <div className="container relative mx-auto px-4 pt-12 text-center">
          <h1 className={cn(fontDisplay, "mb-2 text-4xl font-semibold tracking-tight sm:text-5xl")}>Grading report</h1>
          <p className="text-sm text-blue-50/85">{studentName} - {date}</p>
        </div>
      </div>

      <div className="container relative mx-auto -mt-16 px-4 pb-16 print:mt-0 print:p-0">
        <div className={cn("mx-auto grid gap-6", showOptions && canEdit ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_320px]" : "max-w-4xl")}>
          <div className="space-y-4">
            {regradeResult && (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-200 print:hidden" role="status">
                <p className="font-semibold">Regraded: {regradeResult.totalBefore} → {regradeResult.totalAfter} marks{regradeResult.changed.length ? `, ${regradeResult.changed.length} question${regradeResult.changed.length === 1 ? '' : 's'} changed` : ', no question changed'}.</p>
                {regradeResult.changed.length > 0 && <p className="mt-1">{regradeResult.changed.map((c) => `Q${c.question}: ${c.before ?? '–'} → ${c.after}`).join(' · ')}</p>}
              </div>
            )}
            <Dialog open={regradeOpen} onOpenChange={setRegradeOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Regrade this paper</DialogTitle>
                  <DialogDescription>The paper is graded again from its pages against the set&apos;s answer key. New marks and feedback replace the current ones (edits you made to this report are lost; extra credit stays). About a minute.</DialogDescription>
                </DialogHeader>
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Tell the grader what to look at (optional)</span>
                  <textarea value={regradeNote} onChange={(e) => setRegradeNote(e.target.value)} rows={3} placeholder="e.g. Question 8 is circled C, not A. Accept 'bent' without an angle for 31d." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base" />
                </label>
                {regradeError && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{regradeError}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" className={actionButton} onClick={() => setRegradeOpen(false)} disabled={regrading}>Cancel</Button>
                  <Button className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")} onClick={() => void regrade()} disabled={regrading}>
                    {regrading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Grading again…</> : <><RefreshCw className="mr-1.5 h-4 w-4" /> Regrade</>}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            {/* Toolbar */}
            <div className={cn(buttonRow, "rounded-2xl bg-white/95 p-2 shadow-lg shadow-blue-900/10 ring-1 ring-slate-200 print:hidden")}>
              {result.batchId && (
                <Button variant="ghost" asChild className={actionButton}>
                  <Link href={`/grade-exam/batch/${result.batchId}`}><Users className="mr-1.5 h-4 w-4" /> Class results</Link>
                </Button>
              )}
              {canEdit && !editing && (
                <Button onClick={() => setEditing(true)} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>
                  <Edit2 className="mr-1.5 h-4 w-4" /> Edit report
                </Button>
              )}
              {canEdit && result.canRegrade && !editing && (
                <Button variant="ghost" onClick={() => { setRegradeNote(''); setRegradeError(''); setRegradeOpen(true) }} className={actionButton}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> Regrade
                </Button>
              )}
              {canEdit && (
                <Button variant="ghost" aria-pressed={showOptions} onClick={() => setShowOptions((o) => !o)} className={cn(actionButton, showOptions && "bg-blue-50 text-blue-800 ring-blue-300 hover:bg-blue-50")}>
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Customize
                </Button>
              )}
              <Button variant="ghost" onClick={() => window.print()} className={actionButton}>
                <Printer className="mr-1.5 h-4 w-4" /> Print
              </Button>
              {result.pdfUrl && (
                <Button variant="ghost" onClick={() => window.open(result.pdfUrl!, '_blank')} className={actionButton}>
                  <Download className="mr-1.5 h-4 w-4" /> Graded PDF
                </Button>
              )}
              {canEdit && result.linkedStudent && (
                <label className="flex items-center gap-2 rounded-lg px-2 text-sm text-slate-700">
                  <Switch checked={result.released} onCheckedChange={(v) => void setReleased(v)} />
                  Visible to student
                </label>
              )}
              {canEdit && !editing && saveState !== 'idle' && (
                <span className={cn("ml-auto pr-2 text-xs", saveState === 'error' ? "text-red-600" : "text-slate-500")} aria-live="polite">
                  {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'All changes saved' : `Not saved: ${saveError || 'check your connection.'}`}
                </span>
              )}
            </div>

            {editing && canEdit && (
              <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-900 ring-1 ring-inset ring-blue-200 print:hidden">
                <strong>You&apos;re editing.</strong> Change names, marks and feedback right on the report. Changes save as you go; press <strong>Done</strong> (or Esc) when you&apos;re finished.
                {result.groupId && result.groupMembers.length > 1 && (
                  <label className="mt-2 flex items-center gap-2">
                    <Switch checked={applyToGroup} onCheckedChange={setApplyToGroup} />
                    Apply mark, feedback and comment changes to the whole group ({result.groupMembers.join(', ')})
                  </label>
                )}
              </p>
            )}
            <div className={cn("rounded-3xl border bg-white p-6 shadow-2xl shadow-blue-900/10 sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none", editing && canEdit ? "border-blue-300 ring-4 ring-blue-100" : "border-slate-200")}>
              {((result.groupId && result.groupMembers.length > 1) || result.daysLate != null) && (
                <div className="mb-4 flex flex-wrap gap-2">
                  {result.groupId && result.groupMembers.length > 1 && (
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-sm font-medium text-indigo-800 ring-1 ring-inset ring-indigo-200">
                      <Users className="h-4 w-4" />Group work: {result.groupMembers.join(', ')}
                    </p>
                  )}
                  {result.daysLate != null && (
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-800 ring-1 ring-inset ring-amber-200" title="Handed in after the class set was graded">
                      <Clock className="h-4 w-4" />{lateLabel(result.daysLate)}
                    </p>
                  )}
                </div>
              )}
              <ReportDocument draft={draft} onChange={patchDraft} editing={editing && canEdit} settings={settings} date={date} />
            </div>

            {editing && canEdit && (
              <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 print:hidden">
                <div className="flex items-center gap-4 rounded-2xl bg-slate-900 py-2.5 pl-5 pr-2.5 text-sm text-white shadow-2xl">
                  <span className="flex items-center gap-2" aria-live="polite">
                    {saveState === 'saving'
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                      : saveState === 'error'
                        ? <span className="text-rose-300">Not saved: {saveError || 'check your connection'}</span>
                        : <><Check className="h-4 w-4 text-emerald-400" />Editing · changes saved</>}
                  </span>
                  <Button size="sm" onClick={() => void finishEditing()} className="bg-white text-slate-900 hover:bg-slate-100">Done</Button>
                </div>
              </div>
            )}

            {isTeacher && (
              <div className="print:hidden">
                <Button onClick={() => router.push('/grade-exam')} variant="outline" className="w-full" size="lg">
                  <FileCheck className="mr-2 h-5 w-5" /> Grade another paper
                </Button>
              </div>
            )}
          </div>

          {showOptions && canEdit && (
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-blue-900/5 print:hidden lg:sticky lg:top-4">
              <h3 className={cn(fontDisplay, "mb-4 text-lg font-semibold text-slate-900")}>Customize report</h3>
              <ReportOptions
                settings={settings}
                onSettings={patchSettings}
                scale={draft.scale}
                onScale={(scale) => patchDraft({ scale })}
                onScaleDefault={() => draft.scale && patchSettings({ defaultScale: draft.scale })}
                markingStyle={draft.markingStyle}
                onMarkingStyle={(markingStyle) => patchDraft({ markingStyle })}
                possible={possible}
              />
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}
