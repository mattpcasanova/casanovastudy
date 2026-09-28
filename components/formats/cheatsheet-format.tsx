"use client"

import { useMemo, useState } from 'react'
import { AlertTriangle, Brain, Printer, Search, Sigma, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { eyebrow } from '@/lib/formats/design'
import { parseCheatSheet, type BoxTone } from '@/lib/formats/cheatsheet'
import { normalizeGuideMarkdown, plainText } from '@/lib/formats/normalize'
import { StudyMarkdown } from './study-markdown'

const TONE: Record<BoxTone, { bar: string; title: string; icon: typeof Sigma | null }> = {
  formula: { bar: 'border-t-sky-500', title: 'text-sky-800', icon: Sigma },
  warning: { bar: 'border-t-rose-500', title: 'text-rose-800', icon: AlertTriangle },
  memory: { bar: 'border-t-violet-500', title: 'text-violet-800', icon: Brain },
  default: { bar: 'border-t-slate-700', title: 'text-slate-800', icon: null },
}

// A dense one-page reference: small boxes flowing in columns. Built to be
// printed — print CSS packs it into two tight columns.
export default function CheatSheetFormat({ content }: { content: string }) {
  const sheet = useMemo(() => parseCheatSheet(content), [content])
  const boxes = useMemo(
    () => sheet.boxes.map((b) => ({ ...b, md: normalizeGuideMarkdown(b.body), search: `${b.title} ${plainText(b.body)}`.toLowerCase() })),
    [sheet]
  )
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const shown = q ? boxes.filter((b) => b.search.includes(q)) : boxes

  if (boxes.length === 0) {
    return (
      <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-6 sm:p-10')}>
        <StudyMarkdown content={normalizeGuideMarkdown(content)} />
      </div>
    )
  }

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-6xl space-y-5')}>
      {(sheet.description || sheet.intro) && (
        <div className="mx-auto max-w-3xl text-center print:hidden">
          {sheet.description && <p className="text-slate-600">{sheet.description}</p>}
          {sheet.intro && <StudyMarkdown content={normalizeGuideMarkdown(sheet.intro)} compact className="mt-2 text-left" />}
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center print:hidden">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a formula, term or rule…"
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-9 text-sm outline-none transition focus:border-slate-400 focus:bg-white"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-600" aria-label="Clear search">
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <span className="text-sm text-slate-500">{q ? `${shown.length} of ${boxes.length}` : boxes.length} boxes</span>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-slate-800 px-4 text-sm font-medium text-white transition hover:bg-slate-900"
          >
            <Printer className="h-4 w-4" /> Print cheat sheet
          </button>
        </div>
      </div>

      {shown.length === 0 ? (
        <p className="py-10 text-center text-slate-500 print:hidden">Nothing matches &ldquo;{query}&rdquo;.</p>
      ) : (
        <div className="cheatsheet-grid columns-1 gap-4 md:columns-2 xl:columns-3 print:columns-2 print:gap-3">
          {shown.map((b) => {
            const tone = TONE[b.tone]
            const Icon = tone.icon
            return (
              <section
                key={b.title}
                className={cn('mb-4 break-inside-avoid rounded-xl border border-t-4 border-slate-200 bg-white p-4 shadow-sm print:mb-3 print:p-2.5 print:shadow-none', tone.bar)}
              >
                <h2 className={cn(eyebrow, 'mb-2 flex items-center gap-1.5 !text-[0.72rem]', tone.title)}>
                  {Icon && <Icon className="h-3.5 w-3.5 shrink-0" />}
                  <span>{b.title}</span>
                </h2>
                <StudyMarkdown content={b.md} compact className="cheatsheet-body text-[0.88rem] leading-snug" />
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
