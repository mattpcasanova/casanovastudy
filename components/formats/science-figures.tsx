"use client"

// Science and economics figures (specs and all the numbers in
// lib/graphs/science-figs.ts). The titration curve and the supply and demand
// graph get controls when `interactive` (never while a question is unanswered);
// controls don't print.

import { useState } from 'react'
import {
  TRENDS, describeScience, equilibrium, shiftResult, titrationPH,
  type CircuitSpec, type DnaSpec, type HeatingCurveSpec, type PeriodicSpec, type Resistor, type Shift, type SupplyDemandSpec, type TitrationSpec,
} from '@/lib/graphs/science-figs'
import { tidy } from '@/lib/graphs/lines'
import { sliderClass } from './math-figures'
import { cn } from '@/lib/utils'

const INK = '#1e293b'
const MUTED = '#64748b'
const AXIS = '#475569'
const BLUE = '#2563eb'
const RED = '#e11d48'
const font = { fontFamily: 'inherit' } as const

// ── Periodic table ──────────────────────────────────────────────────────────

const HILITE = [
  { fill: '#bfdbfe', stroke: '#2563eb' }, { fill: '#a7f3d0', stroke: '#059669' }, { fill: '#ddd6fe', stroke: '#7c3aed' },
  { fill: '#fde68a', stroke: '#d97706' }, { fill: '#fecdd3', stroke: '#e11d48' },
]

export function PeriodicFigure({ spec }: { spec: PeriodicSpec }) {
  const S = 28, left = 26, top = 30
  const rows = spec.fBlock ? 9 : 7
  const W = left + 18 * S + 6, H = top + rows * S + (spec.fBlock ? 10 : 0) + 6
  const tintOf = (z: number) => { const i = spec.highlights.findIndex((h) => h.z.includes(z)); return i >= 0 ? HILITE[i] : null }
  const cy = (row: number) => top + (row - 1) * S + (row > 7 ? 10 : 0)
  const trend = spec.trend ? TRENDS[spec.trend] : null
  return (
    <div role="figure" aria-label={describeScience(spec)}>
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} style={{ minWidth: 520 }} className="mx-auto block h-auto w-full max-w-[680px]" aria-hidden="true">
          <defs>
            <marker id="pt-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={6} markerHeight={6} orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill={RED} /></marker>
          </defs>
          {!trend && Array.from({ length: 18 }, (_, g) => <text key={g} x={left + g * S + S / 2} y={top - 6} textAnchor="middle" fontSize={8} fill={MUTED} style={font}>{g + 1}</text>)}
          {trend && (
            <>
              <line x1={trend.across === 'right' ? left + 4 : left + 18 * S - 4} y1={top - 12} x2={trend.across === 'right' ? left + 18 * S - 4 : left + 4} y2={top - 12} stroke={RED} strokeWidth={2} markerEnd="url(#pt-arrow)" />
              <line x1={left - 12} y1={trend.group === 'down' ? top + 4 : top + 7 * S - 4} x2={left - 12} y2={trend.group === 'down' ? top + 7 * S - 4 : top + 4} stroke={RED} strokeWidth={2} markerEnd="url(#pt-arrow)" />
            </>
          )}
          {spec.cells.map((c) => {
            const t = tintOf(c.z)
            const x = left + (c.col - 1) * S, y = cy(c.row)
            return (
              <g key={c.z}>
                <rect x={x + 0.75} y={y + 0.75} width={S - 1.5} height={S - 1.5} rx={3} fill={t?.fill ?? '#f8fafc'} stroke={t?.stroke ?? '#cbd5e1'} strokeWidth={t ? 1.4 : 0.8} />
                <text x={x + 3.5} y={y + 8.5} fontSize={5.6} fill={MUTED} style={font}>{c.z}</text>
                <text x={x + S / 2} y={y + 20.5} textAnchor="middle" fontSize={10.5} fontWeight={t ? 700 : 500} fill={INK} style={font}>{c.symbol}</text>
              </g>
            )
          })}
        </svg>
      </div>
      {(spec.highlights.length > 0 || trend) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-700">
          {spec.highlights.map((h, i) => (
            <span key={i} className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-sm border" style={{ background: HILITE[i].fill, borderColor: HILITE[i].stroke }} aria-hidden="true" />{h.label}</span>
          ))}
          {trend && <span><span className="font-semibold text-rose-700">{trend.name}</span> increases in the direction of the arrows ({trend.across === 'right' ? 'left to right' : 'right to left'}, and {trend.group === 'down' ? 'down' : 'up'} a group)</span>}
        </div>
      )}
    </div>
  )
}

