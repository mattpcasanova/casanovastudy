"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Circle, Clock, CreditCard, HelpCircle, List, Puzzle, ScrollText, Sparkles, Flag, Lightbulb, FileText, History } from 'lucide-react'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import { parsePlan, type PlanUnit, type PlanUnitFormat } from '@/lib/formats/plan'
import { normalizeGuideMarkdown } from '@/lib/formats/normalize'
import { StudyMarkdown } from './study-markdown'
import { usePersistentSet } from './guide-parts'

interface PlanFormatProps {
  content: string
  studyGuideId: string
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
// (/?plan=<id>&unit=<key> prefills the generator), linked back through
// study_guides.parent_guide_id. "Studied" is a per-browser checkmark.
export default function PlanFormat({ content, studyGuideId }: PlanFormatProps) {
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

function UnitCard({ unit, planId, child, done, isNext, onToggle }: {
  unit: PlanUnit
  planId: string
  child?: ChildGuide
  done: boolean
  isNext: boolean
  onToggle: () => void
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
        <UnitAction unit={unit} planId={planId} child={child} tone="light" />
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
