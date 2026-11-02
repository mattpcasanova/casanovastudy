"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowUp, CheckCircle2, ChevronRight, Flame, Lightbulb, RotateCcw, SkipForward, Terminal, Trophy, XCircle, Shuffle as ShuffleIcon, ListOrdered, Puzzle, PencilLine, Columns2, HelpCircle, Bug, Flag } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import {
  parsePractice, parsePracticeRaw, isBlankCorrect, normalizeAnswer, seededShuffle, isTrueFalse,
  type PracticeActivity, type MatchActivity, type FillActivity, type OrderActivity, type SortActivity, type ChoiceActivity, type BugActivity,
} from '@/lib/formats/practice'
import { InlineMarkdown } from './study-markdown'
import { ExplanationText } from './explanation-text'
import { QuestionStem } from './question-stem'
import { ReadAloudButton } from '@/components/reading/reading-provider'
import { questionForSpeech, textForSpeech } from '@/lib/reading/speech'
import { CodeBlock, CodeLines } from './code-view'
import { GraphFence } from './graph-figure'
import { DesmosHelpButton, ExplainButton } from '@/components/explain/explain-provider'
import { CheckWorkButton, HintLadder } from '@/components/explain/tutor-help'
import { activityAsk, desmosActivityAsk } from '@/components/explain/asks'
import { PracticeWorksheet } from './practice-worksheet'
import { CodeExerciseView } from './code-exercise'
import { useGuideHistory, useRecordResult } from '@/components/study-results-context'
import { useAttemptVersion } from '@/components/formats/use-attempt-version'
import { PreparingVersion } from '@/components/formats/preparing-version'
import { ChoiceActions, CrossOutButton, LockInButton, crossedClass, useCrossOut } from '@/components/formats/choice-tools'
import { TurnedInCard, useAssignmentCounts, useAssignmentFinish, useAssignmentTimeLimit } from '@/components/assign/assignment-context'
import { TimeLimitGate, TimeChip } from './quiz-format'
import { timeLimitText } from '@/lib/practice/assignments'
import { Timer } from 'lucide-react'
import { useRunProgress } from '@/lib/use-run-progress'
import { cleanPracticeRun, type PracticeRun } from '@/lib/run-progress-rules'
import { ResumeStrip } from './resume-strip'
import { useRouter } from 'next/navigation'
import { openHomeWithPrefill } from '@/lib/prefill'
import { missedPrefill, missedQuestionsFromGuide } from '@/lib/learner/missed'
import { WeakSpotBanner } from './weak-spot-banner'
import { AnswerTag } from './quiz-format'

interface PracticeFormatProps {
  content: string
  subject: string
  title?: string
  gradeLevel?: string
  /** Saves the run as it goes (left in class, finished at home). */
  studyGuideId?: string
}

const KIND_META: Record<PracticeActivity['kind'], { label: string; icon: typeof Puzzle }> = {
  match: { label: 'Matching', icon: Puzzle },
  fill: { label: 'Fill in the blank', icon: PencilLine },
  order: { label: 'Put in order', icon: ListOrdered },
  sort: { label: 'Sort it out', icon: Columns2 },
  choice: { label: 'Question', icon: HelpCircle },
  bug: { label: 'Find the bug', icon: Bug },
  write: { label: 'Write the code', icon: Terminal },
}

type Outcome = { correct: boolean; note?: string; given?: string; score?: number }
/**
 * How an activity reports its answer. Multi-part activities (matching, order,
 * sort, several blanks) give partial credit: `score` is the share of parts right
 * (0-1), so an activity is always worth 1 point but 5 of 6 pairs earns 0.83.
 */
type Done = (correct: boolean, note?: string, given?: string, score?: number) => void
/** Points earned on one activity (1 when fully right). */
const pointsFor = (o?: Outcome) => (!o ? 0 : o.correct ? 1 : o.score ?? 0)
/** "4.83" for fractional totals, "5" for whole ones. */
const points = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/0$/, ''))
const partNote = (right: number, total: number, what: string) => `Partly right: ${right} of ${total} ${what}.`

/**
 * Assigned work that counts: answers are locked in and the next activity comes
 * up without showing right or wrong; the review comes after the run is turned in.
 * Activities read this to say "Submit" instead of "Check".
 */
const FeedbackHeld = createContext(false)
const useHeld = () => useContext(FeedbackHeld)

/** The run's activities in play order: a retry subset, with "come back to it" ones moved to the end. */
function playOrder(all: PracticeActivity[], subset: string[] | null, later: string[]): PracticeActivity[] {
  const base = subset ? all.filter((a) => subset.includes(a.id)) : all
  if (later.length === 0) return base
  const putOff = later.map((id) => base.find((a) => a.id === id)).filter((a): a is PracticeActivity => !!a)
  return [...base.filter((a) => !later.includes(a.id)), ...putOff]
}