// ── Titration curve ─────────────────────────────────────────────────────────

export function TitrationFigure({ spec, interactive }: { spec: TitrationSpec; interactive?: boolean }) {
  const end = spec.equivalence.volume * 2
  const [added, setAdded] = useState<number | null>(null)
  const W = 440, H = 286, left = 40, right = W - 14, top = 12, bottom = 240
  const sx = (v: number) => left + (v / end) * (right - left)
  const sy = (ph: number) => bottom - (ph / 14) * (bottom - top)
  const eq = spec.equivalence
  const ticks = [0, 0.5, 1, 1.5, 2].map((k) => k * eq.volume)
  const titrant = spec.input.acid ? 'base' : 'acid'
  const probe = added === null ? null : { v: added, ph: titrationPH(spec.input, added) }
  return (
    <div role="figure" aria-label={describeScience(spec)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[520px]" aria-hidden="true">
        {spec.half && spec.showLabels && <rect x={sx(eq.volume * 0.1)} y={top} width={sx(eq.volume * 0.9) - sx(eq.volume * 0.1)} height={bottom - top} fill="#dbeafe" opacity={0.55} />}
        {[0, 2, 4, 6, 8, 10, 12, 14].map((ph) => (
          <g key={ph}>
            <line x1={left} y1={sy(ph)} x2={right} y2={sy(ph)} stroke={ph === 7 ? '#94a3b8' : '#e2e8f0'} strokeWidth={1} strokeDasharray={ph === 7 ? '4 3' : undefined} />
            <text x={left - 6} y={sy(ph) + 3.5} textAnchor="end" fontSize={10.5} fill={INK} style={font}>{ph}</text>
          </g>
        ))}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={sx(v)} y1={bottom} x2={sx(v)} y2={bottom + 5} stroke={AXIS} />
            <text x={sx(v)} y={bottom + 17} textAnchor="middle" fontSize={10.5} fill={INK} style={font}>{tidy(v, 1)}</text>
          </g>
        ))}
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={AXIS} strokeWidth={1.2} />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={AXIS} strokeWidth={1.2} />
        <text x={(left + right) / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={AXIS} style={font}>Volume of strong {titrant} added (mL)</text>
        <text x={11} y={(top + bottom) / 2} textAnchor="middle" fontSize={11} fill={AXIS} transform={`rotate(-90 11 ${(top + bottom) / 2})`} style={font}>pH</text>
        <polyline points={spec.points.map(([v, ph]) => `${sx(v).toFixed(1)},${sy(ph).toFixed(1)}`).join(' ')} fill="none" stroke={BLUE} strokeWidth={2.2} strokeLinejoin="round" />
        {spec.showLabels && (
          <>
            <line x1={sx(eq.volume)} y1={bottom} x2={sx(eq.volume)} y2={sy(eq.pH)} stroke={RED} strokeWidth={1} strokeDasharray="4 3" />
            <circle cx={sx(eq.volume)} cy={sy(eq.pH)} r={4.5} fill={RED} />
            {spec.half && <circle cx={sx(spec.half.volume)} cy={sy(spec.half.pH)} r={4.5} fill="#059669" />}
            {spec.half && <text x={sx(eq.volume * 0.5)} y={top + 12} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="#1d4ed8" style={font}>buffer region</text>}
          </>
        )}
        {probe && <circle cx={sx(probe.v)} cy={sy(probe.ph)} r={5.5} fill="white" stroke={INK} strokeWidth={2} />}
      </svg>
      {spec.showLabels && (
        <ul className="mx-auto mt-1 flex max-w-xl flex-wrap justify-center gap-x-5 gap-y-1 text-sm text-slate-700">
          <li>Starts at <span className="font-semibold text-slate-900">pH {tidy(spec.startPH, 2)}</span></li>
          {spec.half && <li className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />Half-equivalence: {tidy(spec.half.volume, 2)} mL, <span className="font-semibold text-slate-900">pH = {spec.input.acid ? 'pKa' : '14 − pKb'} = {tidy(spec.half.pH, 2)}</span></li>}
          <li className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-rose-600" aria-hidden="true" />Equivalence point: {tidy(eq.volume, 2)} mL, <span className="font-semibold text-slate-900">pH {tidy(eq.pH, 2)}</span></li>
        </ul>
      )}
      {interactive && spec.showLabels && (
        <div className="mx-auto mt-2 max-w-sm print:hidden">
          <input type="range" className={sliderClass} aria-label={`Volume of ${titrant} added`} min={0} max={end} step={end / 200} value={added ?? 0} onChange={(e) => setAdded(Number(e.target.value))} />
          <p className="mt-1 text-center text-xs text-slate-500">{probe ? <>After <span className="font-semibold text-slate-800">{tidy(probe.v, 1)} mL</span>: <span className="font-semibold text-slate-800">pH {tidy(probe.ph, 2)}</span></> : `Drag to add ${titrant} and read the pH.`}</p>
        </div>
      )}
    </div>
  )
}

