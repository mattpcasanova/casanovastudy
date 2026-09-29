"use client"

// Print-only worksheet for practice activities. The interactive PracticeSession
// shows one activity at a time, which prints as a single card — this lays every
// activity out for pen-and-paper use, followed by an answer key on a new page.
// Shuffles use seededShuffle so the printout matches between renders.

import { cn } from '@/lib/utils'
import { eyebrow, fontDisplay } from '@/lib/formats/design'
import { seededShuffle, isTrueFalse, type PracticeActivity } from '@/lib/formats/practice'
import { InlineMarkdown } from './study-markdown'
import { CodeBlock, CodeLines } from './code-view'

const KIND_LABEL: Record<PracticeActivity['kind'], string> = {
  match: 'Match',
  fill: 'Fill in the blank',
  order: 'Put in order',
  sort: 'Sort',
  choice: 'Question',
  bug: 'Find the bug',
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function Blank({ chars }: { chars: number }) {
  return <span className="mx-1 inline-block border-b border-slate-500 align-baseline" style={{ width: `${Math.max(6, Math.min(20, chars + 3))}ch` }}>&nbsp;</span>
}

function Question({ a, n }: { a: PracticeActivity; n: number }) {
  const label = isTrueFalse(a) ? 'True or false' : KIND_LABEL[a.kind]
  return (
    <li className="break-inside-avoid py-3">
      <p className="text-sm">
        <span className="font-semibold text-slate-900">{n}. </span>
        <span className={cn(eyebrow, 'mr-2 text-slate-500')}>{label}</span>
        {a.kind !== 'fill' && a.prompt && <span className="font-medium text-slate-900"><InlineMarkdown text={a.prompt} /></span>}
      </p>
      {a.code && a.kind !== 'bug' && <CodeBlock lang={a.code.lang} text={a.code.text} compact className="my-2" />}

      {a.kind === 'match' && (() => {
        const defs = seededShuffle(a.pairs.map((p, i) => ({ ...p, i })), a.id)
        return (
          <div className="mt-2 grid grid-cols-2 gap-6 text-sm">
            <ol className="space-y-1.5">
              {a.pairs.map((p, i) => (
                <li key={i} className="flex items-baseline gap-2"><span className="w-8 border-b border-slate-500">&nbsp;</span><span className="font-medium">{i + 1}. <InlineMarkdown text={p.term} /></span></li>
              ))}
            </ol>
            <ol className="space-y-1.5">
              {defs.map((d, j) => <li key={d.i}><span className="font-semibold">{LETTERS[j]}.</span> <InlineMarkdown text={d.definition} /></li>)}
            </ol>
          </div>
        )
      })()}

      {a.kind === 'fill' && (
        <p className="mt-1.5 text-[0.95rem] leading-loose">
          {a.parts.map((part, i) => (typeof part === 'string' ? <InlineMarkdown key={i} text={part} /> : <Blank key={i} chars={Math.max(...part.answers.map((x) => x.length))} />))}
        </p>
      )}

      {a.kind === 'order' && (
        <ul className="mt-2 space-y-1.5 text-sm">
          {seededShuffle(a.items, a.id).map((item) => (
            <li key={item} className="flex items-baseline gap-2"><span className="inline-block h-5 w-7 rounded border border-slate-500" /><InlineMarkdown text={item} /></li>
          ))}
        </ul>
      )}

      {a.kind === 'sort' && (
        <div className="mt-2 text-sm">
          <p className="text-slate-600">
            <span className="font-medium text-slate-800">Word bank: </span>
            {seededShuffle(a.buckets.flatMap((b) => b.items), a.id).join(' · ')}
          </p>
          <div className={cn('mt-2 grid gap-3', a.buckets.length === 3 ? 'grid-cols-3' : 'grid-cols-2')}>
            {a.buckets.map((b) => (
              <div key={b.name} className="min-h-[5rem] rounded border border-slate-400 p-2">
                <p className="font-semibold"><InlineMarkdown text={b.name} /></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {a.kind === 'choice' && (
        isTrueFalse(a) ? (
          <p className="mt-1.5 text-sm">○ True &nbsp;&nbsp;&nbsp; ○ False</p>
        ) : (
          <ol className="mt-1.5 space-y-1 pl-5 text-sm">
            {a.options.map((o, i) => <li key={i} className="list-none">○ <span className="font-semibold">{LETTERS[i]}.</span> <InlineMarkdown text={o} /></li>)}
          </ol>
        )
      )}

      {a.kind === 'bug' && (
        <>
          <CodeLines lang={a.code.lang} text={a.code.text} />
          <p className="text-sm">Line with the bug: <Blank chars={3} /> &nbsp; Fix: <Blank chars={24} /></p>
        </>
      )}
    </li>
  )
}

function answerFor(a: PracticeActivity): React.ReactNode {
  switch (a.kind) {
    case 'match': {
      const defs = seededShuffle(a.pairs.map((p, i) => ({ ...p, i })), a.id)
      return a.pairs.map((_, i) => `${i + 1}–${LETTERS[defs.findIndex((d) => d.i === i)]}`).join(', ')
    }
    case 'fill':
      return a.parts.filter((p): p is { answers: string[] } => typeof p !== 'string').map((p) => p.answers.join(' / ')).join('; ')
    case 'order':
      return a.items.join(' → ')
    case 'sort':
      return a.buckets.map((b) => `${b.name}: ${b.items.join(', ')}`).join(' | ')
    case 'choice':
      return isTrueFalse(a) ? a.options[a.correct] : `${LETTERS[a.correct]}. ${a.options[a.correct]}`
    case 'bug':
      return `Line ${a.bugLines.join(', ')}${a.fix ? ` (fix: ${a.fix})` : ''}`
  }
}

export function PracticeWorksheet({ activities, title, className }: { activities: PracticeActivity[]; title?: string; className?: string }) {
  if (activities.length === 0) return null
  const topics = activities.some((a) => a.topic)
  let lastTopic = ''
  return (
    <section className={cn('text-slate-800', className)}>
      <h2 className={cn(fontDisplay, 'border-b border-slate-300 pb-1 text-xl font-semibold')}>{title && title.trim().toLowerCase() !== 'practice' ? title : 'Practice worksheet'}</h2>
      <ol className="divide-y divide-slate-200">
        {activities.map((a, i) => {
          const heading = topics && a.topic && a.topic !== lastTopic ? a.topic : null
          if (heading) lastTopic = a.topic
          return (
            <div key={a.id}>
              {heading && <p className={cn(fontDisplay, 'break-after-avoid pt-4 text-base font-semibold text-slate-900')}>{heading}</p>}
              <Question a={a} n={i + 1} />
            </div>
          )
        })}
      </ol>
      <div className="break-before-page pt-2">
        <h3 className={cn(fontDisplay, 'border-b border-slate-300 pb-1 text-lg font-semibold')}>Answer key</h3>
        <ol className="mt-2 space-y-1.5 text-sm">
          {activities.map((a, i) => (
            <li key={a.id} className="break-inside-avoid">
              <span className="font-semibold">{i + 1}.</span> <InlineMarkdown text={String(answerFor(a))} />
              {a.explanation && <span className="text-slate-500">. <InlineMarkdown text={a.explanation} /></span>}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
