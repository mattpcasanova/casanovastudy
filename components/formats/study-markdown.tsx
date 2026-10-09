"use client"

// The one markdown renderer for study-guide content (Outline, Summary,
// Flashcards, Quiz). Replaces the old regex → HTML string approach, which only
// understood bold/bullets/tables and let blockquotes, code fences, numbered
// lists and inline code through as raw symbols.
//
// Input should be run through normalizeGuideMarkdown() first (renderers do this
// once per guide); it turns blockquote "boxes" into ~~~~callout-<kind> fences
// that are rendered here as designed callouts.

import { memo, useState, type ReactNode } from 'react'
import ReactMarkdown, { type Components, type Options } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'
import rehypeKatex from 'rehype-katex'
import 'katex/dist/katex.min.css'
import { AlertTriangle, BookMarked, Brain, Eye, EyeOff, HelpCircle, Info, Lightbulb, Target } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHECK_ANSWER_SEPARATOR, FIGURE_GROUP_SEPARATOR, type CalloutKind } from '@/lib/formats/normalize'
import { AsciiDiagram, StepsDiagram, TreeDiagram, looksLikeAsciiDiagram, parseSteps, parseTree } from './diagrams'
import { CodeBlock } from './code-view'
import { GraphFence } from './graph-figure'
import { DesmosSteps } from './desmos-steps'
import { GRAPH_FENCE_LANGS } from '@/lib/graphs/spec'
import { remarkScripts } from '@/lib/formats/scripts'

// Single-$ math is off: "$100" in history/econ guides must stay text.
// Inline math is written $$x^2$$; display math is $$ on its own lines.
// remarkScripts turns calculator-style x^(n-1) / a_n in text into real sup/sub.
const remarkPlugins: Options['remarkPlugins'] = [remarkGfm, [remarkMath, { singleDollarTextMath: false }], remarkScripts]
const rehypePlugins: Options['rehypePlugins'] = [[rehypeKatex, { throwOnError: false, strict: 'ignore' }]]

// ── Callouts ────────────────────────────────────────────────────────────────

const CALLOUTS: Record<CalloutKind, { icon: typeof Info; label: string; box: string; iconCls: string; title: string }> = {
  keyterm: { icon: BookMarked, label: 'Key term', box: 'border-blue-200 bg-blue-50/70', iconCls: 'bg-blue-600 text-white', title: 'text-blue-900' },
  example: { icon: Lightbulb, label: 'Example', box: 'border-violet-200 bg-violet-50/60', iconCls: 'bg-violet-500 text-white', title: 'text-violet-900' },
  check: { icon: HelpCircle, label: 'Check yourself', box: 'border-emerald-200 bg-emerald-50/60', iconCls: 'bg-emerald-600 text-white', title: 'text-emerald-900' },
  remember: { icon: Brain, label: 'Remember', box: 'border-cyan-200 bg-cyan-50/60', iconCls: 'bg-cyan-600 text-white', title: 'text-cyan-900' },
  tip: { icon: Target, label: 'Exam tip', box: 'border-amber-200 bg-amber-50/70', iconCls: 'bg-amber-500 text-white', title: 'text-amber-900' },
  warning: { icon: AlertTriangle, label: 'Watch out', box: 'border-rose-200 bg-rose-50/60', iconCls: 'bg-rose-500 text-white', title: 'text-rose-900' },
  note: { icon: Info, label: '', box: 'border-slate-200 bg-slate-50', iconCls: 'bg-slate-500 text-white', title: 'text-slate-900' },
}

// "Key Term Box — Photosynthesis" → { eyebrow: "Key term", heading: "Photosynthesis" }
function calloutHeading(kind: CalloutKind, label: string): { eyebrow: string; heading: string | null } {
  const base = CALLOUTS[kind].label
  if (!label) return { eyebrow: base, heading: null }
  const cleaned = label.replace(/\bbox\b/i, '').replace(/\s+/g, ' ').trim()
  const split = cleaned.match(/^([^—:–]+?)\s*[—:–]\s*(.+)$/)
  if (split) return { eyebrow: split[1].trim(), heading: split[2].trim() }
  // The label is just the kind ("Analogy", "Check Yourself") → eyebrow only.
  if (cleaned.split(' ').length <= 4) return { eyebrow: cleaned, heading: null }
  return { eyebrow: base, heading: cleaned }
}

