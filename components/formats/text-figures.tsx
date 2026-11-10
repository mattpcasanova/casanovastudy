// Writing and literature figures (specs in lib/graphs/text-figs.ts): a text
// with every piece named, and a story arc.

import { describeText, STAGE_NAMES, type AnnotatedSpec, type PlotSpec, type PlotStage } from '@/lib/graphs/text-figs'
import { InlineMarkdown } from './study-markdown'
import { cn } from '@/lib/utils'

const TONES = [
  { bar: 'border-blue-500', bg: 'bg-blue-50', text: 'text-blue-800' },
  { bar: 'border-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-800' },
  { bar: 'border-violet-500', bg: 'bg-violet-50', text: 'text-violet-800' },
  { bar: 'border-amber-500', bg: 'bg-amber-50', text: 'text-amber-900' },
  { bar: 'border-rose-500', bg: 'bg-rose-50', text: 'text-rose-800' },
  { bar: 'border-sky-500', bg: 'bg-sky-50', text: 'text-sky-800' },
  { bar: 'border-teal-500', bg: 'bg-teal-50', text: 'text-teal-800' },
]

export function AnnotatedFigure({ spec }: { spec: AnnotatedSpec }) {
  return (
    <div role="figure" aria-label={describeText(spec)} className="mx-auto max-w-2xl space-y-1.5 text-left">
      {spec.parts.map((p, i) => {
        const t = TONES[p.tone % TONES.length]
        return (
          <div key={i} className={cn('grid grid-cols-1 gap-x-3 gap-y-0.5 rounded-r-xl border-l-4 px-3 py-2 sm:grid-cols-[7.5rem_minmax(0,1fr)]', t.bar, t.bg)}>
            <span className={cn('text-xs font-bold uppercase tracking-wide sm:pt-0.5', t.text)}>{p.role}</span>
            <span className="text-[0.95rem] leading-relaxed text-slate-900"><InlineMarkdown text={p.text} /></span>
          </div>
        )
      })}
    </div>
  )
}

const STAGE_COLOR: Record<PlotStage, string> = { exposition: '#2563eb', rising: '#d97706', climax: '#e11d48', falling: '#7c3aed', resolution: '#059669' }

export function PlotFigure({ spec }: { spec: PlotSpec }) {
  const W = 440, H = 170, left = 24, right = W - 24, base = 140, peak = 26
  const n = spec.points.length
  const climax = spec.points.findIndex((p) => p.stage === 'climax')
  // Height of each point: flat start, climbing to the climax, coming down to a flat end.
  const height = (i: number) => {
    const s = spec.points[i].stage
    if (s === 'exposition' || s === 'resolution') return 0
    if (s === 'climax') return 1
    const before = spec.points.slice(0, climax).filter((p) => p.stage === 'rising').length
    const after = spec.points.slice(climax + 1).filter((p) => p.stage === 'falling').length
    if (s === 'rising') return (spec.points.slice(0, i + 1).filter((p) => p.stage === 'rising').length) / (before + 1)
    return 1 - (spec.points.slice(climax + 1, i + 1).filter((p) => p.stage === 'falling').length) / (after + 1)
  }
  const xy = spec.points.map((_, i) => ({ x: left + 30 + ((right - left - 60) * i) / Math.max(1, n - 1), y: base - height(i) * (base - peak) }))
  const path = [`${left},${xy[0].y}`, ...xy.map((p) => `${p.x},${p.y}`), `${right},${xy[n - 1].y}`].join(' ')
  return (
    <div role="figure" aria-label={describeText(spec)} className="text-left">
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[520px]" aria-hidden="true">
        <polyline points={path} fill="none" stroke="#475569" strokeWidth={2} strokeLinejoin="round" />
        {xy.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={11} fill={STAGE_COLOR[spec.points[i].stage]} stroke="white" strokeWidth={2} />
            <text x={p.x} y={p.y + 4} textAnchor="middle" fontSize={11.5} fontWeight={700} fill="white" style={{ fontFamily: 'inherit' }}>{i + 1}</text>
          </g>
        ))}
      </svg>
      <ol className="mx-auto mt-1 max-w-xl space-y-1.5">
        {spec.points.map((p, i) => (
          <li key={i} className="flex gap-2.5 text-sm">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: STAGE_COLOR[p.stage] }} aria-hidden="true">{i + 1}</span>
            <span className="min-w-0 text-slate-800"><span className="font-semibold text-slate-900">{STAGE_NAMES[p.stage]}:</span> <InlineMarkdown text={p.text} /></span>
          </li>
        ))}
      </ol>
    </div>
  )
}
