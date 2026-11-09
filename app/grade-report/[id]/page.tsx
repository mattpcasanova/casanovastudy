"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, Clock, Edit2, FileCheck, FileSearch, Loader2, PencilLine, Printer, RefreshCw, SlidersHorizontal, Users } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import NavigationHeader from "@/components/navigation-header"
import { PageLoader } from "@/components/ui/loader"
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
import { MarkedPages, PaperViewer } from "@/components/grading/report/paper-viewer"
import { pageForQuestion, pickPaperPages, type PaperPage } from "@/lib/grading/paper-pages"
import { QuestionPicker, type RegradeScope } from "@/components/grading/question-picker"
import { applyAnnotation, placeStamp, stampText, stampsOf, unmarkedCount, type StampTarget } from "@/lib/grading/mark-points"

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
  createdAt: string
  isOwner: boolean
  /** Saved pages + the set's answer key exist, so the owner can grade it again. */
  canRegrade?: boolean
  /** The paper's pages as signed links (owner only; empty when none were saved). */
  pages?: PaperPage[]
  linkedStudent: boolean
  groupId: string | null
  groupMembers: string[]
  released: boolean
  reportSettings: ReportSettings
  /** Handed in after being marked absent/missing; days after the set was first graded. */
  daysLate: number | null
  /** The other papers in the set (owner only), in name order, for moving paper to paper while marking. */
  setPapers?: Array<{ id: string; name: string; toMark: number }>
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
  // Marking the paper herself: marks are clicked beside the paper (a lighter edit mode).
  const [marking, setMarking] = useState(false)
  const [showOptions, setShowOptions] = useState(false)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState('')
  const [applyToGroup, setApplyToGroup] = useState(true)
  // Regrade: a note for the grader, then the paper is graded again from its saved pages.
  const [regradeOpen, setRegradeOpen] = useState(false)
  const [regradeNote, setRegradeNote] = useState('')
  const [regradeScope, setRegradeScope] = useState<RegradeScope>([])
  const [regrading, setRegrading] = useState(false)
  const [regradeError, setRegradeError] = useState('')
  const [regradeResult, setRegradeResult] = useState<{ totalBefore: number; totalAfter: number; changed: Array<{ question: string; before: number | null; after: number }>; notRegraded: string[] } | null>(null)
  const [reloadKey, setReloadKey] = useState(0)
  // The paper beside the report (signed page links from the API, teacher only).
  const [paperOpen, setPaperOpen] = useState(false)
  const [paperPage, setPaperPage] = useState(0)
  // The mark just given, waiting to be put on the paper (the next click on the page places it).
  const [placing, setPlacing] = useState<StampTarget | null>(null)
  // The question the palette's notes go on (the last one clicked; the first unmarked to begin with).
  const [focusQuestion, setFocusQuestion] = useState<number | null>(null)
  // "Put the marks on the paper for me": the model finds each answer's height, the marks go in the margin there.
  const [placingAll, setPlacingAll] = useState(false)
  const [placeNote, setPlaceNote] = useState('')

  const isTeacher = user?.user_type === 'teacher'
  const canEdit = !!(isTeacher && result?.isOwner)
  const pages = pickPaperPages(result?.pages)
  const showPageFor = useCallback((questionIndex: number) => {
    // The page the grader recorded for this answer, else a guess from its place on the paper.
    const recorded = draft?.breakdown[questionIndex]?.pages?.[0]
    setPaperPage(recorded && recorded <= pages.length ? recorded - 1 : pageForQuestion(questionIndex, draft?.breakdown.length ?? 0, pages.length))
    setPaperOpen(true)
  }, [draft?.breakdown, pages.length])

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
        // A paper waiting for the teacher's marks opens ready to mark, with the paper beside it.
        setFocusQuestion(null)
        if (data.data.isOwner && (unmarkedCount(data.data.gradeBreakdown) > 0 || new URLSearchParams(window.location.search).get('mark') === '1')) {
          setMarking(true)
          setEditing(true)
          if (data.data.pages?.length && window.matchMedia('(min-width: 1024px)').matches) setPaperOpen(true)
        }
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
      const res = await authFetch(`/api/grade-exam/${id}/regrade`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(regradeScope ? { note: regradeNote, questions: regradeScope } : { note: regradeNote }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not regrade')
      setRegradeResult({ totalBefore: data.totalBefore, totalAfter: data.totalAfter, changed: data.changed ?? [], notRegraded: data.notRegraded ?? [] })
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
    setMarking(false)
    setPlacing(null)
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
        <PageLoader label="Opening the report" fill />
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

  const { possible } = reportTotals(draft)
  const studentName = `${draft.firstName} ${draft.lastName}`.trim() || 'Student'
  // Customize: a side column normally; right under the toolbar while the paper has the side column (it used to land below the report, out of sight).
  const optionsPanel = (
    <aside className={cn("h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-lg shadow-blue-900/5 print:hidden", !(paperOpen && pages.length) && "lg:sticky lg:top-4")}>
      <div className="mb-4 flex items-center justify-between gap-2">
        <h3 className={cn(fontDisplay, "text-lg font-semibold text-slate-900")}>Customize report</h3>
        <Button variant="ghost" size="sm" onClick={() => setShowOptions(false)} className={actionButton}>Done</Button>
      </div>
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
  )
  const date = new Date(result.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const toMark = unmarkedCount(draft.breakdown)
  const stamps = pages.length ? stampsOf(draft.breakdown) : []
  const focusAt = focusQuestion ?? Math.max(0, draft.breakdown.findIndex((q) => q.unmarked))
  const usesCodes = !!draft.markingStyle.codes || draft.breakdown.some((q) => q.markCodes || q.points?.some((p) => p.code))
  const placingStamp = placing && stamps.find((s) => s.target.question === placing.question && s.target.point === placing.point)
  // A mark sheet the teacher fills in herself (set up with "I'll mark them myself").
  const isSheet = toMark > 0 || draft.breakdown.some((q) => q.points?.length)
  // Paper to paper while marking: the next one in name order (papers still to mark first).
  const others = result.setPapers ?? []
  const here = others.findIndex((p) => p.id === result.id)
  const prevPaper = here > 0 ? others[here - 1] : null
  // The next one still to mark (wrapping round to earlier names), else simply the next paper.
  const nextPaper = here >= 0 ? (others.slice(here + 1).find((p) => p.toMark > 0) ?? others.slice(0, here).find((p) => p.toMark > 0) ?? others[here + 1] ?? null) : null
  const placeAll = async () => {
    if (!draft) return
    setPlacingAll(true); setPlaceNote('')
    try {
      await saveDraft(draft) // the marks as they stand now
      const res = await authFetch(`/api/grade-exam/${id}/place`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Could not place the marks')
      patchDraft({ breakdown: data.breakdown })
      setPlaceNote(`${data.placed ? `Marks placed for ${data.placed} question${data.placed === 1 ? '' : 's'}. Drag any that landed wrong.` : 'Nothing new to place.'}${data.missing?.length ? ` Couldn't find ${data.missing.map((m: string) => `Q${m}`).join(', ')} on the page.` : ''}`)
    } catch (e) {
      setPlaceNote(e instanceof Error ? e.message : 'Could not place the marks')
    } finally {
      setPlacingAll(false)
    }
  }
  const goToPaper = async (paperId: string) => {
    await saveDraft(draft)
    setPlacing(null)
    setPaperPage(0)
    window.scrollTo({ top: 0 })
    router.push(`/grade-report/${paperId}?mark=1`)
  }

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
        <div className={cn("mx-auto grid gap-6", paperOpen && pages.length ? "max-w-[1700px] lg:grid-cols-[minmax(0,1fr)_minmax(380px,44%)]" : showOptions && canEdit ? "max-w-6xl lg:grid-cols-[minmax(0,1fr)_320px]" : "max-w-4xl")}>
          <div className="min-w-0 space-y-4">
            {regradeResult && (
              <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-900 ring-1 ring-inset ring-emerald-200 print:hidden" role="status">
                <p className="font-semibold">Regraded: {regradeResult.totalBefore} → {regradeResult.totalAfter} marks{regradeResult.changed.length ? `, ${regradeResult.changed.length} question${regradeResult.changed.length === 1 ? '' : 's'} changed` : ', no question changed'}.</p>
                {regradeResult.changed.length > 0 && <p className="mt-1">{regradeResult.changed.map((c) => `Q${c.question}: ${c.before ?? '–'} → ${c.after}`).join(' · ')}</p>}
                {regradeResult.notRegraded.length > 0 && <p className="mt-1">Couldn&apos;t find {regradeResult.notRegraded.map((q) => `Q${q}`).join(', ')} on the paper, so {regradeResult.notRegraded.length === 1 ? 'it was' : 'they were'} left as {regradeResult.notRegraded.length === 1 ? 'it was' : 'they were'}.</p>}
              </div>
            )}
            <Dialog open={regradeOpen} onOpenChange={setRegradeOpen}>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>{isSheet ? 'Let the grader mark this paper' : 'Regrade this paper'}</DialogTitle>
                  <DialogDescription>{isSheet && regradeScope === null
                    ? "The paper is marked against the set's answer key from its pages, with feedback on each question, in about a minute. Marks and notes you put on this paper are replaced; you can change anything after."
                    : regradeScope
                    ? "Only the questions you pick are graded again, against the set's answer key. Everything else on this report stays as it is."
                    : "The whole paper is graded again from its pages against the set's answer key. New marks and feedback replace the current ones (edits you made to this report are lost; extra credit stays). About a minute."}</DialogDescription>
                </DialogHeader>
                <QuestionPicker questions={(draft?.breakdown ?? []).map((q) => String(q.questionNumber))} value={regradeScope} onChange={setRegradeScope} />
                <label className="block text-sm">
                  <span className="font-medium text-slate-800">Tell the grader what to look at (optional)</span>
                  <textarea value={regradeNote} onChange={(e) => setRegradeNote(e.target.value)} rows={3} placeholder="e.g. Question 8 is circled C, not A. Accept 'bent' without an angle for 31d." className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-base" />
                </label>
                {regradeError && <p className="rounded-lg bg-rose-50 p-2 text-sm text-rose-800">{regradeError}</p>}
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="ghost" className={actionButton} onClick={() => setRegradeOpen(false)} disabled={regrading}>Cancel</Button>
                  <Button className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")} onClick={() => void regrade()} disabled={regrading || (regradeScope !== null && !regradeScope.length)}>
                    {regrading ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Grading again…</> : <><RefreshCw className="mr-1.5 h-4 w-4" /> {regradeScope === null ? 'Regrade the paper' : regradeScope.length ? `Regrade ${regradeScope.length} question${regradeScope.length === 1 ? '' : 's'}` : 'Pick a question'}</>}
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
              {canEdit && !editing && isSheet && (
                <Button onClick={() => { setMarking(true); setEditing(true); if (pages.length && window.matchMedia('(min-width: 1024px)').matches) setPaperOpen(true) }} className={cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>
                  <PencilLine className="mr-1.5 h-4 w-4" /> {toMark > 0 ? 'Mark this paper' : 'Change marks'}
                </Button>
              )}
              {canEdit && !editing && (
                <Button variant={isSheet ? "ghost" : "default"} onClick={() => setEditing(true)} className={isSheet ? actionButton : cn(actionButtonPrimary, "bg-blue-600 hover:bg-blue-700")}>
                  <Edit2 className="mr-1.5 h-4 w-4" /> Edit report
                </Button>
              )}
              {pages.length > 0 && (
                <Button variant="ghost" aria-pressed={paperOpen} onClick={() => setPaperOpen((o) => !o)} className={cn(actionButton, paperOpen && "bg-blue-50 text-blue-800 ring-blue-300 hover:bg-blue-50")}>
                  <FileSearch className="mr-1.5 h-4 w-4" /> {paperOpen ? 'Hide the paper' : canEdit ? 'View the paper' : stamps.length ? 'See your marked paper' : 'See your paper'}
                </Button>
              )}
              {canEdit && result.canRegrade && (!editing || toMark > 0) && (
                <Button variant="ghost" onClick={() => { setRegradeNote(''); setRegradeError(''); setRegradeScope(toMark > 0 ? null : []); setRegradeOpen(true) }} className={actionButton}>
                  <RefreshCw className="mr-1.5 h-4 w-4" /> {toMark > 0 ? 'Let the grader mark it' : 'Regrade'}
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

            {showOptions && canEdit && paperOpen && pages.length > 0 && optionsPanel}
            {editing && canEdit && (
              <p className="rounded-xl bg-blue-50 px-4 py-2.5 text-sm text-blue-900 ring-1 ring-inset ring-blue-200 print:hidden">
                {marking
                  ? <><strong>You&apos;re marking.</strong> Click each mark the student earned (click again to take it back), or pick the number. {pages.length > 0 ? 'With the paper open, click the page to put that mark on it, or pick a note from the row above the page. Students see the marked paper once you make the report visible to them. ' : ''}Marks save as you go.</>
                  : <><strong>You&apos;re editing.</strong> Change names, marks and feedback right on the report. Changes save as you go; press <strong>Done</strong> (or Esc) when you&apos;re finished.</>}
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
              <ReportDocument draft={draft} onChange={patchDraft} editing={editing && canEdit} marking={marking && canEdit} onGiven={marking && paperOpen && pages.length ? (t) => { setPlacing(t); setFocusQuestion(t.question) } : undefined} placing={placing} focusQuestion={marking ? focusAt : undefined} onFocusQuestion={marking ? setFocusQuestion : undefined} settings={settings} date={date} onShowPage={canEdit && pages.length ? showPageFor : undefined} owner={canEdit} />
            </div>

            {editing && canEdit && (
              <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 print:hidden">
                <div className="flex items-center gap-4 rounded-2xl bg-slate-900 py-2.5 pl-5 pr-2.5 text-sm text-white shadow-2xl">
                  <span className="flex items-center gap-2" aria-live="polite">
                    {saveState === 'saving'
                      ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</>
                      : saveState === 'error'
                        ? <span className="text-rose-300">Not saved: {saveError || 'check your connection'}</span>
                        : <><Check className="h-4 w-4 text-emerald-400" />{marking ? (toMark > 0 ? `${draft.breakdown.length - toMark} of ${draft.breakdown.length} marked · saved` : 'All marked · saved') : 'Editing · changes saved'}</>}
                  </span>
                  {marking && prevPaper && (
                    <Button size="sm" variant="ghost" onClick={() => void goToPaper(prevPaper.id)} className="text-white hover:bg-white/10 hover:text-white" aria-label={`Previous paper: ${prevPaper.name}`}>
                      <ArrowLeft className="h-4 w-4" /><span className="ml-1 hidden sm:inline">Previous</span>
                    </Button>
                  )}
                  {marking && nextPaper ? (
                    <Button size="sm" onClick={() => void goToPaper(nextPaper.id)} className="bg-white text-slate-900 hover:bg-slate-100" title={nextPaper.name}>
                      Next paper<ArrowRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : null}
                  <Button size="sm" onClick={() => void finishEditing()} className={marking && nextPaper ? "bg-white/10 text-white hover:bg-white/20" : "bg-white text-slate-900 hover:bg-slate-100"}>Done</Button>
                </div>
              </div>
            )}

            <MarkedPages pages={pages} stamps={stamps} studentName={studentName} />

            {isTeacher && (
              <div className="print:hidden">
                <Button onClick={() => router.push('/grade-exam')} variant="outline" className="w-full" size="lg">
                  <FileCheck className="mr-2 h-5 w-5" /> Grade another paper
                </Button>
              </div>
            )}
          </div>

          {paperOpen && pages.length > 0 && (
            <div className="min-w-0 lg:sticky lg:top-4 lg:h-[calc(100vh-2rem)]">
              <PaperViewer
                pages={pages} page={paperPage} onPage={setPaperPage} studentName={studentName} onClose={() => { setPaperOpen(false); setPlacing(null) }}
                stamps={stamps}
                placing={placing && editing ? { text: stampText(draft.breakdown, placing), question: draft.breakdown[placing.question]?.questionNumber ?? '', placed: !!placingStamp } : null}
                onPlace={(at) => { if (placing) { patchDraft({ breakdown: placeStamp(draft.breakdown, placing, at) }); setPlacing(null) } }}
                onPickStamp={editing ? (s) => setPlacing(s.target) : undefined}
                onRemovePlacing={() => { if (placing) { patchDraft({ breakdown: placeStamp(draft.breakdown, placing, undefined) }); setPlacing(null) } }}
                onCancelPlacing={() => setPlacing(null)}
                autoPlace={editing && canEdit && draft.breakdown.some((q) => !q.unmarked) ? { busy: placingAll, note: placeNote, onClick: () => void placeAll() } : null}
                palette={editing && canEdit && draft.breakdown[focusAt] ? { question: draft.breakdown[focusAt].questionNumber, examBoard: usesCodes, onPick: (a) => { const r = applyAnnotation(draft.breakdown, focusAt, a); if (r.breakdown !== draft.breakdown) patchDraft({ breakdown: r.breakdown }); setPlacing(r.target) } } : null}
              />
            </div>
          )}
          {showOptions && canEdit && !(paperOpen && pages.length > 0) && optionsPanel}
        </div>
      </div>
    </div>
  )
}
