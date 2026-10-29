"use client"

// A question whose text continues past its first line: the extra lines are
// the statements (I. / II. / III.), data or short passage the options refer
// to, shown as a list under the question. Plain one-line questions render as
// before. Safe inside a <p> (spans only).

import { cn } from '@/lib/utils'
import { InlineMarkdown } from './study-markdown'
import { Passage, splitPassage } from './passage'

/**
 * `passage` (or a ```passage fence at the start of `text`, as Learn and
 * practice carry it) renders above the question as a reading passage.
 */
export function QuestionStem({ text, passage, listClassName }: { text: string; passage?: string; listClassName?: string }) {
  const split = splitPassage(text)
  const body = split.text
  const reading = passage ?? split.passage
  const [first, ...rest] = body.split('\n').filter((l) => l.trim())
  if (!rest.length) return <>{reading && <Passage text={reading} />}<InlineMarkdown text={first ?? ''} /></>
  return (
    <>
      {reading && <Passage text={reading} />}
      <InlineMarkdown text={first} />
      <span className={cn('mt-3 block space-y-1.5 rounded-xl bg-slate-50 px-4 py-3 font-sans text-base font-normal leading-snug text-slate-800 ring-1 ring-inset ring-slate-200', listClassName)}>
        {rest.map((line, i) => {
          const m = line.match(/^\(?((?:I{1,3}|IV|V|VI{0,3})|[1-9])[.)]\s+(.*)$/)
          return (
            <span key={i} className="flex gap-2">
              {m ? <><span className="w-7 shrink-0 font-semibold text-slate-900">{m[1]}.</span><span><InlineMarkdown text={m[2]} /></span></> : <InlineMarkdown text={line} />}
            </span>
          )
        })}
      </span>
    </>
  )
}
