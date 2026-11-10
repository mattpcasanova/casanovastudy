"use client"

// Math, statistics and computer science figures (specs and all the numbers in
// lib/graphs/math-figs.ts). The normal curve and unit circle get a slider when
// `interactive` (never while a question is unanswered, so it can't be used to
// read off the answer); sliders don't print.

import { useState } from 'react'
import {
  circleAngle, describeMath, shadedArea,
  type AreaModelSpec, type ArraySpec, type FractionBarSpec, type NormalSpec, type PlaceValueSpec, type ProbabilityTreeSpec, type Shade, type TapeSpec, type TreeNode, type UnitCircleSpec,
} from '@/lib/graphs/math-figs'
import { tidy } from '@/lib/graphs/lines'
import { cn } from '@/lib/utils'

const INK = '#1e293b'
const MUTED = '#64748b'
const AXIS = '#475569'
const BLUE = '#2563eb'
const FILL = '#bfdbfe'

export const sliderClass = 'h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-blue-600'

// ── Normal curve ────────────────────────────────────────────────────────────

export function NormalFigure({ spec, interactive }: { spec: NormalSpec; interactive?: boolean }) {
  const [shade, setShade] = useState<Shade | null>(spec.shade)
  const { mean, sd } = spec
  const W = 440, left = 14, right = W - 14, base = 150, top = 22
  const plain = mean === 0 && sd === 1
  const ruleTop = base + (plain ? 24 : 38)
  const H = spec.rule && !spec.shade ? ruleTop + 3 * 15 + 6 : spec.xLabel ? 214 : plain ? 178 : 190
  const sx = (z: number) => left + ((z + 3.6) / 7.2) * (right - left)
  const sy = (z: number) => base - Math.exp(-(z * z) / 2) * (base - top)
  const zOf = (x: number) => (x - mean) / sd
  const pts = (from: number, to: number) => {
    const out: string[] = []
    for (let z = from; z <= to + 1e-9; z += 0.06) out.push(`${sx(z).toFixed(1)},${sy(z).toFixed(1)}`)
    out.push(`${sx(to).toFixed(1)},${sy(to).toFixed(1)}`)
    return out
  }
  const region = (from: number, to: number) => {
    const a = Math.max(-3.6, from), b = Math.min(3.6, to)
    return b > a ? `M${sx(a)},${base} L${pts(a, b).join(' L')} L${sx(b)},${base} Z` : ''
  }
  const regions = !shade ? [] : shade.type === 'below' ? [region(-3.6, zOf(shade.a))] : shade.type === 'above' ? [region(zOf(shade.a), 3.6)]
    : shade.type === 'between' ? [region(zOf(shade.a), zOf(shade.b))] : [region(-3.6, zOf(shade.a)), region(zOf(shade.b), 3.6)]
  const area = shade ? shadedArea(mean, sd, shade) : null
  const zText = (x: number) => tidy(zOf(x), 2).replace('-', '−')
  const bounds = !shade ? [] : 'b' in shade ? [shade.a, shade.b] : [shade.a]
  const step = sd / 20
  const setBound = (i: number, v: number) => {
    if (!shade) return
    if (!('b' in shade)) return setShade({ ...shade, a: v })
    const next = i === 0 ? { ...shade, a: Math.min(v, shade.b) } : { ...shade, b: Math.max(v, shade.a) }
    setShade(next)
  }
  return (
    <div role="figure" aria-label={describeMath({ ...spec, shade })}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[520px]" aria-hidden="true">
        {spec.rule && [3, 2, 1].map((k) => (
          <path key={k} d={region(-k, k)} fill={['#dbeafe', '#bfdbfe', '#93c5fd'][3 - k]} opacity={shade ? 0.35 : 1} />
        ))}
        {regions.filter(Boolean).map((d, i) => <path key={i} d={d} fill={FILL} stroke={BLUE} strokeWidth={0.8} />)}
        <polyline points={pts(-3.6, 3.6).join(' ')} fill="none" stroke={INK} strokeWidth={1.8} />
        <line x1={left} y1={base} x2={right} y2={base} stroke={AXIS} strokeWidth={1.2} />
        {[-3, -2, -1, 0, 1, 2, 3].map((k) => (
          <g key={k}>
            <line x1={sx(k)} y1={base} x2={sx(k)} y2={base + 5} stroke={AXIS} strokeWidth={1.2} />
            <text x={sx(k)} y={base + 18} textAnchor="middle" fontSize={11} fill={INK} style={{ fontFamily: 'inherit' }}>{tidy(mean + k * sd, 3).replace('-', '−')}</text>
            {!plain && <text x={sx(k)} y={base + 31} textAnchor="middle" fontSize={9.5} fill={MUTED} style={{ fontFamily: 'inherit' }}>{k === 0 ? 'z = 0' : `${k > 0 ? '+' : '−'}${Math.abs(k)}`}</text>}
          </g>
        ))}
        {spec.rule && !spec.shade && [[1, '68%'], [2, '95%'], [3, '99.7%']].map(([k, label]) => {
          const y = ruleTop + Number(k) * 15 - 6
          return (
            <g key={label}>
              <line x1={sx(-Number(k))} y1={y} x2={sx(Number(k))} y2={y} stroke={BLUE} strokeWidth={1.4} />
              <rect x={W / 2 - 17} y={y - 6} width={34} height={12} fill="white" />
              <text x={W / 2} y={y + 3.5} textAnchor="middle" fontSize={10} fontWeight={700} fill={BLUE} style={{ fontFamily: 'inherit' }}>{label}</text>
            </g>
          )
        })}
        {spec.xLabel && <text x={W / 2} y={H - 2} textAnchor="middle" fontSize={11} fill={AXIS} style={{ fontFamily: 'inherit' }}>{spec.xLabel}</text>}
      </svg>
      {shade && (
        <p className="mt-1 text-center text-sm text-slate-700">
          {shade.type === 'below' ? `Below ${tidy(shade.a, 3)}` : shade.type === 'above' ? `Above ${tidy(shade.a, 3)}` : shade.type === 'between' ? `Between ${tidy(shade.a, 3)} and ${tidy(shade.b, 3)}` : `Below ${tidy(shade.a, 3)} or above ${tidy(shade.b, 3)}`}
          <span className="text-slate-500"> (z = {bounds.map(zText).join(' and ')})</span>
          {spec.showArea && area !== null && <>: <span className="font-semibold text-slate-900">area {area.toFixed(4)}</span> <span className="text-slate-500">({tidy(area * 100, 2)}%)</span></>}
        </p>
      )}
      {interactive && shade && spec.showArea && (
        <div className="mx-auto mt-2 max-w-sm space-y-1.5 print:hidden">
          {bounds.map((b, i) => (
            <input key={i} type="range" className={sliderClass} aria-label={bounds.length > 1 ? (i === 0 ? 'Lower bound' : 'Upper bound') : 'Boundary'}
              min={mean - 3.5 * sd} max={mean + 3.5 * sd} step={step} value={b} onChange={(e) => setBound(i, Number(e.target.value))} />
          ))}
          <p className="text-center text-xs text-slate-500">Drag to move the boundary and watch the area change.</p>
        </div>
      )}
    </div>
  )
}

