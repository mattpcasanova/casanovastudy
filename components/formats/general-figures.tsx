// General-purpose figures (specs in lib/graphs/general.ts): Venn comparison,
// layers and pyramids, a labelled scale, parts of a whole, labelled parts of a
// formula or sentence, and a small timeline. Mostly plain HTML so text wraps
// and nothing shrinks on a phone; everything prints.

import { describeGeneral, type AnatomySpec, type LayersSpec, type MiniTimelineSpec, type PartsSpec, type SpectrumSpec, type VennSpec } from '@/lib/graphs/general'
import { InlineMarkdown } from './study-markdown'
import { cn } from '@/lib/utils'

// One tint per item, in order; each is readable on white and when printed.
const TINTS = [
  { soft: 'bg-blue-50', ring: 'ring-blue-200', solid: 'bg-blue-600', text: 'text-blue-800', border: 'border-blue-500' },
  { soft: 'bg-emerald-50', ring: 'ring-emerald-200', solid: 'bg-emerald-600', text: 'text-emerald-800', border: 'border-emerald-500' },
  { soft: 'bg-violet-50', ring: 'ring-violet-200', solid: 'bg-violet-600', text: 'text-violet-800', border: 'border-violet-500' },
  { soft: 'bg-amber-50', ring: 'ring-amber-200', solid: 'bg-amber-500', text: 'text-amber-900', border: 'border-amber-500' },
  { soft: 'bg-rose-50', ring: 'ring-rose-200', solid: 'bg-rose-600', text: 'text-rose-800', border: 'border-rose-500' },
  { soft: 'bg-sky-50', ring: 'ring-sky-200', solid: 'bg-sky-600', text: 'text-sky-800', border: 'border-sky-500' },
  { soft: 'bg-teal-50', ring: 'ring-teal-200', solid: 'bg-teal-600', text: 'text-teal-800', border: 'border-teal-500' },
  { soft: 'bg-slate-100', ring: 'ring-slate-300', solid: 'bg-slate-500', text: 'text-slate-800', border: 'border-slate-500' },
]
const tint = (i: number) => TINTS[i % TINTS.length]

const Text = ({ children }: { children: string }) => <InlineMarkdown text={children} />

// ── Venn ────────────────────────────────────────────────────────────────────

function VennList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1 text-sm leading-snug text-slate-800">
      {items.map((t, i) => <li key={i}><Text>{t}</Text></li>)}
    </ul>
  )
}

export function VennFigure({ spec }: { spec: VennSpec }) {
  const [a, b] = spec.sets
  return (
    <div role="figure" aria-label={describeGeneral(spec)} className="text-left">
      {/* Two overlapping rounded shapes; the shared middle is where they cross. Stacks on a phone. */}
      <div className="relative mx-auto grid max-w-2xl grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1fr)] sm:gap-0">
        <div className="rounded-3xl bg-blue-50 p-4 ring-1 ring-inset ring-blue-200 sm:-mr-6 sm:rounded-[999px] sm:py-8 sm:pl-10 sm:pr-12">
          <p className="mb-1.5 font-semibold text-blue-900"><Text>{a.name}</Text></p>
          <VennList items={a.items} />
        </div>
        <div className="z-10 self-center rounded-3xl bg-violet-100/90 p-4 ring-1 ring-inset ring-violet-300 sm:rounded-[999px] sm:px-5 sm:py-7 sm:text-center">
          <p className="mb-1.5 font-semibold text-violet-900">Both</p>
          {spec.both.length ? <VennList items={spec.both} /> : <p className="text-sm text-slate-500">Nothing in common</p>}
        </div>
        <div className="rounded-3xl bg-emerald-50 p-4 ring-1 ring-inset ring-emerald-200 sm:-ml-6 sm:rounded-[999px] sm:py-8 sm:pl-12 sm:pr-10">
          <p className="mb-1.5 font-semibold text-emerald-900"><Text>{b.name}</Text></p>
          <VennList items={b.items} />
        </div>
      </div>
    </div>
  )
}

// ── Layers and pyramids ─────────────────────────────────────────────────────

export function LayersFigure({ spec }: { spec: LayersSpec }) {
  const n = spec.layers.length
  return (
    <div role="figure" aria-label={describeGeneral(spec)} className="mx-auto flex max-w-xl flex-col items-center gap-1">
      {spec.layers.map((l, i) => {
        const t = tint(i)
        // A pyramid steps out from 46% wide at the top to full width at the base.
        const width = spec.shape === 'pyramid' ? 46 + (54 * i) / Math.max(1, n - 1) : 100
        return (
          <div key={i} style={{ width: `${width}%` }} className={cn('rounded-xl px-3 py-2 text-center ring-1 ring-inset', t.soft, t.ring)}>
            <p className={cn('text-sm font-semibold leading-snug', t.text)}><Text>{l.label}</Text></p>
            {l.detail && <p className="text-xs leading-snug text-slate-600"><Text>{l.detail}</Text></p>}
          </div>
        )
      })}
    </div>
  )
}

// ── A labelled scale ────────────────────────────────────────────────────────

