"use client"

import { useState, useEffect, useMemo, memo } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import {
  ChevronRight,
  CheckCircle2,
  Circle,
  Check,
  X,
  Shuffle,
  RotateCcw,
  ArrowLeft,
  ArrowRight,
  Trophy,
  ListChecks,
  CreditCard,
  HelpCircle,
} from 'lucide-react'
import {
  CustomGuideContent,
  CustomSection,
  isTextContent,
  isDefinitionContent,
  isAlertContent,
  isQuizContent,
  isChecklistContent,
  isTableContent,
  isFlashcardsContent,
  isPracticeContent,
  QuizQuestion,
  FlashCard,
  DefinitionColorVariant,
  TableContent,
  AlertContent,
} from '@/lib/types/custom-guide'
import { cn } from '@/lib/utils'
import { fontDisplay, eyebrow } from '@/lib/formats/design'
import { displaySerif } from '@/lib/formats/fonts'
import { ALERT_VARIANTS, DEFINITION_COLORS, TABLE_HEADER_STYLES } from '@/components/custom-guide-editor/block-styles'
import { normalizePracticeActivities } from '@/lib/formats/practice'
import { PracticeSession } from './practice-format'

interface CustomFormatProps {
  content: CustomGuideContent
  studyGuideId: string
}

// ── Markdown ─────────────────────────────────────────────────────────────────
// react-markdown (no raw HTML, so no XSS / no regex ReDoS) replaces the old
// regex formatter that leaked `**`, `>`, and table pipes as literal symbols.


// A table written directly under a list item or paragraph (no blank line) is
// swallowed into it by GFM's lazy continuation — add the blank line for them.
function normalizeMarkdown(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const prev = out.length > 0 ? out[out.length - 1] : ''
    if (line.trimStart().startsWith('|') && prev.trim() && !prev.trimStart().startsWith('|')) out.push('')
    out.push(line)
  }
  return out.join('\n')
}

const tableShell = 'not-prose my-4 overflow-x-auto rounded-xl border border-slate-200'

const mdComponents: Components = {
  h1: ({ children }) => <h3 className={cn(fontDisplay, 'mb-2 mt-6 text-xl font-semibold text-slate-900 first:mt-0')}>{children}</h3>,
  h2: ({ children }) => <h3 className={cn(fontDisplay, 'mb-2 mt-6 text-xl font-semibold text-slate-900 first:mt-0')}>{children}</h3>,
  h3: ({ children }) => <h4 className="mb-1.5 mt-5 text-base font-semibold text-slate-900 first:mt-0">{children}</h4>,
  h4: ({ children }) => <h5 className="mb-1 mt-4 text-sm font-semibold uppercase tracking-wide text-slate-600 first:mt-0">{children}</h5>,
  p: ({ children }) => <p className="my-3 leading-relaxed text-slate-700 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-3 list-disc space-y-1.5 pl-5 text-slate-700 marker:text-slate-400">{children}</ul>,
  ol: ({ children }) => <ol className="my-3 list-decimal space-y-1.5 pl-5 text-slate-700 marker:font-semibold marker:text-slate-400">{children}</ol>,
  li: ({ children }) => <li className="pl-1 leading-relaxed">{children}</li>,
  strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 hover:decoration-blue-500">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="my-4 rounded-r-xl border-l-4 border-blue-300 bg-blue-50/50 px-4 py-2 text-slate-700 [&_p]:my-1.5">{children}</blockquote>
  ),
  hr: () => <hr className="my-6 border-slate-200" />,
  code: ({ className, children }) => {
    const isBlock = /language-/.test(className || '') || String(children).includes('\n')
    if (isBlock) return <code className="font-mono text-[0.85rem]">{children}</code>
    return <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800">{children}</code>
  },
  pre: ({ children }) => (
    <pre className="my-4 overflow-x-auto rounded-xl bg-slate-900 px-4 py-3 text-[0.85rem] leading-relaxed text-slate-100">{children}</pre>
  ),
  table: ({ children }) => (
    <div className={tableShell}>
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
  tr: ({ children }) => <tr className="border-b border-slate-100 last:border-0 even:bg-slate-50/70">{children}</tr>,
  th: ({ children }) => <th className="border-b border-slate-200 px-4 py-2.5 text-left font-semibold text-slate-900">{children}</th>,
  td: ({ children }) => <td className="px-4 py-2.5 align-top text-slate-700 first:font-medium first:text-slate-900">{children}</td>,
}