// ── Unit circle ─────────────────────────────────────────────────────────────

const ANGLE_COLORS = ['#2563eb', '#059669', '#7c3aed', '#d97706']

export function UnitCircleFigure({ spec, interactive }: { spec: UnitCircleSpec; interactive?: boolean }) {
  const [first, setFirst] = useState(spec.angles[0].degrees)
  const angles = [circleAngle(first), ...spec.angles.slice(1)]
  const S = 300, c = S / 2, r = 104
  const px = (x: number) => c + x * r, py = (y: number) => c - y * r
  const main = angles[0]
  return (
    <div role="figure" aria-label={describeMath({ ...spec, angles })}>
      <svg viewBox={`0 0 ${S} ${S}`} className="mx-auto block h-auto w-full max-w-[340px]" aria-hidden="true">
        <line x1={14} y1={c} x2={S - 14} y2={c} stroke={AXIS} strokeWidth={1} />
        <line x1={c} y1={14} x2={c} y2={S - 14} stroke={AXIS} strokeWidth={1} />
        <circle cx={c} cy={c} r={r} fill="none" stroke={INK} strokeWidth={1.6} />
        {[[1, 0, '1'], [-1, 0, '−1'], [0, 1, '1'], [0, -1, '−1']].map(([x, y, t]) => (
          <text key={`${x}${y}`} x={px(Number(x)) + (x ? Number(x) * 10 : 8)} y={py(Number(y)) + (y ? -Number(y) * 9 + 3 : 13)} textAnchor="middle" fontSize={10} fill={MUTED} style={{ fontFamily: 'inherit' }}>{t}</text>
        ))}
        {/* Reference triangle for the first angle */}
        <line x1={px(main.x)} y1={py(main.y)} x2={px(main.x)} y2={c} stroke={ANGLE_COLORS[0]} strokeWidth={1.2} strokeDasharray="4 3" />
        <line x1={c} y1={c} x2={px(main.x)} y2={c} stroke={ANGLE_COLORS[0]} strokeWidth={2.4} opacity={0.35} />
        {(() => {
          const sweep = ((main.degrees % 360) + 360) % 360
          const rad = (sweep * Math.PI) / 180, ar = 24
          return sweep > 0 && <path d={`M${c + ar},${c} A${ar},${ar} 0 ${sweep > 180 ? 1 : 0} 0 ${c + ar * Math.cos(rad)},${c - ar * Math.sin(rad)}`} fill="none" stroke={ANGLE_COLORS[0]} strokeWidth={1.4} />
        })()}
        {angles.map((a, i) => (
          <g key={i}>
            <line x1={c} y1={c} x2={px(a.x)} y2={py(a.y)} stroke={ANGLE_COLORS[i]} strokeWidth={2} />
            <circle cx={px(a.x)} cy={py(a.y)} r={4.5} fill={ANGLE_COLORS[i]} />
          </g>
        ))}
      </svg>
      <ul className="mx-auto mt-1 max-w-sm space-y-1">
        {angles.map((a, i) => (
          <li key={i} className="flex items-center justify-center gap-2 text-sm">
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: ANGLE_COLORS[i] }} aria-hidden="true" />
            <span className="font-semibold text-slate-900">{a.degreeText}</span>
            <span className="text-slate-500">= {a.radianText}</span>
            {spec.showCoords && <span className="text-slate-800">→ (cos, sin) = ({a.cos}, {a.sin})</span>}
          </li>
        ))}
      </ul>
      {interactive && spec.showCoords && (
        <div className="mx-auto mt-2 max-w-sm print:hidden">
          <input type="range" className={sliderClass} aria-label="Angle in degrees" min={0} max={360} step={15} value={((first % 360) + 360) % 360} onChange={(e) => setFirst(Number(e.target.value))} />
          <p className="mt-1 text-center text-xs text-slate-500">Drag to turn the angle in 15° steps.</p>
        </div>
      )}
    </div>
  )
}

