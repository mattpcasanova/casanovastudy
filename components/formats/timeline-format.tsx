"use client"

import { useMemo, useState } from 'react'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import { parseTimeline, type TimelineEvent } from '@/lib/formats/timeline'
import { normalizeGuideMarkdown } from '@/lib/formats/normalize'
import { InlineMarkdown, StudyMarkdown } from './study-markdown'

// Eras of dated events on a vertical rail. "Hide dates" turns it into a
// self-quiz: dates are covered until tapped.
export default function TimelineFormat({ content }: { content: string }) {
  const tl = useMemo(() => parseTimeline(content), [content])
  const [hideDates, setHideDates] = useState(false)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())
  const eventCount = tl.eras.reduce((n, e) => n + e.events.length, 0)

  if (eventCount === 0) {
    return (
      <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10')}>
        <StudyMarkdown content={normalizeGuideMarkdown(content)} />
      </div>
    )
  }

  const toggleHide = () => {
    setHideDates((h) => !h)
    setRevealed(new Set())
  }
  const reveal = (key: string) => setRevealed((r) => new Set(r).add(key))

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl space-y-6')}>
      {tl.description && <p className="text-center text-slate-600 print:hidden">{tl.description}</p>}

      {/* Toolbar */}
      <div className="sticky top-2 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur print:hidden">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm text-slate-600">
            <span className="font-semibold text-slate-900">{eventCount}</span> events · {tl.eras.length} era{tl.eras.length === 1 ? '' : 's'}
          </span>
          <button
            type="button"
            onClick={toggleHide}
            aria-pressed={hideDates}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              hideDates ? 'bg-fuchsia-600 text-white hover:bg-fuchsia-700' : 'bg-fuchsia-50 text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200 hover:bg-fuchsia-100'
            )}
          >
            {hideDates ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            {hideDates ? 'Show all dates' : 'Quiz me: hide dates'}
          </button>
        </div>
        {tl.eras.length > 1 && (
          <div className="-mx-1 mt-2.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
            {tl.eras.map((era, i) => (
              <a
                key={i}
                href={`#era-${i + 1}`}
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700 transition hover:bg-slate-200"
              >
                {era.title}
              </a>
            ))}
          </div>
        )}
      </div>

      {tl.eras.map((era, i) => (
        <section key={i} id={`era-${i + 1}`} className="scroll-mt-40">
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-purple-600 px-5 py-4 text-white shadow-md shadow-fuchsia-900/10 print:bg-none print:px-0 print:text-slate-900 print:shadow-none">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className={cn(fontDisplay, 'text-xl font-semibold sm:text-2xl')}>{era.title}</h2>
              {era.range && <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-medium print:bg-transparent print:p-0">{era.range}</span>}
            </div>
            {era.summary && <p className="mt-1 text-sm text-fuchsia-50/90 print:text-slate-600"><InlineMarkdown text={era.summary} /></p>}
          </div>

          <ol className="relative ml-3 space-y-4 border-l-2 border-fuchsia-200 pl-6 sm:ml-[6.5rem] print:ml-0 print:border-slate-300">
            {era.events.map((ev) => (
              <EventItem key={ev.key} ev={ev} hidden={hideDates && !revealed.has(ev.key)} onReveal={() => reveal(ev.key)} />
            ))}
          </ol>
        </section>
      ))}

      {tl.extras.map((s) => (
        <section key={s.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8 print:border-0 print:p-0 print:shadow-none">
          <h2 className={cn(fontDisplay, 'mb-3 text-2xl font-semibold text-slate-900')}>{s.title}</h2>
          <StudyMarkdown content={normalizeGuideMarkdown(s.body)} />
        </section>
      ))}
    </div>
  )
}

function EventItem({ ev, hidden, onReveal }: { ev: TimelineEvent; hidden: boolean; onReveal: () => void }) {
  const date = ev.date || '—'
  const dateEl = hidden ? (
    <button
      type="button"
      onClick={onReveal}
      className="rounded-md bg-fuchsia-100 px-2 py-0.5 text-xs font-semibold text-fuchsia-700 ring-1 ring-inset ring-fuchsia-200 transition hover:bg-fuchsia-200 print:hidden"
    >
      When? Tap to reveal
    </button>
  ) : (
    <span className="font-semibold tabular-nums text-fuchsia-700">{date}</span>
  )

  return (
    <li className="relative break-inside-avoid">
      <span className="absolute -left-[calc(1.5rem+7px)] top-4 h-3 w-3 rounded-full border-2 border-white bg-fuchsia-500 ring-2 ring-fuchsia-200 print:ring-0" />
      {/* Date column on wide screens */}
      <div className="absolute -left-[8.25rem] top-3.5 hidden w-24 text-right text-sm leading-tight sm:block print:hidden">{dateEl}</div>
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md print:border-0 print:p-0 print:shadow-none">
        <div className="mb-1 text-sm sm:hidden print:block">{dateEl}</div>
        <h3 className={cn(fontDisplay, 'text-lg font-semibold leading-snug text-slate-900')}><InlineMarkdown text={ev.title} /></h3>
        {ev.what && <p className="mt-1 text-[0.95rem] leading-relaxed text-slate-700"><InlineMarkdown text={ev.what} /></p>}
        {ev.why && (
          <p className="mt-2 flex gap-2 rounded-lg bg-fuchsia-50/70 px-3 py-2 text-sm leading-relaxed text-slate-700 print:bg-transparent print:p-0">
            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-fuchsia-500" />
            <span><span className={cn(eyebrow, 'mr-1 !text-[0.65rem] text-fuchsia-700')}>Why it matters</span> <InlineMarkdown text={ev.why} /></span>
          </p>
        )}
      </div>
    </li>
  )
}
