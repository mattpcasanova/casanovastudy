"use client"

import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, XCircle, RotateCcw, ChevronLeft, ChevronRight, Loader2, Zap, ClipboardList, Lightbulb, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { openHomeWithPrefill, type GuidePrefill } from '@/lib/prefill'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import { stripEmoji, toTitleCase, plainText } from '@/lib/formats/normalize'
import { InlineMarkdown } from './study-markdown'
import { ExplanationText } from './explanation-text'
import { DesmosHelpButton, ExplainButton } from '@/components/explain/explain-provider'
import { desmosQuizAsk, quizAsk } from '@/components/explain/asks'
import { QuestionStem } from './question-stem'
import { GraphFence } from './graph-figure'
import { parseQuizContent, type Question, type ShortAnswerQuestion } from '@/lib/formats/quiz'
import { useRecordResult } from '@/components/study-results-context'

interface QuizFormatProps {
  content: string
  subject: string
  title?: string
  gradeLevel?: string
}

export { parseQuizContent, type Question } from '@/lib/formats/quiz'

interface ShortAnswerScore {
  score: number
  feedback: string
  isCorrect: boolean
}

type Mode = 'practice' | 'test'

const TYPE_LABEL: Record<Question['type'], string> = { mc: 'Multiple choice', tf: 'True or false', sa: 'Short answer' }

