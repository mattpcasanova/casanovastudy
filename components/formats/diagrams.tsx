"use client"

// Visual diagrams for study guides. The generator is asked to emit
//   ```steps   one step per line: "Title | optional detail"
//   ```tree    2-space indented hierarchy: "Label | optional detail"
//   ```cycle   like steps, but the last step loops back to the first
// Older guides drew ASCII-art diagrams in plain code fences; AsciiDiagram
// upgrades the common shapes (vertical arrow chains, "A → B → C" lines,
// "X ──► Y" mappings) and otherwise shows the art in a tidy mono panel.

import { ArrowDown, ArrowRight, RotateCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { InlineMarkdown } from './study-markdown'

interface Step {
  title: string
  detail?: string
}

function splitDetail(line: string): Step {
  const t = line.trim().replace(/^(\d+[.)]|[-*•]|step\s*\d+\s*[:.)-]?)\s*/i, '')
  const pipe = t.indexOf(' | ')
  if (pipe > 0) return { title: t.slice(0, pipe).trim(), detail: t.slice(pipe + 3).trim() }
  const paren = t.match(/^(.+?)\s+\((.+)\)$/)
  if (paren) return { title: paren[1].trim(), detail: paren[2].trim() }
  const colon = t.match(/^([^:]{2,40}):\s+(.+)$/)
  if (colon) return { title: colon[1].trim(), detail: colon[2].trim() }
  return { title: t }
}

export function parseSteps(text: string): Step[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map(splitDetail)
}

const frame = 'not-prose my-5 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5'

export function StepsDiagram({ steps, cycle = false }: { steps: Step[]; cycle?: boolean }) {
  if (steps.length === 0) return null
  // Short, few steps read best as a horizontal flow on wide screens.
  const horizontal = steps.length <= 5 && steps.every((s) => s.title.length <= 32 && (s.detail?.length ?? 0) <= 70)

  return (
    <figure className={cn(frame, '@container')}>
      <ol className={cn('flex flex-col gap-2', horizontal && '@2xl:flex-row @2xl:items-stretch @2xl:gap-0')}>
        {steps.map((s, i) => (
          <li key={i} className={cn('flex flex-col', horizontal && '@2xl:min-w-0 @2xl:flex-1 @2xl:flex-row @2xl:items-center')}>
            <div className="flex min-w-0 flex-1 items-start gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-3 shadow-sm">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-semibold text-white">
                {i + 1}
              </span>
              <div className="min-w-0">
                <div className="font-semibold leading-snug text-slate-900"><InlineMarkdown text={s.title} /></div>
                {s.detail && <div className="mt-0.5 text-sm leading-snug text-slate-600"><InlineMarkdown text={s.detail} /></div>}
              </div>
            </div>
            {i < steps.length - 1 && (
              <span className={cn('flex justify-center py-0.5 text-blue-400', horizontal && '@2xl:px-1.5 @2xl:py-0')} aria-hidden>
                <ArrowDown className={cn('h-4 w-4', horizontal && '@2xl:hidden')} />
                {horizontal && <ArrowRight className="hidden h-4 w-4 @2xl:block" />}
              </span>
            )}
          </li>
        ))}
      </ol>
      {cycle && (
        <figcaption className="mt-3 flex items-center justify-center gap-1.5 text-xs font-medium text-blue-700">
          <RotateCw className="h-3.5 w-3.5" /> Repeats — step {steps.length} leads back to step 1
        </figcaption>
      )}
    </figure>
  )
}

// ── Tree ─────────────────────────────────────────────────────────────────────

interface TreeNode extends Step {
  children: TreeNode[]
}

export function parseTree(text: string): TreeNode[] {
  const roots: TreeNode[] = []
  const stack: Array<{ indent: number; node: TreeNode }> = []
  for (const raw of text.split('\n')) {
    if (!raw.trim()) continue
    const indent = raw.replace(/\t/g, '  ').search(/\S/)
    const node: TreeNode = { ...splitDetail(raw.replace(/^[\s│├└─]+/, '')), children: [] }
    while (stack.length && stack[stack.length - 1].indent >= indent) stack.pop()
    if (stack.length) stack[stack.length - 1].node.children.push(node)
    else roots.push(node)
    stack.push({ indent, node })
  }
  return roots
}

