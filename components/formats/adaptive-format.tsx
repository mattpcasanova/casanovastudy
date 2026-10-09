"use client"

// Adaptive practice player (format 'adaptive'). One question at a time from the
// guide's concept-tagged bank; lib/adaptive/engine.ts picks what comes next
// from the saved answers, so answering never calls the AI. The AI is only used
// for refills (owner only, when a concept runs low; capped per session and per
// day) and for checking the occasional "explain it" answer.
// Answers persist as study_progress kind 'adaptive' + cs:adaptive:<id>.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CheckCircle2, ChevronRight, Crosshair, Layers, Lightbulb, Loader2, PenLine, Rocket, RotateCcw, Sparkles, Target, Trophy, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { InlineMarkdown, StudyMarkdown } from "./study-markdown"
import { QuestionStem } from "./question-stem"
import { GraphFence } from "./graph-figure"
import { ExplanationText } from "./explanation-text"
import { ExplainButton } from "@/components/explain/explain-provider"
import { useRecordResult } from "@/components/study-results-context"
import { usePlan } from "@/components/plan/plan-provider"
import { isPlanBlock, type PlanBlock } from "@/lib/plan-rules"
import { authFetch } from "@/lib/auth-fetch"
import { loadProgress, saveProgress } from "@/lib/progress"
import { openHomeWithPrefill } from "@/lib/prefill"
import { isAnswerCorrect, parseAdaptive, type AdaptiveQuestion } from "@/lib/adaptive/format"
import {
  ADAPTIVE_RULES,
  conceptProgress,
  conceptsNeedingRefill,
  nextStep,
  refillTarget,
  sessionSummary,
  withOutOfQuestions,
  type AdaptiveAnswer,
  type ConceptProgress,
} from "@/lib/adaptive/engine"
import { nextDetail, nextStudyRequest, nextTitle, recommendNext, type NextKind, type NextOption } from "@/lib/adaptive/next"

interface Props {
  content: string
  studyGuideId: string
  title: string
  subject?: string
  gradeLevel?: string
  isOwner: boolean
}

/** updatedAt (epoch ms) decides which copy is newer, so "Start over" on one device sticks on the others. */
interface Saved { answers: AdaptiveAnswer[]; updatedAt?: number }

const storageKey = (id: string) => `cs:adaptive:${id}`
const LEVEL_LABEL = { 1: "Warm-up", 2: "Core", 3: "Challenge" } as const

function readLocal(id: string): Saved {
  try {
    const v = JSON.parse(localStorage.getItem(storageKey(id)) || "null") as Saved | null
    return Array.isArray(v?.answers) ? v : { answers: [] }
  } catch { return { answers: [] } }
}

function answerLabel(q: AdaptiveQuestion, given?: string): string {
  if (given === undefined) return ""
  if (q.type === "mc" || q.type === "tf") return q.options[Number(given)] ?? given
  return given
}

function correctLabel(q: AdaptiveQuestion): string {
  return q.type === "mc" || q.type === "tf" ? q.options[q.correct] : q.answers[0]
}

function explainAsk(q: AdaptiveQuestion, given?: string) {
  const lines = ["Explain this practice question:", q.prompt]
  q.options.forEach((o, i) => q.type === "mc" && lines.push(`${String.fromCharCode(65 + i)}) ${o}`))
  if (q.type !== "explain") lines.push(`Correct answer: ${correctLabel(q)}`)
  else lines.push(`Model answer: ${q.answers[0]}`)
  if (given !== undefined) lines.push(q.type === "explain" ? `My answer: ${given}` : `I answered: ${answerLabel(q, given)}`)
  if (q.figure) lines.push("(The question shows a figure described by this spec:)", q.figure)
  if (q.explanation) lines.push(`The guide's explanation: ${q.explanation}`)
  const first = q.prompt.split("\n")[0]
  return { label: `Why? “${first.length > 110 ? first.slice(0, 109) + "…" : first}”`, prompt: lines.join("\n") }
}