export default function QuizFormat({ content, subject, title, gradeLevel }: QuizFormatProps) {
  const allQuestions = useMemo(() => parseQuizContent(content), [content])
  const [subset, setSubset] = useState<string[] | null>(null) // "retry missed" ids
  const questions = useMemo(() => (subset ? allQuestions.filter((q) => subset.includes(q.id)) : allQuestions), [allQuestions, subset])

  const [mode, setMode] = useState<Mode>('practice')
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [checked, setChecked] = useState<Record<string, boolean>>({}) // practice-mode reveals
  const [saScores, setSaScores] = useState<Record<string, ShortAnswerScore>>({})
  const [scoring, setScoring] = useState<Record<string, boolean>>({})
  const [finished, setFinished] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const current = questions[Math.min(index, questions.length - 1)]

  // Each question is logged once per run (practice reveal or test submit).
  const logResult = useRecordResult()
  const logged = useRef(new Set<string>())
  const log = (q: Question, correct: boolean, score?: number) => {
    if (logged.current.has(q.id)) return
    logged.current.add(q.id)
    logResult({ source: 'quiz', itemId: `q:${q.id}`, itemKind: q.type, topic: q.section, correct, score })
  }

  const scoreShortAnswer = async (q: ShortAnswerQuestion): Promise<ShortAnswerScore | null> => {
    const studentAnswer = answers[q.id]
    if (!studentAnswer?.trim()) return null
    setScoring((s) => ({ ...s, [q.id]: true }))
    try {
      const response = await fetch('/api/score-short-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q.question, sampleAnswer: q.sampleAnswer, studentAnswer, subject }),
      })
      const result = await response.json()
      if (result.success) {
        setSaScores((s) => ({ ...s, [q.id]: result.data }))
        return result.data
      }
    } catch (error) {
      console.error('Error scoring short answer:', error)
    } finally {
      setScoring((s) => ({ ...s, [q.id]: false }))
    }
    return null
  }

  const choose = (q: Question, value: string) => {
    if (finished || (mode === 'practice' && checked[q.id])) return
    setAnswers((a) => ({ ...a, [q.id]: value }))
    // Practice mode: objective questions check themselves on click.
    if (mode === 'practice' && q.type !== 'sa') {
      setChecked((c) => ({ ...c, [q.id]: true }))
      log(q, isObjectiveCorrect(q, value))
    }
  }

  const checkShortAnswer = async (q: ShortAnswerQuestion) => {
    setChecked((c) => ({ ...c, [q.id]: true }))
    const score = await scoreShortAnswer(q)
    if (score) log(q, score.isCorrect, score.score)
  }

  const finish = async () => {
    setSubmitting(true)
    const pending = questions.filter((q): q is ShortAnswerQuestion => q.type === 'sa' && !saScores[q.id] && !!answers[q.id]?.trim())
    const fresh = await Promise.all(pending.map(scoreShortAnswer))
    const scores: Record<string, ShortAnswerScore> = { ...saScores }
    pending.forEach((q, i) => { const r = fresh[i]; if (r) scores[q.id] = r })
    for (const q of questions) {
      if (q.type === 'sa') {
        const r = scores[q.id]
        if (r) log(q, r.isCorrect, r.score)
      } else if (answers[q.id]) {
        log(q, isObjectiveCorrect(q, answers[q.id]))
      }
    }
    setSubmitting(false)
    setFinished(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const restart = (ids: string[] | null) => {
    setSubset(ids)
    logged.current = new Set()
    setAnswers({})
    setChecked({})
    setSaScores({})
    setIndex(0)
    setFinished(false)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (finished) return
    const t = e.target as HTMLElement | null
    if (t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT')) return
    if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    else if (e.key === 'ArrowRight') setIndex((i) => Math.min(questions.length - 1, i + 1))
  }, [finished, questions.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (allQuestions.length === 0) {
    return <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">No quiz questions were found in this guide.</div>
  }

  const status = (q: Question): 'correct' | 'wrong' | 'answered' | 'open' => {
    const revealed = finished || (mode === 'practice' && checked[q.id])
    if (q.type === 'sa') {
      const s = saScores[q.id]
      if (revealed && s) return s.isCorrect ? 'correct' : 'wrong'
      return answers[q.id]?.trim() ? 'answered' : 'open'
    }
    if (!answers[q.id]) return 'open'
    if (!revealed) return 'answered'
    return isObjectiveCorrect(q, answers[q.id]) ? 'correct' : 'wrong'
  }

  if (finished) {
    return <QuizResults questions={questions} answers={answers} saScores={saScores} status={status} onRestart={restart} isRetry={!!subset} guide={{ title: title || 'this quiz', subject, gradeLevel }} />
  }

  const answeredCount = questions.filter((q) => status(q) !== 'open').length
  const revealed = mode === 'practice' && !!checked[current.id]
  const isLast = index === questions.length - 1

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl space-y-5')}>
      {/* Header: mode + navigator */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{answeredCount}</span> of {questions.length} answered
            {subset && <span className="ml-2 rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Retrying missed</span>}
          </p>
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {([['practice', Zap, 'Practice'], ['test', ClipboardList, 'Test']] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                title={m === 'practice' ? 'See if you got it right after every question' : 'Answer everything, then see your score'}
                className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <Navigator questions={questions} index={index} status={status} onJump={setIndex} />
      </div>

      {/* Question */}
      <div key={current.id} className="animate-fade-up rounded-2xl border border-slate-200 border-t-4 border-t-purple-500 bg-white p-5 shadow-sm sm:p-7 print:hidden">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <span className={cn(eyebrow, 'text-purple-700')}>Question {index + 1}</span>
          <span className="text-slate-300">·</span>
          <span className="text-xs font-medium text-slate-500">{TYPE_LABEL[current.type]}</span>
          {current.section && <span className="ml-auto max-w-[60%] truncate rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{current.section}</span>}
        </div>
        <p className={cn(fontDisplay, 'mb-6 text-xl font-medium leading-snug text-slate-900 sm:text-[1.4rem]')}>
          <QuestionStem text={current.question} />
        </p>
        {current.figure && <GraphFence text={current.figure} compact allowExplain={revealed} />}

        {current.type === 'mc' && (
          <div className="space-y-2.5" role="radiogroup">
            {current.options.map((option, i) => (
              <OptionButton
                key={i}
                letter={String.fromCharCode(65 + i)}
                label={option}
                selected={answers[current.id] === option}
                correct={revealed && option === current.correctAnswer}
                wrong={revealed && answers[current.id] === option && option !== current.correctAnswer}
                locked={revealed}
                onClick={() => choose(current, option)}
              />
            ))}
          </div>
        )}

        {current.type === 'tf' && (
          <div className="grid grid-cols-2 gap-3" role="radiogroup">
            {['true', 'false'].map((v) => (
              <OptionButton
                key={v}
                label={v === 'true' ? 'True' : 'False'}
                selected={answers[current.id] === v}
                correct={revealed && (v === 'true') === current.correctAnswer}
                wrong={revealed && answers[current.id] === v && (v === 'true') !== current.correctAnswer}
                locked={revealed}
                onClick={() => choose(current, v)}
                center
              />
            ))}
          </div>
        )}

        {current.type === 'sa' && (
          <div className="space-y-3">
            <Textarea
              value={answers[current.id] || ''}
              onChange={(e) => setAnswers((a) => ({ ...a, [current.id]: e.target.value }))}
              placeholder="Type your answer…"
              rows={5}
              disabled={revealed}
              className="resize-none text-base"
            />
            {mode === 'practice' && !revealed && (
              <Button
                onClick={() => checkShortAnswer(current)}
                disabled={!answers[current.id]?.trim()}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                Check my answer
              </Button>
            )}
            {revealed && (
              scoring[current.id] ? (
                <div className="flex items-center gap-2 rounded-xl bg-slate-50 p-4 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Scoring your answer…</div>
              ) : (
                <ShortAnswerFeedback score={saScores[current.id]} sample={current.sampleAnswer} extra={<ExplainButton build={() => quizAsk(current, answers[current.id])} />} />
              )
            )}
          </div>
        )}

        {revealed && current.type !== 'sa' && (
          <Feedback
            correct={isObjectiveCorrect(current, answers[current.id])}
            explanation={current.explanation}
            correctLabel={correctLabel(current)}
            pickedLabel={pickedLabel(current, answers[current.id])}
            extra={
              <div className="flex flex-wrap gap-2">
                <ExplainButton build={() => quizAsk(current, answers[current.id])}>{isObjectiveCorrect(current, answers[current.id]) ? 'Explain more' : 'Why?'}</ExplainButton>
                <DesmosHelpButton build={() => desmosQuizAsk(current)} />
              </div>
            }
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button onClick={() => setIndex((i) => Math.max(0, i - 1))} disabled={index === 0} variant="ghost" className="text-slate-600">
          <ChevronLeft className="mr-1 h-4 w-4" /> Previous
        </Button>
        {isLast ? (
          <Button onClick={finish} disabled={answeredCount === 0 || submitting} size="lg" className="bg-emerald-600 text-white hover:bg-emerald-700">
            {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Scoring…</> : mode === 'practice' ? 'See results' : 'Submit quiz'}
          </Button>
        ) : (
          <Button onClick={() => setIndex((i) => i + 1)} size="lg" className="bg-purple-600 text-white hover:bg-purple-700">
            Next <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Print version: the questions, then an answer key on its own page */}
      <div className="hidden print:block">
        <ol className="divide-y divide-slate-200">
          {allQuestions.map((q, i) => (
            <li key={q.id} className="break-inside-avoid py-3 text-sm">
              {q.section && (i === 0 || allQuestions[i - 1].section !== q.section) && (
                <p className={cn(fontDisplay, 'break-after-avoid pb-2 text-base font-semibold text-slate-900')}>{q.section}</p>
              )}
              <p className="mb-2 font-semibold text-slate-900">{i + 1}. <QuestionStem text={q.question} listClassName="text-sm" /></p>
              {q.figure && <div className="ml-5 max-w-md"><GraphFence text={q.figure} compact /></div>}
              {q.type === 'mc' && <div className="ml-5 space-y-1">{q.options.map((o, oi) => <div key={oi}>○ <span className="font-semibold">{String.fromCharCode(65 + oi)}.</span> <InlineMarkdown text={o} /></div>)}</div>}
              {q.type === 'tf' && <div className="ml-5">○ True &nbsp;&nbsp;&nbsp; ○ False</div>}
              {q.type === 'sa' && <div className="ml-5 space-y-2"><div className="h-7 border-b border-slate-400" /><div className="h-7 border-b border-slate-400" /><div className="h-7 border-b border-slate-400" /></div>}
            </li>
          ))}
        </ol>
        <div className="break-before-page pt-2">
          <h3 className={cn(fontDisplay, 'border-b border-slate-300 pb-1 text-lg font-semibold text-slate-900')}>Answer key</h3>
          <ol className="mt-2 space-y-1.5 text-sm">
            {allQuestions.map((q, i) => (
              <li key={q.id} className="break-inside-avoid">
                <span className="font-semibold">{i + 1}.</span>{' '}
                {q.type === 'mc' && <><span className="font-semibold">{String.fromCharCode(65 + q.options.indexOf(q.correctAnswer))}.</span> <InlineMarkdown text={q.correctAnswer} /></>}
                {q.type === 'tf' && (q.correctAnswer ? 'True' : 'False')}
                {q.type === 'sa' && <InlineMarkdown text={q.sampleAnswer} />}
                {q.explanation && <span className="text-slate-500">. <InlineMarkdown text={q.explanation} /></span>}
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}

function isObjectiveCorrect(q: Question, answer: string | undefined): boolean {
  if (q.type === 'mc') return answer === q.correctAnswer
  if (q.type === 'tf') return answer === (q.correctAnswer ? 'true' : 'false')
  return false
}

function pickedLabel(q: Question, answer: string | undefined): string | undefined {
  if (!answer) return undefined
  if (q.type === 'tf') return answer === 'true' ? 'True' : 'False'
  if (q.type === 'mc') { const i = q.options.indexOf(answer); return i < 0 ? undefined : String.fromCharCode(65 + i) }
  return undefined
}

function correctLabel(q: Question): string {
  if (q.type === 'mc') return `${String.fromCharCode(65 + q.options.indexOf(q.correctAnswer))}. ${q.correctAnswer}`
  if (q.type === 'tf') return q.correctAnswer ? 'True' : 'False'
  return q.sampleAnswer
}

const STATUS_DOT = {
  correct: 'bg-emerald-500 text-white',
  wrong: 'bg-rose-500 text-white',
  answered: 'bg-purple-600 text-white',
  open: 'bg-slate-100 text-slate-500 hover:bg-slate-200',
} as const

function Navigator({ questions, index, status, onJump }: { questions: Question[]; index: number; status: (q: Question) => keyof typeof STATUS_DOT; onJump: (i: number) => void }) {
  // Group consecutive questions by section so the navigator mirrors the quiz's topics.
  const groups: Array<{ section: string; items: Array<{ q: Question; i: number }> }> = []
  questions.forEach((q, i) => {
    const g = groups[groups.length - 1]
    if (g && g.section === q.section) g.items.push({ q, i })
    else groups.push({ section: q.section, items: [{ q, i }] })
  })
  const showLabels = groups.length > 1 && groups.some((g) => g.section)
  return (
    // Phones drop the topic labels and let all numbers flow together, so the
    // question itself isn't pushed below the fold.
    <div className={cn('mt-4 flex flex-wrap gap-1.5', showLabels ? 'sm:gap-x-5 sm:gap-y-3' : 'gap-x-1.5')}>
      {groups.map((g, gi) => (
        <div key={gi} className="contents min-w-0 sm:block">
          {showLabels && <p className="mb-1.5 hidden max-w-[14rem] truncate text-[0.7rem] font-medium uppercase tracking-wide text-slate-400 sm:block">{g.section || 'Questions'}</p>}
          <div className="contents sm:flex sm:flex-wrap sm:gap-1.5">
            {g.items.map(({ q, i }) => (
              <button
                key={q.id}
                type="button"
                onClick={() => onJump(i)}
                aria-label={`Question ${i + 1}`}
                aria-current={i === index}
                className={cn(
                  'h-9 w-9 rounded-lg text-xs font-semibold tabular-nums transition sm:h-8 sm:w-8',
                  STATUS_DOT[status(q)],
                  i === index && 'ring-2 ring-purple-500 ring-offset-2'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function OptionButton({ letter, label, selected, correct, wrong, locked, onClick, center }: {
  letter?: string
  label: string
  selected: boolean
  correct: boolean
  wrong: boolean
  locked: boolean
  onClick: () => void
  center?: boolean
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onClick}
      disabled={locked && !selected && !correct}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl border-2 px-4 py-3 text-left transition-all',
        center && 'justify-center',
        correct ? 'border-emerald-400 bg-emerald-50' : wrong ? 'border-rose-400 bg-rose-50' : selected ? 'border-purple-500 bg-purple-50' : 'border-slate-200 bg-white hover:border-purple-300 hover:bg-purple-50/40',
        locked && !correct && !wrong && 'opacity-60'
      )}
    >
      {letter && (
        <span className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-sm font-bold',
          correct ? 'bg-emerald-500 text-white' : wrong ? 'bg-rose-500 text-white' : selected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
        )}>
          {letter}
        </span>
      )}
      <span className={cn('leading-snug text-slate-800', center && 'font-semibold')}><InlineMarkdown text={label} /></span>
      {locked && (correct || wrong) && (
        <span className="ml-auto flex shrink-0 items-center gap-1.5">
          <AnswerTag yours={selected} correct={correct} />
          {correct ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}
        </span>
      )}
    </button>
  )
}

// Spells out which option was the student's and which is right, so a red
// outline next to a green check can't be misread as "my answer was right".
export function AnswerTag({ yours, correct }: { yours: boolean; correct: boolean }) {
  if (!yours && !correct) return null
  return (
    <span className={cn(
      'rounded-full px-2 py-0.5 text-[0.7rem] font-semibold',
      correct ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
    )}>
      {yours ? 'Your answer' : 'Correct answer'}
    </span>
  )
}

function Feedback({ correct, explanation, correctLabel, pickedLabel, extra }: { correct: boolean; explanation?: string; correctLabel: string; pickedLabel?: string; extra?: ReactNode }) {
  return (
    <div className={cn('mt-5 rounded-xl p-4 animate-fade-up', correct ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : 'bg-rose-50 ring-1 ring-inset ring-rose-200')}>
      <p className={cn('flex items-start gap-2 font-semibold', correct ? 'text-emerald-800' : 'text-rose-800')}>
        {correct ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /> : <XCircle className="mt-0.5 h-5 w-5 shrink-0" />}
        {correct ? 'Correct!' : (
          <span>
            Not quite.{pickedLabel && <> You picked <InlineMarkdown text={pickedLabel} />.</>} The answer is <span className="font-bold"><InlineMarkdown text={correctLabel} /></span>
          </span>
        )}
      </p>
      {explanation && (
        <p className="mt-2 flex gap-2 text-sm leading-relaxed text-slate-700">
          <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
          <span><ExplanationText text={explanation} /></span>
        </p>
      )}
      {extra}
    </div>
  )
}

function ShortAnswerFeedback({ score, sample, extra }: { score?: ShortAnswerScore; sample: string; extra?: ReactNode }) {
  return (
    <div className={cn('rounded-xl p-4', !score ? 'bg-slate-50 ring-1 ring-inset ring-slate-200' : score.isCorrect ? 'bg-emerald-50 ring-1 ring-inset ring-emerald-200' : 'bg-amber-50 ring-1 ring-inset ring-amber-200')}>
      {score ? (
        <>
          <p className="flex items-center gap-2 font-semibold text-slate-900">
            {score.isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-amber-600" />}
            {score.score}/100
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700">{score.feedback}</p>
        </>
      ) : (
        <p className="text-sm italic text-slate-500">Not answered</p>
      )}
      <div className="mt-3 border-t border-black/5 pt-3">
        <p className={cn(eyebrow, 'mb-1 text-slate-500')}>Model answer</p>
        <p className="text-sm leading-relaxed text-slate-700"><InlineMarkdown text={sample} /></p>
      </div>
      {extra}
    </div>
  )
}

function QuizResults({ questions, answers, saScores, status, onRestart, isRetry, guide }: {
  guide: { title: string; subject: string; gradeLevel?: string }
  questions: Question[]
  answers: Record<string, string>
  saScores: Record<string, ShortAnswerScore>
  status: (q: Question) => 'correct' | 'wrong' | 'answered' | 'open'
  onRestart: (ids: string[] | null) => void
  isRetry: boolean
}) {
  const graded = questions.filter((q) => q.type !== 'sa' || saScores[q.id])
  const correct = graded.filter((q) => status(q) === 'correct').length
  const pct = graded.length ? Math.round((correct / graded.length) * 100) : 0
  const missed = questions.filter((q) => status(q) !== 'correct')
  const router = useRouter()
  const tone = pct >= 90 ? 'text-emerald-600' : pct >= 70 ? 'text-purple-600' : pct >= 50 ? 'text-amber-600' : 'text-rose-600'
  const message = pct >= 90 ? 'Excellent. You know this material.' : pct >= 70 ? 'Solid. Review the ones you missed.' : pct >= 50 ? 'Getting there. Focus on the topics below.' : 'Keep going. Retry the missed questions.'

  const sections: Array<{ name: string; right: number; total: number }> = []
  for (const q of graded) {
    const name = q.section || 'Questions'
    let s = sections.find((x) => x.name === name)
    if (!s) sections.push((s = { name, right: 0, total: 0 }))
    s.total++
    if (status(q) === 'correct') s.right++
  }

  const circumference = 2 * Math.PI * 52

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl space-y-5')}>
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
          <div className="relative h-32 w-32 shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
              <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" className="text-slate-100" />
              <circle
                cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeWidth="10" strokeLinecap="round"
                className={cn(tone, 'transition-[stroke-dashoffset] duration-700')}
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - pct / 100)}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={cn(fontDisplay, 'text-3xl font-semibold', tone)}>{pct}%</span>
              <span className="text-xs text-slate-500">{correct}/{graded.length}</span>
            </div>
          </div>
          <div className="flex-1 text-center sm:text-left">
            <p className={cn(eyebrow, 'text-slate-400')}>{isRetry ? 'Retry result' : 'Your result'}</p>
            <p className={cn(fontDisplay, 'mt-1 text-2xl font-semibold text-slate-900')}>{message}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
              {missed.length > 0 && (
                <Button onClick={() => onRestart(missed.map((q) => q.id))} className="bg-purple-600 text-white hover:bg-purple-700">
                  <RotateCcw className="mr-2 h-4 w-4" /> Retry {missed.length} missed
                </Button>
              )}
              {missed.length > 0 && (
                <Button
                  onClick={() => router.push(openHomeWithPrefill(missedQuizPrefill(guide, missed)))}
                  variant="outline"
                  className="border-purple-200 text-purple-700 hover:bg-purple-50 hover:text-purple-800"
                >
                  <Sparkles className="mr-2 h-4 w-4" /> New quiz on what I missed
                </Button>
              )}
              <Button onClick={() => onRestart(null)} variant="outline">Start over</Button>
            </div>
          </div>
        </div>

        {sections.length > 1 && (
          <div className="mt-6 grid gap-2.5 border-t border-slate-100 pt-5 sm:grid-cols-2">
            {sections.map((s) => {
              const p = Math.round((s.right / s.total) * 100)
              return (
                <div key={s.name}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="truncate font-medium text-slate-700">{s.name}</span>
                    <span className="shrink-0 tabular-nums text-slate-500">{s.right}/{s.total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className={cn('h-full rounded-full', p >= 80 ? 'bg-emerald-500' : p >= 50 ? 'bg-amber-400' : 'bg-rose-400')} style={{ width: `${p}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h3 className={cn(fontDisplay, 'mb-4 text-lg font-semibold text-slate-900')}>Answer review</h3>
        <ol className="space-y-3">
          {questions.map((q, i) => {
            const st = status(q)
            const ok = st === 'correct'
            const unscored = q.type === 'sa' && !saScores[q.id]
            return (
              <li key={q.id} className={cn('rounded-xl border p-4', unscored ? 'border-slate-200 bg-slate-50' : ok ? 'border-emerald-200 bg-emerald-50/50' : 'border-rose-200 bg-rose-50/50')}>
                <div className="flex gap-3">
                  <span className="mt-0.5 shrink-0">
                    {unscored ? <span className="block h-5 w-5 rounded-full border-2 border-slate-300" /> : ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <XCircle className="h-5 w-5 text-rose-600" />}
                  </span>
                  <div className="min-w-0 flex-1 text-sm">
                    <p className="mb-1.5 font-medium text-slate-900">{i + 1}. <QuestionStem text={q.question} listClassName="text-sm" /></p>
                    {q.figure && !ok && <div className="max-w-sm"><GraphFence text={q.figure} compact /></div>}
                    {q.type !== 'sa' && (
                      <>
                        <p className="text-slate-600">Your answer: <span className={ok ? 'font-medium text-emerald-700' : 'font-medium text-rose-700'}>
                          {answers[q.id] ? <InlineMarkdown text={q.type === 'tf' ? (answers[q.id] === 'true' ? 'True' : 'False') : answers[q.id]} /> : 'Not answered'}
                        </span></p>
                        {!ok && <p className="text-slate-600">Correct answer: <span className="font-medium text-emerald-700"><InlineMarkdown text={correctLabel(q)} /></span></p>}
                      </>
                    )}
                    {q.type === 'sa' && (
                      <>
                        {saScores[q.id] && <p className="text-slate-700"><span className="font-medium">{saScores[q.id].score}/100</span> · {saScores[q.id].feedback}</p>}
                        <p className="mt-1 text-slate-600">Model answer: <InlineMarkdown text={q.sampleAnswer} /></p>
                      </>
                    )}
                    {q.explanation && (
                      <p className="mt-2 flex gap-1.5 text-slate-600"><Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" /><span><InlineMarkdown text={q.explanation} /></span></p>
                    )}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

// The homepage request for "a new quiz on what I missed": the missed questions
// with their right answers, asking for fresh questions on the same concepts.
function missedQuizPrefill(guide: { title: string; subject: string; gradeLevel?: string }, missed: Question[]): GuidePrefill {
  const answerOf = (q: Question) =>
    q.type === 'mc' ? q.correctAnswer : q.type === 'tf' ? (q.correctAnswer ? 'True' : 'False') : q.sampleAnswer
  const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)
  const lines: string[] = []
  let used = 0
  for (const [i, q] of missed.entries()) {
    const line = `${i + 1}. ${clip(plainText(q.question), 300)} (Correct answer: ${clip(plainText(answerOf(q)), 200)})`
    if (used + line.length > 6000) break // stay well under the 8,000-character request limit
    lines.push(line)
    used += line.length
  }
  const n = missed.length
  return {
    source: 'missed-quiz',
    sourceTitle: guide.title,
    studyGuideName: `Review: ${guide.title}`.slice(0, 120),
    format: 'quiz',
    subject: guide.subject,
    gradeLevel: guide.gradeLevel,
    detail: `${n} question${n === 1 ? '' : 's'} you missed`,
    studyRequest: [
      `Make a new practice quiz on what I got wrong in "${guide.title}".`,
      '',
      'These are the questions I missed, with the correct answers:',
      ...lines,
      '',
      'Write fresh questions that test the same concepts from different angles (don’t copy these word for word). Start with a couple of easier warm-up questions, then build up, and explain every answer so I understand why.',
    ].join('\n'),
  }
}
