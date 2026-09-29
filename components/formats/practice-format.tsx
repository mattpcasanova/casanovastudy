"use client"

import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Flame, Lightbulb, RotateCcw, SkipForward, Trophy, XCircle, Shuffle as ShuffleIcon, ListOrdered, Puzzle, PencilLine, Columns2, HelpCircle, Bug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import {
  parsePractice, isBlankCorrect, normalizeAnswer, seededShuffle, isTrueFalse,
  type PracticeActivity, type MatchActivity, type FillActivity, type OrderActivity, type SortActivity, type ChoiceActivity, type BugActivity,
} from '@/lib/formats/practice'
import { InlineMarkdown } from './study-markdown'
import { QuestionStem } from './question-stem'
import { CodeBlock, CodeLines } from './code-view'
import { GraphFence } from './graph-figure'
import { ExplainButton } from '@/components/explain/explain-provider'
import { activityAsk } from '@/components/explain/asks'
import { PracticeWorksheet } from './practice-worksheet'

interface PracticeFormatProps {
  content: string
  subject: string
}

const KIND_META: Record<PracticeActivity['kind'], { label: string; icon: typeof Puzzle }> = {
  match: { label: 'Matching', icon: Puzzle },
  fill: { label: 'Fill in the blank', icon: PencilLine },
  order: { label: 'Put in order', icon: ListOrdered },
  sort: { label: 'Sort it out', icon: Columns2 },
  choice: { label: 'Question', icon: HelpCircle },
  bug: { label: 'Find the bug', icon: Bug },
}

type Outcome = { correct: boolean; note?: string }

export default function PracticeFormat({ content }: PracticeFormatProps) {
  const all = useMemo(() => parsePractice(content), [content])
  if (all.length === 0) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No practice activities were found in this guide.</div>
  }
  return <PracticeSession activities={all} />
}

/**
 * Runs a list of practice activities one at a time with instant feedback,
 * score/streak and a results screen.
 * - variant "page": the standalone Practice format (full-width, window-level Enter).
 * - variant "inline": a compact card embedded in a custom guide.
 */
