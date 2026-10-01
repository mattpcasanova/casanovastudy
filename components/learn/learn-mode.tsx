"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Brain, CheckCircle2, ChevronRight, Clock, Eye, Lightbulb, RotateCcw, Sparkles, Trophy, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import { loadProgress, saveProgress } from '@/lib/progress'
import { buildSession, gradeItem, summarize, MASTERED_BOX, type ItemState, type LearnState } from '@/lib/learn/scheduler'
import { ActivityBody, activityMeta } from '@/components/formats/practice-format'
import { InlineMarkdown, StudyMarkdown } from '@/components/formats/study-markdown'
import { QuestionStem } from '@/components/formats/question-stem'
import { GraphFence } from '@/components/formats/graph-figure'
import { DesmosHelpButton, ExplainButton } from '@/components/explain/explain-provider'
import { activityAsk, desmosActivityAsk } from '@/components/explain/asks'
import { useRecordResult } from '@/components/study-results-context'
import { InstallAppCard } from '@/components/pwa/pwa'
import type { LearnItem } from './items'

// ── Persisted state: instant browser copy + account copy (source of truth) ──
function useLearnState(guideId: string): [LearnState, (next: LearnState) => void, boolean] {
  const key = `cs:learn:${guideId}`
  const [state, setState] = useState<LearnState>({})
  const [ready, setReady] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let local: LearnState = {}
    try { local = JSON.parse(localStorage.getItem(key) || '{}') } catch {}
    setState(local)
    let cancelled = false
    loadProgress<{ items?: LearnState }>(guideId, 'learn').then((remote) => {
      if (cancelled) return
      if (remote?.items) {
        setState(remote.items)
        try { localStorage.setItem(key, JSON.stringify(remote.items)) } catch {}
      } else if (Object.keys(local).length) {
        void saveProgress(guideId, 'learn', { items: local })
      }
      setReady(true)
    })
    return () => { cancelled = true }
  }, [guideId, key])

  const update = useCallback((next: LearnState) => {
    setState(next)
    try { localStorage.setItem(key, JSON.stringify(next)) } catch {}
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => { void saveProgress(guideId, 'learn', { items: next }) }, 500)
  }, [guideId, key])

  return [state, update, ready]
}

function relativeDue(iso: string | null): string {
  if (!iso) return ''
  const days = Math.round((new Date(iso).getTime() - Date.now()) / 86_400_000)
  if (days <= 0) return 'later today'
  if (days === 1) return 'tomorrow'
  return `in ${days} days`
}

type Phase = 'start' | 'session' | 'done'