// Inline variant for short strings (terms, card faces, options): no block <p>.
const inlineComponents: Components = { ...mdComponents, p: ({ children }) => <>{children}</> }

// Same math convention as StudyMarkdown: "$100" stays text; inline math is $$x$$.
const remarkPlugins: Options['remarkPlugins'] = [remarkGfm, [remarkMath, { singleDollarTextMath: false }]]
const rehypePlugins: Options['rehypePlugins'] = [rehypeKatex]

const Markdown = memo(function Markdown({ text, inline = false, className }: { text: string; inline?: boolean; className?: string }) {
  if (!text) return null
  const md = (
    <ReactMarkdown remarkPlugins={remarkPlugins} rehypePlugins={rehypePlugins} components={inline ? inlineComponents : mdComponents}>
      {normalizeMarkdown(text)}
    </ReactMarkdown>
  )
  return inline ? <span className={className}>{md}</span> : <div className={cn('text-[0.97rem]', className)}>{md}</div>
})

// ── Root ─────────────────────────────────────────────────────────────────────

export default function CustomFormat({ content, studyGuideId }: CustomFormatProps) {
  const allSectionIds = useMemo(() => getAllSectionIds(content.sections), [content.sections])
  const persist = studyGuideId !== 'preview'
  const storageKey = `custom-guide-progress-${studyGuideId}`

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({})
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!persist) { setLoaded(true); return }
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.completedSections) setCompletedSections(parsed.completedSections)
        if (parsed.checklistItems) setChecklistItems(parsed.checklistItems)
      }
    } catch (e) {
      console.error('Error loading progress:', e)
    }
    setLoaded(true)
  }, [persist, storageKey])

  useEffect(() => {
    if (!persist || !loaded) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ completedSections, checklistItems }))
    } catch { /* storage unavailable */ }
  }, [completedSections, checklistItems, persist, loaded, storageKey])

  const ctx: RenderCtx = {
    isExpanded: (id) => !collapsed.has(id),
    toggleSection: (id) => setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    }),
    isCompleted: (id) => completedSections.includes(id),
    toggleCompleted: (id) => setCompletedSections(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]),
    checklistItems,
    toggleChecklistItem: (id) => setChecklistItems(prev => ({ ...prev, [id]: !prev[id] })),
  }

  const done = completedSections.filter(id => allSectionIds.includes(id)).length
  const pct = allSectionIds.length > 0 ? Math.round((done / allSectionIds.length) * 100) : 0
  const topSections = content.sections.filter(s => s.type === 'section' && s.title)

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl space-y-6 px-4')}>
      {allSectionIds.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm print:hidden">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">
              <span className="font-semibold text-slate-900">{done}</span> of {allSectionIds.length} sections complete
            </span>
            <span className={cn('text-sm font-semibold', pct === 100 ? 'text-emerald-600' : 'text-blue-600')}>
              {pct === 100 ? 'All done!' : `${pct}%`}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn('h-full rounded-full transition-[width] duration-500 ease-out', pct === 100 ? 'bg-emerald-500' : 'bg-gradient-to-r from-blue-600 to-cyan-500')}
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Jump list — helps longer guides feel navigable */}
          {topSections.length >= 3 && (
            <nav className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4" aria-label="Sections">
              {topSections.map(s => (
                <a
                  key={s.id}
                  href={`#sec-${s.id}`}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                    ctx.isCompleted(s.id)
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300 hover:text-blue-700'
                  )}
                >
                  {ctx.isCompleted(s.id) && <Check className="h-3 w-3" />}
                  {s.title}
                </a>
              ))}
            </nav>
          )}
        </div>
      )}

      <div className="space-y-5">
        {content.sections.map(section => (
          <SectionRenderer key={section.id} section={section} ctx={ctx} level={0} />
        ))}
      </div>
    </div>
  )
}

