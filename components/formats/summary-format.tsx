"use client"

import { Clock, Sparkles, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow, tierStyles } from '@/lib/formats/design'
import { groupDisplayTitle, splitNumbering, type GuideCard } from '@/lib/formats/structure'
import { StudyMarkdown } from './study-markdown'
import { TableOfContents, TierBadge, buildToc, useGuideStructure, useScrollSpy } from './guide-parts'

interface SummaryFormatProps {
  content: string
  subject: string
}

// Summary = the reading view: one calm article column with an "On this page"
// rail, deliberately distinct from the Outline's interactive cards.
export default function SummaryFormat({ content }: SummaryFormatProps) {
  const s = useGuideStructure(content)
  const toc = buildToc(s, { objectivesId: 'objectives' })
  const active = useScrollSpy(toc.map((e) => e.id))
  const minutes = Math.max(1, Math.round(content.split(/\s+/).length / 220))

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-6xl')}>
      <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_14rem] lg:gap-12">
        <article className="mx-auto w-full min-w-0 max-w-[44rem] rounded-2xl border border-slate-200 bg-white px-5 py-8 shadow-sm sm:px-10 sm:py-10 print:border-0 print:p-0 print:shadow-none">
          <header className="border-b border-slate-200 pb-6">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span className={cn(eyebrow, 'text-green-700')}>Summary</span>
              <span className="h-1 w-1 rounded-full bg-slate-300" />
              <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {minutes} min read</span>
            </div>
            {s.subtitle && <p className={cn(fontDisplay, 'mt-3 text-2xl leading-snug text-slate-800')}>{s.subtitle}</p>}
            {s.preface && <StudyMarkdown content={s.preface} className="mt-4" />}
          </header>

          {s.objectives && (
            <section id="objectives" className="mt-8 scroll-mt-6 rounded-xl bg-green-50/70 p-5 ring-1 ring-inset ring-green-100">
              <p className={cn(eyebrow, 'mb-2 flex items-center gap-1.5 text-green-800')}><Target className="h-3.5 w-3.5" /> What you&apos;ll learn</p>
              <StudyMarkdown content={s.objectives} compact />
            </section>
          )}

          {s.blocks.map((b) =>
            b.type === 'group' ? (
              <section key={b.id} id={b.id} className="mt-12 scroll-mt-6">
                <div className="mb-2 flex items-center gap-3">
                  <TierBadge tier={b.tier} />
                  <span className={cn('h-px flex-1', tierStyles[b.tier].dot, 'opacity-30')} />
                </div>
                {groupDisplayTitle(b.title) && (
                  <h2 className={cn(fontDisplay, 'text-sm font-semibold uppercase tracking-[0.12em] text-slate-500')}>{groupDisplayTitle(b.title)}</h2>
                )}
                {b.intro && <StudyMarkdown content={b.intro} compact className="mt-1 text-sm text-slate-500" />}
                {b.cards.map((c) => <SummarySection key={c.id} card={c} />)}
              </section>
            ) : (
              <SummarySection key={b.card.id} card={b.card} standalone />
            )
          )}
        </article>

        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pb-6">
            <TableOfContents entries={toc} active={active} />
          </div>
        </aside>
      </div>
    </div>
  )
}

function SummarySection({ card, standalone = false }: { card: GuideCard; standalone?: boolean }) {
  const { text } = splitNumbering(card.title)
  if (card.kind === 'review') {
    return (
      <section id={card.id} className="mt-12 scroll-mt-6 rounded-xl border border-green-200 bg-gradient-to-br from-green-50 to-white p-5 sm:p-6 print:break-inside-avoid">
        <p className={cn(eyebrow, 'mb-1 flex items-center gap-1.5 text-green-800')}><Sparkles className="h-3.5 w-3.5" /> Wrap-up</p>
        <h2 className={cn(fontDisplay, 'mb-3 text-2xl font-semibold text-slate-900')}>{text}</h2>
        <StudyMarkdown content={card.body} />
      </section>
    )
  }
  return (
    <section id={card.id} className={cn('scroll-mt-6', standalone ? 'mt-12' : 'mt-8')}>
      <h3 className={cn(fontDisplay, 'mb-3 text-[1.6rem] font-semibold leading-tight text-slate-900')}>{text}</h3>
      <StudyMarkdown content={card.body} className="text-[1.02rem] leading-[1.75]" />
    </section>
  )
}