export function PracticeSession({
  activities: all,
  variant = 'page',
  title,
}: {
  activities: PracticeActivity[]
  variant?: 'page' | 'inline'
  title?: string
}) {
  const inline = variant === 'inline'
  const [subset, setSubset] = useState<string[] | null>(null)
  const activities = useMemo(() => (subset ? all.filter((a) => subset.includes(a.id)) : all), [all, subset])
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Record<string, Outcome>>({})
  const [checked, setChecked] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [round, setRound] = useState(0) // bumps to remount activities on restart
  const topRef = useRef<HTMLDivElement>(null)

  const done = index >= activities.length
  const current = activities[Math.min(index, activities.length - 1)]

  const record = (correct: boolean, note?: string) => {
    if (!current) return
    setResults((r) => ({ ...r, [current.id]: { correct, note } }))
    setChecked(true)
    const next = correct ? streak + 1 : 0
    setStreak(next)
    setBestStreak((b) => Math.max(b, next))
  }

  const advance = () => {
    setChecked(false)
    setIndex((i) => i + 1)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const skip = () => {
    if (!current) return
    setResults((r) => ({ ...r, [current.id]: { correct: false } }))
    setStreak(0)
    advance()
  }

  const restart = (ids: string[] | null) => {
    setSubset(ids)
    setResults({})
    setIndex(0)
    setChecked(false)
    setStreak(0)
    setRound((r) => r + 1)
  }

  // Enter continues once an activity has been checked. The page session listens
  // on the window; inline sessions only react to keys inside their own card so
  // several practice blocks on one page don't all advance together.
  const onEnter = (e: { key: string; target: EventTarget | null; preventDefault: () => void }) => {
    if (e.key !== 'Enter' || !checked || done) return
    const t = e.target as HTMLElement | null
    if (t?.tagName === 'INPUT') return // the fill input handles its own Enter
    e.preventDefault()
    advance()
  }
  useEffect(() => {
    if (inline) return
    window.addEventListener('keydown', onEnter)
    return () => window.removeEventListener('keydown', onEnter)
  })

  if (all.length === 0) return null

  const correctCount = activities.filter((a) => results[a.id]?.correct).length
  // Printing swaps the one-at-a-time session for a full worksheet + answer key.
  const worksheet = <PracticeWorksheet activities={all} title={inline ? title : undefined} className={cn('hidden print:block', inline && 'my-4')} />

  if (done) {
    return (
      <>
        <div className="print:hidden">
          <Results activities={activities} results={results} bestStreak={bestStreak} onRestart={restart} isRetry={!!subset} inline={inline} title={title} />
        </div>
        {worksheet}
      </>
    )
  }

  const meta = isTrueFalse(current) ? { label: 'True or false', icon: HelpCircle } : KIND_META[current.kind]
  const Icon = meta.icon
  const outcome = checked ? results[current.id] : undefined

  const segments = (
    <div className={cn('flex gap-1', inline ? 'h-1.5' : 'h-2')}>
      {activities.map((a, i) => (
        <span
          key={a.id}
          className={cn(
            'h-full flex-1 rounded-full transition-colors duration-300',
            results[a.id] ? (results[a.id].correct ? 'bg-emerald-500' : 'bg-rose-400') : i === index ? 'bg-orange-300' : inline ? 'bg-orange-100' : 'bg-slate-100'
          )}
        />
      ))}
    </div>
  )

  const score = (
    <div className="flex items-center gap-3 text-sm">
      <span className="inline-flex items-center gap-1 text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="font-semibold tabular-nums text-slate-900">{correctCount}</span></span>
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums transition', streak >= 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400')}>
        <Flame className="h-4 w-4" /> {streak}
      </span>
    </div>
  )

  const body = (
    <>
      <div className={inline ? 'px-5 py-5 sm:px-6' : 'p-5 sm:p-7'}>
        {inline && (
          <p className={cn(eyebrow, 'mb-2 flex items-center gap-1.5 text-orange-700')}>
            <Icon className="h-3.5 w-3.5" /> {meta.label} · {index + 1} of {activities.length}
          </p>
        )}
        <ActivityBody
          activity={current}
          checked={checked}
          onDone={record}
          onContinue={advance}
          compact={inline}
          autoFocus={!inline || Object.keys(results).length > 0}
        />

        {outcome && (
          <div className={cn('mt-6 animate-fade-up rounded-xl p-4', outcome.correct ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : outcome.note ? 'bg-amber-50 ring-1 ring-inset ring-amber-200' : 'bg-rose-50 ring-1 ring-inset ring-rose-200')}>
            <p className={cn('flex items-center gap-2 font-semibold', outcome.correct ? 'text-emerald-800' : outcome.note ? 'text-amber-800' : 'text-rose-800')}>
              {outcome.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
              {outcome.correct ? (streak >= 3 ? `Correct! ${streak} in a row.` : 'Correct!') : outcome.note ?? 'Not quite. Review the answer above.'}
            </p>
            {current.explanation && (
              <p className="mt-2 flex gap-2 text-sm leading-relaxed text-slate-700">
                <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span><InlineMarkdown text={current.explanation} /></span>
              </p>
            )}
            <ExplainButton build={() => activityAsk(current)}>{outcome.correct ? 'Explain more' : 'Why?'}</ExplainButton>
          </div>
        )}
      </div>
      <div className={cn('flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60', inline ? 'px-5 py-2.5 sm:px-6' : 'px-5 py-3 sm:px-7')}>
        {!checked ? (
          <button type="button" onClick={skip} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
            <SkipForward className="h-4 w-4" /> Skip
          </button>
        ) : <span />}
        {checked && (
          <Button onClick={advance} size={inline ? 'sm' : 'default'} className="bg-orange-500 text-white hover:bg-orange-600">
            {index === activities.length - 1 ? 'See results' : 'Continue'} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </>
  )

  if (inline) {
    return (
      <>
      <div ref={topRef} onKeyDown={onEnter} className="scroll-mt-36 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm print:hidden">
        <div className="space-y-2 border-b border-orange-100 bg-orange-50/60 px-5 py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-orange-900">
              <Puzzle className="h-4 w-4 shrink-0 text-orange-600" />
              <span className="truncate">{title && title.trim().toLowerCase() !== 'practice' ? title : 'Practice'}</span>
            </p>
            {score}
          </div>
          {segments}
        </div>
        <div key={`${current.id}-${round}`} className="animate-fade-up">{body}</div>
      </div>
      {worksheet}
      </>
    )
  }

  return (
    <>
    <div ref={topRef} className={cn(displaySerif.variable, 'mx-auto max-w-3xl scroll-mt-6 space-y-5 print:hidden')}>
      {/* Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mb-2.5 flex items-center justify-between gap-3 text-sm">
          <span className="text-slate-600">
            Activity <span className="font-semibold text-slate-900">{index + 1}</span> of {activities.length}
          </span>
          {score}
        </div>
        {segments}
      </div>

      {/* Activity */}
      <div key={`${current.id}-${round}`} className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/80 to-white px-5 py-3 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white"><Icon className="h-4 w-4" /></span>
            <span className={cn(eyebrow, 'text-orange-700')}>{meta.label}</span>
            {current.topic && <span className="ml-auto max-w-[55%] truncate rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">{current.topic}</span>}
          </div>
        </div>
        {body}
      </div>
    </div>
    <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl')}>{worksheet}</div>
    </>
  )
}

/** Label + icon for an activity's kind (true/false shown separately from MC). */
export function activityMeta(a: PracticeActivity): { label: string; icon: typeof Puzzle } {
  return isTrueFalse(a) ? { label: 'True or false', icon: HelpCircle } : KIND_META[a.kind]
}

/**
 * One activity's prompt, optional code snippet and interactive body. Shared by
 * PracticeSession and Learn mode. `onDone(correct, note?)` fires once when the
 * activity is answered; remount (via `key`) to reset it.
 */
export function ActivityBody({ activity, checked, onDone, onContinue, compact = false, autoFocus = true }: {
  activity: PracticeActivity
  checked: boolean
  onDone: (correct: boolean, note?: string) => void
  onContinue: () => void
  compact?: boolean
  autoFocus?: boolean
}) {
  return (
    <>
      {activity.kind !== 'fill' && activity.prompt && (
        <p className={cn(fontDisplay, 'font-medium leading-snug text-slate-900', compact ? 'mb-4 text-lg' : 'mb-5 text-xl sm:text-[1.45rem]')}>
          <QuestionStem text={activity.prompt} />
        </p>
      )}
      {activity.figure && <GraphFence text={activity.figure} compact />}
      {activity.code && activity.kind !== 'bug' && <CodeBlock lang={activity.code.lang} text={activity.code.text} compact className="mb-5 mt-0" />}
      {activity.kind === 'match' && <MatchBoard activity={activity} onDone={onDone} />}
      {activity.kind === 'fill' && <FillBlank activity={activity} onDone={onDone} checked={checked} onContinue={onContinue} compact={compact} autoFocus={autoFocus} />}
      {activity.kind === 'order' && <OrderList activity={activity} onDone={onDone} checked={checked} />}
      {activity.kind === 'sort' && <SortBoard activity={activity} onDone={onDone} checked={checked} />}
      {activity.kind === 'choice' && <Choice activity={activity} onDone={onDone} checked={checked} />}
      {activity.kind === 'bug' && <BugHunt activity={activity} onDone={onDone} checked={checked} />}
    </>
  )
}

// ── Activities ──────────────────────────────────────────────────────────────

function MatchBoard({ activity, onDone }: { activity: MatchActivity; onDone: (correct: boolean, note?: string) => void }) {
  const terms = useMemo(() => activity.pairs.map((p, i) => ({ ...p, i })), [activity])
  const defs = useMemo(() => seededShuffle(terms, activity.id), [terms, activity.id])
  const [selTerm, setSelTerm] = useState<number | null>(null)
  const [selDef, setSelDef] = useState<number | null>(null)
  const [matched, setMatched] = useState<Set<number>>(new Set())
  const [wrong, setWrong] = useState<[number, number] | null>(null)
  const mistakes = useRef(0)
  const finished = useRef(false)

  const attempt = (t: number, d: number) => {
    if (t === d) {
      const next = new Set(matched).add(t)
      setMatched(next)
      if (next.size === terms.length && !finished.current) {
        finished.current = true
        const m = mistakes.current
        onDone(m === 0, m ? `All matched, with ${m} miss${m === 1 ? '' : 'es'}. Try it clean next time.` : undefined)
      }
    } else {
      mistakes.current++
      setWrong([t, d])
      setTimeout(() => setWrong(null), 650)
    }
    setSelTerm(null)
    setSelDef(null)
  }

  const tile = (active: boolean, isMatched: boolean, isWrong: boolean) =>
    cn(
      'w-full rounded-xl border-2 px-3.5 py-3 text-left text-[0.95rem] leading-snug transition-all duration-150',
      isMatched ? 'cursor-default border-emerald-300 bg-emerald-50 text-emerald-900 opacity-80'
        : isWrong ? 'animate-shake border-rose-400 bg-rose-50'
        : active ? 'border-orange-500 bg-orange-50 shadow-sm'
        : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40'
    )

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Tap a term, then its match. {mistakes.current > 0 && <span className="text-rose-600">{mistakes.current} miss{mistakes.current === 1 ? '' : 'es'}</span>}</p>
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-2.5">
          {terms.map((t) => (
            <button
              key={t.i}
              type="button"
              disabled={matched.has(t.i)}
              onClick={() => (selDef !== null ? attempt(t.i, selDef) : setSelTerm(selTerm === t.i ? null : t.i))}
              className={cn(tile(selTerm === t.i, matched.has(t.i), wrong?.[0] === t.i), 'font-semibold')}
            >
              <InlineMarkdown text={t.term} />
            </button>
          ))}
        </div>
        <div className="space-y-2.5">
          {/* Once everything is matched, line definitions up with their terms. */}
          {(matched.size === terms.length ? terms : defs).map((d) => (
            <button
              key={d.i}
              type="button"
              disabled={matched.has(d.i)}
              onClick={() => (selTerm !== null ? attempt(selTerm, d.i) : setSelDef(selDef === d.i ? null : d.i))}
              className={cn(tile(selDef === d.i, matched.has(d.i), wrong?.[1] === d.i), 'text-slate-700')}
            >
              <InlineMarkdown text={d.definition} />
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

function FillBlank({ activity, onDone, checked, onContinue, compact = false, autoFocus = true }: { activity: FillActivity; onDone: (c: boolean) => void; checked: boolean; onContinue: () => void; compact?: boolean; autoFocus?: boolean }) {
  const blanks = activity.parts.filter((p): p is { answers: string[] } => typeof p !== 'string')
  const [values, setValues] = useState<string[]>(() => blanks.map(() => ''))
  const firstInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (autoFocus) firstInput.current?.focus({ preventScroll: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const results = blanks.map((b, k) => isBlankCorrect(values[k], b.answers))
  const check = () => {
    if (checked || values.every((v) => !v.trim())) return
    onDone(results.every(Boolean))
  }

  let k = -1
  return (
    <div>
      <p className={cn(fontDisplay, 'leading-[2.4] text-slate-900', compact ? 'text-lg' : 'text-xl sm:text-[1.4rem]')}>
        {activity.parts.map((part, idx) => {
          if (typeof part === 'string') return <InlineMarkdown key={idx} text={part} />
          k++
          const n = k
          const ok = results[n]
          const width = Math.max(6, Math.min(18, Math.max(...part.answers.map((a) => a.length)) + 2))
          return (
            <span key={idx} className="inline-flex flex-col align-baseline">
              <input
                ref={n === 0 ? firstInput : undefined}
                value={values[n]}
                disabled={checked}
                onChange={(e) => setValues((v) => v.map((x, j) => (j === n ? e.target.value : x)))}
                onKeyDown={(e) => {
                  if (e.key !== 'Enter') return
                  e.preventDefault()
                  if (checked) onContinue()
                  else check()
                }}
                style={{ width: `${width}ch` }}
                aria-label={`Blank ${n + 1}`}
                className={cn(
                  'mx-1 rounded-lg border-b-2 bg-orange-50/60 px-2 py-0.5 text-center font-sans text-lg font-semibold outline-none transition',
                  !checked ? 'border-orange-400 focus:bg-orange-100/70' : ok ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-rose-500 bg-rose-50 text-rose-800 line-through decoration-rose-400'
                )}
              />
              {checked && !ok && <span className="mx-1 text-center font-sans text-sm font-semibold leading-tight text-emerald-700">{part.answers[0]}</span>}
              {checked && ok && !part.answers.some((ans) => normalizeAnswer(ans) === normalizeAnswer(values[n])) && (
                <span className="mx-1 text-center font-sans text-xs font-medium leading-tight text-emerald-700">spelled {part.answers[0]}</span>
              )}
            </span>
          )
        })}
      </p>
      {!checked && (
        <div className="mt-5 flex items-center gap-3">
          <Button onClick={check} disabled={values.every((v) => !v.trim())} className="bg-orange-500 text-white hover:bg-orange-600">Check</Button>
          <span className="text-xs text-slate-400">or press Enter · spelling slips are OK</span>
        </div>
      )}
    </div>
  )
}

function OrderList({ activity, onDone, checked }: { activity: OrderActivity; onDone: (c: boolean) => void; checked: boolean }) {
  const [items, setItems] = useState(() => seededShuffle(activity.items, activity.id))
  const move = (from: number, to: number) => {
    if (to < 0 || to >= items.length) return
    setItems((list) => {
      const next = [...list]
      const [x] = next.splice(from, 1)
      next.splice(to, 0, x)
      return next
    })
  }
  const correctAt = (i: number) => items[i] === activity.items[i]

  return (
    <div>
      <ol className="space-y-2">
        {items.map((item, i) => (
          <li
            key={item}
            className={cn(
              'flex items-center gap-3 rounded-xl border-2 bg-white px-3 py-2.5 transition-all duration-200',
              !checked ? 'border-slate-200' : correctAt(i) ? 'border-emerald-300 bg-emerald-50' : 'border-rose-300 bg-rose-50'
            )}
          >
            <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold', !checked ? 'bg-orange-100 text-orange-700' : correctAt(i) ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white')}>
              {i + 1}
            </span>
            <span className="flex-1 text-[0.97rem] leading-snug text-slate-800"><InlineMarkdown text={item} /></span>
            {!checked && (
              <span className="flex shrink-0 gap-1">
                <button type="button" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Move up" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button type="button" onClick={() => move(i, i + 1)} disabled={i === items.length - 1} aria-label="Move down" className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {checked && !items.every((_, i) => correctAt(i)) && (
        <div className="mt-4 rounded-xl bg-slate-50 p-4 ring-1 ring-inset ring-slate-200">
          <p className={cn(eyebrow, 'mb-2 text-slate-500')}>Correct order</p>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-700 marker:font-semibold marker:text-emerald-600">
            {activity.items.map((it) => <li key={it}><InlineMarkdown text={it} /></li>)}
          </ol>
        </div>
      )}
      {!checked && <Button onClick={() => onDone(items.every((_, i) => correctAt(i)))} className="mt-5 bg-orange-500 text-white hover:bg-orange-600">Check order</Button>}
    </div>
  )
}

function SortBoard({ activity, onDone, checked }: { activity: SortActivity; onDone: (c: boolean) => void; checked: boolean }) {
  const all = useMemo(
    () => seededShuffle(activity.buckets.flatMap((b, bi) => b.items.map((text) => ({ key: `${bi}:${text}`, text, bucket: bi }))), activity.id),
    [activity]
  )
  const [placed, setPlaced] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const pool = all.filter((x) => placed[x.key] === undefined)

  const place = (key: string, bucket: number) => {
    setPlaced((p) => ({ ...p, [key]: bucket }))
    setSelected(null)
  }
  const unplace = (key: string) => {
    if (checked) return
    setPlaced((p) => { const n = { ...p }; delete n[key]; return n })
  }

  const chip = (x: { key: string; text: string; bucket: number }, inBucket: number | null) => {
    const state = checked && inBucket !== null ? (x.bucket === inBucket ? 'ok' : 'bad') : null
    return (
      <button
        key={x.key}
        type="button"
        draggable={!checked}
        onDragStart={(e) => e.dataTransfer.setData('text/plain', x.key)}
        onClick={() => (inBucket === null ? setSelected(selected === x.key ? null : x.key) : unplace(x.key))}
        className={cn(
          'rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all',
          state === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : state === 'bad' ? 'border-rose-300 bg-rose-50 text-rose-800'
            : selected === x.key ? 'border-orange-500 bg-orange-100 text-orange-900 shadow-sm'
            : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'
        )}
      >
        <InlineMarkdown text={x.text} />
        {state === 'bad' && <span className="ml-1 text-xs font-semibold text-emerald-700">→ {activity.buckets[x.bucket].name}</span>}
      </button>
    )
  }

  return (
    <div>
      {!checked && (
        <div className="mb-4 min-h-[3rem] rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-3">
          {pool.length ? (
            <div className="flex flex-wrap gap-2">{pool.map((x) => chip(x, null))}</div>
          ) : (
            <p className="py-1.5 text-center text-sm text-slate-400">All sorted. Check your answer, or tap an item to move it back.</p>
          )}
        </div>
      )}
      <p className="mb-2 text-sm text-slate-500">{checked ? '' : selected ? 'Now tap a group.' : 'Tap an item, then the group it belongs to (or drag it).'}</p>
      <div className={cn('grid gap-3', activity.buckets.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {activity.buckets.map((b, bi) => (
          <div
            key={b.name}
            onClick={() => selected && place(selected, bi)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); const key = e.dataTransfer.getData('text/plain'); if (key) place(key, bi) }}
            className={cn(
              'min-h-[7rem] rounded-xl border-2 p-3 transition',
              selected ? 'cursor-pointer border-orange-300 bg-orange-50/50 hover:border-orange-500' : 'border-slate-200 bg-white'
            )}
          >
            <p className="mb-2 font-semibold text-slate-900"><InlineMarkdown text={b.name} /></p>
            <div className="flex flex-wrap gap-2">{all.filter((x) => placed[x.key] === bi).map((x) => chip(x, bi))}</div>
          </div>
        ))}
      </div>
      {!checked && (
        <Button
          onClick={() => onDone(all.every((x) => placed[x.key] === x.bucket))}
          disabled={pool.length > 0}
          className="mt-5 bg-orange-500 text-white hover:bg-orange-600"
        >
          Check
        </Button>
      )}
    </div>
  )
}

function Choice({ activity, onDone, checked }: { activity: ChoiceActivity; onDone: (c: boolean) => void; checked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null)
  const isTF = activity.options.length === 2 && activity.options[0] === 'True'
  return (
    <div className={cn(isTF ? 'grid grid-cols-2 gap-3' : 'space-y-2.5')}>
      {activity.options.map((opt, i) => {
        const correct = checked && i === activity.correct
        const wrong = checked && picked === i && i !== activity.correct
        return (
          <button
            key={i}
            type="button"
            disabled={checked}
            onClick={() => { setPicked(i); onDone(i === activity.correct) }}
            className={cn(
              'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
              isTF && 'justify-center font-semibold',
              correct ? 'border-emerald-400 bg-emerald-50' : wrong ? 'border-rose-400 bg-rose-50' : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40',
              checked && !correct && !wrong && 'opacity-60'
            )}
          >
            {!isTF && (
              <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold', correct ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-500')}>
                {String.fromCharCode(65 + i)}
              </span>
            )}
            <span className="leading-snug text-slate-800"><InlineMarkdown text={opt} /></span>
            {correct && <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-emerald-600" />}
            {wrong && <XCircle className="ml-auto h-5 w-5 shrink-0 text-rose-600" />}
          </button>
        )
      })}
    </div>
  )
}

// ── Results ─────────────────────────────────────────────────────────────────

function BugHunt({ activity, onDone, checked }: { activity: BugActivity; onDone: (c: boolean) => void; checked: boolean }) {
  const [picked, setPicked] = useState<number | null>(null)
  const lines = activity.code.text.split('\n')
  const firstBug = activity.bugLines[0]
  return (
    <div>
      <p className="text-sm text-slate-500">
        {checked ? (activity.bugLines.length > 1 ? `The bugs are on lines ${activity.bugLines.join(' and ')}.` : `The bug is on line ${firstBug}.`) : 'Click the line with the bug.'}
      </p>
      <CodeLines
        lang={activity.code.lang}
        text={activity.code.text}
        picked={picked}
        disabled={checked}
        onPick={(n) => {
          if (checked) return
          setPicked(n)
          onDone(activity.bugLines.includes(n))
        }}
        lineState={checked ? (n) => (activity.bugLines.includes(n) ? 'correct' : n === picked ? 'wrong' : null) : undefined}
      />
      {checked && activity.fix && (
        <div className="study-code mt-3 overflow-x-auto rounded-xl bg-slate-900 py-2 font-mono text-[0.82rem] leading-relaxed ring-1 ring-slate-800">
          <div className="whitespace-pre bg-rose-500/15 px-4 text-rose-200"><span className="mr-3 select-none text-rose-400">−</span>{lines[firstBug - 1]?.trim()}</div>
          <div className="whitespace-pre bg-emerald-500/15 px-4 text-emerald-200"><span className="mr-3 select-none text-emerald-400">+</span>{activity.fix}</div>
        </div>
      )}
    </div>
  )
}

function Results({ activities, results, bestStreak, onRestart, isRetry, inline = false, title }: {
  activities: PracticeActivity[]
  results: Record<string, Outcome>
  bestStreak: number
  onRestart: (ids: string[] | null) => void
  isRetry: boolean
  inline?: boolean
  title?: string
}) {
  const correct = activities.filter((a) => results[a.id]?.correct).length
  const pct = activities.length ? Math.round((correct / activities.length) * 100) : 0
  const missed = activities.filter((a) => !results[a.id]?.correct)
  const message = pct >= 90 ? 'Outstanding. You really know this.' : pct >= 70 ? 'Nice work. A little more practice on the misses.' : pct >= 50 ? 'Good start. Run the missed ones again.' : 'Keep at it. Practice the missed activities.'

  const topics: Array<{ name: string; right: number; total: number }> = []
  for (const a of activities) {
    const name = a.topic || 'Practice'
    let t = topics.find((x) => x.name === name)
    if (!t) topics.push((t = { name, right: 0, total: 0 }))
    t.total++
    if (results[a.id]?.correct) t.right++
  }

  if (inline) {
    return (
      <div className="overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm print:hidden">
        <div className="flex items-center gap-2 border-b border-orange-100 bg-orange-50/60 px-5 py-3 text-sm font-semibold text-orange-900">
          <Puzzle className="h-4 w-4 text-orange-600" />
          <span className="truncate">{title && title.trim().toLowerCase() !== 'practice' ? title : 'Practice'}</span>
        </div>
        <div className="animate-fade-up px-6 py-7 text-center">
          <Trophy className={cn('mx-auto h-9 w-9', pct >= 80 ? 'text-amber-500' : 'text-orange-400')} />
          <p className={cn(fontDisplay, 'mt-2 text-3xl font-semibold text-slate-900')}>{correct} / {activities.length}</p>
          <p className="mt-1 text-sm text-slate-500">{message}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {missed.length > 0 && (
              <Button size="sm" onClick={() => onRestart(missed.map((a) => a.id))} className="bg-orange-500 text-white hover:bg-orange-600">
                <RotateCcw className="mr-1.5 h-4 w-4" /> Practice {missed.length} missed
              </Button>
            )}
            <Button size="sm" onClick={() => onRestart(null)} variant="outline"><ShuffleIcon className="mr-1.5 h-4 w-4" /> Start over</Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl space-y-5')}>
      <div className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600"><Trophy className="h-7 w-7" /></span>
        <p className={cn(eyebrow, 'text-slate-400')}>{isRetry ? 'Retry complete' : 'Practice complete'}</p>
        <p className={cn(fontDisplay, 'mt-1 text-5xl font-semibold text-slate-900')}>{pct}%</p>
        <p className="mt-1 text-slate-600">{correct} of {activities.length} right on the first try · best streak {bestStreak}</p>
        <p className={cn(fontDisplay, 'mt-3 text-xl text-slate-800')}>{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {missed.length > 0 && (
            <Button onClick={() => onRestart(missed.map((a) => a.id))} className="bg-orange-500 text-white hover:bg-orange-600">
              <RotateCcw className="mr-2 h-4 w-4" /> Practice {missed.length} missed
            </Button>
          )}
          <Button onClick={() => onRestart(null)} variant="outline"><ShuffleIcon className="mr-2 h-4 w-4" /> Start over</Button>
        </div>
      </div>
      {topics.length > 1 && (
        <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          {topics.map((t) => {
            const p = Math.round((t.right / t.total) * 100)
            return (
              <div key={t.name}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-slate-700">{t.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{t.right}/{t.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full', p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${p}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