// ── Heating curve ───────────────────────────────────────────────────────────

export function HeatingCurveFigure({ spec }: { spec: HeatingCurveSpec }) {
  const W = 440, H = 262, left = 52, right = W - 14, top = 14, bottom = 222
  const sy = (t: number) => bottom - ((t - spec.from) / (spec.to - spec.from)) * (bottom - top)
  const xs = [0, 0.15, 0.37, 0.56, 0.84, 1].map((f) => left + f * (right - left))
  const temps = [spec.from, spec.melting, spec.melting, spec.boiling, spec.boiling, spec.to]
  const order = spec.cooling ? [...temps].reverse() : temps
  const names = spec.cooling ? ['Gas', 'Condensing', 'Liquid', 'Freezing', 'Solid'] : ['Solid', 'Melting', 'Liquid', 'Boiling', 'Gas']
  return (
    <div role="figure" aria-label={describeScience(spec)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[520px]" aria-hidden="true">
        {[spec.melting, spec.boiling].map((t) => (
          <g key={t}>
            <line x1={left} y1={sy(t)} x2={right} y2={sy(t)} stroke="#e2e8f0" strokeDasharray="4 3" />
            <text x={left - 6} y={sy(t) + 3.5} textAnchor="end" fontSize={10.5} fill={INK} style={font}>{spec.showLabels ? `${tidy(t, 1)}°` : ''}</text>
          </g>
        ))}
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={AXIS} strokeWidth={1.2} />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={AXIS} strokeWidth={1.2} />
        <text x={(left + right) / 2} y={H - 8} textAnchor="middle" fontSize={11} fill={AXIS} style={font}>Heat {spec.cooling ? 'removed' : 'added'} →</text>
        <text x={12} y={(top + bottom) / 2} textAnchor="middle" fontSize={11} fill={AXIS} transform={`rotate(-90 12 ${(top + bottom) / 2})`} style={font}>Temperature</text>
        <polyline points={xs.map((x, i) => `${x},${sy(order[i])}`).join(' ')} fill="none" stroke={RED} strokeWidth={2.4} strokeLinejoin="round" />
        {names.map((name, i) => {
          const x = (xs[i] + xs[i + 1]) / 2, y = (sy(order[i]) + sy(order[i + 1])) / 2
          const flat = i % 2 === 1
          return (
            <text key={i} x={x} y={flat ? y - 8 : y + (spec.cooling ? -10 : 4)} dx={flat ? 0 : spec.cooling ? 12 : 12} textAnchor={flat ? 'middle' : 'start'} fontSize={11} fontWeight={600} fill={INK} style={font}>
              {spec.showLabels ? name : 'ABCDE'[i]}
            </text>
          )
        })}
      </svg>
      {spec.showLabels && <p className="mt-1 text-center text-xs text-slate-600">On the flat parts the temperature holds steady: the energy goes into changing the state, not into heating{spec.substance ? ` the ${spec.substance}` : ''}.</p>}
    </div>
  )
}

// ── Circuit ─────────────────────────────────────────────────────────────────

function Zigzag({ x, y, w = 44 }: { x: number; y: number; w?: number }) {
  const step = w / 6
  const pts = [`${x - w / 2},${y}`, ...Array.from({ length: 6 }, (_, i) => `${x - w / 2 + step * (i + 0.5)},${y + (i % 2 ? 7 : -7)}`), `${x + w / 2},${y}`]
  return <polyline points={pts.join(' ')} fill="none" stroke={INK} strokeWidth={1.8} strokeLinejoin="round" />
}

export function CircuitFigure({ spec }: { spec: CircuitSpec }) {
  const W = 440, H = 236, L = 56, R = W - 30, T = 78, B = 206
  const n = spec.parts.length
  const centers = spec.parts.map((_, i) => L + 40 + ((R - L - 80) * (i + 0.5)) / n)
  const half = (p: CircuitSpec['parts'][number]) => (p.type === 'resistor' ? 22 : 40)
  // The top wire runs between the parts, leaving a gap where each one sits.
  const wires: Array<[number, number]> = []
  let x = L
  spec.parts.forEach((p, i) => { wires.push([x, centers[i] - half(p)]); x = centers[i] + half(p) })
  wires.push([x, R])
  const all: Resistor[] = spec.parts.flatMap((p) => (p.type === 'resistor' ? [p.r] : p.branches))
  const mid = (T + B) / 2
  return (
    <div role="figure" aria-label={describeScience(spec)}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[520px]" aria-hidden="true" stroke={INK} strokeWidth={1.8} fill="none">
        {wires.map(([a, b], i) => <line key={i} x1={a} y1={T} x2={b} y2={T} />)}
        <polyline points={`${R},${T} ${R},${B} ${L},${B} ${L},${mid + 9}`} />
        <line x1={L} y1={T} x2={L} y2={mid - 9} />
        {/* Battery: the long plate is the positive side */}
        <line x1={L - 15} y1={mid - 9} x2={L + 15} y2={mid - 9} />
        <line x1={L - 8} y1={mid + 9} x2={L + 8} y2={mid + 9} strokeWidth={3.4} />
        <text x={L - 22} y={mid + 4} textAnchor="end" fontSize={12} fontWeight={700} fill={INK} stroke="none" style={font}>{tidy(spec.volts)} V</text>
        <text x={L + 22} y={mid - 12} fontSize={11} fill={MUTED} stroke="none" style={font}>+</text>
        {spec.parts.map((p, i) => {
          const cx = centers[i]
          if (p.type === 'resistor') return (
            <g key={i}>
              <Zigzag x={cx} y={T} />
              <text x={cx} y={T - 15} textAnchor="middle" fontSize={11.5} fontWeight={600} fill={INK} stroke="none" style={font}>{p.r.name} = {tidy(p.r.ohms)} Ω</text>
            </g>
          )
          const m = p.branches.length
          const ys = p.branches.map((_, j) => T + (j - (m - 1) / 2) * 44)
          return (
            <g key={i}>
              <line x1={cx - 40} y1={ys[0]} x2={cx - 40} y2={ys[m - 1]} />
              <line x1={cx + 40} y1={ys[0]} x2={cx + 40} y2={ys[m - 1]} />
              {p.branches.map((b, j) => (
                <g key={j}>
                  <line x1={cx - 40} y1={ys[j]} x2={cx - 20} y2={ys[j]} />
                  <line x1={cx + 20} y1={ys[j]} x2={cx + 40} y2={ys[j]} />
                  <Zigzag x={cx} y={ys[j]} w={40} />
                  <text x={cx} y={ys[j] - 12} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={INK} stroke="none" style={font}>{b.name} = {tidy(b.ohms)} Ω</text>
                </g>
              ))}
              <circle cx={cx - 40} cy={T} r={2.6} fill={INK} />
              <circle cx={cx + 40} cy={T} r={2.6} fill={INK} />
            </g>
          )
        })}
      </svg>
      {spec.showAnswers && (
        <div className="mx-auto mt-1 max-w-md text-sm">
          <p className="text-center text-slate-700">Total resistance <span className="font-semibold text-slate-900">{tidy(spec.total, 3)} Ω</span> · current from the battery <span className="font-semibold text-slate-900">{tidy(spec.amps, 3)} A</span></p>
          <table className="mx-auto mt-1.5 text-left text-slate-800">
            <tbody>
              {all.map((r, i) => (
                <tr key={i}>
                  <th className="pr-4 font-semibold">{r.name}</th>
                  <td className="pr-4 tabular-nums">{tidy(r.volts, 3)} V</td>
                  <td className="tabular-nums">{tidy(r.amps, 3)} A</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── DNA ─────────────────────────────────────────────────────────────────────

const BASE: Record<string, string> = { A: 'bg-emerald-100 text-emerald-900', T: 'bg-rose-100 text-rose-900', U: 'bg-violet-100 text-violet-900', G: 'bg-amber-100 text-amber-900', C: 'bg-blue-100 text-blue-900' }

export function DnaFigure({ spec }: { spec: DnaSpec }) {
  const codons = !!spec.mrna
  const Strand = ({ seq, label, ends }: { seq: string; label: string; ends: [string, string] }) => (
    <div className="flex items-center gap-2">
      <span className="w-[5.5rem] shrink-0 text-right text-xs font-semibold text-slate-600">{label}</span>
      <span className="text-xs text-slate-500">{ends[0]}</span>
      <span className="flex">
        {seq.split('').map((b, i) => <span key={i} className={cn('flex h-7 w-6 items-center justify-center font-mono text-sm font-semibold', BASE[b], codons && i % 3 === 0 && i > 0 && 'ml-1.5')}>{b}</span>)}
      </span>
      <span className="text-xs text-slate-500">{ends[1]}</span>
    </div>
  )
  return (
    <div role="figure" aria-label={describeScience(spec)} className="overflow-x-auto">
      <div className="mx-auto inline-flex min-w-full flex-col items-start gap-1.5 sm:items-center">
        <div className="space-y-1.5">
          <Strand seq={spec.coding} label="DNA coding" ends={['5′', '3′']} />
          <Strand seq={spec.template} label="DNA template" ends={['3′', '5′']} />
          {spec.mrna && <Strand seq={spec.mrna} label="mRNA" ends={['5′', '3′']} />}
          {spec.protein && (
            <div className="flex items-center gap-2">
              <span className="w-[5.5rem] shrink-0 text-right text-xs font-semibold text-slate-600">Amino acids</span>
              <span className="w-[0.9rem]" aria-hidden="true" />
              <span className="flex">
                {spec.protein.map((aa, i) => <span key={i} className={cn('flex h-7 w-[4.5rem] items-center justify-center rounded-md text-xs font-semibold', aa === 'Stop' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-800', i > 0 && 'ml-1.5')}>{aa}</span>)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Supply and demand ───────────────────────────────────────────────────────

export function SupplyDemandFigure({ spec, interactive }: { spec: SupplyDemandSpec; interactive?: boolean }) {
  const [demand, setDemand] = useState<Shift>(spec.demand)
  const [supply, setSupply] = useState<Shift>(spec.supply)
  const W = 360, H = 300, left = 44, right = W - 16, top = 14, bottom = 258
  const sx = (q: number) => left + (q / 12.5) * (right - left)
  const sy = (p: number) => bottom - (p / 12.5) * (bottom - top)
  const dLine = (d: Shift) => { const k = 10 + d * 2.5; const q1 = Math.max(0.6, k - 11.8), q2 = Math.min(11.8, k - 0.6); return { x1: sx(q1), y1: sy(k - q1), x2: sx(q2), y2: sy(k - q2) } }
  const sLine = (s: Shift) => { const k = s * 2.5; const q1 = Math.max(0.6, k + 0.6), q2 = Math.min(11.8, k + 11.8); return { x1: sx(q1), y1: sy(q1 - k), x2: sx(q2), y2: sy(q2 - k) } }
  const e1 = equilibrium(0, 0), e2 = equilibrium(demand, supply)
  const moved = demand !== 0 || supply !== 0
  const result = shiftResult(demand, supply)
  const control = spec.control ? { price: e2.p + (spec.control === 'floor' ? 2 : -2) } : null
  const qd = control ? 10 + demand * 2.5 - control.price : 0
  const qs = control ? control.price + supply * 2.5 : 0
  const Guide = ({ e, label, color }: { e: { q: number; p: number }; label: string; color: string }) => (
    <g>
      <line x1={left} y1={sy(e.p)} x2={sx(e.q)} y2={sy(e.p)} stroke={color} strokeDasharray="4 3" />
      <line x1={sx(e.q)} y1={bottom} x2={sx(e.q)} y2={sy(e.p)} stroke={color} strokeDasharray="4 3" />
      <circle cx={sx(e.q)} cy={sy(e.p)} r={4.2} fill={color} />
      <text x={left - 5} y={sy(e.p) + 3.5} textAnchor="end" fontSize={10.5} fontWeight={600} fill={color} style={font}>P{label}</text>
      <text x={sx(e.q)} y={bottom + 14} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={color} style={font}>Q{label}</text>
    </g>
  )
  const end = (l: { x2: number; y2: number }, text: string, color: string, dy = 0) => <text x={l.x2 + 3} y={l.y2 + dy} fontSize={11.5} fontWeight={700} fill={color} style={font}>{text}</text>
  const shiftButton = 'h-9 rounded-lg px-2.5 text-xs font-semibold ring-1 ring-inset ring-slate-300 bg-white text-slate-800 hover:bg-slate-50 aria-pressed:bg-blue-600 aria-pressed:text-white aria-pressed:ring-blue-600'
  return (
    <div role="figure" aria-label={describeScience({ ...spec, demand, supply })}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full max-w-[400px]" aria-hidden="true">
        <line x1={left} y1={top} x2={left} y2={bottom} stroke={AXIS} strokeWidth={1.2} />
        <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={AXIS} strokeWidth={1.2} />
        <text x={(left + right) / 2} y={H - 6} textAnchor="middle" fontSize={11} fill={AXIS} style={font}>{spec.xLabel || 'Quantity'}</text>
        <text x={11} y={(top + bottom) / 2} textAnchor="middle" fontSize={11} fill={AXIS} transform={`rotate(-90 11 ${(top + bottom) / 2})`} style={font}>{spec.yLabel || 'Price'}</text>
        <line {...dLine(0)} stroke={BLUE} strokeWidth={2} opacity={demand ? 0.4 : 1} />
        <line {...sLine(0)} stroke={RED} strokeWidth={2} opacity={supply ? 0.4 : 1} />
        {end(dLine(0), demand ? 'D₁' : 'D', BLUE, 4)}
        {end(sLine(0), supply ? 'S₁' : 'S', RED, 4)}
        {demand !== 0 && <><line {...dLine(demand)} stroke={BLUE} strokeWidth={2.2} />{end(dLine(demand), 'D₂', BLUE, 4)}</>}
        {supply !== 0 && <><line {...sLine(supply)} stroke={RED} strokeWidth={2.2} />{end(sLine(supply), 'S₂', RED, 4)}</>}
        {moved && <Guide e={e1} label="₁" color={MUTED} />}
        <Guide e={e2} label={moved ? '₂' : ''} color={INK} />
        {control && (
          <>
            <line x1={left} y1={sy(control.price)} x2={right} y2={sy(control.price)} stroke="#d97706" strokeWidth={2} />
            <text x={right} y={sy(control.price) - 5} textAnchor="end" fontSize={10.5} fontWeight={700} fill="#b45309" style={font}>Price {spec.control}</text>
            <line x1={sx(Math.min(qd, qs))} y1={sy(control.price) + 6} x2={sx(Math.max(qd, qs))} y2={sy(control.price) + 6} stroke="#d97706" strokeWidth={4} opacity={0.45} />
            <text x={sx((qd + qs) / 2)} y={sy(control.price) + 19} textAnchor="middle" fontSize={10} fontWeight={700} fill="#b45309" style={font}>{spec.control === 'floor' ? 'surplus' : 'shortage'}</text>
          </>
        )}
      </svg>
      {spec.showResult && moved && <p className="mt-1 text-center text-sm text-slate-700">Price <span className="font-semibold text-slate-900">{result.price}</span>; quantity <span className="font-semibold text-slate-900">{result.quantity}</span>.</p>}
      {spec.showResult && control && <p className="mt-1 text-center text-sm text-slate-700">{spec.control === 'floor' ? 'Above equilibrium, sellers offer more than buyers want: a surplus.' : 'Below equilibrium, buyers want more than sellers offer: a shortage.'}</p>}
      {interactive && spec.showResult && (
        <div className="mx-auto mt-2 flex max-w-sm flex-wrap items-center justify-center gap-1.5 print:hidden" role="group" aria-label="Shift the curves">
          <button type="button" className={shiftButton} aria-pressed={demand === -1} onClick={() => setDemand(demand === -1 ? 0 : -1)}>Demand ←</button>
          <button type="button" className={shiftButton} aria-pressed={demand === 1} onClick={() => setDemand(demand === 1 ? 0 : 1)}>Demand →</button>
          <button type="button" className={shiftButton} aria-pressed={supply === -1} onClick={() => setSupply(supply === -1 ? 0 : -1)}>Supply ←</button>
          <button type="button" className={shiftButton} aria-pressed={supply === 1} onClick={() => setSupply(supply === 1 ? 0 : 1)}>Supply →</button>
        </div>
      )}
    </div>
  )
}
