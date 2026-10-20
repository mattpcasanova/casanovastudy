"use client"

// "Write the code" exercises: a small code editor, Run, and Check (hidden tests).
// Used by the practice format (WRITE_CODE activities, graded through onDone),
// Learn mode, custom guides, and ```exercise fences in any guide (standalone).
// Code runs in the sandboxed runner (lib/code-runner), never on our servers.

import { useEffect, useMemo, useRef, useState } from 'react'
import { CheckCircle2, Eye, Loader2, Play, RotateCcw, Terminal, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { outputMatches, type CodeExercise } from '@/lib/code-exercise/format'
import { runCode, warmRunner, type RunResult } from '@/lib/code-runner/client'
import { highlightCode, languageLabel } from './code-view'
import { InlineMarkdown } from './study-markdown'
import { QuestionStem } from './question-stem'
import { ExplanationText } from './explanation-text'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import { HintLadder } from '@/components/explain/tutor-help'
import { ExplainButton } from '@/components/explain/explain-provider'

const INDENT: Record<CodeExercise['lang'], string> = { python: '    ', javascript: '  ' }

/** Insert text at the cursor keeping the browser's undo history when possible. */
function insertText(el: HTMLTextAreaElement, text: string, onChange: (v: string) => void) {
  el.focus()
  // insertText with '' deletes the selection but reports failure, so deletes use 'delete'.
  if (!document.execCommand?.(text ? 'insertText' : 'delete', false, text || undefined)) {
    const { selectionStart: s, selectionEnd: e, value } = el
    onChange(value.slice(0, s) + text + value.slice(e))
    requestAnimationFrame(() => el.setSelectionRange(s + text.length, s + text.length))
  }
}

/**
 * A highlighted code editor: a transparent textarea over highlight.js output.
 * Tab / Shift+Tab indent, Enter keeps the indentation, Ctrl/Cmd+Enter runs,
 * Esc leaves the editor (so Tab doesn't trap keyboard users).
 */
export function CodeEditor({ value, onChange, lang, errorLine, onRun, readOnly, onFocus, label = 'Code editor' }: {
  value: string
  onChange: (v: string) => void
  lang: CodeExercise['lang']
  errorLine?: number | null
  onRun?: () => void
  readOnly?: boolean
  onFocus?: () => void
  label?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const { html } = useMemo(() => highlightCode(value, lang), [value, lang])
  const lineCount = Math.max(value.split('\n').length, 4)
  const unit = INDENT[lang]

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); onRun?.(); return }
    if (e.key === 'Escape') { el.blur(); return }
    if (readOnly) return
    const { selectionStart: s, selectionEnd: end, value: v } = el
    const lineStart = v.lastIndexOf('\n', s - 1) + 1
    if (e.key === 'Tab') {
      e.preventDefault()
      if (e.shiftKey) {
        const line = v.slice(lineStart)
        const lead = line.match(/^ */)![0].length
        const remove = Math.min(lead, unit.length)
        if (!remove) return
        el.setSelectionRange(lineStart, lineStart + remove)
        insertText(el, '', onChange)
        const at = Math.max(lineStart, s - remove)
        el.setSelectionRange(at, at)
      } else if (s === end) {
        insertText(el, unit, onChange)
      } else {
        // Indent every selected line.
        const block = v.slice(lineStart, end)
        el.setSelectionRange(lineStart, end)
        insertText(el, block.split('\n').map((l) => unit + l).join('\n'), onChange)
      }
      return
    }
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey) {
      e.preventDefault()
      const before = v.slice(lineStart, s)
      let indent = before.match(/^\s*/)![0]
      const trimmed = before.trimEnd()
      if (lang === 'python' ? trimmed.endsWith(':') : /[{[(]$/.test(trimmed)) indent += unit
      insertText(el, `\n${indent}`, onChange)
    }
  }

  return (
    <div className="study-code not-prose flex overflow-hidden rounded-xl bg-slate-900 shadow-sm ring-1 ring-slate-800 focus-within:ring-2 focus-within:ring-orange-400/70">
      <div aria-hidden className="select-none border-r border-white/10 py-3 pl-3 pr-2 text-right font-mono text-base leading-6 text-slate-500 sm:text-[0.85rem]">
        {Array.from({ length: lineCount }, (_, i) => (
          <div key={i} className={cn(errorLine === i + 1 && 'rounded bg-rose-500/30 text-rose-200')}>{i + 1}</div>
        ))}
      </div>
      <div className="min-w-0 flex-1 overflow-x-auto" onClick={() => ref.current?.focus()}>
        <div className="grid w-max min-w-full">
          <pre aria-hidden className="pointer-events-none col-start-1 row-start-1 m-0 whitespace-pre py-3 pl-3 pr-6 font-mono text-base leading-6 text-slate-100 sm:text-[0.85rem]">
            <code className="hljs" dangerouslySetInnerHTML={{ __html: `${html}\n` }} />
          </pre>
          <textarea
            ref={ref}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKeyDown}
            onFocus={onFocus}
            readOnly={readOnly}
            rows={lineCount}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            aria-label={label}
            className="col-start-1 row-start-1 w-full resize-none overflow-hidden whitespace-pre bg-transparent py-3 pl-3 pr-6 font-mono text-base leading-6 text-transparent caret-orange-300 outline-none selection:bg-sky-400/30 sm:text-[0.85rem]"
          />
        </div>
      </div>
    </div>
  )
}