function Callout({ kind, label, body }: { kind: CalloutKind; label: string; body: string }) {
  const [revealed, setRevealed] = useState(false)
  const cfg = CALLOUTS[kind]
  const Icon = cfg.icon
  const { eyebrow, heading } = calloutHeading(kind, label)
  const [question, answer] = kind === 'check' && body.includes(CHECK_ANSWER_SEPARATOR)
    ? body.split(CHECK_ANSWER_SEPARATOR).map((s) => s.trim())
    : [body, null]

  return (
    <aside className={cn('not-prose my-5 rounded-xl border px-4 py-3.5 print:break-inside-avoid', cfg.box)}>
      <div className="flex gap-3">
        <span className={cn('mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg', cfg.iconCls)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          {(eyebrow || heading) && (
            <div className="mb-1">
              {eyebrow && <p className={cn('text-[0.7rem] font-semibold uppercase tracking-[0.12em] opacity-80', cfg.title)}>{eyebrow}</p>}
              {heading && <p className={cn('font-[family-name:var(--font-display)] text-lg font-semibold leading-snug', cfg.title)}>{heading}</p>}
            </div>
          )}
          <div className="text-[0.95rem] text-slate-700">
            <StudyMarkdownInner content={question} compact />
          </div>
          {answer !== null && (
            <div className="mt-2.5">
              {revealed ? (
                <div className="rounded-lg bg-white/80 px-3 py-2.5 ring-1 ring-inset ring-emerald-200">
                  <p className="mb-1 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-emerald-700">Answer</p>
                  <div className="text-[0.95rem] text-slate-800"><StudyMarkdownInner content={answer} compact /></div>
                  <button type="button" onClick={() => setRevealed(false)} className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 print:hidden">
                    <EyeOff className="h-3.5 w-3.5" /> Hide
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setRevealed(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-sm font-medium text-emerald-700 shadow-sm ring-1 ring-inset ring-emerald-200 transition hover:bg-emerald-600 hover:text-white print:hidden"
                >
                  <Eye className="h-3.5 w-3.5" /> Reveal answer
                </button>
              )}
              {/* Printouts always show the answer. */}
              {!revealed && <div className="hidden print:block text-sm text-slate-700"><strong>Answer:</strong> {answer}</div>}
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

// ── Code / diagram blocks ───────────────────────────────────────────────────

// Minimal hast shape — enough to read a code block's language, meta and text.
interface HastNode {
  type?: string
  tagName?: string
  value?: string
  properties?: { className?: unknown }
  data?: { meta?: string }
  children?: HastNode[]
}

function textOf(node: HastNode | undefined): string {
  if (!node) return ''
  if (typeof node.value === 'string') return node.value
  return (node.children ?? []).map(textOf).join('')
}

const CODE_LANGS = /^(r|py|python|js|javascript|ts|typescript|java|c|cpp|c\+\+|cs|csharp|go|golang|rust|sql|bash|sh|shell|zsh|html|xml|css|json|yaml|yml|matlab|julia|swift|kotlin|ruby|php|scala|haskell|lisp|scheme|pseudo|pseudocode)$/i

function PreBlock({ node }: { node?: HastNode }) {
  const codeEl = node?.children?.find((c) => c.tagName === 'code')
  const classes = (Array.isArray(codeEl?.properties?.className) ? codeEl.properties.className : []) as string[]
  const langClass = classes.find((c) => String(c).startsWith('language-'))
  const lang = langClass ? String(langClass).slice('language-'.length) : ''
  const meta: string = codeEl?.data?.meta ?? ''
  const text = textOf(codeEl)

  if (lang.startsWith('callout-')) {
    const kind = lang.slice('callout-'.length) as CalloutKind
    let label = ''
    try { label = decodeURIComponent(meta.trim()) } catch { label = meta.trim() }
    return <Callout kind={CALLOUTS[kind] ? kind : 'note'} label={label} body={text} />
  }
  const l = lang.toLowerCase()
  if (l === 'steps' || l === 'flow' || l === 'process' || l === 'sequence') return <StepsDiagram steps={parseSteps(text)} />
  if (l === 'cycle') return <StepsDiagram steps={parseSteps(text)} cycle />
  if (l === 'tree' || l === 'hierarchy') return <TreeDiagram roots={parseTree(text)} />
  if (l === 'desmos') return <DesmosSteps text={text} />
  if (GRAPH_FENCE_LANGS.test(l)) return <GraphFence text={text} />
  if (l === 'graph-group') {
    const bodies = text.split(new RegExp(`^${FIGURE_GROUP_SEPARATOR}$`, 'm')).map((b) => b.trim()).filter(Boolean)
    return (
      <div className={cn('not-prose my-5 grid gap-3 sm:grid-cols-2', bodies.length >= 3 && 'lg:grid-cols-3', '[&>figure]:my-0 print:grid-cols-2')}>
        {bodies.map((b, i) => <GraphFence key={i} text={b} compact />)}
      </div>
    )
  }
  if (!CODE_LANGS.test(l) && looksLikeAsciiDiagram(text)) return <AsciiDiagram text={text} />
  return <CodeBlock lang={lang} text={text} />
}

// ── Element styles ──────────────────────────────────────────────────────────

// Smaller and without the extra line height browsers give <sup>/<sub>.
const scriptCls = 'text-[0.72em] leading-none'

function buildComponents(compact: boolean): Components {
  return {
    pre: ({ node }) => <PreBlock node={node as HastNode | undefined} />,
    sup: ({ children }) => <sup className={scriptCls}>{children}</sup>,
    sub: ({ children }) => <sub className={scriptCls}>{children}</sub>,
    code: ({ children }) => (
      <code className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[0.85em] text-slate-800 ring-1 ring-inset ring-slate-200/70">{children}</code>
    ),
    p: ({ children }) => <p className={cn('leading-relaxed', compact ? 'mb-2 last:mb-0' : 'mb-3.5 last:mb-0')}>{children}</p>,
    h1: ({ children }) => <h3 className="mt-7 mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-900 first:mt-0">{children}</h3>,
    h2: ({ children }) => <h3 className="mt-7 mb-3 font-[family-name:var(--font-display)] text-xl font-semibold text-slate-900 first:mt-0">{children}</h3>,
    h3: ({ children }) => (
      <h4 className="mt-6 mb-2.5 flex items-center gap-2 text-[1.02rem] font-semibold text-slate-900 first:mt-0">
        <span className="h-4 w-1 rounded-full bg-blue-500" aria-hidden />
        {children}
      </h4>
    ),
    h4: ({ children }) => <h5 className="mt-5 mb-2 text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-slate-500 first:mt-0">{children}</h5>,
    h5: ({ children }) => <h6 className="mt-4 mb-1.5 text-sm font-semibold text-slate-700">{children}</h6>,
    h6: ({ children }) => <h6 className="mt-4 mb-1.5 text-sm font-semibold text-slate-700">{children}</h6>,
    ul: ({ children, className }) => (
      <ul className={cn(
        className?.includes('contains-task-list') ? 'list-none pl-1' : 'list-disc pl-5 marker:text-blue-400',
        compact ? 'my-2 space-y-1' : 'my-3 space-y-1.5'
      )}>{children}</ul>
    ),
    ol: ({ children, start }) => (
      <ol start={start} className={cn('list-decimal pl-5 marker:font-semibold marker:text-blue-500', compact ? 'my-2 space-y-1' : 'my-3 space-y-1.5')}>{children}</ol>
    ),
    li: ({ children }) => <li className="pl-1 leading-relaxed [&>p]:mb-1">{children}</li>,
    strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
    a: ({ children, href }) => (
      <a href={href} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-700 underline decoration-blue-300 underline-offset-2 hover:decoration-blue-600">{children}</a>
    ),
    hr: () => null,
    blockquote: ({ children }) => (
      <blockquote className="my-4 border-l-4 border-slate-300 pl-4 italic text-slate-600">{children}</blockquote>
    ),
    input: ({ checked }) => (
      <input type="checkbox" defaultChecked={!!checked} className="mr-2 h-4 w-4 translate-y-0.5 rounded border-slate-300 accent-blue-600" />
    ),
    table: ({ children }) => (
      <div className="not-prose my-5 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full border-collapse text-left text-sm">{children}</table>
      </div>
    ),
    thead: ({ children }) => <thead className="bg-gradient-to-b from-blue-50 to-blue-50/40">{children}</thead>,
    tbody: ({ children }) => <tbody className="divide-y divide-slate-100 [&>tr:nth-child(even)]:bg-slate-50/60">{children}</tbody>,
    tr: ({ children }) => <tr className="align-top">{children}</tr>,
    th: ({ children, style }) => (
      <th style={style} className="whitespace-nowrap border-b border-blue-100 px-4 py-2.5 text-[0.72rem] font-semibold uppercase tracking-[0.08em] text-blue-900">{children}</th>
    ),
    td: ({ children, style }) => (
      <td style={style} className="px-4 py-2.5 leading-snug text-slate-700 first:font-medium first:text-slate-900">{children}</td>
    ),
  }
}

const fullComponents = buildComponents(false)
const compactComponents = buildComponents(true)

function StudyMarkdownInner({ content, compact = false }: { content: string; compact?: boolean }) {
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={compact ? compactComponents : fullComponents}
    >
      {content}
    </ReactMarkdown>
  )
}

/** Block-level study-guide markdown (tables, callouts, diagrams, math). */
export const StudyMarkdown = memo(function StudyMarkdown({
  content,
  compact = false,
  className,
}: {
  content: string
  compact?: boolean
  className?: string
}) {
  if (!content.trim()) return null
  return (
    <div className={cn('text-slate-700', compact ? 'text-[0.95rem]' : 'text-[0.98rem]', className)}>
      <StudyMarkdownInner content={content} compact={compact} />
    </div>
  )
})

const inlineComponents: Components = {
  p: ({ children }) => <>{children}</>,
  sup: ({ children }) => <sup className={scriptCls}>{children}</sup>,
  sub: ({ children }) => <sub className={scriptCls}>{children}</sub>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  code: ({ children }) => <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
}

/** Inline markdown for short strings (card questions, quiz options, titles). */
export const InlineMarkdown = memo(function InlineMarkdown({ text }: { text: string }): ReactNode {
  // Fast path for plain strings.
  if (!/[*_`$\[^\u0302-\u0305\u0307\u20D7]/.test(text)) return <>{text}</> // combining accents (x̄) go through remarkScripts too
  return (
    <ReactMarkdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={inlineComponents}
    >
      {text}
    </ReactMarkdown>
  )
})