export function SpectrumFigure({ spec }: { spec: SpectrumSpec }) {
  const endText = (e: SpectrumSpec['from']) => [e.value !== null ? String(e.value) : null, e.label].filter(Boolean).join(' · ')
  const marks = [...spec.marks].sort((x, y) => x.at - y.at)
  return (
    <div role="figure" aria-label={describeGeneral(spec)} className="mx-auto max-w-xl text-left">
      <div className="relative px-1 pt-1">
        <div className="h-3 rounded-full bg-gradient-to-r from-rose-400 via-amber-300 to-blue-500" />
        {marks.map((m, i) => (
          <span key={i} aria-hidden="true" style={{ left: `calc(${m.at * 100}% )` }} className="absolute top-0 h-5 w-0.5 -translate-x-1/2 rounded bg-slate-900" />
        ))}
      </div>
      <div className="mt-1.5 flex justify-between gap-4 text-xs font-semibold text-slate-600">
        <span>{endText(spec.from)}</span>
        <span className="text-right">{endText(spec.to)}</span>
      </div>
      {/* The marks as a list in order along the bar, each with a dot showing where it sits: labels never collide. */}
      <ul className="mt-3 space-y-1.5">
        {marks.map((m, i) => (
          <li key={i} className="flex items-center gap-3 text-sm">
            <span className="relative h-1.5 w-20 shrink-0 rounded-full bg-slate-200" aria-hidden="true">
              <span style={{ left: `${m.at * 100}%` }} className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-900" />
            </span>
            {m.value && <span className="w-12 shrink-0 font-semibold tabular-nums text-slate-900">{m.value}</span>}
            <span className="min-w-0 text-slate-800"><Text>{m.label}</Text></span>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Parts of a whole ────────────────────────────────────────────────────────

export function PartsFigure({ spec }: { spec: PartsSpec }) {
  const amount = (v: number) => `${Number.isInteger(v) ? v : Number(v.toFixed(2))}${spec.unit === '%' ? '%' : spec.unit ? ` ${spec.unit}` : ''}`
  return (
    <div role="figure" aria-label={describeGeneral(spec)} className="mx-auto max-w-xl text-left">
      <div className="flex h-9 overflow-hidden rounded-xl ring-1 ring-inset ring-slate-200">
        {spec.parts.map((p, i) => (
          <span key={i} style={{ flexGrow: Math.max(p.share, 0.015), flexBasis: 0 }} className={cn('h-full border-r border-white last:border-r-0', tint(i).solid)} />
        ))}
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
        {spec.parts.map((p, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className={cn('h-3 w-3 shrink-0 rounded-sm', tint(i).solid)} aria-hidden="true" />
            <span className="min-w-0 flex-1 text-slate-800"><Text>{p.label}</Text></span>
            <span className="shrink-0 font-semibold tabular-nums text-slate-900">{amount(p.value)}</span>
            {spec.unit !== '%' && <span className="w-10 shrink-0 text-right tabular-nums text-slate-500">{Math.round(p.share * 100)}%</span>}
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── Labelled parts of a formula or sentence ─────────────────────────────────

export function AnatomyFigure({ spec }: { spec: AnatomySpec }) {
  let labelled = -1
  return (
    <div role="figure" aria-label={describeGeneral(spec)} className="flex flex-wrap items-start justify-center gap-x-2 gap-y-4">
      {spec.parts.map((p, i) => {
        const t = p.label ? tint(++labelled) : null
        return (
          <span key={i} className="flex max-w-full flex-col items-center sm:max-w-[16rem]">
            <span className={cn('px-1.5 pb-1 text-xl font-semibold leading-tight', t ? cn('border-b-[3px]', t.border, 'text-slate-900') : 'border-b-[3px] border-transparent text-slate-500')}>
              <Text>{p.text}</Text>
            </span>
            {p.label && t && <span className={cn('mt-1.5 text-center text-xs font-semibold leading-snug', t.text)}><Text>{p.label}</Text></span>}
          </span>
        )
      })}
    </div>
  )
}

// ── A small timeline ────────────────────────────────────────────────────────

export function MiniTimelineFigure({ spec }: { spec: MiniTimelineSpec }) {
  return (
    <ol role="figure" aria-label={describeGeneral(spec)} className="mx-auto flex max-w-3xl flex-col text-left sm:flex-row sm:text-center">
      {spec.events.map((e, i) => (
        <li key={i} className="relative flex flex-1 gap-3 pb-4 last:pb-0 sm:flex-col sm:items-center sm:gap-0 sm:px-1.5 sm:pb-0">
          {/* The line: down the left on a phone, across the top from sm. */}
          <span aria-hidden="true" className={cn('absolute bg-slate-300', 'left-[0.4375rem] top-4 h-full w-0.5 sm:left-1/2 sm:top-[0.4375rem] sm:h-0.5 sm:w-full', i === spec.events.length - 1 && 'hidden')} />
          <span aria-hidden="true" className={cn('relative z-10 mt-1 h-4 w-4 shrink-0 rounded-full ring-4 ring-white sm:mt-0', tint(i).solid)} />
          <span className="min-w-0 sm:mt-2">
            <span className="block text-sm font-bold tabular-nums text-slate-900">{e.when}</span>
            <span className="block text-sm leading-snug text-slate-700"><Text>{e.label}</Text></span>
          </span>
        </li>
      ))}
    </ol>
  )
}