// ── Fraction bars ───────────────────────────────────────────────────────────

export function FractionBarFigure({ spec }: { spec: FractionBarSpec }) {
  return (
    <div role="figure" aria-label={describeMath(spec)} className="mx-auto max-w-xl space-y-3 text-left">
      {spec.bars.map((b, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-12 shrink-0 text-right text-lg font-semibold tabular-nums text-slate-900">{b.n}/{b.d}</span>
          <span className="min-w-0 flex-1">
            <span className="flex gap-2">
              {Array.from({ length: b.wholes }, (_, wi) => (
                <span key={wi} className="flex h-9 flex-1 overflow-hidden rounded-lg border border-slate-500">
                  {Array.from({ length: b.d }, (_, k) => (
                    <span key={k} className={cn('h-full flex-1 border-r border-slate-500 last:border-r-0', wi * b.d + k < b.n ? ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500', 'bg-rose-500'][i % 5] : 'bg-white')} />
                  ))}
                </span>
              ))}
            </span>
            {b.label && <span className="mt-0.5 block text-xs text-slate-600">{b.label}</span>}
          </span>
        </div>
      ))}
    </div>
  )
}

// ── Area model ──────────────────────────────────────────────────────────────

const CELL_TINTS = ['bg-blue-50', 'bg-emerald-50', 'bg-violet-50', 'bg-amber-50']

export function AreaModelFigure({ spec }: { spec: AreaModelSpec }) {
  return (
    <div role="figure" aria-label={describeMath(spec)} className="text-center">
      <div className="inline-block max-w-full overflow-x-auto">
        <table className="border-separate border-spacing-0 text-slate-900">
          <thead>
            <tr>
              <th className="w-12" aria-hidden="true">×</th>
              {spec.cols.map((col, j) => <th key={j} className="px-2 pb-1.5 text-base font-semibold">{col}</th>)}
            </tr>
          </thead>
          <tbody>
            {spec.rows.map((row, i) => (
              <tr key={i}>
                <th className="pr-2 text-right text-base font-semibold">{row}</th>
                {spec.cells[i].map((cell, j) => (
                  <td key={j} className={cn('h-14 min-w-[4.5rem] border border-slate-400 px-3 text-center text-base font-medium tabular-nums', CELL_TINTS[(i * spec.cols.length + j) % CELL_TINTS.length])}>
                    {spec.showAnswers ? cell : <span className="text-slate-400">?</span>}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {spec.showAnswers && <p className="mt-2 text-sm text-slate-700">{spec.left} = {spec.right} = <span className="font-semibold text-slate-900">{spec.total}</span></p>}
    </div>
  )
}

// ── Tape diagram ────────────────────────────────────────────────────────────

export function TapeFigure({ spec }: { spec: TapeSpec }) {
  const widest = Math.max(...spec.tapes.map((t) => t.units))
  const show = spec.showAnswers && spec.unit !== null
  return (
    <div role="figure" aria-label={describeMath(spec)} className="mx-auto max-w-xl space-y-2 text-left">
      {spec.tapes.map((t, i) => (
        <div key={i} className="flex items-center gap-3">
          <span className="w-20 shrink-0 text-right text-sm font-semibold text-slate-900 sm:w-28">{t.label}</span>
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <span className="flex h-9" style={{ width: `${(t.units / widest) * 100}%` }}>
              {Array.from({ length: t.units }, (_, k) => (
                <span key={k} className={cn('flex h-full flex-1 items-center justify-center border-y border-r border-slate-500 text-xs font-medium tabular-nums text-slate-800 first:rounded-l-md first:border-l last:rounded-r-md', ['bg-blue-100', 'bg-emerald-100', 'bg-violet-100', 'bg-amber-100'][i % 4])}>
                  {show ? tidy(spec.unit!, 2) : ''}
                </span>
              ))}
            </span>
          </span>
          <span className="w-14 shrink-0 text-sm font-semibold tabular-nums text-slate-900">{show && t.value !== null ? tidy(t.value, 2) : '?'}</span>
        </div>
      ))}
      {show && spec.total !== null && <p className="pt-1 text-center text-sm text-slate-700">Each part is <span className="font-semibold text-slate-900">{tidy(spec.unit!, 2)}</span>; the total is <span className="font-semibold text-slate-900">{tidy(spec.total, 2)}</span>.</p>}
    </div>
  )
}

// ── Probability tree ────────────────────────────────────────────────────────

export function ProbabilityTreeFigure({ spec }: { spec: ProbabilityTreeSpec }) {
  const rowH = 34, colW = 118, x0 = 14, labelW = 66
  const W = x0 + spec.depth * colW + (spec.showAnswers ? 70 : 8)
  const H = spec.leaves * rowH + 12
  let leaf = 0
  type Placed = { node: TreeNode; x: number; y: number; kids: Placed[]; depth: number }
  const place = (node: TreeNode, depth: number): Placed => {
    const kids = node.children.map((k) => place(k, depth + 1))
    const y = kids.length ? (kids[0].y + kids[kids.length - 1].y) / 2 : 6 + rowH / 2 + rowH * leaf++
    return { node, x: x0 + (depth + 1) * colW - labelW, y, kids, depth }
  }
  const placed = spec.roots.map((r) => place(r, 0))
  const rootY = (placed[0].y + placed[placed.length - 1].y) / 2
  const draw = (p: Placed, fromX: number, fromY: number): React.ReactNode => (
    <g key={`${p.depth}-${p.node.label}-${p.y}`}>
      <line x1={fromX} y1={fromY} x2={p.x - 4} y2={p.y} stroke={AXIS} strokeWidth={1.3} />
      <text x={(fromX + p.x) / 2 - 2} y={(fromY + p.y) / 2 + (p.y <= fromY ? -5 : 13)} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={BLUE} style={{ fontFamily: 'inherit' }}>{p.node.text}</text>
      <text x={p.x} y={p.y + 4} fontSize={11.5} fontWeight={600} fill={INK} style={{ fontFamily: 'inherit' }}>{p.node.label.length > 11 ? `${p.node.label.slice(0, 10)}…` : p.node.label}</text>
      {p.kids.map((k) => draw(k, p.x + labelW - 2, p.y))}
      {!p.kids.length && spec.showAnswers && (
        <text x={W - 4} y={p.y + 4} textAnchor="end" fontSize={11} fill={INK} style={{ fontFamily: 'inherit' }}>P = <tspan fontWeight={700}>{p.node.pathText}</tspan></text>
      )}
    </g>
  )
  return (
    <div className="overflow-x-auto" role="figure" aria-label={describeMath(spec)}>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: Math.min(W, 300) }} className="mx-auto block h-auto w-full max-w-[560px]" aria-hidden="true">
        <circle cx={x0} cy={rootY} r={3.5} fill={INK} />
        {placed.map((p) => draw(p, x0, rootY))}
      </svg>
    </div>
  )
}

// ── Place value ─────────────────────────────────────────────────────────────

export function PlaceValueFigure({ spec }: { spec: PlaceValueSpec }) {
  return (
    <div role="figure" aria-label={describeMath(spec)} className="text-center">
      <div className="inline-block max-w-full overflow-x-auto">
        <table className="border-separate border-spacing-0 text-slate-900">
          <tbody>
            <tr>{spec.columns.map((c, i) => <th key={i} className={cn('border-b border-slate-300 px-2.5 pb-1 text-xs font-semibold text-slate-600', c.point && 'border-l-2 border-l-slate-900')}>{c.place}</th>)}</tr>
            <tr>{spec.columns.map((c, i) => <td key={i} className={cn('px-2.5 py-1.5 text-2xl font-semibold tabular-nums', c.point && 'border-l-2 border-l-slate-900', c.digit === '0' && 'text-slate-400')}>{c.digit}</td>)}</tr>
            {spec.base !== 10 && <tr>{spec.columns.map((c, i) => <td key={i} className="px-2.5 text-xs text-slate-500">× {c.weight}</td>)}</tr>}
            <tr>{spec.columns.map((c, i) => <td key={i} className={cn('border-t border-slate-300 px-2.5 pt-1 text-sm tabular-nums text-blue-800', c.point && 'border-l-2 border-l-slate-900')}>{c.value}</td>)}</tr>
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-sm text-slate-700">
        {spec.columns.filter((c) => c.digit !== '0').map((c) => c.value).join(' + ')} = <span className="font-semibold text-slate-900">{spec.base === 10 ? Number(spec.total).toLocaleString('en-US', { maximumFractionDigits: 4 }) : spec.total}</span>
        {spec.base !== 10 && <span className="text-slate-500"> in base 10</span>}
      </p>
    </div>
  )
}

// ── Array ───────────────────────────────────────────────────────────────────

const HILITE = ['bg-emerald-100 border-emerald-500', 'bg-amber-100 border-amber-500', 'bg-violet-100 border-violet-500']

export function ArrayFigure({ spec }: { spec: ArraySpec }) {
  const tintOf = (i: number) => { const h = spec.highlights.findIndex((x) => x.indexes.includes(i)); return h >= 0 ? HILITE[h] : 'bg-white border-slate-400' }
  return (
    <div role="figure" aria-label={describeMath(spec)} className="text-center">
      <div className="inline-flex max-w-full items-end gap-2 overflow-x-auto pb-1">
        {spec.name && <span className="mb-7 shrink-0 font-mono text-sm font-semibold text-slate-700">{spec.name}</span>}
        <div className="flex">
          {spec.cells.map((cell, i) => {
            const here = spec.pointers.filter((p) => p.index === i)
            return (
              <span key={i} className="flex flex-col items-center">
                <span className="flex h-9 flex-col items-center justify-end text-xs font-semibold text-blue-700">
                  {here.length > 0 && <><span className="font-mono">{here.map((p) => p.name).join(', ')}</span><span aria-hidden="true" className="leading-none">↓</span></>}
                </span>
                <span className={cn('-ml-px flex h-11 min-w-[2.75rem] items-center justify-center border px-2 font-mono text-base font-semibold text-slate-900', tintOf(i), i === 0 && 'ml-0 rounded-l-md', i === spec.cells.length - 1 && 'rounded-r-md')}>{cell}</span>
                <span className="mt-1 font-mono text-xs text-slate-500">{i}</span>
              </span>
            )
          })}
        </div>
      </div>
      {spec.highlights.some((h) => h.label) && (
        <p className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-700">
          {spec.highlights.map((h, i) => h.label && <span key={i} className="inline-flex items-center gap-1.5"><span className={cn('h-3 w-3 rounded-sm border', HILITE[i])} aria-hidden="true" />{h.label}</span>)}
        </p>
      )}
    </div>
  )
}