export default function LearnMode({ guideId, title, items }: { guideId: string; title: string; items: LearnItem[] }) {
  const [state, setState, ready] = useLearnState(guideId)
  const ids = useMemo(() => items.map((i) => i.id), [items])
  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items])
  const summary = summarize(ids, state)

  const [phase, setPhase] = useState<Phase>('start')
  const [queue, setQueue] = useState<string[]>([])
  const [pos, setPos] = useState(0)
  const [checked, setChecked] = useState(false)
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [firstTry, setFirstTry] = useState<Record<string, boolean>>({}) // first answer this session
  const [sessionSize, setSessionSize] = useState(0)
  const [attempt, setAttempt] = useState(0) // remount key for repeated items
  const presented = useRef<{ key: string; st?: ItemState } | null>(null)
  const logResult = useRecordResult()

  const start = (ahead = false) => {
    let session = buildSession(ids, state)
    // Nothing due: study ahead — weakest items first.
    if (ahead || session.length === 0) {
      session = [...ids].sort((a, b) => (state[a]?.box ?? 0) - (state[b]?.box ?? 0)).slice(0, 12)
    }
    setQueue(session)
    setSessionSize(session.length)
    setPos(0)
    setFirstTry({})
    setChecked(false)
    setRevealed(false)
    setLastCorrect(null)
    setPhase(session.length ? 'session' : 'done')
  }

  const current = phase === 'session' ? byId.get(queue[pos]) : undefined

  const record = (correct: boolean) => {
    if (!current || checked) return
    setChecked(true)
    setLastCorrect(correct)
    setState(gradeItem(state, current.id, correct))
    setFirstTry((f) => (current.id in f ? f : { ...f, [current.id]: correct }))
    // Only the first answer this session counts toward weak spots; re-queued
    // misses would otherwise inflate the item's accuracy.
    if (!(current.id in firstTry)) {
      logResult({
        source: 'learn',
        itemId: current.id,
        itemKind: current.kind === 'card' ? 'card' : current.activity.kind,
        topic: current.topic,
        correct,
      })
    }
    // Missed items come back at the end of this session until they stick.
    if (!correct) setQueue((q) => [...q, current.id])
  }

  const advance = useCallback(() => {
    setChecked(false)
    setRevealed(false)
    setLastCorrect(null)
    setAttempt((a) => a + 1)
    setPos((p) => {
      const next = p + 1
      if (next >= queue.length) setPhase('done')
      return next
    })
  }, [queue.length])

  // Keyboard: Space reveals a card, 1 = again, 2 = got it, Enter continues.
  useEffect(() => {
    if (phase !== 'session') return
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return
      if (checked && e.key === 'Enter') { e.preventDefault(); advance(); return }
      if (current?.kind === 'card' && !checked) {
        if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true) }
        else if (revealed && e.key === '1') record(false)
        else if (revealed && e.key === '2') record(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (items.length === 0) {
    return (
      <Shell guideId={guideId} title={title}>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
          This guide has no flashcards, questions or practice activities to learn from.
        </div>
      </Shell>
    )
  }

  const stats = (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {[
        { label: 'Due now', value: summary.due, cls: 'text-rose-600' },
        { label: 'New', value: summary.fresh, cls: 'text-blue-600' },
        { label: 'Learning', value: summary.learning, cls: 'text-amber-600' },
        { label: 'Mastered', value: summary.mastered, cls: 'text-emerald-600' },
      ].map((s) => (
        <div key={s.label} className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-100">
          <p className={cn(fontDisplay, 'text-2xl font-semibold tabular-nums', s.cls)}>{s.value}</p>
          <p className="text-xs font-medium text-slate-500">{s.label}</p>
        </div>
      ))}
    </div>
  )
  const masteryPct = summary.total ? Math.round((summary.mastered / summary.total) * 100) : 0

  if (phase === 'start') {
    const planned = buildSession(ids, state)
    const reviews = planned.filter((id) => state[id]).length
    return (
      <Shell guideId={guideId} title={title}>
        <InstallAppCard reason="Open Learn mode in one tap and study a few cards whenever you have a minute." />
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Brain className="h-6 w-6" /></span>
            <div>
              <p className={cn(eyebrow, 'text-violet-700')}>Learn mode</p>
              <p className="text-sm text-slate-500">Spaced repetition: you&apos;ll see things again right before you&apos;d forget them.</p>
            </div>
          </div>
          {stats}
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs font-medium text-slate-500"><span>Mastery</span><span>{masteryPct}%</span></div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-700" style={{ width: `${masteryPct}%` }} />
            </div>
          </div>
          <div className="mt-6 flex flex-col items-start gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
            {planned.length > 0 ? (
              <>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">Today&apos;s session: {planned.length} item{planned.length === 1 ? '' : 's'}</span>
                  <span className="text-slate-500"> · {reviews} review{reviews === 1 ? '' : 's'}, {planned.length - reviews} new · about {Math.max(2, Math.round(planned.length * 0.5))} min</span>
                </p>
                <Button size="lg" onClick={() => start()} disabled={!ready} className="bg-violet-600 text-white hover:bg-violet-700">
                  <Sparkles className="mr-2 h-4 w-4" /> Start
                </Button>
              </>
            ) : (
              <>
                <p className="text-slate-700">
                  <span className="font-semibold text-emerald-700">All caught up!</span>
                  {summary.nextDue && <span className="text-slate-500"> Next review {relativeDue(summary.nextDue)}.</span>}
                </p>
                <Button variant="outline" onClick={() => start(true)}>Study ahead anyway</Button>
              </>
            )}
          </div>
        </div>
      </Shell>
    )
  }

  if (phase === 'done' || !current) {
    const answered = Object.keys(firstTry).length
    const right = Object.values(firstTry).filter(Boolean).length
    const after = summarize(ids, state)
    return (
      <Shell guideId={guideId} title={title}>
        <div className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-600"><Trophy className="h-7 w-7" /></span>
          <p className={cn(eyebrow, 'text-slate-400')}>Session complete</p>
          <p className={cn(fontDisplay, 'mt-1 text-3xl font-semibold text-slate-900')}>{right} of {answered} right on the first try</p>
          <p className="mt-2 text-slate-600">
            {after.mastered} mastered · {after.learning} still learning
            {after.nextDue && <> · next review {relativeDue(after.nextDue)}</>}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {(after.due > 0 || after.fresh > 0) && (
              <Button onClick={() => start()} className="bg-violet-600 text-white hover:bg-violet-700">
                <RotateCcw className="mr-2 h-4 w-4" /> Keep going
              </Button>
            )}
            <Button asChild variant="outline"><Link href={`/study-guide/${guideId}`}>Back to guide</Link></Button>
          </div>
        </div>
      </Shell>
    )
  }

  // Label reflects the item as it was when shown, not after grading it.
  const presentedKey = `${current.id}-${attempt}`
  if (presented.current?.key !== presentedKey) presented.current = { key: presentedKey, st: state[current.id] }
  const itemState = presented.current.st
  const isRepeat = current.id in firstTry && !checked
  const meta = current.kind === 'activity' ? activityMeta(current.activity) : { label: 'Flashcard', icon: Brain }
  const Icon = meta.icon
  const doneCount = Math.min(pos, queue.length)

  return (
    <Shell guideId={guideId} title={title}>
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
          <span><span className="font-semibold text-slate-900">{doneCount}</span> of {queue.length}{queue.length > sessionSize && <span className="text-slate-400"> (incl. {queue.length - sessionSize} retr{queue.length - sessionSize === 1 ? 'y' : 'ies'})</span>}</span>
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500">
            <Clock className="h-3.5 w-3.5" />
            {!itemState ? 'New' : itemState.box === 0 ? 'Relearning' : itemState.box >= MASTERED_BOX ? 'Mastered · quick check' : `Review · level ${itemState.box}`}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="h-full rounded-full bg-violet-500 transition-all duration-300" style={{ width: `${(doneCount / Math.max(queue.length, 1)) * 100}%` }} />
        </div>
      </div>

      <div key={`${current.id}-${attempt}`} className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-violet-50/80 to-white px-5 py-3 sm:px-7">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-white"><Icon className="h-4 w-4" /></span>
          <span className={cn(eyebrow, 'text-violet-700')}>{meta.label}</span>
          {isRepeat && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-200">Try again</span>}
          {current.topic && <span className="ml-auto max-w-[55%] truncate rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">{current.topic}</span>}
        </div>

        <div className="p-5 sm:p-7">
          {current.kind === 'activity' ? (
            <ActivityBody activity={current.activity} checked={checked} onDone={(c) => record(c)} onContinue={advance} />
          ) : (
            <div>
              <p className={cn(fontDisplay, 'text-center text-xl font-medium leading-snug text-slate-900 sm:text-2xl')}>
                <QuestionStem text={current.front} listClassName="text-left" />
              </p>
              {current.figure && <div className="mx-auto mt-4 max-w-lg"><GraphFence text={current.figure} compact allowExplain={revealed} /></div>}
              {!revealed ? (
                <div className="mt-8 flex justify-center">
                  <Button size="lg" variant="outline" onClick={() => setRevealed(true)}>
                    <Eye className="mr-2 h-4 w-4" /> Show answer <span className="ml-2 text-xs text-slate-400">Space</span>
                  </Button>
                </div>
              ) : (
                <div className="mt-6 animate-fade-up">
                  <div className="rounded-xl bg-violet-50/60 p-5 ring-1 ring-inset ring-violet-100">
                    <StudyMarkdown content={current.back} compact />
                  </div>
                  <ExplainButton build={() => ({
                    label: `Explain this card: “${current.front.split('\n')[0].slice(0, 110)}”`,
                    prompt: `Explain this flashcard from my guide.\nQuestion: ${current.front}\nAnswer: ${current.back}`,
                  })} />
                  {!checked && (
                    <div className="mt-5 grid grid-cols-2 gap-3">
                      <Button variant="outline" size="lg" onClick={() => record(false)} className="border-rose-200 text-rose-700 hover:bg-rose-50">
                        <XCircle className="mr-2 h-4 w-4" /> Again <span className="ml-2 text-xs text-rose-300">1</span>
                      </Button>
                      <Button variant="outline" size="lg" onClick={() => record(true)} className="border-emerald-200 text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Got it <span className="ml-2 text-xs text-emerald-300">2</span>
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {checked && current.kind === 'activity' && (
            <div className={cn('mt-6 animate-fade-up rounded-xl p-4', lastCorrect ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : 'bg-rose-50 ring-1 ring-inset ring-rose-200')}>
              <p className={cn('flex items-center gap-2 font-semibold', lastCorrect ? 'text-emerald-800' : 'text-rose-800')}>
                {lastCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                {lastCorrect ? 'Correct!' : "Not quite. You'll see this one again shortly."}
              </p>
              {current.activity.explanation && (
                <p className="mt-2 flex gap-2 text-sm leading-relaxed text-slate-700">
                  <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                  <span><InlineMarkdown text={current.activity.explanation} /></span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                <ExplainButton build={() => activityAsk(current.activity)}>{lastCorrect ? 'Explain more' : 'Why?'}</ExplainButton>
                {(current.activity.kind === 'choice' || current.activity.kind === 'fill') && <DesmosHelpButton build={() => desmosActivityAsk(current.activity)} />}
              </div>
            </div>
          )}
        </div>

        {checked && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-7">
            <span className="text-xs text-slate-500">
              {lastCorrect ? `Next review ${relativeDue(state[current.id]?.due ?? null) || 'soon'}` : 'Coming back later this session'}
            </span>
            <Button onClick={advance} className="bg-violet-600 text-white hover:bg-violet-700">
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Shell>
  )
}

function Shell({ guideId, title, children }: { guideId: string; title: string; children: React.ReactNode }) {
  return (
    <div className={cn(displaySerif.variable, 'min-h-screen bg-slate-50')}>
      <div className="bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 text-white">
        <div className="container mx-auto max-w-3xl px-4 pb-10 pt-6">
          <Link href={`/study-guide/${guideId}`} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-sm font-medium text-white/90 hover:bg-white/20">
            <ArrowLeft className="h-4 w-4" /> Back to guide
          </Link>
          <p className={cn(eyebrow, 'mt-5 text-white/70')}>Learn</p>
          <h1 className={cn(fontDisplay, 'mt-1 break-words text-3xl font-semibold leading-tight sm:text-4xl')}>{title}</h1>
        </div>
      </div>
      <div className="container mx-auto -mt-5 max-w-3xl space-y-5 px-4 pb-16">{children}</div>
    </div>
  )
}