export default function AdaptiveFormat({ content: initialContent, studyGuideId, title, subject, gradeLevel, isOwner }: Props) {
  const router = useRouter()
  const recordResult = useRecordResult()
  const { openPremium } = usePlan()
  const [content, setContent] = useState(initialContent)
  const guide = useMemo(() => parseAdaptive(content), [content])
  const [answers, setAnswers] = useState<AdaptiveAnswer[] | null>(null)
  const [started, setStarted] = useState(false)
  // The question on screen stays put while its feedback shows, even though answers changed.
  const [current, setCurrent] = useState<{ question: AdaptiveQuestion; review: boolean } | null>(null)
  const [result, setResult] = useState<{ correct: boolean; given: string; score?: number; feedback?: string } | null>(null)
  const [refilling, setRefilling] = useState<string | null>(null)
  const [refillsOff, setRefillsOff] = useState(!isOwner)
  const refillFailures = useRef(0)

  // Load: browser copy first, then the account copy if it's newer.
  const updatedAt = useRef(0)
  useEffect(() => {
    const local = readLocal(studyGuideId)
    updatedAt.current = local.updatedAt ?? 0
    setAnswers(local.answers)
    if (local.answers.length) setStarted(true)
    let alive = true
    void loadProgress<Saved>(studyGuideId, "adaptive").then((remote) => {
      if (!alive || !Array.isArray(remote?.answers) || (remote.updatedAt ?? 0) <= updatedAt.current) return
      updatedAt.current = remote.updatedAt ?? 0
      setAnswers(remote.answers)
      if (remote.answers.length) setStarted(true)
    })
    return () => { alive = false }
  }, [studyGuideId])

  // Save every change: immediately to the browser, debounced to the account.
  const changed = useRef(false)
  useEffect(() => {
    if (!answers || !changed.current) return
    const saved: Saved = { answers, updatedAt: updatedAt.current }
    try { localStorage.setItem(storageKey(studyGuideId), JSON.stringify(saved)) } catch {}
    const t = setTimeout(() => void saveProgress(studyGuideId, "adaptive", saved), 1200)
    return () => clearTimeout(t)
  }, [answers, studyGuideId])
  const updateAnswers = (next: AdaptiveAnswer[]) => {
    changed.current = true
    updatedAt.current = Date.now()
    setAnswers(next)
  }

  const step = useMemo(() => (answers ? nextStep(guide, answers) : null), [guide, answers])
  const needRefill = useMemo(() => (answers && !refillsOff ? conceptsNeedingRefill(guide, answers) : []), [guide, answers, refillsOff])

  // Ask for more questions in the background when a concept runs low (one at a time).
  useEffect(() => {
    if (!answers || refilling || !needRefill.length) return
    const conceptId = needRefill[0]
    const { level, missed } = refillTarget(guide, answers, conceptId)
    setRefilling(conceptId)
    void (async () => {
      try {
        const res = await authFetch(`/api/adaptive/${studyGuideId}/refill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conceptId, level, missed: missed.map((m) => ({ q: m.q, given: m.given })) }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.ok && typeof data.content === "string") {
          refillFailures.current = 0
          setContent(data.content)
        } else if (res.status === 403 || res.status === 409 || isPlanBlock(data)) {
          setRefillsOff(true) // not the owner, session full, or today's cap: carry on with review questions
        } else if (++refillFailures.current >= 2) {
          setRefillsOff(true)
        }
      } catch {
        if (++refillFailures.current >= 2) setRefillsOff(true)
      } finally {
        setRefilling(null)
      }
    })()
  }, [answers, needRefill, refilling, guide, studyGuideId])

  // Show the next question when nothing is on screen.
  useEffect(() => {
    if (!started || current || step?.kind !== "question") return
    setCurrent({ question: step.question, review: step.review })
    setResult(null)
  }, [started, current, step])

  const progress = useMemo(() => {
    if (!answers) return []
    const p = conceptProgress(guide, answers)
    // Concepts with nothing left to ask and no refill coming are finished.
    return step?.kind === "empty" && !refilling && (refillsOff || !needRefill.length) ? withOutOfQuestions(p, step.conceptIds) : p
  }, [guide, answers, step, refilling, refillsOff, needRefill])

  const finished = started && !current && (step?.kind === "done" || (step?.kind === "empty" && !refilling && (refillsOff || !needRefill.length)))
  const waiting = started && !current && step?.kind === "empty" && !finished

  const submit = useCallback((given: string, extra?: { correct: boolean; score?: number; feedback?: string }) => {
    if (!current || !answers) return
    const q = current.question
    const correct = extra ? extra.correct : isAnswerCorrect(q, given)
    setResult({ correct, given, score: extra?.score, feedback: extra?.feedback })
    const firstTime = !answers.some((a) => a.q === q.id)
    updateAnswers([...answers, { q: q.id, correct, given, ...(extra?.score !== undefined ? { score: extra.score } : {}), at: Date.now() }])
    // Log first answers (not second tries); an explain answer only when the AI actually scored it.
    if (firstTime && (q.type !== "explain" || extra?.score !== undefined)) {
      const concept = guide.concepts.find((c) => c.id === q.conceptId)
      recordResult({ source: "adaptive", itemId: `a:${q.id}`, itemKind: q.type, correct, topic: concept?.name, ...(extra?.score !== undefined ? { score: extra.score } : {}) })
    }
  }, [current, answers, guide, recordResult])

  const advance = () => { setCurrent(null); setResult(null) }

  const restart = () => {
    updateAnswers([])
    setCurrent(null)
    setResult(null)
    setStarted(true)
  }

  if (!guide.questions.length) {
    return <p className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-600">This practice session has no questions yet.</p>
  }
  if (!answers) return <div className="h-64 animate-pulse rounded-2xl bg-white" />

  const summary = sessionSummary(guide, answers)

  if (!started) {
    return (
      <StartCard
        concepts={guide.concepts.map((c) => c.name)}
        description={guide.description}
        onStart={() => setStarted(true)}
      />
    )
  }

  if (finished) {
    const next = recommendNext(guide, answers, progress)
    const open = (option: NextOption) => router.push(openHomeWithPrefill({
      source: "adaptive-next",
      sourceTitle: title,
      studyRequest: nextStudyRequest(option, title),
      studyGuideName: nextTitle(option, title),
      format: "adaptive",
      subject,
      gradeLevel,
      difficultyLevel: option.difficulty,
      detail: nextDetail(option),
    }))
    return <DoneCard progress={progress} summary={summary} next={next} onNext={open} onRestart={restart} />
  }

  const q = current?.question
  const concept = q ? guide.concepts.find((c) => c.id === q.conceptId) : undefined
  const cp = q ? progress.find((p) => p.id === q.conceptId) : undefined
  // Two misses in a row on this concept: reteach before moving on.
  const showLesson = !!(result && !result.correct && q?.type !== "explain" && cp && cp.missStreak >= 2 && concept?.lesson)

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0">
        {waiting || !q ? (
          <div className="flex items-center gap-3 rounded-2xl border border-sky-200 bg-white p-6 text-slate-700 shadow-sm">
            <Loader2 className="h-5 w-5 animate-spin text-sky-600" />
            Writing new questions for you based on how you&apos;re doing…
          </div>
        ) : (
          <div key={`${q.id}-${answers.length - (result ? 1 : 0)}`} className="animate-fade-up overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-sky-50/50 px-5 py-3 text-sm sm:px-7">
              <span className="inline-flex items-center gap-1.5 font-semibold text-sky-800"><Target className="h-4 w-4" /> {concept?.name}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-500 ring-1 ring-inset ring-slate-200">
                {q.type === "explain" ? "In your own words" : LEVEL_LABEL[q.level]}
              </span>
              {current?.review && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">Second try</span>}
              <span className="ml-auto tabular-nums text-slate-500">{summary.mastered} of {summary.total} mastered</span>
            </div>

            <div className="p-5 sm:p-7">
              <QuestionPrompt text={q.prompt} />
              {q.figure && <div className="mt-4"><GraphFence text={q.figure} allowExplain={!!result} /></div>}
              <div className="mt-5">
                {(q.type === "mc" || q.type === "tf") && <ChoiceAnswer q={q} result={result} onPick={(i) => submit(String(i))} />}
                {q.type === "num" && <NumberAnswer key={q.id} result={result} onSubmit={submit} />}
                {q.type === "explain" && <ExplainAnswer key={q.id} q={q} guideId={studyGuideId} result={result} onChecked={submit} onBlocked={openPremium} />}
              </div>

              {result && (
                <div className={cn("mt-6 animate-fade-up rounded-xl p-4",
                  q.type === "explain" ? "bg-sky-50 ring-1 ring-inset ring-sky-200" : result.correct ? "bg-emerald-50 ring-1 ring-inset ring-emerald-200" : "bg-rose-50 ring-1 ring-inset ring-rose-200")}>
                  {q.type === "explain" ? (
                    <>
                      <p className="flex items-center gap-2 font-semibold text-sky-900">
                        <PenLine className="h-5 w-5" /> {result.score === undefined ? "Compare with a model answer" : result.score >= 80 ? "Nicely explained" : result.score >= 50 ? "Partly there" : "Not quite yet"}
                      </p>
                      {result.feedback && <p className="mt-2 text-sm leading-relaxed text-slate-700">{result.feedback}</p>}
                      <p className="mt-3 text-sm leading-relaxed text-slate-700"><span className="font-semibold text-slate-900">A strong answer: </span><InlineMarkdown text={q.answers[0]} /></p>
                    </>
                  ) : (
                    <>
                      <p className={cn("flex items-center gap-2 font-semibold", result.correct ? "text-emerald-800" : "text-rose-800")}>
                        {result.correct ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                        {result.correct ? "Correct!" : q.type === "num" ? <span>Not quite. The answer is <InlineMarkdown text={q.answers[0]} />.</span> : "Not quite."}
                      </p>
                      {!result.correct && q.type === "mc" && q.feedback[Number(result.given)] && (
                        <p className="mt-2 text-sm leading-relaxed text-slate-700"><InlineMarkdown text={q.feedback[Number(result.given)]} /></p>
                      )}
                      {q.explanation && (
                        <p className="mt-2 flex gap-2 text-sm leading-relaxed text-slate-700">
                          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                          <span><ExplanationText text={q.explanation} /></span>
                        </p>
                      )}
                    </>
                  )}
                  <ExplainButton build={() => explainAsk(q, result.given)}>{result.correct ? "Explain more" : "Why?"}</ExplainButton>
                </div>
              )}

              {showLesson && concept && (
                <div className="mt-4 animate-fade-up rounded-xl bg-amber-50 p-4 ring-1 ring-inset ring-amber-200">
                  <p className="flex items-center gap-2 font-semibold text-amber-900"><Sparkles className="h-4 w-4" /> Quick review: {concept.name}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-800"><InlineMarkdown text={concept.lesson} /></p>
                  {q.level > 1 && <p className="mt-2 text-xs text-amber-800">The next one on this will be a little easier.</p>}
                </div>
              )}
            </div>

            {result && (
              <div className="flex justify-end border-t border-slate-100 bg-slate-50/60 px-5 py-3 sm:px-7">
                <Button onClick={advance} autoFocus className="bg-sky-600 text-white hover:bg-sky-700">
                  Continue <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <ConceptPanel progress={progress} activeId={q?.conceptId} refilling={refilling} />
    </div>
  )
}

/**
 * The question. Data tables and code under the question line need block
 * markdown; plain questions (and I./II./III. statements) use QuestionStem.
 */
function QuestionPrompt({ text }: { text: string }) {
  const [first, ...rest] = text.split("\n")
  const body = rest.join("\n")
  if (/^\s*\|.*\|\s*$/m.test(body) || body.includes("```")) {
    return (
      <div>
        <p className="text-lg font-semibold leading-snug text-slate-900"><InlineMarkdown text={first} /></p>
        <StudyMarkdown content={body} compact className="mt-3" />
      </div>
    )
  }
  return <p className="text-lg font-semibold leading-snug text-slate-900"><QuestionStem text={text} /></p>
}

// ── Answer inputs ───────────────────────────────────────────────────────────

function ChoiceAnswer({ q, result, onPick }: { q: AdaptiveQuestion; result: { given: string } | null; onPick: (i: number) => void }) {
  const isTF = q.type === "tf"
  const picked = result ? Number(result.given) : null
  return (
    <div className={cn(isTF ? "grid grid-cols-2 gap-3" : "space-y-2.5")}>
      {q.options.map((opt, i) => {
        const correct = !!result && i === q.correct
        const wrong = !!result && picked === i && i !== q.correct
        return (
          <button
            key={i}
            type="button"
            disabled={!!result}
            onClick={() => onPick(i)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all",
              isTF && "justify-center font-semibold",
              correct ? "border-emerald-400 bg-emerald-50" : wrong ? "border-rose-400 bg-rose-50" : "border-slate-200 bg-white hover:border-sky-300 hover:bg-sky-50/40",
              result && !correct && !wrong && "opacity-60"
            )}
          >
            {!isTF && (
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold", correct ? "bg-emerald-500 text-white" : wrong ? "bg-rose-500 text-white" : "bg-slate-100 text-slate-500")}>
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

function NumberAnswer({ result, onSubmit }: { result: { given: string; correct: boolean } | null; onSubmit: (given: string) => void }) {
  const [value, setValue] = useState("")
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); if (value.trim() && !result) onSubmit(value.trim()) }}
      className="flex flex-wrap items-center gap-3"
    >
      <input
        value={result ? result.given : value}
        onChange={(e) => setValue(e.target.value)}
        disabled={!!result}
        autoFocus
        inputMode="decimal"
        placeholder="Your answer"
        aria-label="Your answer"
        className={cn("w-48 rounded-xl border-2 px-4 py-2.5 text-lg tabular-nums outline-none transition focus:border-sky-400",
          result ? (result.correct ? "border-emerald-400 bg-emerald-50" : "border-rose-400 bg-rose-50") : "border-slate-200")}
      />
      {!result && <Button type="submit" disabled={!value.trim()} className="bg-sky-600 text-white hover:bg-sky-700">Check</Button>}
    </form>
  )
}

function ExplainAnswer({ q, guideId, result, onChecked, onBlocked }: {
  q: AdaptiveQuestion
  guideId: string
  result: { given: string } | null
  onChecked: (given: string, extra: { correct: boolean; score?: number; feedback?: string }) => void
  onBlocked: (block: PlanBlock) => void
}) {
  const [value, setValue] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  const check = async () => {
    const answer = value.trim()
    if (!answer) return
    setBusy(true)
    setError("")
    try {
      const res = await authFetch(`/api/adaptive/${guideId}/check`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionId: q.id, answer }),
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok && typeof data.score === "number") {
        onChecked(answer, { correct: data.score >= 80, score: data.score, feedback: data.feedback })
        return
      }
      if (isPlanBlock(data) && data.code === "premium_only") onBlocked(data)
      // Couldn't check it (signed out, daily cap, error): show the model answer instead.
      onChecked(answer, { correct: false, feedback: typeof data.error === "string" ? data.error : undefined })
    } catch {
      setError("Couldn't check your answer. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      <textarea
        value={result ? result.given : value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          // Enter checks the answer; Shift+Enter adds a new line.
          if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault()
            if (!busy) void check()
          }
        }}
        disabled={!!result || busy}
        rows={4}
        autoFocus
        maxLength={3000}
        placeholder="Explain it in a few sentences, as if teaching a friend."
        className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 leading-relaxed outline-none transition focus:border-sky-400 disabled:bg-slate-50"
      />
      {!result && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button onClick={check} disabled={!value.trim() || busy} className="bg-sky-600 text-white hover:bg-sky-700">
            {busy ? <><Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> Checking…</> : "Check my answer"}
          </Button>
          <button type="button" disabled={busy} onClick={() => onChecked("", { correct: false })} className="text-sm font-medium text-slate-500 hover:text-slate-800">
            Skip, show me an answer
          </button>
          {error && <span className="text-sm text-rose-600">{error}</span>}
        </div>
      )}
      <p className="mt-2 text-xs text-slate-400">Press Enter to check (Shift+Enter for a new line). This one is for practice explaining; it doesn&apos;t count toward mastery.</p>
    </div>
  )
}

// ── Side panel, start and finish ────────────────────────────────────────────

function masteryPercent(p: ConceptProgress): number {
  if (p.status === "mastered") return 100
  if (!p.answered) return 0
  // How close the last few answers are to the bar, scaled by answers needed.
  const reach = Math.min(1, p.accuracy / ADAPTIVE_RULES.threshold)
  const volume = Math.min(1, p.answered / ADAPTIVE_RULES.minAnswered)
  return Math.round(Math.min(95, reach * volume * 100))
}

function ConceptPanel({ progress, activeId, refilling }: { progress: ConceptProgress[]; activeId?: string; refilling: string | null }) {
  return (
    <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:sticky lg:top-24">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">Your mastery</p>
      <ul className="space-y-3">
        {progress.map((p) => {
          const pct = masteryPercent(p)
          return (
            <li key={p.id} className={cn("rounded-lg px-2 py-1.5 transition", p.id === activeId && "bg-sky-50")}>
              <div className="flex items-center justify-between gap-2 text-sm">
                <span className={cn("truncate font-medium", p.status === "mastered" ? "text-emerald-700" : "text-slate-800")}>{p.name}</span>
                {p.status === "mastered" ? <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  : p.id === refilling ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-500" aria-label="Writing new questions" />
                    : <span className="shrink-0 text-xs tabular-nums text-slate-400">{p.answered ? `${p.correct}/${p.answered}` : ""}</span>}
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={cn("h-full rounded-full transition-all duration-500", p.status === "mastered" ? "bg-emerald-500" : p.status === "in_progress" ? "bg-sky-500" : "bg-amber-400")} style={{ width: `${pct}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        A concept is mastered when you get {Math.round(ADAPTIVE_RULES.threshold * 100)}% of your last {ADAPTIVE_RULES.window} right. Questions get harder as you go and easier when you miss.
      </p>
    </aside>
  )
}

function StartCard({ concepts, description, onStart }: { concepts: string[]; description: string; onStart: () => void }) {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <p className="flex items-center gap-2 text-sm font-semibold text-sky-700"><Target className="h-4 w-4" /> Adaptive practice</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-900">Practice until you&apos;ve got it</h2>
      <p className="mt-2 leading-relaxed text-slate-600">
        {description || "Questions adapt to you."} Get one right and the next is harder; miss one and you get a quick review and an easier one. You&apos;re done when every concept is mastered.
      </p>
      <ul className="mt-5 flex flex-wrap gap-2">
        {concepts.map((c) => <li key={c} className="rounded-full bg-sky-50 px-3 py-1 text-sm font-medium text-sky-800 ring-1 ring-inset ring-sky-200">{c}</li>)}
      </ul>
      <Button onClick={onStart} size="lg" className="mt-6 bg-sky-600 text-white hover:bg-sky-700">
        Start practicing <ChevronRight className="ml-1 h-4 w-4" />
      </Button>
    </div>
  )
}

const NEXT_COPY: Record<NextKind, { title: string; button: string; Icon: typeof Rocket }> = {
  harder: { title: "Level up", button: "Make a harder session", Icon: Rocket },
  focus: { title: "Focus on what you missed", button: "Make a focused session", Icon: Crosshair },
  foundations: { title: "Build your foundations", button: "Make a foundations session", Icon: Layers },
}

function DoneCard({ progress, summary, next, onNext, onRestart }: {
  progress: ConceptProgress[]
  summary: { answered: number; correct: number; mastered: number; total: number }
  next: { recommended: NextOption; others: NextOption[] }
  onNext: (option: NextOption) => void
  onRestart: () => void
}) {
  const all = summary.mastered === summary.total
  const rec = NEXT_COPY[next.recommended.kind]
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
      <Trophy className={cn("h-10 w-10", all ? "text-amber-500" : "text-sky-500")} />
      <h2 className="mt-3 text-2xl font-semibold text-slate-900">{all ? "You mastered every concept" : `You mastered ${summary.mastered} of ${summary.total} concepts`}</h2>
      <p className="mt-1 text-slate-600">{summary.correct} of {summary.answered} answers right.</p>
      <ul className="mt-5 space-y-2">
        {progress.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-2.5 text-sm">
            <span className="font-medium text-slate-800">{p.name}</span>
            <span className={cn("shrink-0 font-semibold", p.status === "mastered" ? "text-emerald-700" : "text-amber-700")}>
              {p.status === "mastered" ? "Mastered" : "Keep practicing"} · {p.correct}/{p.answered}
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-6 rounded-xl bg-sky-50 p-5 ring-1 ring-inset ring-sky-200">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-sky-700">Recommended next</p>
        <p className="mt-1.5 flex items-center gap-2 text-lg font-semibold text-slate-900"><rec.Icon className="h-5 w-5 text-sky-600" /> {rec.title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-600">A new adaptive session with {nextDetail(next.recommended)}.</p>
        <Button onClick={() => onNext(next.recommended)} className="mt-4 bg-sky-600 text-white hover:bg-sky-700">
          <Sparkles className="mr-1.5 h-4 w-4" /> {rec.button}
        </Button>
      </div>

      {next.others.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium text-slate-500">Or instead</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {next.others.map((o) => {
              const c = NEXT_COPY[o.kind]
              return (
                <button key={o.kind} type="button" onClick={() => onNext(o)} className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-sky-300 hover:bg-sky-50/40">
                  <c.Icon className="mt-0.5 h-4 w-4 shrink-0 text-sky-600" />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">{c.title}</span>
                    <span className="block text-xs leading-snug text-slate-500">{nextDetail(o)}</span>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      <button type="button" onClick={onRestart} className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-800">
        <RotateCcw className="h-3.5 w-3.5" /> Redo this session
      </button>
    </div>
  )
}