type Phase = 'idle' | 'loading' | 'running'

const passed = (r: RunResult, ex: CodeExercise) =>
  !r.error && r.tests.every((t) => t.pass) && (!ex.output || outputMatches(r.stdout, ex.output))

/**
 * One exercise. In practice/Learn, `onDone(correct, note?)` fires once: when
 * the tests pass, or when the student reveals the solution first. Standalone
 * (a ```exercise fence in a guide) keeps its own pass state.
 */
export function CodeExerciseView({ exercise, checked = false, onDone, compact = false, standalone = false, showPrompt = true }: {
  exercise: CodeExercise
  checked?: boolean
  onDone?: (correct: boolean, note?: string) => void
  compact?: boolean
  standalone?: boolean
  showPrompt?: boolean
}) {
  const [code, setCode] = useState(exercise.starter)
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<{ run: RunResult; graded: boolean } | null>(null)
  const [fails, setFails] = useState(0)
  const [showSolution, setShowSolution] = useState(false)
  const [solved, setSolved] = useState(false)
  const done = checked || solved
  const label = languageLabel(exercise.lang)
  const warmed = useRef(false)
  const warm = () => {
    if (warmed.current) return
    warmed.current = true
    void warmRunner(exercise.lang)
  }
  // JavaScript costs nothing to start; Python waits for the student to engage.
  useEffect(() => { if (exercise.lang === 'javascript') warm() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const execute = async (graded: boolean) => {
    if (phase !== 'idle') return
    warm()
    setPhase('running')
    const run = await runCode(
      { lang: exercise.lang, code, tests: graded ? exercise.tests : [] },
      (s) => setPhase(s === 'loading' ? 'loading' : 'running'),
    )
    setPhase('idle')
    setResult({ run, graded })
    if (!graded || done || run.failed) return
    if (passed(run, exercise)) {
      setSolved(true)
      onDone?.(true)
    } else {
      setFails((n) => n + 1)
    }
  }

  const revealSolution = () => {
    setShowSolution(true)
    if (!done) {
      setSolved(true)
      onDone?.(false, 'You opened the solution. Read it, then try writing it from memory.')
    }
  }

  const run = result?.run
  const allPass = !!run && result!.graded && passed(run, exercise)
  const outputWrong = !!run && result!.graded && !run.error && !!exercise.output && !outputMatches(run.stdout, exercise.output)

  return (
    <div className={cn(standalone && 'not-prose my-6 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm print:break-inside-avoid')}>
      {standalone && (
        <div className="flex items-center gap-2 border-b border-slate-100 bg-gradient-to-r from-orange-50/80 to-white px-4 py-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-orange-500 text-white"><Terminal className="h-3.5 w-3.5" /></span>
          <span className={cn(eyebrow, 'text-orange-700')}>Try it · {label}</span>
          {solved && <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><CheckCircle2 className="h-4 w-4" /> Solved</span>}
        </div>
      )}
      <div className={cn(standalone && 'p-4 sm:p-5')}>
        {showPrompt && (
          <p className={cn(fontDisplay, 'font-medium leading-snug text-slate-900', standalone ? 'mb-3 text-lg' : compact ? 'mb-4 text-lg' : 'mb-5 text-xl sm:text-[1.45rem]')}>
            <QuestionStem text={exercise.prompt} />
          </p>
        )}
        {exercise.output && (
          <div className="mb-3 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600 ring-1 ring-inset ring-slate-200">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">It should print</p>
            <pre className="whitespace-pre-wrap font-mono text-[0.82rem] text-slate-800">{exercise.output}</pre>
          </div>
        )}

        <div className="print:hidden">
          <CodeEditor
            value={code}
            onChange={setCode}
            lang={exercise.lang}
            errorLine={run?.error?.line ?? null}
            onRun={() => execute(false)}
            onFocus={warm}
            label={`${label} code editor`}
          />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => execute(false)} disabled={phase !== 'idle'} onPointerEnter={warm} className="gap-1.5">
              <Play className="h-3.5 w-3.5" /> Run
            </Button>
            {!done && (
              <Button type="button" size="sm" onClick={() => execute(true)} disabled={phase !== 'idle'} onPointerEnter={warm} className="gap-1.5 bg-orange-500 text-white hover:bg-orange-600">
                <CheckCircle2 className="h-3.5 w-3.5" /> Check
              </Button>
            )}
            <button type="button" onClick={() => { setCode(exercise.starter); setResult(null) }} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
              <RotateCcw className="h-3.5 w-3.5" /> Reset
            </button>
            {exercise.solution && !showSolution && (done || fails > 0) && (
              <button type="button" onClick={revealSolution} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800">
                <Eye className="h-3.5 w-3.5" /> {done ? 'See a solution' : 'Show the solution'}
              </button>
            )}
            <span className="ml-auto hidden text-xs text-slate-400 sm:inline">Ctrl+Enter runs</span>
          </div>

          {phase !== 'idle' && (
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-600" role="status">
              <Loader2 className="h-4 w-4 animate-spin" />
              {phase === 'loading' ? `Starting ${label}. The first run takes a few seconds…` : 'Running…'}
            </p>
          )}

          {run && phase === 'idle' && (
            <div className="mt-3 space-y-2" aria-live="polite">
              {(run.stdout || (!result!.graded && !run.error)) && (
                <div className="overflow-hidden rounded-lg bg-slate-950 ring-1 ring-slate-800">
                  <p className="border-b border-white/10 px-3 py-1 font-mono text-[0.68rem] uppercase tracking-wider text-slate-500">Output</p>
                  <pre className="max-h-56 overflow-auto whitespace-pre-wrap px-3 py-2 font-mono text-[0.82rem] leading-relaxed text-slate-100">{run.stdout || <span className="text-slate-500">(nothing printed)</span>}</pre>
                </div>
              )}
              {run.error && (
                <div className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-800 ring-1 ring-inset ring-rose-200">
                  <p className="font-mono text-[0.82rem]">{run.error.message}</p>
                  {run.error.line && !run.failed && <p className="mt-0.5 text-xs text-rose-700">Line {run.error.line}</p>}
                </div>
              )}
              {result!.graded && !run.error && (
                <div className={cn('rounded-lg px-3 py-2.5 text-sm ring-1 ring-inset', allPass ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-200')}>
                  <p className={cn('mb-1.5 font-semibold', allPass ? 'text-emerald-800' : 'text-amber-900')}>
                    {allPass
                      ? run.tests.length ? 'All tests pass.' : 'The output matches.'
                      : run.tests.length
                        ? `${run.tests.filter((t) => t.pass).length} of ${run.tests.length} tests pass${outputWrong ? ', and the printed output is different' : ''}. Fix it and check again.`
                        : 'The printed output doesn’t match yet. Fix it and check again.'}
                  </p>
                  <ul className="space-y-1">
                    {run.tests.map((t, i) => (
                      <li key={i} className="flex gap-2">
                        {t.pass ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />}
                        <span className="min-w-0">
                          <code className="break-all font-mono text-[0.8rem] text-slate-800">{t.test}</code>
                          {!t.pass && t.error && <span className="block text-xs text-rose-700">{t.error.message}</span>}
                          {!t.pass && !t.error && t.got !== undefined && <span className="block text-xs text-slate-600">got <code className="font-mono">{t.got}</code>, expected <code className="font-mono">{t.expected}</code></span>}
                        </span>
                      </li>
                    ))}
                    {outputWrong && (
                      <li className="flex gap-2">
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                        <span>Printed output doesn&apos;t match. Compare it with &ldquo;It should print&rdquo; above.</span>
                      </li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {!done && (
            <HintLadder hint={exercise.hint} question={{ prompt: `${exercise.prompt}\n\nStarter code (${label}):\n${exercise.starter}` }} />
          )}

          {showSolution && exercise.solution && (
            <div className="mt-3">
              <p className={cn(eyebrow, 'mb-1.5 text-slate-500')}>A solution</p>
              <CodeEditor value={exercise.solution} onChange={() => {}} lang={exercise.lang} readOnly label="Solution" />
            </div>
          )}

          {standalone && solved && (
            <div className="mt-3 space-y-2">
              {exercise.explanation && <p className="text-sm leading-relaxed text-slate-700"><ExplanationText text={exercise.explanation} /></p>}
              <ExplainButton build={() => ({ label: `Explain: “${exercise.prompt.slice(0, 90)}”`, prompt: `Explain this coding exercise and a good solution.\n${exercise.prompt}\nMy code:\n${code}${exercise.solution ? `\nModel solution:\n${exercise.solution}` : ''}` })}>Explain more</ExplainButton>
            </div>
          )}
        </div>

        {/* Print: the task and starter code, with room to write. */}
        <div className="hidden print:block">
          {exercise.starter && <pre className="whitespace-pre-wrap rounded border border-slate-300 p-2 font-mono text-xs">{exercise.starter}</pre>}
          <div className="mt-2 space-y-3">{[0, 1, 2, 3].map((i) => <div key={i} className="h-6 border-b border-slate-300" />)}</div>
          {standalone && exercise.tests.length > 0 && <p className="mt-2 text-xs text-slate-600">It should pass: <InlineMarkdown text={exercise.tests.map((t) => `\`${t}\``).join(', ')} /></p>}
        </div>
      </div>
    </div>
  )
}