interface RenderCtx {
  isExpanded: (id: string) => boolean
  toggleSection: (id: string) => void
  isCompleted: (id: string) => boolean
  toggleCompleted: (id: string) => void
  checklistItems: Record<string, boolean>
  toggleChecklistItem: (id: string) => void
}

function getAllSectionIds(sections: CustomSection[]): string[] {
  const ids: string[] = []
  for (const section of sections) {
    if (section.type === 'section') ids.push(section.id)
    if (section.children) ids.push(...getAllSectionIds(section.children))
  }
  return ids
}

const filled = (v: unknown) => typeof v === 'string' ? v.trim().length > 0 : v !== undefined && v !== null

// Guides saved from the old editor often contain untouched placeholder blocks
// (a blank quiz question, an empty card). Drop blank items so students never
// see an empty quiz or an "(empty)" flashcard.
function hasContent(section: CustomSection): boolean {
  const c = section.content
  switch (section.type) {
    case 'section':
      return true // headings still anchor the outline even with no body
    case 'text':
      return !!c && isTextContent(c) && filled(c.markdown)
    case 'definition':
      return !!c && isDefinitionContent(c) && (filled(c.term) || filled(c.definition))
    case 'alert':
      return !!c && isAlertContent(c) && filled(c.message)
    case 'quiz':
      return !!c && isQuizContent(c) && c.questions.some(q => filled(q.question))
    case 'flashcards':
      return !!c && isFlashcardsContent(c) && c.cards.some(card => filled(card.front) || filled(card.back))
    case 'practice':
      return !!c && isPracticeContent(c) && normalizePracticeActivities(c.activities, { strict: true }).length > 0
    case 'checklist':
      return !!c && isChecklistContent(c) && c.items.some(i => filled(i.label))
    case 'table':
      return !!c && isTableContent(c) && (c.rows.some(r => r.some(filled)) || c.headers.some(filled))
    default:
      return false
  }
}

function SectionRenderer({ section, ctx, level }: { section: CustomSection; ctx: RenderCtx; level: number }) {
  if (!hasContent(section)) return null
  const c = section.content
  switch (section.type) {
    case 'section':
      return <SectionCard section={section} ctx={ctx} level={level} />
    case 'text':
      return c && isTextContent(c) ? <Markdown text={c.markdown} /> : null
    case 'definition':
      return c && isDefinitionContent(c)
        ? <DefinitionBlock term={c.term} definition={c.definition} examples={c.examples} colorVariant={c.colorVariant} />
        : null
    case 'alert':
      return c && isAlertContent(c) ? <CalloutBlock variant={c.variant} title={c.title} message={c.message} /> : null
    case 'quiz':
      return c && isQuizContent(c)
        ? <QuizBlock questions={c.questions.filter(q => filled(q.question))} title={section.title} />
        : null
    case 'flashcards':
      return c && isFlashcardsContent(c)
        ? <FlashcardsBlock cards={c.cards.filter(card => filled(card.front) || filled(card.back))} title={section.title} />
        : null
    case 'practice':
      return c && isPracticeContent(c) ? <PracticeBlock activities={c.activities} title={section.title} sectionId={section.id} /> : null
    case 'checklist':
      return c && isChecklistContent(c)
        ? <ChecklistBlock items={c.items} sectionId={section.id} title={section.title} ctx={ctx} />
        : null
    case 'table':
      return c && isTableContent(c) ? <TableBlock headers={c.headers} rows={c.rows} headerStyle={c.headerStyle} title={section.title} /> : null
    default:
      return null
  }
}

// ── Section ──────────────────────────────────────────────────────────────────