function countLeaves(n: TreeNode): number {
  return n.children.length ? n.children.reduce((a, c) => a + countLeaves(c), 0) : 1
}
function depthOf(n: TreeNode): number {
  return 1 + Math.max(0, ...n.children.map(depthOf))
}

function NodeBox({ node, root }: { node: TreeNode; root?: boolean }) {
  return (
    <div
      className={cn(
        'max-w-[15rem] rounded-lg border px-3 py-2 text-center shadow-sm',
        root ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white'
      )}
    >
      <div className={cn('text-sm font-semibold leading-snug', root ? 'text-white' : 'text-slate-900')}>
        <InlineMarkdown text={node.title} />
      </div>
      {node.detail && (
        <div className={cn('mt-0.5 text-xs leading-snug', root ? 'text-blue-100' : 'text-slate-500')}>
          <InlineMarkdown text={node.detail} />
        </div>
      )}
    </div>
  )
}

function OrgTree({ node, root }: { node: TreeNode; root?: boolean }) {
  const kids = node.children
  return (
    <div className="flex flex-col items-center">
      <NodeBox node={node} root={root} />
      {kids.length > 0 && (
        <>
          <div className="h-4 w-px bg-slate-300" />
          <div className="flex gap-3">
            {kids.map((c, i) => (
              <div key={i} className="relative flex flex-col items-center pt-4">
                {kids.length > 1 && (
                  <div
                    className="absolute top-0 h-px bg-slate-300"
                    style={{ left: i === 0 ? '50%' : '-0.375rem', right: i === kids.length - 1 ? '50%' : '-0.375rem' }}
                  />
                )}
                <div className="absolute left-1/2 top-0 h-4 w-px bg-slate-300" />
                <OrgTree node={c} />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function IndentTree({ nodes, level = 0 }: { nodes: TreeNode[]; level?: number }) {
  return (
    <ul className={cn('space-y-1.5', level > 0 && 'ml-3 mt-1.5 border-l-2 border-slate-200 pl-4')}>
      {nodes.map((n, i) => (
        <li key={i}>
          <div className="flex items-baseline gap-2">
            <span className={cn('h-2 w-2 shrink-0 translate-y-[-1px] rounded-full', level === 0 ? 'bg-blue-600' : 'bg-slate-400')} />
            <span className={cn('font-semibold text-slate-900', level > 0 && 'text-sm')}><InlineMarkdown text={n.title} /></span>
            {n.detail && <span className="text-sm text-slate-500">— <InlineMarkdown text={n.detail} /></span>}
          </div>
          {n.children.length > 0 && <IndentTree nodes={n.children} level={level + 1} />}
        </li>
      ))}
    </ul>
  )
}

export function TreeDiagram({ roots }: { roots: TreeNode[] }) {
  if (roots.length === 0) return null
  // Org chart for compact hierarchies; indented tree for big/deep ones.
  const compact = roots.length === 1 && countLeaves(roots[0]) <= 6 && depthOf(roots[0]) <= 3
  return (
    <figure className={frame}>
      {compact ? (
        <div className="overflow-x-auto pb-1">
          <div className="mx-auto w-fit px-1">
            <OrgTree node={roots[0]} root />
          </div>
        </div>
      ) : (
        <IndentTree nodes={roots} />
      )}
    </figure>
  )
}

// ── Legacy ASCII art ─────────────────────────────────────────────────────────

const ARROW_ONLY = /^[\s↓▼⬇|│v↑▲⬆]+$/
const ARROW_CHARS = /[→⟶➜➔►▶]|-{1,}>|─+>|=>/

export function looksLikeAsciiDiagram(text: string): boolean {
  return /[─-╿]|[→←↑↓►▼▲◄⟶➜]|--+>|==>/.test(text)
}

function asMapping(lines: string[]): Array<{ from: string; to: string }> | null {
  const rows: Array<{ from: string; to: string }> = []
  for (const l of lines) {
    const parts = l.split(/\s*(?:[─—=-]*\s*[→⟶➜➔►▶>])\s*/).map((p) => p.replace(/[─│└├┌┐┘┤┬┴┼]/g, '').trim()).filter(Boolean)
    if (parts.length !== 2) return null
    rows.push({ from: parts[0], to: parts[1] })
  }
  return rows.length >= 2 ? rows : null
}

// "│ DESIGN │ DESCRIPTIVE │ INFERENTIAL │" rows (optionally under a title line)
// → labelled boxes. Returns null when the art isn't a simple row of boxes.
function boxRow(lines: string[]): { title: string; cells: string[] } | null {
  const titleLines: string[] = []
  const rows: string[][] = []
  for (const l of lines) {
    if (/^[\s─┌┐└┘├┤┬┴┼═╔╗╚╝]+$/.test(l)) continue // pure border line
    if (l.includes('│') || l.includes('║')) {
      const cells = l.split(/[│║]/).slice(1, -1).map((c) => c.trim())
      if (cells.length < 2) return null
      rows.push(cells)
    } else if (!rows.length) titleLines.push(l.trim())
    else return null
  }
  if (!rows.length || rows.some((r) => r.length !== rows[0].length)) return null
  const cells = rows[0].map((_, col) => rows.map((r) => r[col]).filter(Boolean).join(' '))
  return { title: titleLines.join(' '), cells }
}

export function AsciiDiagram({ text }: { text: string }) {
  const lines = text.split('\n').filter((l) => l.trim())

  const boxes = boxRow(lines)
  if (boxes) {
    const toTitle = (t: string) => (t === t.toUpperCase() ? t.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : t)
    const children = boxes.cells.map((c) => ({ title: toTitle(c), children: [] as TreeNode[] }))
    if (boxes.title) return <TreeDiagram roots={[{ title: toTitle(boxes.title), children }]} />
    return (
      <figure className={frame}>
        <div className="flex flex-wrap justify-center gap-3">
          {children.map((c, i) => <NodeBox key={i} node={c} />)}
        </div>
      </figure>
    )
  }

  // Vertical chain: content lines separated by arrow-only lines.
  const content = lines.filter((l) => !ARROW_ONLY.test(l))
  const alternates = lines.length === content.length * 2 - 1 && lines.every((l, i) => (i % 2 === 1) === ARROW_ONLY.test(l))
  if (content.length >= 2 && alternates && content.every((l) => !/[─-╿]/.test(l))) {
    return <StepsDiagram steps={content.map(splitDetail)} />
  }

  // Single "A → B → C" line.
  if (lines.length === 1) {
    const parts = lines[0].split(/\s*(?:→|⟶|➜|►|->|-->|=>)\s*/).map((p) => p.trim()).filter(Boolean)
    if (parts.length >= 2) return <StepsDiagram steps={parts.map(splitDetail)} />
  }

  // "X ──► Y" rows → two-column mapping.
  if (lines.every((l) => ARROW_CHARS.test(l))) {
    const rows = asMapping(lines)
    if (rows) {
      return (
        <figure className={frame}>
          <div className="space-y-2">
            {rows.map((r, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
                <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 shadow-sm">{r.from}</div>
                <ArrowRight className="h-4 w-4 text-blue-500" aria-hidden />
                <div className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-900">{r.to}</div>
              </div>
            ))}
          </div>
        </figure>
      )
    }
  }

  return (
    <figure className={cn(frame, 'overflow-x-auto')}>
      <pre className="mx-auto w-fit font-mono text-[0.8rem] leading-[1.35] text-slate-700">{text.replace(/\n+$/, '')}</pre>
    </figure>
  )
}