export default function PracticeFormat({ content, subject, title, gradeLevel, studyGuideId }: PracticeFormatProps) {
  // Another attempt gets new versions of the activities (use-attempt-version.ts).
  const ver = useAttemptVersion(content, studyGuideId)
  const all = useMemo(() => (ver.content ? parsePractice(ver.content, ver.seed) : []), [ver.content, ver.seed])
  const originalIds = useMemo(() => parsePracticeRaw(content).map((a) => a.id), [content])
  const router = useRouter()
  // What this student got wrong here last time (their latest answer to each activity).
  const history = useGuideHistory('p:')
  if (all.length === 0 && !ver.preparing) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No practice activities were found in this guide.</div>
  }
  const missedIds = history ? all.filter((a) => history.missedIds.includes(a.id)).map((a) => a.id) : []
  return (
    <PracticeSession
      activities={all}
      progressKey={studyGuideId}
      version={{ number: ver.version, preparing: ver.preparing, count: originalIds.length, ids: originalIds, next: ver.next, startNext: ver.startNext }}
      lastMissed={missedIds.length ? {
        ids: missedIds,
        topics: history?.topics ?? [],
        newQuiz: () => router.push(openHomeWithPrefill(missedPrefill({ title: title || 'this practice set', subject, gradeLevel }, missedQuestionsFromGuide(content, missedIds.map((id) => `p:${id}`))))),
      } : undefined}
    />
  )
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
  lastMissed,
  progressKey,
  version,
}: {
  activities: PracticeActivity[]
  variant?: 'page' | 'inline'
  title?: string
  /** Guide id: save the run as it goes and put it back on return (page variant). */
  progressKey?: string
  /** Activities the student got wrong last time, for the "Retry those" nudge (page variant). */
  lastMissed?: { ids: string[]; topics: string[]; newQuiz: () => void }
  /** Page variant: new versions of the activities for another try (use-attempt-version.ts). */
  version?: { number: number; preparing: boolean; count: number; ids: string[]; next: { label: string; assigned: boolean; waiting?: boolean } | null; startNext: () => void }
}) {
  const inline = variant === 'inline'
  const [subset, setSubset] = useState<string[] | null>(null)
  // Activities the student put off ("Come back to it") move to the end of the run.
  const [later, setLater] = useState<string[]>([])
  const activities = useMemo(() => playOrder(all, subset, later), [all, subset, later])
  const [index, setIndex] = useState(0)
  const [results, setResults] = useState<Record<string, Outcome>>({})
  const [checked, setChecked] = useState(false)
  const [streak, setStreak] = useState(0)
  const [bestStreak, setBestStreak] = useState(0)
  const [round, setRound] = useState(0) // bumps to remount activities on restart
  // The teacher's time limit on assigned work (page runs that count): wall clock from Start, hands the run in at zero.
  const limit = useAssignmentTimeLimit()
  const limited = variant === 'page' && limit != null && !subset
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState(() => Date.now())
  const topRef = useRef<HTMLDivElement>(null)
  const logResult = useRecordResult()
  const logged = useRef(new Set<string>()) // first answer per activity per run

  const done = activities.length > 0 && index >= activities.length
  const current = activities[Math.min(index, activities.length - 1)]

  // Save the run as it goes; put a saved one back (started in class, finished at home).
  const counts = useAssignmentCounts()
  const hold = variant === 'page' && counts && !subset
  // With versions, ids come from the original (every version has the same ones; a saved run must survive while its version loads).
  const ids = useMemo(() => version?.ids ?? all.map((a) => a.id), [all, version?.ids])
  const cleanRun = useCallback((raw: unknown) => cleanPracticeRun(raw, ids), [ids])
  const progress = useRunProgress<PracticeRun>(variant === 'page' ? progressKey : undefined, 'practice', cleanRun)
  const [resumed, setResumed] = useState(false)
  useEffect(() => {
    const run = progress.restored
    if (!run) return
    const order = playOrder(all, run.subset, run.later)
    // An activity answered but not yet continued past: start on the next one.
    const at = run.results[order[run.index]?.id] ? run.index + 1 : run.index
    setSubset(run.subset)
    setLater(run.later)
    setResults(run.results)
    setIndex(at)
    setChecked(false)
    setStreak(run.streak)
    setBestStreak(run.bestStreak)
    setStartedAt(run.startedAt ?? null)
    setRound((r) => r + 1)
    logged.current = new Set(Object.keys(run.results))
    reported.current = false
    setResumed(true)
  }, [progress.restored, all])
  const { save: saveRun, clear: clearRun } = progress
  useEffect(() => {
    if (done || (index === 0 && !Object.keys(results).length && !later.length && !startedAt)) return
    saveRun({ index, results, later, subset, streak, bestStreak, startedAt: startedAt ?? undefined })
  }, [done, index, results, later, subset, streak, bestStreak, startedAt, saveRun])
  // The countdown: a tick a second while the limited run is going; at zero the run ends with what's answered.
  useEffect(() => {
    if (!limited || !startedAt || done) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [limited, startedAt, done])
  const secondsUsed = limited && startedAt ? Math.max(0, Math.floor((now - startedAt) / 1000)) : 0
  const timeUp = limited && !!startedAt && limit != null && secondsUsed >= limit
  useEffect(() => {
    if (!timeUp || done) return
    setChecked(false)
    setIndex(activities.length)
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [timeUp, done, activities.length])
  // A finished run is over: the results screen shows it, and next time starts fresh.
  useEffect(() => { if (done) clearRun() }, [done, clearRun])
  // Assigned practice: a full run on the practice page counts (not inline blocks or missed-only retries).
  const reportAssignment = useAssignmentFinish()
  const reported = useRef(false)
  useEffect(() => {
    if (!done || reported.current || !reportAssignment || variant !== 'page' || subset || !activities.length) return
    reported.current = true
    const answers = activities.filter((a) => results[a.id]).map((a) => ({ id: `p:${a.id}`, correct: !!results[a.id].correct, ...(results[a.id].given ? { given: results[a.id].given } : {}), ...(results[a.id].score ? { score: results[a.id].score } : {}) }))
    const earned = Math.round(activities.reduce((sum, a) => sum + pointsFor(results[a.id]), 0) * 100) / 100
    // A new version's answers wouldn't match the original's wording in the teacher's report, so only right/wrong (and partial credit) goes.
    const v = version?.number ?? 0
    reportAssignment({ correct: earned, total: activities.length, seconds: limited && startedAt ? Math.max(0, Math.round((Date.now() - startedAt) / 1000)) : undefined, detail: { answers: v ? answers.map(({ given: _g, ...rest }) => rest) : answers, ...(v ? { version: v } : {}) } })
  }, [done, reportAssignment, variant, subset, activities, results, limited, startedAt, version?.number])

  const record: Done = (correct, note, given, score) => {
    if (!current) return
    if (!logged.current.has(current.id)) {
      logged.current.add(current.id)
      logResult({
        source: inline ? 'custom' : 'practice',
        itemId: `${inline ? 'c' : 'p'}:${current.id}`,
        itemKind: current.kind,
        topic: current.topic || title,
        correct,
        ...(score !== undefined && !correct ? { score } : {}),
      })
    }
    const part = !correct && score !== undefined && score > 0 ? { score: Math.round(score * 100) / 100 } : {}
    setResults((r) => ({ ...r, [current.id]: { correct, note, ...(given ? { given } : {}), ...part } }))
    setResumed(false)
    const next = correct ? streak + 1 : 0
    setStreak(next)
    setBestStreak((b) => Math.max(b, next))
    // Held feedback: straight on to the next one, nothing revealed.
    if (hold) { setChecked(false); setIndex((i) => i + 1); topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return }
    setChecked(true)
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

  // Send the current activity to the end; the next one slides into its place.
  const comeBackLater = () => {
    if (!current) return
    setLater((l) => [...l.filter((id) => id !== current.id), current.id])
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const restart = (ids: string[] | null) => {
    reported.current = false
    setResumed(false)
    clearRun()
    setSubset(ids)
    setLater([])
    logged.current = new Set()
    setResults({})
    setIndex(0)
    setChecked(false)
    setStreak(0)
    setStartedAt(null)
    setRound((r) => r + 1)
  }

  // Enter continues once an activity has been checked. The page session listens
  // on the window; inline sessions only react to keys inside their own card so
  // several practice blocks on one page don't all advance together.
  const onEnter = (e: { key: string; target: EventTarget | null; preventDefault: () => void }) => {
    if (e.key !== 'Enter' || !checked || done) return
    const t = e.target as HTMLElement | null
    if (t?.tagName === 'INPUT' || t?.tagName === 'TEXTAREA') return // the fill input and code editor handle their own Enter
    e.preventDefault()
    advance()
  }
  useEffect(() => {
    if (inline) return
    window.addEventListener('keydown', onEnter)
    return () => window.removeEventListener('keydown', onEnter)
  })

  if (version?.preparing) return <PreparingVersion count={version.count} what="activities" />
  if (all.length === 0) return null

  const correctCount = points(Math.round(activities.reduce((sum, a) => sum + pointsFor(results[a.id]), 0) * 100) / 100)
  // Printing swaps the one-at-a-time session for a full worksheet + answer key.
  const worksheet = <PracticeWorksheet activities={all} title={inline ? title : undefined} className={cn('hidden print:block', inline && 'my-4')} />

  if (done) {
    return (
      <>
        <div className="print:hidden">
          <Results activities={activities} results={results} bestStreak={bestStreak} onRestart={restart} next={version?.next ?? null} onNext={(ids) => { version?.startNext(); restart(ids) }} isRetry={!!subset} inline={inline} title={title} />
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
            results[a.id] ? (hold ? 'bg-orange-500' : results[a.id].correct ? 'bg-emerald-500' : results[a.id].score ? 'bg-amber-400' : 'bg-rose-400') : i === index ? 'bg-orange-300' : inline ? 'bg-orange-100' : 'bg-slate-100'
          )}
        />
      ))}
    </div>
  )

  const score = hold ? (
    <span className="text-sm text-slate-600"><span className="font-semibold tabular-nums text-slate-900">{Object.keys(results).length}</span> answered · answers show when you finish</span>
  ) : (
    <div className="flex items-center gap-3 text-sm">
      <span className="inline-flex items-center gap-1 text-slate-600"><CheckCircle2 className="h-4 w-4 text-emerald-500" /><span className="font-semibold tabular-nums text-slate-900">{correctCount}</span></span>
      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold tabular-nums transition', streak >= 2 ? 'bg-orange-100 text-orange-700' : 'text-slate-400')}>
        <Flame className="h-4 w-4" /> {streak}
      </span>
    </div>
  )

  const body = (
    <FeedbackHeld.Provider value={hold}>
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
                <span><ExplanationText text={current.explanation} /></span>
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              <ExplainButton build={() => activityAsk(current)}>{outcome.correct ? 'Explain more' : 'Why?'}</ExplainButton>
              {!outcome.correct && (current.kind === 'choice' || current.kind === 'fill') && <CheckWorkButton question={activityQuestion(current)} correctAnswer={activityAnswer(current)} />}
              {(current.kind === 'choice' || current.kind === 'fill') && <DesmosHelpButton build={() => desmosActivityAsk(current)} />}
            </div>
          </div>
        )}
      </div>
      <div className={cn('flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60', inline ? 'px-5 py-2.5 sm:px-6' : 'px-5 py-3 sm:px-7')}>
        {!checked ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {/* Only worth offering while something comes after it. */}
            {index < activities.length - 1 && (
              <button type="button" onClick={comeBackLater} title="Move this to the end and come back to it" className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900">
                <Flag className="h-4 w-4" /> Come back to it
              </button>
            )}
            <button type="button" onClick={skip} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
              <SkipForward className="h-4 w-4" /> Skip
            </button>
          </div>
        ) : <span />}
        {checked && (
          <Button onClick={advance} size={inline ? 'sm' : 'default'} className="bg-orange-700 text-white hover:bg-orange-800">
            {index === activities.length - 1 ? 'See results' : 'Continue'} <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>
    </FeedbackHeld.Provider>
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
      {resumed && !done && (
        <ResumeStrip done={Object.keys(results).length} total={activities.length} noun="activity" onStartOver={counts ? undefined : () => restart(null)} />
      )}
      {/* Not over a run in progress: its own answers would show up as "last time", and Retry would drop it. */}
      {!subset && lastMissed && !resumed && !counts && (
        <WeakSpotBanner count={lastMissed.ids.length} topics={lastMissed.topics} noun="activity" onRetry={() => restart(lastMissed.ids)} onNewQuiz={lastMissed.newQuiz} />
      )}
      {/* Progress */}
      <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
        <div className="mb-2.5 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-600">
            Activity <span className="font-semibold text-slate-900">{index + 1}</span> of {activities.length}
          </span>
          <span className="flex items-center gap-3">
            {limited && limit != null && (startedAt
              ? <TimeChip left={limit - secondsUsed} total={limit} />
              : <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 font-medium text-slate-700"><Timer className="h-4 w-4" /> {timeLimitText(limit)}</span>)}
            {score}
          </span>
        </div>
        {segments}
      </div>

      {limited && limit != null && !startedAt ? (
        <TimeLimitGate seconds={limit} count={activities.length} noun="activity" plural="activities" onStart={() => setStartedAt(Date.now())} />
      ) : (
      /* Activity */
      <div key={`${current.id}-${round}`} className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-orange-50/80 to-white px-5 py-3 sm:px-7">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white"><Icon className="h-4 w-4" /></span>
            <span className={cn(eyebrow, 'text-orange-700')}>{meta.label}</span>
            {later.includes(current.id) && <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"><Flag className="h-3 w-3" /> Back to this one</span>}
            {current.topic && <span className="ml-auto max-w-[55%] truncate rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200">{current.topic}</span>}
          </div>
        </div>
        {body}
      </div>
      )}
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
/** A question-like activity as plain text for hints and "Check my work". */
export function activityQuestion(a: PracticeActivity): { prompt: string; options?: string[]; figure?: string } {
  const prompt = a.kind === 'fill' ? a.parts.map((p) => (typeof p === 'string' ? p : '___')).join('') : a.prompt
  return { prompt, options: a.kind === 'choice' && !isTrueFalse(a) ? a.options : undefined, figure: a.figure }
}

/** The right answer of a choice/fill activity, for "Check my work". */
export function activityAnswer(a: PracticeActivity): string | undefined {
  if (a.kind === 'choice') return a.options[a.correct]
  if (a.kind === 'fill') return a.parts.filter((p): p is { answers: string[] } => typeof p !== 'string').map((p) => p.answers[0]).join(', ')
  return undefined
}

export function ActivityBody({ activity, checked, onDone, onContinue, compact = false, autoFocus = true }: {
  activity: PracticeActivity
  checked: boolean
  /** `given`: what they picked or typed, for the teacher's report on assigned practice; `score`: partial credit (0-1). */
  onDone: Done
  onContinue: () => void
  compact?: boolean
  autoFocus?: boolean
}) {
  return (
    <>
      {activity.kind !== 'fill' && activity.prompt && (
        <div className={cn('flex items-start gap-3', compact ? 'mb-4' : 'mb-5')}>
          <p className={cn(fontDisplay, 'min-w-0 flex-1 font-medium leading-snug text-slate-900', compact ? 'text-lg' : 'text-xl sm:text-[1.45rem]')}>
            <QuestionStem text={activity.prompt} passage={activity.passage} />
          </p>
          <ReadAloudButton text={activitySpeech(activity)} label="Read this aloud" />
        </div>
      )}
      {activity.kind === 'fill' && <div className="-mt-1 mb-2 flex justify-end"><ReadAloudButton text={activitySpeech(activity)} label="Read this aloud" /></div>}
      {activity.figure && <GraphFence text={activity.figure} compact allowExplain={!!checked} />}
      {activity.code && activity.kind !== 'bug' && activity.kind !== 'write' && <CodeBlock lang={activity.code.lang} text={activity.code.text} compact className="mb-5 mt-0" />}
      {activity.kind === 'match' && <MatchBoard activity={activity} onDone={onDone} />}
      {activity.kind === 'fill' && <FillBlank activity={activity} onDone={onDone} checked={checked} onContinue={onContinue} compact={compact} autoFocus={autoFocus} />}
      {activity.kind === 'order' && <OrderList activity={activity} onDone={onDone} checked={checked} />}
      {activity.kind === 'sort' && <SortBoard activity={activity} onDone={onDone} checked={checked} />}
      {activity.kind === 'choice' && <Choice activity={activity} onDone={onDone} checked={checked} hint={!checked && <HintLadder key={activity.id} className="mt-0" hint={activity.hint} question={activityQuestion(activity)} />} />}
      {activity.kind === 'bug' && <BugHunt activity={activity} onDone={onDone} checked={checked} />}
      {activity.kind === 'write' && <CodeExerciseView exercise={activity.exercise} checked={checked} onDone={onDone} compact={compact} showPrompt={false} />}
      {!checked && activity.kind === 'fill' && (
        <HintLadder key={activity.id} hint={activity.hint} question={activityQuestion(activity)} />
      )}
    </>
  )
}

// ── Activities ──────────────────────────────────────────────────────────────

function MatchBoard({ activity, onDone }: { activity: MatchActivity; onDone: Done }) {
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
        // Each wrong tap costs one pair's share of the point.
        const m = mistakes.current
        const n = terms.length
        const right = Math.max(0, n - m)
        onDone(m === 0, m ? `All matched, with ${m} miss${m === 1 ? '' : 'es'}: ${right} of ${n} pairs count.` : undefined, m ? `${right} of ${n} pairs on the first try` : undefined, m ? right / n : undefined)
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

function FillBlank({ activity, onDone, checked, onContinue, compact = false, autoFocus = true }: { activity: FillActivity; onDone: Done; checked: boolean; onContinue: () => void; compact?: boolean; autoFocus?: boolean }) {
  const held = useHeld()
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
    const right = results.filter(Boolean).length
    const partial = blanks.length > 1 && right > 0 && right < blanks.length
    onDone(right === blanks.length, partial ? partNote(right, blanks.length, 'blanks') : undefined, values.map((v) => v.trim()).join(' / '), partial ? right / blanks.length : undefined)
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
          <Button onClick={check} disabled={values.every((v) => !v.trim())} className="bg-orange-700 text-white hover:bg-orange-800">{held ? 'Submit' : 'Check'}</Button>
          <span className="text-xs text-slate-400">or press Enter · spelling slips are OK</span>
        </div>
      )}
    </div>
  )
}

function OrderList({ activity, onDone, checked }: { activity: OrderActivity; onDone: Done; checked: boolean }) {
  const held = useHeld()
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
      {!checked && <Button onClick={() => {
        const right = items.filter((_, i) => correctAt(i)).length
        const partial = right > 0 && right < items.length
        onDone(right === items.length, partial ? partNote(right, items.length, 'in the right place') : undefined, `${right} of ${items.length} in the right place`, partial ? right / items.length : undefined)
      }} className="mt-5 bg-orange-700 text-white hover:bg-orange-800">{held ? 'Submit' : 'Check order'}</Button>}
    </div>
  )
}

function SortBoard({ activity, onDone, checked }: { activity: SortActivity; onDone: Done; checked: boolean }) {
  const held = useHeld()
  // Tap an item to pick it up (from the pool or a group), then tap where it goes.
  // A tap on an item already in a group picks it up instead of throwing it out, and
  // a tap that lands on another item inside a group counts as a tap on that group
  // (it used to also kick that item out, which swapped answers by accident).
  const all = useMemo(
    () => seededShuffle(activity.buckets.flatMap((b, bi) => b.items.map((text) => ({ key: `${bi}:${text}`, text, bucket: bi }))), activity.id),
    [activity]
  )
  const [placed, setPlaced] = useState<Record<string, number>>({})
  const [selected, setSelected] = useState<string | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const pool = all.filter((x) => placed[x.key] === undefined)
  const selectedPlaced = selected !== null && placed[selected] !== undefined

  const place = (key: string, bucket: number) => {
    if (checked) return
    setPlaced((p) => ({ ...p, [key]: bucket }))
    setSelected(null)
  }
  const unplace = (key: string) => {
    if (checked) return
    setPlaced((p) => { const n = { ...p }; delete n[key]; return n })
    setSelected(null)
  }

  const chip = (x: { key: string; text: string; bucket: number }, inBucket: number | null) => {
    const state = checked && inBucket !== null ? (x.bucket === inBucket ? 'ok' : 'bad') : null
    return (
      <button
        key={x.key}
        type="button"
        disabled={checked}
        draggable={!checked}
        aria-pressed={selected === x.key}
        onDragStart={(e) => { e.dataTransfer.setData('text/plain', x.key); e.dataTransfer.effectAllowed = 'move'; setDragging(x.key) }}
        onDragEnd={() => setDragging(null)}
        onClick={(e) => {
          e.stopPropagation()
          if (checked) return
          // Something else is picked up: a tap on an item in a group means "put it in this group".
          if (selected && selected !== x.key && inBucket !== null) { place(selected, inBucket); return }
          setSelected(selected === x.key ? null : x.key)
        }}
        className={cn(
          'rounded-full border-2 px-3 py-1.5 text-sm font-medium transition-all disabled:cursor-default',
          state === 'ok' ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
            : state === 'bad' ? 'border-rose-300 bg-rose-50 text-rose-800'
            : selected === x.key ? 'border-orange-500 bg-orange-100 text-orange-900 shadow-sm ring-2 ring-orange-200'
            : dragging === x.key ? 'border-orange-300 bg-white text-slate-400'
            : 'border-slate-200 bg-white text-slate-700 hover:border-orange-300'
        )}
      >
        <InlineMarkdown text={x.text} />
        {state === 'bad' && <span className="ml-1 text-xs font-semibold text-emerald-700">→ {activity.buckets[x.bucket].name}</span>}
      </button>
    )
  }

  const dropKey = (e: React.DragEvent) => { e.preventDefault(); setDragging(null); return e.dataTransfer.getData('text/plain') }

  return (
    <div>
      {!checked && (
        <div
          onClick={() => selectedPlaced && selected && unplace(selected)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { const key = dropKey(e); if (key && placed[key] !== undefined) unplace(key) }}
          className={cn('mb-4 min-h-[3rem] rounded-xl border-2 border-dashed p-3 transition', selectedPlaced ? 'cursor-pointer border-orange-300 bg-orange-50/50' : 'border-slate-200 bg-slate-50/60')}
        >
          {pool.length ? (
            <div className="flex flex-wrap gap-2">{pool.map((x) => chip(x, null))}</div>
          ) : (
            <p className="py-1.5 text-center text-sm text-slate-500">{selectedPlaced ? 'Tap here to take it out of its group.' : 'All sorted. Check your answer, or tap an item to move it.'}</p>
          )}
        </div>
      )}
      <p className="mb-2 text-sm text-slate-500">
        {checked ? '' : selectedPlaced ? 'Tap another group to move it, or tap it again to leave it where it is.' : selected ? 'Now tap the group it belongs in.' : 'Tap an item, then the group it belongs in (or drag it).'}
      </p>
      <div className={cn('grid grid-cols-1 gap-3', activity.buckets.length === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}>
        {activity.buckets.map((b, bi) => {
          const target = !!selected && placed[selected] !== bi
          return (
            <div
              key={b.name}
              onClick={() => selected && place(selected, bi)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const key = dropKey(e); if (key) place(key, bi) }}
              className={cn(
                'min-h-[7rem] rounded-xl border-2 p-3 transition',
                target ? 'cursor-pointer border-orange-300 bg-orange-50/50 hover:border-orange-500' : 'border-slate-200 bg-white'
              )}
            >
              <p className="mb-2 font-semibold text-slate-900"><InlineMarkdown text={b.name} /></p>
              <div className="flex flex-wrap gap-2">{all.filter((x) => placed[x.key] === bi).map((x) => chip(x, bi))}</div>
            </div>
          )
        })}
      </div>
      {!checked && (
        <Button
          onClick={() => {
            const right = all.filter((x) => placed[x.key] === x.bucket).length
            const partial = right > 0 && right < all.length
            onDone(right === all.length, partial ? partNote(right, all.length, 'sorted right') : undefined, `${right} of ${all.length} sorted right`, partial ? right / all.length : undefined)
          }}
          disabled={pool.length > 0}
          className="mt-5 bg-orange-700 text-white hover:bg-orange-800"
        >
          {held ? 'Submit' : 'Check'}
        </Button>
      )}
    </div>
  )
}

function Choice({ activity, onDone, checked, hint }: { activity: ChoiceActivity; onDone: (c: boolean, note?: string, given?: string) => void; checked: boolean; hint?: React.ReactNode }) {
  const held = useHeld()
  // A pick is locked in by "Check answer" or tapping it again; options can be crossed out.
  const [picked, setPicked] = useState<number | null>(null)
  const cross = useCrossOut(activity.id)
  const isTF = activity.options.length === 2 && activity.options[0] === 'True'
  const lock = (i: number) => { if (!checked) onDone(i === activity.correct, undefined, activity.options[i]) }
  return (
    <div>
      <div className={cn(isTF ? 'grid grid-cols-2 gap-3' : 'space-y-2.5')}>
        {activity.options.map((opt, i) => {
          const correct = checked && i === activity.correct
          const wrong = checked && picked === i && i !== activity.correct
          const selected = !checked && picked === i
          const crossed = !checked && !selected && cross.crossed.has(i)
          const button = (
            <button
              key={i}
              type="button"
              disabled={checked}
              aria-pressed={selected}
              onClick={() => { cross.uncross(i); if (picked === i) lock(i); else setPicked(i) }}
              className={cn(
                'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
                isTF && 'justify-center font-semibold',
                correct ? 'border-emerald-400 bg-emerald-50' : wrong ? 'border-rose-400 bg-rose-50' : selected ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40',
                checked && !correct && !wrong && 'opacity-60',
                crossed && crossedClass
              )}
            >
              {!isTF && (
                <span className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold', correct ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : selected ? 'bg-orange-700 text-white' : 'bg-slate-100 text-slate-500')}>
                  {String.fromCharCode(65 + i)}
                </span>
              )}
              <span className="option-text leading-snug text-slate-800"><InlineMarkdown text={opt} /></span>
              {(correct || wrong) && (
                <span className="ml-auto flex shrink-0 items-center gap-1.5">
                  <AnswerTag yours={picked === i} correct={correct} />
                  {correct ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}
                </span>
              )}
            </button>
          )
          if (isTF) return button
          return (
            <div key={i} className="flex items-center gap-2">
              {button}
              <CrossOutButton letter={String.fromCharCode(65 + i)} crossed={cross.crossed.has(i)} disabled={checked} onToggle={() => { if (picked === i) setPicked(null); cross.toggle(i) }} />
            </div>
          )
        })}
      </div>
      <ChoiceActions hint={hint} check={<LockInButton show={!checked && picked !== null} onClick={() => picked !== null && lock(picked)} tone="orange" label={held ? 'Lock in answer' : undefined} />} />
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

function Results({ activities, results, bestStreak, onRestart, next = null, onNext, isRetry, inline = false, title }: {
  /** New versions of the activities for another try (null: inline, or signed out). */
  next?: { label: string; assigned: boolean; waiting?: boolean } | null
  onNext?: (ids: string[] | null) => void
  activities: PracticeActivity[]
  results: Record<string, Outcome>
  bestStreak: number
  onRestart: (ids: string[] | null) => void
  isRetry: boolean
  inline?: boolean
  title?: string
}) {
  const earned = Math.round(activities.reduce((sum, a) => sum + pointsFor(results[a.id]), 0) * 100) / 100
  const correct = points(earned)
  const pct = activities.length ? Math.round((earned / activities.length) * 100) : 0
  const missed = activities.filter((a) => !results[a.id]?.correct)
  const message = pct >= 90 ? 'Outstanding. You really know this.' : pct >= 70 ? 'Nice work. A little more practice on the misses.' : pct >= 50 ? 'Good start. Run the missed ones again.' : 'Keep at it. Practice the missed activities.'

  const topics: Array<{ name: string; right: number; total: number }> = []
  for (const a of activities) {
    const name = a.topic || 'Practice'
    let t = topics.find((x) => x.name === name)
    if (!t) topics.push((t = { name, right: 0, total: 0 }))
    t.total++
    t.right += pointsFor(results[a.id])
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
              <Button size="sm" onClick={() => onRestart(missed.map((a) => a.id))} className="bg-orange-700 text-white hover:bg-orange-800">
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
      {!isRetry && <TurnedInCard />}
      <div className="animate-fade-up rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <span className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600"><Trophy className="h-7 w-7" /></span>
        <p className={cn(eyebrow, 'text-slate-400')}>{isRetry ? 'Retry complete' : 'Practice complete'}</p>
        <p className={cn(fontDisplay, 'mt-1 text-5xl font-semibold text-slate-900')}>{pct}%</p>
        <p className="mt-1 text-slate-600">{correct} of {activities.length} right on the first try · best streak {bestStreak}</p>
        <p className={cn(fontDisplay, 'mt-3 text-xl text-slate-800')}>{message}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {/* Assigned with attempts left: the next attempt, with new activities (not these again: that's memorizing). */}
          {next?.assigned && onNext && (
            <Button onClick={() => onNext(null)} disabled={next.waiting} className="bg-orange-700 text-white hover:bg-orange-800">
              <RotateCcw className="mr-2 h-4 w-4" /> {next.label}
            </Button>
          )}
          {!next?.assigned && missed.length > 0 && (
            <Button onClick={() => (next && onNext ? onNext(missed.map((a) => a.id)) : onRestart(missed.map((a) => a.id)))} className="bg-orange-700 text-white hover:bg-orange-800">
              <RotateCcw className="mr-2 h-4 w-4" /> Practice {missed.length} missed{next ? ' with new questions' : ''}
            </Button>
          )}
          {!next?.assigned && <Button onClick={() => (next && onNext ? onNext(null) : onRestart(null))} variant="outline"><ShuffleIcon className="mr-2 h-4 w-4" /> {next ? 'Start over with new questions' : 'Start over'}</Button>}
        </div>
      </div>
      {topics.length > 1 && (
        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:grid-cols-2 sm:p-6">
          {topics.map((t) => {
            const p = Math.round((t.right / t.total) * 100)
            return (
              <div key={t.name}>
                <div className="mb-1 flex justify-between gap-2 text-sm">
                  <span className="truncate font-medium text-slate-700">{t.name}</span>
                  <span className="shrink-0 tabular-nums text-slate-500">{points(Math.round(t.right * 100) / 100)}/{t.total}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn('h-full rounded-full', p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${p}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
      <AnswerReview activities={activities} results={results} />
    </div>
  )
}

/** The right answer of any activity as text, for the review after a run. */
function rightAnswerText(a: PracticeActivity): string {
  switch (a.kind) {
    case 'choice': return a.options[a.correct] ?? ''
    case 'fill': return a.parts.filter((p): p is { answers: string[] } => typeof p !== 'string').map((p) => p.answers[0]).join(' / ')
    case 'order': return a.items.map((it, i) => `${i + 1}. ${it}`).join('   ')
    case 'sort': return a.buckets.map((b) => `${b.name}: ${b.items.join(', ')}`).join(' · ')
    case 'match': return a.pairs.map((p) => `${p.term} = ${p.definition}`).join(' · ')
    case 'bug': return `Line ${a.bugLines.join(', ')}${a.fix ? `: ${a.fix}` : ''}`
    case 'write': return a.exercise.solution ? 'See the solution in the exercise' : ''
  }
}

/** Every activity of the run with their answer, the right one and the explanation (where they went wrong). */
function AnswerReview({ activities, results }: { activities: PracticeActivity[]; results: Record<string, Outcome> }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h3 className={cn(fontDisplay, 'mb-4 text-lg font-semibold text-slate-900')}>Answer review</h3>
      <ol className="space-y-3">
        {activities.map((a, i) => {
          const r = results[a.id]
          const ok = !!r?.correct
          const part = !ok && !!r?.score
          const prompt = activityQuestion(a).prompt
          return (
            <li key={a.id} className={cn('rounded-xl border p-4 text-sm', ok ? 'border-emerald-200 bg-emerald-50/50' : part ? 'border-amber-200 bg-amber-50/50' : 'border-rose-200 bg-rose-50/50')}>
              <div className="flex gap-3">
                <span className="mt-0.5 shrink-0">{ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className={cn('h-5 w-5', part ? 'text-amber-600' : 'text-rose-600')} />}</span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <p className="font-medium text-slate-900">{i + 1}. <InlineMarkdown text={prompt} /></p>
                  <p className="text-slate-700"><span className="font-semibold">Your answer:</span> {r ? (r.given ? <InlineMarkdown text={r.given} /> : r.note ?? (ok ? 'Right' : 'Skipped')) : 'Not answered'}{part && r?.note ? ` (${r.note})` : ''}</p>
                  {!ok && rightAnswerText(a) && <p className="text-emerald-800"><span className="font-semibold">Right answer:</span> <InlineMarkdown text={rightAnswerText(a)} /></p>}
                  {a.explanation && <p className="flex gap-2 leading-relaxed text-slate-600"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" /><span><ExplanationText text={a.explanation} /></span></p>}
                </div>
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

/** What the speaker button says for an activity: the prompt, plus choices or the sentence with its blanks. */
function activitySpeech(a: PracticeActivity): string {
  if (a.kind === 'fill') return [a.prompt ? textForSpeech(a.prompt) : '', textForSpeech(a.parts.map((p) => (typeof p === 'string' ? p : ' blank ')).join(''))].filter(Boolean).join('. ')
  if (a.kind === 'choice' && !isTrueFalse(a)) return questionForSpeech(a.prompt, a.options)
  return textForSpeech(a.prompt)
}