function SectionCard({ section, ctx, level }: { section: CustomSection; ctx: RenderCtx; level: number }) {
  const isExpanded = ctx.isExpanded(section.id)
  const isCompleted = ctx.isCompleted(section.id)
  const children = (section.children ?? []).filter(hasContent)
  const intro = section.content && isTextContent(section.content) ? section.content.markdown : ''
  const hasBody = children.length > 0 || !!intro.trim()
  const top = level === 0

  return (
    <section
      id={`sec-${section.id}`}
      className={cn(
        'scroll-mt-36',
        top ? 'rounded-2xl border border-slate-200 bg-white shadow-sm' : 'border-l-2 border-slate-200 pl-4'
      )}
    >
      <div className={cn('flex items-center gap-3 print:break-after-avoid', top ? 'px-5 py-4 sm:px-6' : 'py-1')}>
        <button
          type="button"
          role="checkbox"
          aria-checked={isCompleted}
          aria-label={isCompleted ? 'Mark section incomplete' : 'Mark section complete'}
          onClick={() => ctx.toggleCompleted(section.id)}
          className="shrink-0 rounded-full outline-none transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-blue-500 print:hidden"
        >
          {isCompleted
            ? <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            : <Circle className="h-5 w-5 text-slate-300" />}
        </button>
        <h2
          className={cn(
            fontDisplay,
            'min-w-0 flex-1 font-semibold leading-snug transition-colors',
            top ? 'text-xl sm:text-2xl' : level === 1 ? 'text-lg' : 'text-base',
            isCompleted ? 'text-slate-400' : 'text-slate-900'
          )}
        >
          <button
            type="button"
            onClick={() => hasBody && ctx.toggleSection(section.id)}
            aria-expanded={hasBody ? isExpanded : undefined}
            className="flex w-full items-center gap-2 text-left print:cursor-default"
          >
            <span className="flex-1">{section.title || 'Untitled section'}</span>
            {hasBody && (
              <ChevronRight className={cn('h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 print:hidden', isExpanded && 'rotate-90')} />
            )}
          </button>
        </h2>
      </div>

      {hasBody && (
        <div className={cn('grid transition-[grid-template-rows] duration-300 ease-out print:!grid-rows-[1fr]', isExpanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
          <div className="min-h-0 overflow-hidden" inert={!isExpanded}>
            <div className={cn('space-y-4', top ? 'border-t border-slate-100 px-5 pb-6 pt-5 sm:px-6' : 'pb-2 pt-2')}>
              {intro.trim() && <Markdown text={intro} />}
              {children.map(child => (
                <SectionRenderer key={child.id} section={child} ctx={ctx} level={level + 1} />
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

// ── Definition ───────────────────────────────────────────────────────────────

function DefinitionBlock({
  term,
  definition,
  examples,
  colorVariant = 'purple',
}: {
  term: string
  definition: string
  examples?: string[]
  colorVariant?: DefinitionColorVariant
}) {
  const s = DEFINITION_COLORS[colorVariant] ?? DEFINITION_COLORS.purple
  const ex = (examples ?? []).filter(e => e && e.trim())
  return (
    <div className={cn('rounded-r-xl border-l-4 px-4 py-3 print:break-inside-avoid', s.edge, s.bg)}>
      <p className={cn(eyebrow, 'mb-1 text-slate-500')}>Key term</p>
      <h4 className={cn(fontDisplay, 'text-lg font-semibold', s.term)}>
        <Markdown text={term} inline />
      </h4>
      <div className={cn('mt-1 leading-relaxed', s.text)}>
        <Markdown text={definition} inline />
      </div>
      {ex.length > 0 && (
        <div className="mt-3 border-t border-black/5 pt-2">
          <p className={cn(eyebrow, 'mb-1.5 text-slate-500')}>Examples</p>
          <ul className="space-y-1 text-sm text-slate-700">
            {ex.map((e, i) => (
              <li key={i} className="flex gap-2">
                <span className={cn('mt-2 h-1.5 w-1.5 shrink-0 rounded-full', s.swatch)} />
                <Markdown text={e} inline />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ── Callout ──────────────────────────────────────────────────────────────────

function CalloutBlock({ variant, title, message }: { variant: AlertContent['variant']; title?: string; message: string }) {
  const v = ALERT_VARIANTS[variant] ?? ALERT_VARIANTS.info
  const Icon = v.icon
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3 print:break-inside-avoid', v.box)}>
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', v.iconCls)} />
      <div className="min-w-0 flex-1">
        <p className={cn('text-sm font-semibold', v.title)}>{title || v.label}</p>
        <div className={cn('mt-0.5 text-sm leading-relaxed [&_p]:my-1 [&_p]:text-inherit', v.body)}>
          <Markdown text={message} className="text-sm" />
        </div>
      </div>
    </div>
  )
}

// ── Table ────────────────────────────────────────────────────────────────────

function TableBlock({
  headers,
  rows,
  headerStyle = 'default',
  title,
}: {
  headers: string[]
  rows: string[][]
  headerStyle?: TableContent['headerStyle']
  title?: string
}) {
  const s = TABLE_HEADER_STYLES[headerStyle || 'default'] ?? TABLE_HEADER_STYLES.default
  return (
    <figure>
      {title && <figcaption className="mb-2 text-sm font-semibold text-slate-700">{title}</figcaption>}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className={s.head}>
            <tr>
              {headers.map((h, i) => (
                <th key={i} className={cn('whitespace-nowrap border-b border-slate-200 px-4 py-2.5 text-left font-semibold', s.headText)}>
                  <Markdown text={h} inline />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, r) => (
              <tr key={r} className="border-b border-slate-100 last:border-0 even:bg-slate-50/70">
                {row.map((cell, c) => (
                  <td key={c} className={cn('min-w-[8rem] px-4 py-2.5 align-top leading-relaxed', c === 0 ? 'font-medium text-slate-900' : 'text-slate-700')}>
                    <Markdown text={cell} inline />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}

// ── Checklist ────────────────────────────────────────────────────────────────

function ChecklistBlock({
  items,
  sectionId,
  title,
  ctx,
}: {
  items: { id: string; label: string }[]
  sectionId: string
  title?: string
  ctx: RenderCtx
}) {
  const visible = items.filter(i => i.label.trim())
  const doneCount = visible.filter(i => ctx.checklistItems[`${sectionId}-${i.id}`]).length
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 print:break-inside-avoid">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <ListChecks className="h-4 w-4 text-teal-600" />
          {title || 'Checklist'}
        </p>
        <span className="text-xs font-medium text-slate-500">{doneCount}/{visible.length}</span>
      </div>
      <ul className="space-y-0.5">
        {visible.map(item => {
          const id = `${sectionId}-${item.id}`
          const checked = !!ctx.checklistItems[id]
          return (
            <li key={item.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => ctx.toggleChecklistItem(id)}
                className="flex w-full items-start gap-3 rounded-lg px-2 py-1.5 text-left transition hover:bg-slate-50"
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[5px] border-2 transition-colors',
                    checked ? 'border-teal-500 bg-teal-500 text-white' : 'border-slate-300'
                  )}
                >
                  {checked && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className={cn('text-sm leading-relaxed transition-colors', checked ? 'text-slate-400 line-through' : 'text-slate-700')}>
                  <Markdown text={item.label} inline />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

// ── Quiz ─────────────────────────────────────────────────────────────────────

type QuizResult = 'correct' | 'incorrect'

interface QuizAnswerState {
  answer: string
  checked: boolean
  result?: QuizResult
}

const norm = (s: unknown) => String(s ?? '').trim().toLowerCase()

// Compare numeric answers with a small tolerance ("42", "42.0 m/s", "≈42").
function numericMatch(user: string, correct: string): boolean | null {
  const n = (s: string) => {
    const m = s.replace(/,/g, '').match(/-?\d+(?:\.\d+)?(?:e-?\d+)?/i)
    return m ? parseFloat(m[0]) : null
  }
  const a = n(user)
  const b = n(correct)
  if (a === null || b === null) return null
  const tol = Math.max(Math.abs(b) * 0.01, 1e-9)
  return Math.abs(a - b) <= tol
}

function QuizBlock({ questions, title }: { questions: QuizQuestion[]; title?: string }) {
  const [order, setOrder] = useState(questions)
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, QuizAnswerState>>({})
  const [finished, setFinished] = useState(false)

  const q = order[index]
  const state = answers[q.id] ?? { answer: '', checked: false }
  const isSelfGraded = q.questionType === 'short-answer' || q.questionType === 'calculation'
  const scored = Object.values(answers).filter(a => a.result)
  const correctCount = scored.filter(a => a.result === 'correct').length

  const setState = (patch: Partial<QuizAnswerState>) =>
    setAnswers(prev => ({ ...prev, [q.id]: { ...state, ...patch } }))

  const check = () => {
    if (q.questionType === 'multiple-choice' || q.questionType === 'true-false') {
      setState({ checked: true, result: norm(state.answer) === norm(q.correctAnswer) ? 'correct' : 'incorrect' })
    } else if (q.questionType === 'calculation') {
      const match = numericMatch(state.answer, String(q.correctAnswer))
      // Auto-grade when both sides are numbers; otherwise let the student self-check.
      setState({ checked: true, result: match === null ? undefined : match ? 'correct' : 'incorrect' })
    } else {
      setState({ checked: true })
    }
  }

  const restart = (shuffle: boolean) => {
    setOrder(shuffle ? [...questions].sort(() => Math.random() - 0.5) : questions)
    setAnswers({})
    setIndex(0)
    setFinished(false)
  }

  const go = (delta: number) => {
    const next = index + delta
    if (next >= order.length) { setFinished(true); return }
    if (next >= 0) setIndex(next)
  }

  const header = (
    <div className="flex items-center justify-between gap-3 border-b border-purple-100 bg-purple-50/60 px-5 py-3">
      <p className="flex items-center gap-2 text-sm font-semibold text-purple-900">
        <HelpCircle className="h-4 w-4 text-purple-600" />
        {title && title.toLowerCase() !== 'quiz' ? title : 'Practice quiz'}
      </p>
      <div className="flex items-center gap-1">
        {order.map((item, i) => {
          const r = answers[item.id]?.result
          return (
            <button
              key={item.id}
              type="button"
              aria-label={`Question ${i + 1}`}
              onClick={() => { setFinished(false); setIndex(i) }}
              className={cn(
                'h-2 rounded-full transition-all duration-200',
                i === index && !finished ? 'w-5 bg-purple-600' : 'w-2',
                i !== index || finished ? (r === 'correct' ? 'bg-emerald-400' : r === 'incorrect' ? 'bg-rose-400' : answers[item.id]?.checked ? 'bg-purple-300' : 'bg-purple-200') : ''
              )}
            />
          )
        })}
      </div>
    </div>
  )

  if (finished) {
    const pct = scored.length ? Math.round((correctCount / scored.length) * 100) : 0
    return (
      <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm print:hidden">
        {header}
        <div className="px-6 py-8 text-center">
          <Trophy className={cn('mx-auto h-10 w-10', pct >= 80 ? 'text-amber-500' : 'text-purple-400')} />
          <p className={cn(fontDisplay, 'mt-3 text-3xl font-semibold text-slate-900')}>
            {correctCount} / {scored.length}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            {scored.length === 0 ? 'No graded answers yet.' : pct >= 80 ? 'Great work. You know this material.' : pct >= 50 ? 'Solid start. Review the misses and try again.' : 'Worth another pass. Review, then retry.'}
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <button type="button" onClick={() => restart(false)} className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <RotateCcw className="h-4 w-4" /> Retry
            </button>
            <button type="button" onClick={() => restart(true)} className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white hover:bg-purple-700">
              <Shuffle className="h-4 w-4" /> Shuffle & retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const options = q.questionType === 'true-false' ? ['True', 'False'] : (q.options ?? []).filter(o => o && o.trim())

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-purple-200 bg-white shadow-sm print:hidden">
        {header}
        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div>
            <p className={cn(eyebrow, 'mb-1.5 text-purple-600')}>Question {index + 1} of {order.length}</p>
            <div className={cn(fontDisplay, 'text-lg font-medium leading-snug text-slate-900')}>
              <Markdown text={q.question} inline />
            </div>
          </div>

          {options.length > 0 && (
            <div className={cn('grid gap-2', q.questionType === 'true-false' && 'grid-cols-2')}>
              {options.map((opt, i) => {
                const selected = !!state.answer && norm(state.answer) === norm(opt)
                const isRight = state.checked && norm(opt) === norm(q.correctAnswer)
                const isWrong = state.checked && selected && !isRight
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={state.checked}
                    onClick={() => setState({ answer: opt })}
                    className={cn(
                      'flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm transition-all duration-150',
                      isRight ? 'border-emerald-300 bg-emerald-50' :
                      isWrong ? 'border-rose-300 bg-rose-50' :
                      selected ? 'border-purple-400 bg-purple-50 ring-2 ring-purple-100' :
                      'border-slate-200 hover:border-purple-300 hover:bg-slate-50',
                      state.checked && !isRight && !isWrong && 'opacity-60'
                    )}
                  >
                    {q.questionType !== 'true-false' && (
                      <span
                        className={cn(
                          'flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                          isRight ? 'bg-emerald-500 text-white' : isWrong ? 'bg-rose-500 text-white' : selected ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-500'
                        )}
                      >
                        {isRight ? <Check className="h-3.5 w-3.5" /> : isWrong ? <X className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                      </span>
                    )}
                    <span className={cn('flex-1 text-slate-800', q.questionType === 'true-false' && 'text-center font-medium')}>
                      <Markdown text={opt} inline />
                    </span>
                  </button>
                )
              })}
            </div>
          )}

          {isSelfGraded && (
            q.questionType === 'short-answer' ? (
              <textarea
                value={state.answer}
                onChange={(e) => setState({ answer: e.target.value })}
                disabled={state.checked}
                rows={3}
                placeholder="Write your answer, then check it against the model answer…"
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100 disabled:bg-slate-50"
              />
            ) : (
              <input
                value={state.answer}
                onChange={(e) => setState({ answer: e.target.value })}
                onKeyDown={(e) => { if (e.key === 'Enter' && state.answer.trim() && !state.checked) check() }}
                disabled={state.checked}
                placeholder="Your answer"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-purple-300 focus:ring-4 focus:ring-purple-100 disabled:bg-slate-50"
              />
            )
          )}

          {state.checked && (
            <div
              className={cn(
                'rounded-xl border px-4 py-3 text-sm',
                state.result === 'correct' ? 'border-emerald-200 bg-emerald-50' :
                state.result === 'incorrect' ? 'border-rose-200 bg-rose-50' :
                'border-slate-200 bg-slate-50'
              )}
            >
              {state.result === 'correct' && <p className="font-semibold text-emerald-800">Correct!</p>}
              {state.result === 'incorrect' && (
                <p className="font-semibold text-rose-800">
                  Not quite. The answer is <Markdown text={String(q.correctAnswer)} inline />.
                </p>
              )}
              {!state.result && (
                <>
                  <p className={cn(eyebrow, 'mb-1 text-slate-500')}>Model answer</p>
                  <Markdown text={String(q.correctAnswer)} className="text-sm" />
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-200 pt-3">
                    <span className="text-xs text-slate-500">How did you do?</span>
                    <button type="button" onClick={() => setState({ result: 'correct' })} className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700">
                      <Check className="h-3 w-3" /> Got it
                    </button>
                    <button type="button" onClick={() => setState({ result: 'incorrect' })} className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100">
                      Not yet
                    </button>
                  </div>
                </>
              )}
              {q.explanation && (
                <div className="mt-2 text-slate-700 [&_p]:my-1">
                  <Markdown text={q.explanation} className="text-sm" />
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            {!state.checked ? (
              <button
                type="button"
                onClick={check}
                disabled={!state.answer.trim()}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:bg-slate-200 disabled:text-slate-400"
              >
                {isSelfGraded && q.questionType === 'short-answer' ? 'Show answer' : 'Check'}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => go(1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-purple-700"
              >
                {index === order.length - 1 ? 'See results' : 'Next'} <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Print: every question with its answer key */}
      <div className="hidden space-y-3 print:block">
        <p className="font-semibold">{title || 'Practice quiz'}</p>
        {questions.map((item, i) => (
          <div key={item.id} className="break-inside-avoid text-sm">
            <p className="font-medium">{i + 1}. <Markdown text={item.question} inline /></p>
            {item.options && item.questionType === 'multiple-choice' && (
              <ol className="ml-6 list-[upper-alpha]">
                {item.options.filter(o => o && o.trim()).map((o, j) => <li key={j}><Markdown text={o} inline /></li>)}
              </ol>
            )}
            <p className="ml-6 text-slate-500">Answer: {String(item.correctAnswer)}</p>
          </div>
        ))}
      </div>
    </>
  )
}

// ── Flashcards ───────────────────────────────────────────────────────────────

function FlashcardsBlock({ cards, title }: { cards: FlashCard[]; title?: string }) {
  const [order, setOrder] = useState(cards)
  const [index, setIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)

  const card = order[index]

  const go = (delta: number) => {
    const next = index + delta
    if (next < 0 || next >= order.length) return
    setFlipped(false)
    setIndex(next)
  }

  const shuffle = () => {
    setOrder([...cards].sort(() => Math.random() - 0.5))
    setIndex(0)
    setFlipped(false)
  }

  const face = 'absolute inset-0 backface-hidden flex flex-col overflow-hidden rounded-2xl border shadow-sm'

  return (
    <>
      <div
        className="overflow-hidden rounded-2xl border border-indigo-200 bg-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 print:hidden"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') { e.preventDefault(); go(1) }
          else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1) }
          else if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setFlipped(f => !f) }
        }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-indigo-100 bg-indigo-50/60 px-5 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
            <CreditCard className="h-4 w-4 text-indigo-600" />
            {title || 'Flashcards'}
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-indigo-700/80">{index + 1} / {order.length}</span>
            <button type="button" onClick={shuffle} title="Shuffle" aria-label="Shuffle deck" className="flex h-7 w-7 items-center justify-center rounded-md text-indigo-500 transition hover:bg-indigo-100">
              <Shuffle className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="h-1 bg-indigo-50">
          <div className="h-full bg-indigo-500 transition-[width] duration-300" style={{ width: `${((index + 1) / order.length) * 100}%` }} />
        </div>

        <div className="p-5">
          <div className="perspective-1000 relative h-64">
            <div
              className={cn('transform-style-3d relative h-full w-full cursor-pointer transition-transform duration-500 motion-reduce:transition-none', flipped && 'rotate-y-180')}
              onClick={() => setFlipped(f => !f)}
              role="button"
              aria-label={flipped ? 'Show front' : 'Show back'}
            >
              <div className={cn(face, 'border-slate-200 bg-white')}>
                <span className={cn(eyebrow, 'px-5 pt-4 text-indigo-500')}>Front</span>
                <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-4">
                  <div className={cn(fontDisplay, 'text-center text-2xl font-medium leading-snug text-slate-900')}>
                    {card.front ? <Markdown text={card.front} inline /> : <span className="italic text-slate-300">(empty)</span>}
                  </div>
                </div>
                <p className="pb-4 text-center text-xs text-slate-400">Tap to flip · ← → to move</p>
              </div>
              <div className={cn(face, 'rotate-y-180 border-indigo-200 bg-indigo-50')}>
                <span className={cn(eyebrow, 'px-5 pt-4 text-indigo-600')}>Back</span>
                <div className="flex flex-1 items-center justify-center overflow-y-auto px-6 py-4">
                  <div className="text-center text-lg leading-relaxed text-slate-800">
                    {card.back ? <Markdown text={card.back} inline /> : <span className="italic text-slate-300">(empty)</span>}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between">
            <button type="button" onClick={() => go(-1)} disabled={index === 0} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40">
              <ArrowLeft className="h-4 w-4" /> Prev
            </button>
            <button type="button" onClick={() => setFlipped(f => !f)} className="rounded-lg border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50">
              Flip
            </button>
            <button type="button" onClick={() => go(1)} disabled={index === order.length - 1} className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-40">
              Next <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Print: all cards as a two-column term list */}
      <div className="hidden print:block">
        <p className="mb-2 font-semibold">{title || 'Flashcards'}</p>
        <table className="w-full border-collapse text-sm">
          <tbody>
            {cards.map(c => (
              <tr key={c.id} className="break-inside-avoid border-b border-slate-200">
                <td className="w-1/3 py-1.5 pr-4 align-top font-semibold"><Markdown text={c.front} inline /></td>
                <td className="py-1.5 align-top"><Markdown text={c.back} inline /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Practice ─────────────────────────────────────────────────────────────────
// Reuses the standalone Practice format's session as a compact inline card.
// Strict normalization drops half-authored or malformed activities (saved
// drafts, AI output) so students only see playable ones.
function PracticeBlock({ activities, title, sectionId }: { activities: unknown; title?: string; sectionId: string }) {
  const playable = useMemo(
    () => normalizePracticeActivities(activities, { strict: true, idPrefix: sectionId }),
    [activities, sectionId]
  )
  if (playable.length === 0) return null
  return <PracticeSession activities={playable} variant="inline" title={title} />
}
