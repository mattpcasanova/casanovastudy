"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle, Clock, CreditCard, HelpCircle, List, Puzzle, ScrollText, Sparkles, Flag, Lightbulb, FileText, History, CalendarDays, Loader2, AlertCircle, X } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import { parsePlan, unitStudyRequest, type PlanUnit, type PlanUnitFormat } from '@/lib/formats/plan'
import { scheduleUnits, fromISODate, toISODate, type PlanSchedule, type DaysPerWeek } from '@/lib/formats/schedule'
import { loadProgress, saveProgress } from '@/lib/progress'
import { generateGuide } from '@/lib/generate-guide'
import { normalizeGuideMarkdown } from '@/lib/formats/normalize'
import { StudyMarkdown } from './study-markdown'
import { usePersistentSet } from './guide-parts'

interface PlanFormatProps {
  content: string
  studyGuideId: string
  title: string
  subject: string
  gradeLevel: string
  isOwner: boolean
}

type GenStatus = 'queued' | 'running' | 'error'

// "2026-10-07" → "Wed, Oct 7" / "Today" / "Tomorrow"
function friendlyDate(iso: string): string {
  const today = toISODate(new Date())
  const tomorrow = toISODate(new Date(Date.now() + 86_400_000))
  if (iso === today) return 'Today'
  if (iso === tomorrow) return 'Tomorrow'
  return fromISODate(iso).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// Test-date schedule: browser copy for instant render, account copy wins.
function usePlanSchedule(guideId: string): [PlanSchedule | null, (s: PlanSchedule | null) => void] {
  const key = `cs:schedule:${guideId}`
  const [schedule, setSchedule] = useState<PlanSchedule | null>(null)
  useEffect(() => {
    try { const raw = localStorage.getItem(key); if (raw) setSchedule(JSON.parse(raw)) } catch {}
    let cancelled = false
    loadProgress<{ schedule?: PlanSchedule | null }>(guideId, 'schedule').then((remote) => {
      if (cancelled || !remote || !('schedule' in remote)) return
      setSchedule(remote.schedule ?? null)
      try { localStorage.setItem(key, JSON.stringify(remote.schedule ?? null)) } catch {}
    })
    return () => { cancelled = true }
  }, [guideId, key])
  const update = useCallback((next: PlanSchedule | null) => {
    setSchedule(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
    void saveProgress(guideId, 'schedule', { schedule: next })
  }, [guideId, key])
  return [schedule, update]
}

const UNIT_FORMAT: Record<PlanUnitFormat, { label: string; icon: typeof List; text: string; bg: string }> = {
  outline: { label: 'Outline', icon: List, text: 'text-blue-700', bg: 'bg-blue-50' },
  flashcards: { label: 'Flashcards', icon: CreditCard, text: 'text-indigo-700', bg: 'bg-indigo-50' },
  quiz: { label: 'Quiz', icon: HelpCircle, text: 'text-purple-700', bg: 'bg-purple-50' },
  summary: { label: 'Summary', icon: ScrollText, text: 'text-green-700', bg: 'bg-green-50' },
  practice: { label: 'Practice', icon: Puzzle, text: 'text-orange-700', bg: 'bg-orange-50' },
  cheatsheet: { label: 'Cheat sheet', icon: FileText, text: 'text-slate-700', bg: 'bg-slate-100' },
  timeline: { label: 'Timeline', icon: History, text: 'text-fuchsia-700', bg: 'bg-fuchsia-50' },
}

// "45 min", "1 hour", "1.5 hours", "1 hr 30 min" → minutes (0 if unknown).
function minutesOf(time: string): number {
  const t = time.toLowerCase()
  const h = t.match(/(\d+(?:\.\d+)?)\s*(?:h|hr|hrs|hour|hours)\b/)
  const m = t.match(/(\d+)\s*(?:m|min|mins|minute|minutes)\b/)
  return Math.round((h ? parseFloat(h[1]) * 60 : 0) + (m ? parseInt(m[1], 10) : 0))
}

function formatMinutes(total: number): string {
  if (total <= 0) return ''
  if (total < 60) return `${total} min`
  const h = total / 60
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h === 1 ? '' : 's'}`
}

interface ChildGuide { id: string; title: string; plan_unit: string | null; created_at: string }

// A plan is the roadmap; each unit becomes its own guide via the homepage
// (/?plan=<id>&unit=<key> fills in the generator and starts building), linked back through
// study_guides.parent_guide_id. "Studied" is a per-browser checkmark.
export default function PlanFormat({ content, studyGuideId, title, subject, gradeLevel, isOwner }: PlanFormatProps) {
  const plan = useMemo(() => parsePlan(content), [content])
  const units = useMemo(() => plan.phases.flatMap((p) => p.units), [plan])
  const { user } = useAuth()
  const [children, setChildren] = useState<Record<string, ChildGuide>>({})
  const [studied, toggleStudied] = usePersistentSet(`cs:plan:${studyGuideId}`)

  useEffect(() => {
    if (!user) return
    let cancelled = false
    supabase
      .from('study_guides')
      .select('id, title, plan_unit, created_at')
      .eq('parent_guide_id', studyGuideId)
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (cancelled || !data) return
        const map: Record<string, ChildGuide> = {}
        for (const g of data as ChildGuide[]) if (g.plan_unit) map[g.plan_unit] = g // latest wins
        setChildren(map)
      })
    return () => { cancelled = true }
  }, [studyGuideId, user])

  const [schedule, setSchedule] = usePlanSchedule(studyGuideId)
  const remainingKeys = useMemo(() => units.filter((u) => !studied.has(u.key)).map((u) => u.key), [units, studied])
  const paced = useMemo(() => (schedule ? scheduleUnits(remainingKeys, schedule) : null), [schedule, remainingKeys])

  // "Create all remaining guides": two at a time, each linked back to this plan.
  const [gen, setGen] = useState<Record<string, GenStatus>>({})
  const [confirmAll, setConfirmAll] = useState(false)
  const abortRef = useRef<AbortController | null>(null)
  const running = Object.values(gen).some((g) => g === 'queued' || g === 'running')
  const missing = units.filter((u) => !children[u.key])

  useEffect(() => () => abortRef.current?.abort(), [])
  useEffect(() => {
    if (!running) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault() }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [running])

  const generateAll = async () => {
    const queue = [...missing]
    if (!queue.length) return
    const controller = new AbortController()
    abortRef.current = controller
    setGen(Object.fromEntries(queue.map((u) => [u.key, 'queued' as GenStatus])))
    const worker = async () => {
      while (queue.length && !controller.signal.aborted) {
        const unit = queue.shift()!
        setGen((g) => ({ ...g, [unit.key]: 'running' }))
        try {
          const id = await generateGuide({
            studyGuideName: unit.title,
            subject: subject || 'general',
            gradeLevel: gradeLevel || 'general',
            format: unit.format,
            studyRequest: unitStudyRequest(title, unit),
            sourcePolicy: 'expand',
            planId: studyGuideId,
            planUnit: unit.key,
          }, controller.signal)
          setChildren((c) => ({ ...c, [unit.key]: { id, title: unit.title, plan_unit: unit.key, created_at: new Date().toISOString() } }))
          setGen((g) => { const next = { ...g }; delete next[unit.key]; return next })
        } catch {
          if (controller.signal.aborted) return
          setGen((g) => ({ ...g, [unit.key]: 'error' }))
        }
      }
    }
    await Promise.all([worker(), worker()])
  }

  const totalMinutes = units.reduce((sum, u) => sum + minutesOf(u.time), 0)
  const doneCount = units.filter((u) => studied.has(u.key)).length
  const pct = units.length ? Math.round((doneCount / units.length) * 100) : 0
  const nextUp = units.find((u) => !studied.has(u.key))

  if (units.length === 0) {
    // Not a parseable plan — show it as a document rather than nothing.
    return (
      <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10')}>
        <StudyMarkdown content={normalizeGuideMarkdown(content)} />
      </div>
    )
  }

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-4xl space-y-8')}>
      {/* Progress summary */}
      <div className="grid gap-4 md:grid-cols-[1fr_1.2fr] print:hidden">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className={cn(eyebrow, 'text-teal-700')}>Your progress</p>
          <p className={cn(fontDisplay, 'mt-2 text-4xl font-semibold text-slate-900')}>
            {doneCount}<span className="text-2xl text-slate-400"> / {units.length}</span>
          </p>
          <p className="text-sm text-slate-500">units studied{totalMinutes > 0 && ` · about ${formatMinutes(totalMinutes)} in total`}</p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
        </div>
        {nextUp ? (
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-teal-600 to-cyan-600 p-6 text-white shadow-lg shadow-teal-900/10">
            <Flag className="absolute -right-4 -top-4 h-28 w-28 rotate-12 text-white/10" />
            <p className={cn(eyebrow, 'text-teal-100')}>Next up · Unit {nextUp.number}</p>
            <p className={cn(fontDisplay, 'mt-2 text-2xl font-semibold leading-snug')}>{nextUp.title}</p>
            {nextUp.goal && <p className="mt-1 text-sm text-teal-50/90">{nextUp.goal}</p>}
            <UnitAction unit={nextUp} planId={studyGuideId} child={children[nextUp.key]} tone="dark" />
          </div>
        ) : (
          <div className="flex flex-col justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-6 text-white shadow-lg">
            <CheckCircle2 className="mb-2 h-8 w-8" />
            <p className={cn(fontDisplay, 'text-2xl font-semibold')}>Plan complete!</p>
            <p className="text-sm text-emerald-50">Revisit any unit, or retake its guide&apos;s quiz or practice to stay sharp.</p>
          </div>
        )}
      </div>

      <ScheduleCard schedule={schedule} onChange={setSchedule} paced={paced} remaining={remainingKeys.length} />

      {isOwner && (missing.length > 0 || running) && (
        <div className="flex flex-col gap-3 rounded-2xl border border-teal-200 bg-teal-50/60 p-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <p className="text-sm text-slate-700">
            {running
              ? <><Loader2 className="mr-1.5 inline h-4 w-4 animate-spin text-teal-600" />Creating your guides: {Object.values(gen).filter((g) => g !== 'error').length} left. Keep this tab open; each unit links up as it finishes.</>
              : <><span className="font-semibold text-slate-900">{missing.length} unit{missing.length === 1 ? '' : 's'}</span> {missing.length === 1 ? "doesn't have its" : "don't have their"} guide yet. Create them all at once instead of one by one.</>}
          </p>
          {running ? (
            <button type="button" onClick={() => { abortRef.current?.abort(); setGen({}) }} className="shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium text-slate-600 hover:bg-white">
              Stop
            </button>
          ) : (
            <button type="button" onClick={() => setConfirmAll(true)} className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700">
              <Sparkles className="h-4 w-4" /> Create all {missing.length} guides
            </button>
          )}
        </div>
      )}

      <AlertDialog open={confirmAll} onOpenChange={setConfirmAll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create {missing.length} guides?</AlertDialogTitle>
            <AlertDialogDescription>
              Each unit gets its own guide in the format the plan suggests, linked back to this plan. It takes about {Math.max(1, Math.ceil(missing.length / 2))} minute{missing.length > 2 ? 's' : ''}. Keep this tab open while it runs.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-teal-600 hover:bg-teal-700" onClick={() => { void generateAll() }}>Create them</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {plan.overview && (
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <h2 className={cn(fontDisplay, 'mb-3 text-xl font-semibold text-slate-900')}>{plan.overview.title}</h2>
          <StudyMarkdown content={normalizeGuideMarkdown(plan.overview.body)} />
        </section>
      )}

      {/* Phases as a timeline */}
      {plan.phases.map((phase, pi) => (
        <section key={phase.title + pi}>
          <div className="mb-4 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-600 text-sm font-bold text-white shadow-sm">{pi + 1}</span>
            <h2 className={cn(fontDisplay, 'text-2xl font-semibold text-slate-900')}>{phase.title.replace(/^phase\s*\d+\s*[:.\-–—]\s*/i, '')}</h2>
            <span className="text-sm text-slate-400">{phase.units.length} unit{phase.units.length === 1 ? '' : 's'}</span>
          </div>
          <ol className="relative ml-4 space-y-4 border-l-2 border-slate-200 pl-7">
            {phase.units.map((unit) => (
              <UnitCard
                key={unit.key}
                unit={unit}
                planId={studyGuideId}
                child={children[unit.key]}
                done={studied.has(unit.key)}
                isNext={nextUp?.key === unit.key}
                onToggle={() => toggleStudied(unit.key)}
                dueDate={paced?.byUnit[unit.key]}
                genStatus={gen[unit.key]}
              />
            ))}
          </ol>
        </section>
      ))}

      {plan.extras.map((section, i) => (
        <section key={section.title + i} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-6 sm:p-8">
          <h2 className={cn(fontDisplay, 'mb-3 flex items-center gap-2 text-xl font-semibold text-slate-900')}>
            <Lightbulb className="h-5 w-5 text-amber-500" /> {section.title}
          </h2>
          <StudyMarkdown content={normalizeGuideMarkdown(section.body)} />
        </section>
      ))}
    </div>
  )
}

function UnitCard({ unit, planId, child, done, isNext, onToggle, dueDate, genStatus }: {
  unit: PlanUnit
  planId: string
  child?: ChildGuide
  done: boolean
  isNext: boolean
  onToggle: () => void
  dueDate?: string
  genStatus?: GenStatus
}) {
  const fmt = UNIT_FORMAT[unit.format]
  const Icon = fmt.icon
  return (
    <li className="relative">
      {/* Timeline node */}
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={done ? `Mark unit ${unit.number} as not studied` : `Mark unit ${unit.number} as studied`}
        onClick={onToggle}
        className="absolute -left-[2.55rem] top-5 rounded-full bg-slate-50 outline-none transition hover:scale-110 focus-visible:ring-2 focus-visible:ring-teal-500 print:hidden"
      >
        {done ? <CheckCircle2 className="h-6 w-6 text-emerald-500" /> : <Circle className={cn('h-6 w-6', isNext ? 'text-teal-500' : 'text-slate-300')} />}
      </button>
      <article
        className={cn(
          'rounded-2xl border bg-white p-5 shadow-sm transition-shadow hover:shadow-md print:break-inside-avoid',
          isNext ? 'border-teal-300 ring-4 ring-teal-500/10' : 'border-slate-200',
          done && 'bg-slate-50/80'
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-xs font-medium">
          {/* Printed plans get a box to tick off by hand */}
          <span aria-hidden className="hidden h-4 w-4 rounded-sm border-2 border-slate-500 print:inline-block" />
          <span className="text-slate-400">Unit {unit.number}</span>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', fmt.bg, fmt.text)}>
            <Icon className="h-3.5 w-3.5" /> {fmt.label}
          </span>
          {unit.time && (
            <span className="inline-flex items-center gap-1 text-slate-500"><Clock className="h-3.5 w-3.5" /> {unit.time}</span>
          )}
          {done && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">Studied</span>}
          {!done && dueDate && (
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5', dueDate === toISODate(new Date()) ? 'bg-teal-600 text-white' : 'bg-teal-50 text-teal-700')}>
              <CalendarDays className="h-3.5 w-3.5" /> {friendlyDate(dueDate)}
            </span>
          )}
        </div>
        <h3 className={cn(fontDisplay, 'mt-2 text-lg font-semibold leading-snug', done ? 'text-slate-500' : 'text-slate-900')}>{unit.title}</h3>
        {unit.goal && <p className="mt-1 text-sm leading-relaxed text-slate-600">{unit.goal}</p>}
        {unit.covers.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {unit.covers.map((c) => (
              <span key={c} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{c}</span>
            ))}
          </div>
        )}
        {genStatus ? (
          <p className={cn('mt-4 inline-flex items-center gap-1.5 text-sm font-medium print:hidden', genStatus === 'error' ? 'text-rose-600' : 'text-teal-700')}>
            {genStatus === 'running' && <><Loader2 className="h-4 w-4 animate-spin" /> Creating this guide…</>}
            {genStatus === 'queued' && <><Clock className="h-4 w-4" /> Waiting its turn…</>}
            {genStatus === 'error' && <><AlertCircle className="h-4 w-4" /> Couldn&apos;t create it. Try this one on its own.</>}
          </p>
        ) : null}
        {genStatus !== 'running' && genStatus !== 'queued' && <UnitAction unit={unit} planId={planId} child={child} tone="light" />}
      </article>
    </li>
  )
}

function UnitAction({ unit, planId, child, tone }: { unit: PlanUnit; planId: string; child?: ChildGuide; tone: 'light' | 'dark' }) {
  const createHref = `/?plan=${encodeURIComponent(planId)}&unit=${encodeURIComponent(unit.key)}`
  const primary = tone === 'dark'
    ? 'bg-white text-teal-700 hover:bg-teal-50'
    : 'bg-teal-600 text-white hover:bg-teal-700'
  const secondary = tone === 'dark'
    ? 'text-white/90 hover:text-white'
    : 'text-slate-500 hover:text-teal-700'
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 print:hidden">
      {child ? (
        <>
          <Link href={`/study-guide/${child.id}`} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition', primary)}>
            Open guide <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={createHref} className={cn('text-sm font-medium transition', secondary)}>Make another</Link>
        </>
      ) : (
        <Link href={createHref} className={cn('inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-semibold shadow-sm transition', primary)}>
          <Sparkles className="h-4 w-4" /> Create this guide
        </Link>
      )}
    </div>
  )
}

const DAY_OPTIONS: Array<{ value: DaysPerWeek; label: string }> = [
  { value: 3, label: '3 days a week (Mon/Wed/Fri)' },
  { value: 5, label: 'Weekdays' },
  { value: 7, label: 'Every day' },
]

function ScheduleCard({ schedule, onChange, paced, remaining }: {
  schedule: PlanSchedule | null
  onChange: (s: PlanSchedule | null) => void
  paced: ReturnType<typeof scheduleUnits> | null
  remaining: number
}) {
  const [editing, setEditing] = useState(false)
  const [date, setDate] = useState('')
  const [days, setDays] = useState<DaysPerWeek>(5)
  const tomorrow = toISODate(new Date(Date.now() + 86_400_000))

  const startEdit = () => {
    setDate(schedule?.testDate ?? '')
    setDays(schedule?.daysPerWeek ?? 5)
    setEditing(true)
  }

  if (editing || !schedule) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-600"><CalendarDays className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">Have a test date?</p>
            <p className="text-sm text-slate-500">Set it and we&apos;ll pace the units for you. It adjusts as you check units off.</p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center"
              onSubmit={(e) => {
                e.preventDefault()
                if (!date) return
                onChange({ testDate: date, daysPerWeek: days })
                setEditing(false)
              }}
            >
              <input
                type="date"
                required
                min={tomorrow}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                aria-label="Test date"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              />
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value) as DaysPerWeek)}
                aria-label="Study days per week"
                className="h-10 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-teal-500"
              >
                {DAY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <div className="flex gap-2">
                <button type="submit" className="h-10 rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700">Set schedule</button>
                {editing && (
                  <button type="button" onClick={() => setEditing(false)} className="h-10 rounded-lg px-3 text-sm font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
                )}
              </div>
            </form>
          </div>
        </div>
      </div>
    )
  }

  const past = !paced || paced.daysLeft <= 0
  const dayLabel = DAY_OPTIONS.find((o) => o.value === schedule.daysPerWeek)?.label.replace(/ \(.*\)$/, '').toLowerCase()
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center print:hidden">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white"><CalendarDays className="h-5 w-5" /></span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900">
          Test on {fromISODate(schedule.testDate).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          {!past && <span className="font-normal text-slate-500"> · {paced!.daysLeft} day{paced!.daysLeft === 1 ? '' : 's'} left</span>}
        </p>
        <p className="text-sm text-slate-600">
          {past
            ? 'That date has passed. Set a new one to keep pacing.'
            : remaining === 0
              ? 'Every unit is studied. Use the time left to review and retake quizzes.'
              : paced!.studyDays === 0
                ? 'No study days left before the test at this pace. Try "Every day".'
                : <>{remaining} unit{remaining === 1 ? '' : 's'} left · about <strong>{paced!.perWeek}</strong> a week ({dayLabel}){paced!.reviewDate ? <> · final review {friendlyDate(paced!.reviewDate)}</> : null}. Each unit shows its day below.</>}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button type="button" onClick={startEdit} className="rounded-lg px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50">Change</button>
        <button type="button" onClick={() => onChange(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600" aria-label="Remove schedule">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
