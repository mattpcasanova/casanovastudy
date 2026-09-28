"use client"

import { useState } from 'react'
import { ChevronDown, CheckCircle2, Circle, ChevronsDownUp, ChevronsUpDown, Target, RotateCcw, ClipboardCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, tierStyles, type Tier } from '@/lib/formats/design'
import { groupDisplayTitle, splitNumbering, type GuideCard } from '@/lib/formats/structure'
import { StudyMarkdown } from './study-markdown'
import { TableOfContents, TierBadge, TIER_BLURB, buildToc, useGuideStructure, usePersistentSet, useScrollSpy } from './guide-parts'

interface OutlineFormatProps {
  content: string
  subject: string
  studyGuideId?: string
}

// Outline = the interactive, check-it-off view: topics are collapsible cards
// grouped by exam priority, with a progress bar and a sticky topic list.
export default function OutlineFormat({ content, studyGuideId }: OutlineFormatProps) {
  const s = useGuideStructure(content)
  const allCards = s.blocks.flatMap((b) => (b.type === 'group' ? b.cards : [b.card]))
  const checkable = allCards.filter((c) => c.kind === 'section')

  const [done, toggleDone, resetDone] = usePersistentSet(studyGuideId ? `cs:outline:${studyGuideId}` : undefined)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const allCollapsed = collapsed.size >= allCards.length && allCards.length > 0

  const toc = buildToc(s, { objectivesId: 'objectives' }).map((e) => ({ ...e, done: done.has(e.id) }))
  const active = useScrollSpy(toc.map((e) => e.id))

  const doneCount = checkable.filter((c) => done.has(c.id)).length
  const pct = checkable.length ? Math.round((doneCount / checkable.length) * 100) : 0

  const toggleCollapse = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  let topicNumber = 0
  const renderCard = (card: GuideCard, tier: Tier | null) => {
    const n = card.kind === 'section' ? ++topicNumber : null
    return (
      <TopicCard
        key={card.id}
        card={card}
        tier={tier}
        number={n}
        open={!collapsed.has(card.id)}
        onToggleOpen={() => toggleCollapse(card.id)}
        done={done.has(card.id)}
        onToggleDone={() => toggleDone(card.id)}
      />
    )
  }

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-6xl')}>
      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {/* Sticky topic list */}
        <aside className="hidden lg:block print:hidden">
          <div className="sticky top-6 max-h-[calc(100vh-3rem)] overflow-y-auto pb-6">
            <TableOfContents entries={toc} active={active} title="Topics" />
          </div>
        </aside>

        <div className="min-w-0 space-y-8">
          {/* Progress + controls */}
          <div className="sticky top-3 z-20 -mx-1 rounded-xl border border-slate-200 bg-white/90 px-4 py-3 shadow-sm backdrop-blur print:hidden">
            <div className="flex items-center gap-4">
              <div className="min-w-0 flex-1">
                <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-slate-600">
                    <span className="font-semibold text-slate-900">{doneCount}</span> of {checkable.length} topics reviewed
                  </span>
                  <span className="font-semibold tabular-nums text-blue-700">{pct}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => setCollapsed(allCollapsed ? new Set() : new Set(allCards.map((c) => c.id)))}
                  className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                >
                  {allCollapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
                  <span className="hidden sm:inline">{allCollapsed ? 'Expand all' : 'Collapse all'}</span>
                </button>
                {doneCount > 0 && (
                  <button
                    type="button"
                    onClick={resetDone}
                    className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    title="Reset progress"
                  >
                    <RotateCcw className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {(s.subtitle || s.preface) && (
            <header className="space-y-3">
              {s.subtitle && <p className={cn(fontDisplay, 'text-xl leading-snug text-slate-600')}>{s.subtitle}</p>}
              {s.preface && <StudyMarkdown content={s.preface} />}
            </header>
          )}

          {s.objectives && (
            <section id="objectives" className="scroll-mt-28 rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-white p-5 sm:p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-600 text-white"><Target className="h-4 w-4" /></span>
                <h2 className={cn(fontDisplay, 'text-lg font-semibold text-slate-900')}>Learning objectives</h2>
              </div>
              <StudyMarkdown content={s.objectives} compact />
            </section>
          )}

          {s.blocks.map((b) =>
            b.type === 'group' ? (
              <section key={b.id} id={b.id} className="scroll-mt-28">
                <div className={cn('mb-4 border-b-2 pb-3', tierStyles[b.tier].borderB)}>
                  {groupDisplayTitle(b.title) ? (
                    <>
                      <TierBadge tier={b.tier} />
                      <h2 className={cn(fontDisplay, 'mt-2 text-2xl font-semibold text-slate-900')}>{groupDisplayTitle(b.title)}</h2>
                    </>
                  ) : (
                    <h2 className={cn(fontDisplay, 'flex items-center gap-2.5 text-2xl font-semibold text-slate-900')}>
                      <span className={cn('h-2.5 w-2.5 rounded-full', tierStyles[b.tier].dot)} />
                      {tierStyles[b.tier].label}
                    </h2>
                  )}
                  <div className="mt-1 text-sm text-slate-500">
                    {b.intro ? <StudyMarkdown content={b.intro} compact className="text-sm text-slate-500" /> : TIER_BLURB[b.tier]}
                  </div>
                </div>
                <div className="space-y-3">{b.cards.map((c) => renderCard(c, b.tier))}</div>
              </section>
            ) : (
              <div key={b.card.id}>{renderCard(b.card, null)}</div>
            )
          )}

          {checkable.length > 0 && doneCount === checkable.length && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center print:hidden">
              <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
              <p className="font-semibold text-emerald-900">Every topic reviewed — nice work.</p>
              <p className="text-sm text-emerald-700">Try explaining each one out loud without looking to lock it in.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function TopicCard({
  card,
  tier,
  number,
  open,
  onToggleOpen,
  done,
  onToggleDone,
}: {
  card: GuideCard
  tier: Tier | null
  number: number | null
  open: boolean
  onToggleOpen: () => void
  done: boolean
  onToggleDone: () => void
}) {
  const { num, text } = splitNumbering(card.title)
  const isReview = card.kind === 'review'
  const badge = num ?? (number !== null ? String(number) : null)
  const edge = tier ? tierStyles[tier].edge : isReview ? 'border-l-amber-400' : 'border-l-slate-300'

  return (
    <article
      id={card.id}
      className={cn(
        'scroll-mt-28 overflow-hidden rounded-xl border border-l-4 bg-white shadow-sm transition-shadow hover:shadow-md print:break-inside-avoid print:shadow-none',
        isReview ? 'border-amber-200 bg-amber-50/30' : 'border-slate-200',
        edge,
        done && 'bg-slate-50/80'
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {isReview ? (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700"><ClipboardCheck className="h-4 w-4" /></span>
        ) : (
          <button
            type="button"
            role="checkbox"
            aria-checked={done}
            aria-label={done ? 'Mark as not reviewed' : 'Mark as reviewed'}
            onClick={onToggleDone}
            className="shrink-0 rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-500 print:hidden"
          >
            {done ? <CheckCircle2 className="h-6 w-6 text-emerald-600" /> : <Circle className="h-6 w-6 text-slate-300 hover:text-slate-400" />}
          </button>
        )}
        <button type="button" onClick={onToggleOpen} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {badge && !isReview && (
            <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-slate-500">{badge}</span>
          )}
          <span className={cn('flex-1 text-[1.05rem] font-semibold leading-snug', done ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-900')}>
            {text}
          </span>
          <ChevronDown className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 print:hidden', open && 'rotate-180')} />
        </button>
      </div>
      <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out print:!grid-rows-[1fr]', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-4 pb-5 pt-4 sm:px-5 sm:pl-14">
            <StudyMarkdown content={card.body} />
            {!isReview && !done && (
              <button
                type="button"
                onClick={onToggleDone}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-slate-200 px-3 py-1 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700 print:hidden"
              >
                <CheckCircle2 className="h-4 w-4" /> Mark as reviewed
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
