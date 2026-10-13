"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, Check, Download, Edit2, FileCheck, Loader2, Printer, SlidersHorizontal, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import NavigationHeader from "@/components/navigation-header"
import { ReportDocument, reportTotals, type ReportDraft } from "@/components/grading/report/report-document"
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
  pdfUrl: string | null
  createdAt: string
  isOwner: boolean
  linkedStudent: boolean
  released: boolean
  reportSettings: ReportSettings
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
  }, [id, user?.id, authLoading])

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
          <Button onClick={() => router.push('/grade-exam')}>
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
            {/* Toolbar */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/95 p-2 shadow-lg shadow-blue-900/10 ring-1 ring-slate-200 print:hidden">
              {result.batchId && (
                <Button asChild variant="ghost" size="sm">
                  <Link href={`/grade-exam/batch/${result.batchId}`}><Users className="mr-1.5 h-4 w-4" /> Class results</Link>
                </Button>
              )}
              {canEdit && (
                <Button variant={editing ? "default" : "outline"} size="sm" onClick={() => setEditing((e) => !e)}>
                  {editing ? <><Check className="mr-1.5 h-4 w-4" /> Done editing</> : <><Edit2 className="mr-1.5 h-4 w-4" /> Edit</>}
                </Button>
              )}
              {canEdit && (
                <Button variant={showOptions ? "secondary" : "outline"} size="sm" onClick={() => setShowOptions((o) => !o)}>
                  <SlidersHorizontal className="mr-1.5 h-4 w-4" /> Customize
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" /> Print
              </Button>
              {result.pdfUrl && (
                <Button variant="outline" size="sm" onClick={() => window.open(result.pdfUrl!, '_blank')}>
                  <Download className="mr-1.5 h-4 w-4" /> Graded PDF
                </Button>
              )}
              {canEdit && result.linkedStudent && (
                <label className="flex items-center gap-2 rounded-lg px-2 text-sm text-slate-700">
                  <Switch checked={result.released} onCheckedChange={(v) => void setReleased(v)} />
                  Visible to student
                </label>
              )}
              {canEdit && (
                <span className={cn("ml-auto pr-2 text-xs", saveState === 'error' ? "text-red-600" : "text-slate-500")} aria-live="polite">
                  {saveState === 'saving' ? 'Saving...' : saveState === 'saved' ? 'All changes saved' : saveState === 'error' ? `Not saved: ${saveError || 'check your connection.'}` : ''}
                </span>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-blue-900/10 sm:p-8 print:rounded-none print:border-0 print:p-0 print:shadow-none">
              <ReportDocument draft={draft} onChange={patchDraft} editing={editing && canEdit} settings={settings} date={date} />
            </div>

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
