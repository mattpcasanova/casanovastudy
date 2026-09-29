"use client"

// Draws ```graph fences (lib/graphs/spec.ts) as SVG: coordinate planes,
// geometry figures, scatterplots, bar charts, histograms, dot plots, box plots
// and number lines. Everything is drawn from the spec's numbers, so the figure
// matches the question exactly. A spec that can't be parsed shows a quiet
// placeholder instead of breaking the page.

import { memo, useId, useMemo, useRef, type ReactNode } from 'react'
import { LineChart, MessageCircleQuestion } from 'lucide-react'
import { cn } from '@/lib/utils'
import { evaluate, type Expr } from '@/lib/graphs/expr'
import { boxExit, layoutDiagram } from '@/lib/graphs/diagram'
import {
  describeGraph, parseGraphSpec,
  type BarSpec, type BoxplotSpec, type DiagramSpec, type Color, type DotplotSpec, type GeometrySpec, type GraphSpec,
  type HistogramSpec, type NumberlineSpec, type PlaneSpec, type Pt, type ScatterSpec,
} from '@/lib/graphs/spec'
import { useDesmos } from '@/components/desmos/desmos-context'
import { useExplain } from '@/components/explain/explain-context'
import { LewisFigure, MoleculeFigure, ReactionFigure, VseprFigure } from './chem-figures'
import { PedigreeFigure, PunnettFigure } from './bio-figures'
import { FreeBodyFigure } from './physics-figures'

const frame = 'not-prose my-5 rounded-xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5'

const INK = '#1e293b' // slate-800
const MUTED = '#64748b' // slate-500
const GRID = '#e2e8f0' // slate-200
const AXIS = '#475569' // slate-600
const PALETTE: Record<Color, string> = {
  blue: '#2563eb', red: '#e11d48', green: '#059669', orange: '#d97706', purple: '#7c3aed', gray: '#64748b',
}
const CYCLE: Color[] = ['blue', 'red', 'green', 'purple', 'orange']
const colorOf = (c: Color | undefined, i: number) => PALETTE[c ?? CYCLE[i % CYCLE.length]]

const W = 440
const FONT = 13

// ── Number helpers ──────────────────────────────────────────────────────────

function niceStep(span: number, target = 8): number {
  const raw = span / target
  const mag = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / mag
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * mag
}

function ticks(lo: number, hi: number, step: number): number[] {
  const out: number[] = []
  const start = Math.ceil(lo / step - 1e-9) * step
  for (let v = start; v <= hi + step * 1e-9 && out.length < 200; v += step) out.push(Math.abs(v) < step * 1e-9 ? 0 : v)
  return out
}

function fmt(v: number): string {
  if (Math.abs(v) >= 1e5 || (Math.abs(v) < 1e-3 && v !== 0)) return v.toExponential(1)
  return String(Number(v.toFixed(3)))
}

/** A readable range that covers [lo, hi], starting at 0 when data are near it. */
function niceRange(lo: number, hi: number, zero = true): [number, number] {
  if (zero && lo >= 0 && lo <= hi * 0.35) lo = 0
  if (hi - lo < 1e-9) { lo -= 1; hi += 1 }
  const step = niceStep(hi - lo, 6)
  return [Math.floor(lo / step) * step, Math.ceil(hi / step) * step]
}

function cleanLabel(s: string): string {
  return s.replace(/\${1,2}/g, '').replace(/\\circ|\^\\circ|\^\{\\circ\}/g, '°').replace(/\*\*/g, '')
}

// ── SVG bits ────────────────────────────────────────────────────────────────

function Label({ x, y, children, anchor = 'middle', size = FONT, color = INK, weight = 500, baseline = 'middle' }: {
  x: number; y: number; children: ReactNode; anchor?: 'start' | 'middle' | 'end'; size?: number; color?: string; weight?: number
  baseline?: 'middle' | 'hanging' | 'auto'
}) {
  return (
    <text
      x={x} y={y} textAnchor={anchor} dominantBaseline={baseline} fontSize={size} fontWeight={weight} fill={color}
      stroke="#fff" strokeWidth={3.5} strokeLinejoin="round" paintOrder="stroke"
      style={{ fontFamily: 'inherit' }}
    >
      {children}
    </text>
  )
}

function ArrowDefs({ id }: { id: string }) {
  return (
    <defs>
      <marker id={`${id}-arrow`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
        <path d="M0,1 L9,5 L0,9 z" fill={AXIS} />
      </marker>
    </defs>
  )
}

/** Samples y = f(x) into path segments, breaking at gaps and asymptotes. */
function samplePath(expr: Expr, x0: number, x1: number, sx: (x: number) => number, sy: (y: number) => number, yLo: number, yHi: number): string {
  const N = 480
  const span = yHi - yLo
  let d = ''
  let pen = false
  let prev: number | null = null
  for (let i = 0; i <= N; i++) {
    const x = x0 + ((x1 - x0) * i) / N
    const y = evaluate(expr, x)
    const bad = !Number.isFinite(y) || Math.abs(y) > 1e7
    // A huge jump across the window between neighbors = an asymptote, not a line.
    const jump = prev !== null && !bad && Math.abs(y - prev) > span * 3 && (y - yLo) * (prev - yLo) !== 0 && Math.sign(y - (yLo + yHi) / 2) !== Math.sign(prev - (yLo + yHi) / 2)
    if (bad || jump) { pen = false; prev = bad ? null : y; if (bad) continue }
    const cy = Math.max(yLo - span * 2, Math.min(yHi + span * 2, y))
    d += `${pen ? 'L' : 'M'}${sx(x).toFixed(2)},${sy(cy).toFixed(2)}`
    pen = true
    prev = y
  }
  return d
}

// ── Coordinate plane ────────────────────────────────────────────────────────

interface Frame {
  w: number; h: number
  sx: (x: number) => number
  sy: (y: number) => number
  x: [number, number]; y: [number, number]
  left: number; right: number; top: number; bottom: number
}

function makeFrame(x: [number, number], y: [number, number], opts: { equal?: boolean; pad?: [number, number, number, number]; width?: number }): Frame {
  const [pt, pr, pb, pl] = opts.pad ?? [14, 18, 14, 14]
  const w = opts.width ?? W
  const iw = w - pl - pr
  const xs = x[1] - x[0]
  const ys = y[1] - y[0]
  let ih = opts.equal ? (iw * ys) / xs : iw * 0.62
  ih = Math.max(180, Math.min(420, ih))
  const h = ih + pt + pb
  return {
    w, h, x, y, left: pl, right: pl + iw, top: pt, bottom: pt + ih,
    sx: (v) => pl + ((v - x[0]) / xs) * iw,
    sy: (v) => pt + ih - ((v - y[0]) / ys) * ih,
  }
}

function PlaneFigure({ spec }: { spec: PlaneSpec }) {
  const id = useId().replace(/:/g, '')
  const hasAxisLabels = !!(spec.xLabel || spec.yLabel)
  // With the y-axis on the left edge its tick labels sit left of it, so a y-axis title needs more room.
  const padLeft = spec.yLabel ? (spec.x[0] >= 0 ? 58 : 30) : hasAxisLabels ? 30 : 16
  const f = makeFrame(spec.x, spec.y, { equal: true, pad: [16, 20, hasAxisLabels ? 30 : 16, padLeft] })
  const { sx, sy } = f
  const xStep = spec.grid && spec.grid > 0 ? spec.grid : niceStep(spec.x[1] - spec.x[0], 10)
  const yStep = spec.grid && spec.grid > 0 ? spec.grid : niceStep(spec.y[1] - spec.y[0], 10)
  const xTicks = ticks(spec.x[0], spec.x[1], xStep)
  const yTicks = ticks(spec.y[0], spec.y[1], yStep)
  // Label every tick unless crowded.
  const xEvery = xTicks.length > 14 ? 2 : 1
  const yEvery = yTicks.length > 14 ? 2 : 1
  const axX = spec.y[0] <= 0 && spec.y[1] >= 0 ? sy(0) : f.bottom // horizontal axis position
  const axY = spec.x[0] <= 0 && spec.x[1] >= 0 ? sx(0) : f.left // vertical axis position
  const plotted = new Set(spec.plots.map((p) => p.source.replace(/\s+/g, '')))

  const plotLabels = spec.plots.map((p) => {
    if (!p.label) return null
    // Put the label near the right end, where the curve is still in view.
    const [d0, d1] = p.domain ? [Math.max(p.domain[0], spec.x[0]), Math.min(p.domain[1], spec.x[1])] : spec.x
    for (let i = 0; i <= 40; i++) {
      const x = d1 - ((d1 - d0) * (i + 2)) / 48
      const y = evaluate(p.expr, x)
      const margin = (spec.y[1] - spec.y[0]) * 0.06
      if (Number.isFinite(y) && y > spec.y[0] + margin && y < spec.y[1] - margin) return { x: sx(x), y: sy(y) - 12 }
    }
    return null
  })

  const lineThrough = (a: Pt, b: Pt): [Pt, Pt] => {
    const dx = b[0] - a[0]
    const dy = b[1] - a[1]
    const big = (Math.abs(spec.x[1] - spec.x[0]) + Math.abs(spec.y[1] - spec.y[0])) * 4 / (Math.hypot(dx, dy) || 1)
    return [[a[0] - dx * big, a[1] - dy * big], [b[0] + dx * big, b[1] + dy * big]]
  }

  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={describeGraph(spec)}>
      <ArrowDefs id={id} />
      <defs>
        {spec.vectors.map((v, i) => (
          <marker key={i} id={`${id}-vec${i}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" markerUnits="userSpaceOnUse" orient="auto">
            <path d="M0,0.5 L10,5 L0,9.5 z" fill={colorOf(v.color, i)} />
          </marker>
        ))}
      </defs>
      <clipPath id={`${id}-clip`}><rect x={f.left} y={f.top} width={f.right - f.left} height={f.bottom - f.top} /></clipPath>

      {spec.grid !== 0 && (
        <g stroke={GRID} strokeWidth={1}>
          {xTicks.map((t) => <line key={`gx${t}`} x1={sx(t)} x2={sx(t)} y1={f.top} y2={f.bottom} />)}
          {yTicks.map((t) => <line key={`gy${t}`} x1={f.left} x2={f.right} y1={sy(t)} y2={sy(t)} />)}
        </g>
      )}

      <g clipPath={`url(#${id}-clip)`}>
        {spec.shades.map((s, i) => {
          const color = colorOf(s.color, i)
          if (s.axis === 'x') {
            const v = evaluate(s.expr, 0)
            const x0 = s.op.startsWith('>') ? sx(v) : f.left
            const x1 = s.op.startsWith('>') ? f.right : sx(v)
            return (
              <g key={`s${i}`}>
                <rect x={Math.min(x0, x1)} y={f.top} width={Math.abs(x1 - x0)} height={f.bottom - f.top} fill={color} fillOpacity={0.14} />
                <line x1={sx(v)} x2={sx(v)} y1={f.top} y2={f.bottom} stroke={color} strokeWidth={2} strokeDasharray={s.op.length === 1 ? '6 5' : undefined} />
              </g>
            )
          }
          const N = 240
          const edge = s.op.startsWith('>') ? spec.y[1] + (spec.y[1] - spec.y[0]) : spec.y[0] - (spec.y[1] - spec.y[0])
          let d = ''
          for (let k = 0; k <= N; k++) {
            const x = spec.x[0] + ((spec.x[1] - spec.x[0]) * k) / N
            let y = evaluate(s.expr, x)
            if (!Number.isFinite(y)) y = edge
            y = Math.max(spec.y[0] - (spec.y[1] - spec.y[0]), Math.min(spec.y[1] + (spec.y[1] - spec.y[0]), y))
            d += `${k === 0 ? 'M' : 'L'}${sx(x).toFixed(2)},${sy(y).toFixed(2)}`
          }
          d += `L${sx(spec.x[1])},${sy(edge)}L${sx(spec.x[0])},${sy(edge)}Z`
          const boundary = samplePath(s.expr, spec.x[0], spec.x[1], sx, sy, spec.y[0], spec.y[1])
          return (
            <g key={`s${i}`}>
              <path d={d} fill={color} fillOpacity={0.14} />
              {!plotted.has(s.source.replace(/\s+/g, '')) && (
                <path d={boundary} fill="none" stroke={color} strokeWidth={2} strokeDasharray={s.op.length === 1 ? '6 5' : undefined} />
              )}
            </g>
          )
        })}
      </g>

      {/* Axes */}
      <line x1={f.left} x2={f.right} y1={axX} y2={axX} stroke={AXIS} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} markerStart={spec.x[0] < 0 ? `url(#${id}-arrow)` : undefined} />
      <line x1={axY} x2={axY} y1={f.bottom} y2={f.top} stroke={AXIS} strokeWidth={1.4} markerEnd={`url(#${id}-arrow)`} markerStart={spec.y[0] < 0 ? `url(#${id}-arrow)` : undefined} />
      <g>
        {xTicks.filter((t, i) => t !== 0 && i % xEvery === 0 && sx(t) < f.right - 8).map((t) => (
          <g key={`tx${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={axX - 3} y2={axX + 3} stroke={AXIS} />
            <Label x={sx(t)} y={axX + 13} size={11} color={MUTED} weight={400}>{fmt(t)}</Label>
          </g>
        ))}
        {yTicks.filter((t, i) => t !== 0 && i % yEvery === 0 && sy(t) > f.top + 8).map((t) => (
          <g key={`ty${t}`}>
            <line x1={axY - 3} x2={axY + 3} y1={sy(t)} y2={sy(t)} stroke={AXIS} />
            <Label x={axY - 6} y={sy(t)} anchor="end" size={11} color={MUTED} weight={400}>{fmt(t)}</Label>
          </g>
        ))}
        {axX !== f.bottom && axY !== f.left && <Label x={axY - 6} y={axX + 12} anchor="end" size={11} color={MUTED} weight={400}>0</Label>}
      </g>
      {spec.xLabel
        ? <Label x={(f.left + f.right) / 2} y={f.h - 8} size={12} color={AXIS}>{cleanLabel(spec.xLabel)}</Label>
        : <Label x={f.right + 2} y={axX - 12} anchor="end" size={13} color={AXIS} weight={600}>x</Label>}
      {spec.yLabel
        ? <text x={12} y={(f.top + f.bottom) / 2} textAnchor="middle" fontSize={12} fill={AXIS} transform={`rotate(-90 12 ${(f.top + f.bottom) / 2})`}>{cleanLabel(spec.yLabel)}</text>
        : <Label x={axY + 10} y={f.top + 4} anchor="start" size={13} color={AXIS} weight={600}>y</Label>}

      <g clipPath={`url(#${id}-clip)`}>
        {spec.vlines.map((v, i) => (
          <line key={`v${i}`} x1={sx(v.x)} x2={sx(v.x)} y1={f.top} y2={f.bottom} stroke={colorOf(v.color, i + 2)} strokeWidth={2} strokeDasharray={v.dashed ? '6 5' : undefined} />
        ))}
        {spec.polygons.map((p, i) => (
          <polygon key={`pg${i}`} points={p.pts.map(([x, y]) => `${sx(x)},${sy(y)}`).join(' ')} fill={colorOf(p.color, i)} fillOpacity={0.1} stroke={colorOf(p.color, i)} strokeWidth={2} strokeDasharray={p.dashed ? '6 5' : undefined} strokeLinejoin="round" />
        ))}
        {spec.circles.map((c, i) => (
          <ellipse key={`c${i}`} cx={sx(c.center[0])} cy={sy(c.center[1])} rx={Math.abs(sx(c.r) - sx(0))} ry={Math.abs(sy(c.r) - sy(0))} fill="none" stroke={colorOf(c.color, i)} strokeWidth={2} strokeDasharray={c.dashed ? '6 5' : undefined} />
        ))}
        {spec.lines.map((l, i) => {
          const [a, b] = lineThrough(l.from, l.to)
          return <line key={`l${i}`} x1={sx(a[0])} y1={sy(a[1])} x2={sx(b[0])} y2={sy(b[1])} stroke={colorOf(l.color, i)} strokeWidth={2.2} strokeDasharray={l.dashed ? '6 5' : undefined} />
        })}
        {spec.segments.map((l, i) => (
          <line key={`sg${i}`} x1={sx(l.from[0])} y1={sy(l.from[1])} x2={sx(l.to[0])} y2={sy(l.to[1])} stroke={colorOf(l.color ?? 'gray', i)} strokeWidth={2.2} strokeDasharray={l.dashed ? '6 5' : undefined} strokeLinecap="round" />
        ))}
        {spec.vectors.map((v, i) => {
          const color = colorOf(v.color, i)
          const [x1, y1, x2, y2] = [sx(v.from[0]), sy(v.from[1]), sx(v.to[0]), sy(v.to[1])]
          return (
            <g key={`vec${i}`}>
              {v.components && (
                <g stroke={color} strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="5 4">
                  <line x1={x1} y1={y1} x2={x2} y2={y1} />
                  <line x1={x2} y1={y1} x2={x2} y2={y2} />
                </g>
              )}
              <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.6} strokeLinecap="round" markerEnd={`url(#${id}-vec${i})`} />
            </g>
          )
        })}
        {spec.plots.map((p, i) => {
          const [d0, d1] = p.domain ? [Math.max(p.domain[0], spec.x[0]), Math.min(p.domain[1], spec.x[1])] : spec.x
          return (
            <path key={`p${i}`} d={samplePath(p.expr, d0, d1, sx, sy, spec.y[0], spec.y[1])} fill="none" stroke={colorOf(p.color, i)} strokeWidth={2.4} strokeDasharray={p.dashed ? '7 5' : undefined} strokeLinejoin="round" strokeLinecap="round" />
          )
        })}
      </g>

      {spec.plots.map((p, i) => {
        const at = plotLabels[i]
        return at && p.label ? <Label key={`pl${i}`} x={Math.min(at.x, f.right - 10)} y={Math.max(at.y, f.top + 8)} color={colorOf(p.color, i)} weight={600} anchor="end">{cleanLabel(p.label)}</Label> : null
      })}
      {spec.segments.map((l, i) => l.label ? (
        <Label key={`sgl${i}`} x={(sx(l.from[0]) + sx(l.to[0])) / 2 + 8} y={(sy(l.from[1]) + sy(l.to[1])) / 2 - 8} anchor="start">{cleanLabel(l.label)}</Label>
      ) : null)}
      {spec.lines.map((l, i) => l.label ? (
        <Label key={`ll${i}`} x={sx(l.to[0]) + 8} y={sy(l.to[1]) - 8} anchor="start" color={colorOf(l.color, i)} weight={600}>{cleanLabel(l.label)}</Label>
      ) : null)}
      {spec.vlines.map((v, i) => v.label ? <Label key={`vl${i}`} x={sx(v.x) + 5} y={f.top + 10} anchor="start" color={colorOf(v.color, i + 2)}>{cleanLabel(v.label)}</Label> : null)}
      {spec.polygons.map((p, i) => {
        if (!p.label) return null
        const cx = p.pts.reduce((s, q) => s + q[0], 0) / p.pts.length
        const cy = p.pts.reduce((s, q) => s + q[1], 0) / p.pts.length
        return <Label key={`pgl${i}`} x={sx(cx)} y={sy(cy)} color={colorOf(p.color, i)} weight={600}>{cleanLabel(p.label)}</Label>
      })}
      {spec.points.map((p, i) => {
        const x = sx(p.at[0])
        const y = sy(p.at[1])
        if (x < f.left - 1 || x > f.right + 1 || y < f.top - 1 || y > f.bottom + 1) return null
        const color = p.color ? PALETTE[p.color] : INK
        return (
          <g key={`pt${i}`}>
            <circle cx={x} cy={y} r={4.2} fill={p.open ? '#fff' : color} stroke={color} strokeWidth={2} />
            {p.label && <Label x={x + 7} y={y - 10} anchor={x > f.right - 60 ? 'end' : 'start'}>{cleanLabel(p.label)}</Label>}
          </g>
        )
      })}
      {spec.vectors.map((v, i) => v.label ? (
        <Label key={`vl${i}`} x={sx(v.to[0]) + (v.to[0] >= v.from[0] ? 8 : -8)} y={sy(v.to[1]) - 10} anchor={v.to[0] >= v.from[0] ? 'start' : 'end'} color={colorOf(v.color, i)} weight={700}>{cleanLabel(v.label)}</Label>
      ) : null)}
      {spec.texts.map((t, i) => <Label key={`t${i}`} x={sx(t.at[0])} y={sy(t.at[1])}>{cleanLabel(t.text)}</Label>)}
    </svg>
  )
}

// ── Geometry ────────────────────────────────────────────────────────────────

function GeometryFigure({ spec }: { spec: GeometrySpec }) {
  const pts = new Map(spec.points.map((p) => [p.name, p.at] as const))
  const all: Pt[] = [...spec.points.map((p) => p.at)]
  for (const c of spec.circles) {
    const o = pts.get(c.center)!
    all.push([o[0] - c.r, o[1] - c.r], [o[0] + c.r, o[1] + c.r])
  }
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)]
  const pad = 34
  const spanX = Math.max(maxX - minX, 1e-6)
  const spanY = Math.max(maxY - minY, 1e-6)
  const scale = Math.min((W - pad * 2) / spanX, 300 / spanY)
  const w = W
  const h = spanY * scale + pad * 2
  const offX = (w - spanX * scale) / 2
  const sx = (x: number) => offX + (x - minX) * scale
  const sy = (y: number) => pad + (maxY - y) * scale
  const P = (n: string): Pt => { const p = pts.get(n)!; return [sx(p[0]), sy(p[1])] }
  const cx = spec.points.reduce((s, p) => s + sx(p.at[0]), 0) / spec.points.length
  const cy = spec.points.reduce((s, p) => s + sy(p.at[1]), 0) / spec.points.length

  const unit = (a: Pt, b: Pt): Pt => { const d = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1; return [(b[0] - a[0]) / d, (b[1] - a[1]) / d] }
  /** Offset from segment midpoint, perpendicular and away from the figure's center. */
  const sideLabelPos = (a: Pt, b: Pt, dist: number): Pt => {
    const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    const u = unit(a, b)
    let n: Pt = [-u[1], u[0]]
    if ((m[0] - cx) * n[0] + (m[1] - cy) * n[1] < 0) n = [-n[0], -n[1]]
    return [m[0] + n[0] * dist, m[1] + n[1] * dist]
  }

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block h-auto w-full max-w-[480px]" role="img" aria-label={describeGraph(spec)}>
      {spec.circles.map((c, i) => {
        const [ox, oy] = P(c.center)
        return <circle key={`c${i}`} cx={ox} cy={oy} r={c.r * scale} fill={i === 0 ? '#eff6ff' : 'none'} fillOpacity={0.6} stroke={c.color ? PALETTE[c.color] : INK} strokeWidth={2} strokeDasharray={c.dashed ? '6 5' : undefined} />
      })}
      {spec.sectors.map((sc, i) => {
        const o = P(sc.center)
        const a = P(sc.a)
        const b = P(sc.b)
        const r = Math.hypot(a[0] - o[0], a[1] - o[1])
        const a1 = Math.atan2(a[1] - o[1], a[0] - o[0])
        const a2 = Math.atan2(b[1] - o[1], b[0] - o[0])
        let delta = a2 - a1
        while (delta <= -Math.PI) delta += 2 * Math.PI
        while (delta > Math.PI) delta -= 2 * Math.PI
        const end: Pt = [o[0] + Math.cos(a2) * r, o[1] + Math.sin(a2) * r]
        const color = sc.color ? PALETTE[sc.color] : PALETTE.blue
        return <path key={`sc${i}`} d={`M${o.join(',')}L${a.join(',')}A${r},${r} 0 0 ${delta > 0 ? 1 : 0} ${end.join(',')}Z`} fill={color} fillOpacity={0.28} stroke="none" />
      })}
      {spec.polygons.map((p, i) => (
        <polygon key={`pg${i}`} points={p.names.map((n) => P(n).join(',')).join(' ')} fill={p.shaded ? (p.color ? PALETTE[p.color] : PALETTE.blue) : i === 0 ? '#eff6ff' : 'none'} fillOpacity={p.shaded ? 0.28 : 1} stroke={p.color ? PALETTE[p.color] : INK} strokeWidth={2} strokeLinejoin="round" strokeDasharray={p.dashed ? '6 5' : undefined} />
      ))}
      {spec.segments.map((s, i) => {
        const [a, b] = [P(s.a), P(s.b)]
        return <line key={`s${i}`} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke={s.color ? PALETTE[s.color] : INK} strokeWidth={2} strokeDasharray={s.dashed ? '6 5' : undefined} strokeLinecap="round" />
      })}
      {spec.rightAngles.map((r, i) => {
        const v = P(r.v)
        const u1 = unit(v, P(r.a))
        const u2 = unit(v, P(r.b))
        const k = 13
        const p1: Pt = [v[0] + u1[0] * k, v[1] + u1[1] * k]
        const p2: Pt = [v[0] + (u1[0] + u2[0]) * k, v[1] + (u1[1] + u2[1]) * k]
        const p3: Pt = [v[0] + u2[0] * k, v[1] + u2[1] * k]
        return <path key={`ra${i}`} d={`M${p1.join(',')}L${p2.join(',')}L${p3.join(',')}`} fill="none" stroke={INK} strokeWidth={1.4} />
      })}
      {spec.angles.map((an, i) => {
        const v = P(an.v)
        const u1 = unit(v, P(an.a))
        const u2 = unit(v, P(an.b))
        const r = 22
        const a1 = Math.atan2(u1[1], u1[0])
        const a2 = Math.atan2(u2[1], u2[0])
        let delta = a2 - a1
        while (delta <= -Math.PI) delta += 2 * Math.PI
        while (delta > Math.PI) delta -= 2 * Math.PI
        const sweep = delta > 0 ? 1 : 0
        const s: Pt = [v[0] + Math.cos(a1) * r, v[1] + Math.sin(a1) * r]
        const e: Pt = [v[0] + Math.cos(a2) * r, v[1] + Math.sin(a2) * r]
        const mid = a1 + delta / 2
        const lr = an.label && an.label.length > 3 ? 44 : 38
        return (
          <g key={`an${i}`}>
            <path d={`M${s.join(',')}A${r},${r} 0 0 ${sweep} ${e.join(',')}`} fill="none" stroke={PALETTE.blue} strokeWidth={1.6} />
            {an.label && <Label x={v[0] + Math.cos(mid) * lr} y={v[1] + Math.sin(mid) * lr} size={12} color={PALETTE.blue} weight={600}>{cleanLabel(an.label)}</Label>}
          </g>
        )
      })}
      {spec.ticks.map((t, i) => {
        const [a, b] = [P(t.a), P(t.b)]
        const m: Pt = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
        const u = unit(a, b)
        const n: Pt = [-u[1], u[0]]
        return (
          <g key={`tk${i}`} stroke={INK} strokeWidth={1.6}>
            {Array.from({ length: t.count }, (_, k) => {
              const off = (k - (t.count - 1) / 2) * 5
              const c: Pt = [m[0] + u[0] * off, m[1] + u[1] * off]
              return <line key={k} x1={c[0] - n[0] * 6} y1={c[1] - n[1] * 6} x2={c[0] + n[0] * 6} y2={c[1] + n[1] * 6} />
            })}
          </g>
        )
      })}
      {spec.sides.map((s, i) => {
        const ticked = spec.ticks.some((t) => (t.a === s.a && t.b === s.b) || (t.a === s.b && t.b === s.a))
        const [x, y] = sideLabelPos(P(s.a), P(s.b), ticked ? 20 : 14)
        return <Label key={`sd${i}`} x={x} y={y} size={13} weight={600}>{cleanLabel(s.label)}</Label>
      })}
      {spec.segments.map((s, i) => {
        if (!s.label) return null
        const ticked = spec.ticks.some((t) => (t.a === s.a && t.b === s.b) || (t.a === s.b && t.b === s.a))
        const [x, y] = sideLabelPos(P(s.a), P(s.b), ticked ? 20 : 12)
        return <Label key={`sl${i}`} x={x} y={y} size={13} weight={600}>{cleanLabel(s.label)}</Label>
      })}
      {spec.points.filter((p) => !p.hide).map((p) => {
        const [x, y] = [sx(p.at[0]), sy(p.at[1])]
        let d: Pt = [x - cx, y - cy]
        const len = Math.hypot(d[0], d[1])
        d = len < 1 ? [0, -1] : [d[0] / len, d[1] / len]
        return (
          <g key={`pt${p.name}`}>
            <circle cx={x} cy={y} r={2.6} fill={INK} />
            <Label x={x + d[0] * 15} y={y + d[1] * 15} size={14} weight={600}>{p.name}</Label>
          </g>
        )
      })}
    </svg>
  )
}

// ── Data charts ─────────────────────────────────────────────────────────────

/** Cartesian frame for data charts: axes along the bottom and left edges. */
function DataAxes({ f, xTicks, yTicks, xLabel, yLabel, xFmt = fmt, grid = true }: {
  f: Frame; xTicks: number[] | null; yTicks: number[]; xLabel?: string; yLabel?: string; xFmt?: (v: number) => string; grid?: boolean
}) {
  return (
    <g>
      {grid && yTicks.map((t) => <line key={`g${t}`} x1={f.left} x2={f.right} y1={f.sy(t)} y2={f.sy(t)} stroke={GRID} />)}
      <line x1={f.left} x2={f.right} y1={f.bottom} y2={f.bottom} stroke={AXIS} strokeWidth={1.4} />
      <line x1={f.left} x2={f.left} y1={f.top} y2={f.bottom} stroke={AXIS} strokeWidth={1.4} />
      {yTicks.map((t) => <Label key={`y${t}`} x={f.left - 6} y={f.sy(t)} anchor="end" size={11} color={MUTED} weight={400}>{fmt(t)}</Label>)}
      {xTicks?.map((t) => (
        <g key={`x${t}`}>
          <line x1={f.sx(t)} x2={f.sx(t)} y1={f.bottom} y2={f.bottom + 4} stroke={AXIS} />
          <Label x={f.sx(t)} y={f.bottom + 14} size={11} color={MUTED} weight={400}>{xFmt(t)}</Label>
        </g>
      ))}
      {xLabel && <Label x={(f.left + f.right) / 2} y={f.h - 8} size={12} color={AXIS}>{cleanLabel(xLabel)}</Label>}
      {yLabel && <text x={13} y={(f.top + f.bottom) / 2} textAnchor="middle" fontSize={12} fill={AXIS} transform={`rotate(-90 13 ${(f.top + f.bottom) / 2})`}>{cleanLabel(yLabel)}</text>}
    </g>
  )
}

function dataPad(xLabel?: string, yLabel?: string, bottomExtra = 0): [number, number, number, number] {
  return [14, 18, 24 + (xLabel ? 18 : 0) + bottomExtra, 40 + (yLabel ? 18 : 0)]
}

function ScatterFigure({ spec }: { spec: ScatterSpec }) {
  const id = useId().replace(/:/g, '')
  const x = spec.x ?? niceRange(Math.min(...spec.data.map((p) => p[0])), Math.max(...spec.data.map((p) => p[0])))
  const y = spec.y ?? niceRange(Math.min(...spec.data.map((p) => p[1])), Math.max(...spec.data.map((p) => p[1])))
  const f = makeFrame(x, y, { pad: dataPad(spec.xLabel, spec.yLabel) })
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={describeGraph(spec)}>
      <clipPath id={`${id}-clip`}><rect x={f.left} y={f.top} width={f.right - f.left} height={f.bottom - f.top} /></clipPath>
      <DataAxes f={f} xTicks={ticks(x[0], x[1], niceStep(x[1] - x[0], 8))} yTicks={ticks(y[0], y[1], niceStep(y[1] - y[0], 6))} xLabel={spec.xLabel} yLabel={spec.yLabel} />
      <g clipPath={`url(#${id}-clip)`}>
        {spec.fits.map((fit, i) => (
          <path key={i} d={samplePath(fit.expr, x[0], x[1], f.sx, f.sy, y[0], y[1])} fill="none" stroke={colorOf(undefined, i + 1)} strokeWidth={2.2} strokeDasharray={fit.dashed ? '7 5' : undefined} />
        ))}
      </g>
      {spec.data.map(([px, py], i) => <circle key={i} cx={f.sx(px)} cy={f.sy(py)} r={4} fill={PALETTE.blue} fillOpacity={0.85} stroke="#fff" strokeWidth={1} />)}
    </svg>
  )
}

function BarFigure({ spec }: { spec: BarSpec }) {
  const max = Math.max(0, ...spec.bars.map((b) => b.value))
  const min = Math.min(0, ...spec.bars.map((b) => b.value))
  const y = spec.y ?? niceRange(min, max)
  const longest = Math.max(...spec.bars.map((b) => b.label.length))
  const slant = spec.bars.length > 5 && longest > 6
  const f = makeFrame([0, spec.bars.length], y, { pad: dataPad(spec.xLabel, spec.yLabel, slant ? 30 : 4) })
  const slot = (f.right - f.left) / spec.bars.length
  const bw = Math.min(56, slot * 0.64)
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={describeGraph(spec)}>
      <DataAxes f={f} xTicks={null} yTicks={ticks(y[0], y[1], niceStep(y[1] - y[0], 6))} xLabel={spec.xLabel} yLabel={spec.yLabel} />
      {spec.bars.map((b, i) => {
        const x = f.left + slot * i + (slot - bw) / 2
        const top = f.sy(Math.max(0, b.value))
        const bottom = f.sy(Math.min(0, b.value))
        const cxm = x + bw / 2
        return (
          <g key={i}>
            <rect x={x} y={top} width={bw} height={Math.max(0, bottom - top)} rx={3} fill={b.color ? PALETTE[b.color] : PALETTE.blue} fillOpacity={0.85} />
            {slant
              ? <text x={cxm} y={f.bottom + 12} textAnchor="end" fontSize={11} fill={AXIS} transform={`rotate(-35 ${cxm} ${f.bottom + 12})`}>{b.label.slice(0, 22)}</text>
              : <Label x={cxm} y={f.bottom + 14} size={11} color={AXIS} weight={500}>{b.label.slice(0, 18)}</Label>}
          </g>
        )
      })}
    </svg>
  )
}

function HistogramFigure({ spec }: { spec: HistogramSpec }) {
  const x: [number, number] = [spec.bins[0].from, spec.bins[spec.bins.length - 1].to]
  const y = spec.y ?? niceRange(0, Math.max(...spec.bins.map((b) => b.count)))
  const f = makeFrame(x, y, { pad: dataPad(spec.xLabel, spec.yLabel) })
  const edges = [...new Set(spec.bins.flatMap((b) => [b.from, b.to]))].sort((a, b) => a - b)
  const every = edges.length > 14 ? 2 : 1
  return (
    <svg viewBox={`0 0 ${f.w} ${f.h}`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={describeGraph(spec)}>
      <DataAxes f={f} xTicks={edges.filter((_, i) => i % every === 0)} yTicks={ticks(y[0], y[1], niceStep(y[1] - y[0], 6))} xLabel={spec.xLabel} yLabel={spec.yLabel ?? 'Frequency'} />
      {spec.bins.map((b, i) => (
        <rect key={i} x={f.sx(b.from)} y={f.sy(b.count)} width={f.sx(b.to) - f.sx(b.from)} height={f.bottom - f.sy(b.count)} fill={PALETTE.blue} fillOpacity={0.8} stroke="#fff" strokeWidth={1.2} />
      ))}
    </svg>
  )
}

function axisRange(values: number[], given?: [number, number]): [number, number] {
  if (given) return given
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const step = niceStep(Math.max(hi - lo, 1), 8)
  return [Math.floor(lo / step) * step - (lo % step === 0 ? step : 0), Math.ceil(hi / step) * step + (hi % step === 0 ? step : 0)]
}

/** Horizontal number axis (dot plots, box plots, number lines). */
function NumberAxis({ y, x0, x1, sx, range, arrows, id }: { y: number; x0: number; x1: number; sx: (v: number) => number; range: [number, number]; arrows?: boolean; id: string }) {
  const step = niceStep(range[1] - range[0], 10)
  const ts = ticks(range[0], range[1], step)
  const every = ts.length > 14 ? 2 : 1
  return (
    <g>
      <line x1={x0} x2={x1} y1={y} y2={y} stroke={AXIS} strokeWidth={1.5} markerStart={arrows ? `url(#${id}-arrow)` : undefined} markerEnd={arrows ? `url(#${id}-arrow)` : undefined} />
      {ts.map((t, i) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={y - 5} y2={y + 5} stroke={AXIS} />
          {i % every === 0 && <Label x={sx(t)} y={y + 17} size={11} color={MUTED} weight={400}>{fmt(t)}</Label>}
        </g>
      ))}
    </g>
  )
}

function DotplotFigure({ spec }: { spec: DotplotSpec }) {
  const id = useId().replace(/:/g, '')
  const range = axisRange(spec.values.map((v) => v.value), spec.x)
  const maxCount = Math.max(...spec.values.map((v) => v.count))
  const [l, r] = [24, W - 24]
  const sx = (v: number) => l + ((v - range[0]) / (range[1] - range[0])) * (r - l)
  const dot = Math.min(14, Math.max(7, 200 / maxCount))
  const axisY = maxCount * dot + 20
  const h = axisY + (spec.xLabel ? 44 : 30)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={describeGraph(spec)}>
      <ArrowDefs id={id} />
      <NumberAxis y={axisY} x0={l - 12} x1={r + 12} sx={sx} range={range} id={id} />
      {spec.values.flatMap((v) => Array.from({ length: v.count }, (_, k) => (
        <circle key={`${v.value}-${k}`} cx={sx(v.value)} cy={axisY - dot * (k + 0.5) - 3} r={dot * 0.42} fill={PALETTE.blue} />
      )))}
      {spec.xLabel && <Label x={W / 2} y={h - 8} size={12} color={AXIS}>{cleanLabel(spec.xLabel)}</Label>}
    </svg>
  )
}

function BoxplotFigure({ spec }: { spec: BoxplotSpec }) {
  const id = useId().replace(/:/g, '')
  const range = axisRange(spec.boxes.flatMap((b) => [b.five[0], b.five[4]]), spec.x)
  const hasLabels = spec.boxes.some((b) => b.label)
  const l = hasLabels ? 90 : 24
  const r = W - 24
  const sx = (v: number) => l + ((v - range[0]) / (range[1] - range[0])) * (r - l)
  const rowH = 52
  const axisY = spec.boxes.length * rowH + 14
  const h = axisY + (spec.xLabel ? 44 : 30)
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={describeGraph(spec)}>
      <ArrowDefs id={id} />
      {spec.boxes.map((b, i) => {
        const cy = 14 + rowH * i + rowH / 2
        const [mn, q1, md, q3, mx] = b.five.map(sx)
        const color = colorOf(undefined, i)
        return (
          <g key={i}>
            {b.label && <Label x={l - 10} y={cy} anchor="end" size={12} color={AXIS}>{b.label.slice(0, 14)}</Label>}
            <line x1={mn} x2={q1} y1={cy} y2={cy} stroke={INK} strokeWidth={1.6} />
            <line x1={q3} x2={mx} y1={cy} y2={cy} stroke={INK} strokeWidth={1.6} />
            <line x1={mn} x2={mn} y1={cy - 9} y2={cy + 9} stroke={INK} strokeWidth={1.6} />
            <line x1={mx} x2={mx} y1={cy - 9} y2={cy + 9} stroke={INK} strokeWidth={1.6} />
            <rect x={q1} y={cy - 16} width={Math.max(1, q3 - q1)} height={32} fill={color} fillOpacity={0.14} stroke={color} strokeWidth={2} rx={2} />
            <line x1={md} x2={md} y1={cy - 16} y2={cy + 16} stroke={color} strokeWidth={2.6} />
          </g>
        )
      })}
      <NumberAxis y={axisY} x0={l - 12} x1={r + 12} sx={sx} range={range} id={id} />
      {spec.xLabel && <Label x={(l + r) / 2} y={h - 8} size={12} color={AXIS}>{cleanLabel(spec.xLabel)}</Label>}
    </svg>
  )
}

function NumberlineFigure({ spec }: { spec: NumberlineSpec }) {
  const id = useId().replace(/:/g, '')
  const finite = [...spec.points.map((p) => p.at), ...spec.intervals.flatMap((i) => [i.from, i.to])].filter(Number.isFinite)
  const range = axisRange(finite.length ? finite : [0], spec.x)
  const [l, r] = [26, W - 26]
  const sx = (v: number) => l + ((Math.max(range[0], Math.min(range[1], v)) - range[0]) / (range[1] - range[0])) * (r - l)
  const y = 34
  const h = 64
  return (
    <svg viewBox={`0 0 ${W} ${h}`} className="mx-auto block h-auto w-full max-w-[520px]" role="img" aria-label={describeGraph(spec)}>
      <ArrowDefs id={id} />
      <defs>
        <marker id={`${id}-ray`} viewBox="0 0 10 10" refX="7" refY="5" markerWidth="14" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0,0 L10,5 L0,10 z" fill={PALETTE.blue} />
        </marker>
      </defs>
      <NumberAxis y={y} x0={l - 16} x1={r + 16} sx={sx} range={range} arrows id={id} />
      {spec.intervals.map((iv, i) => {
        const a = Number.isFinite(iv.from) ? sx(iv.from) : l - 12
        const b = Number.isFinite(iv.to) ? sx(iv.to) : r + 12
        return (
          <g key={i}>
            <line x1={a} x2={b} y1={y} y2={y} stroke={PALETTE.blue} strokeWidth={5} strokeLinecap="butt"
              markerStart={!Number.isFinite(iv.from) ? `url(#${id}-ray)` : undefined}
              markerEnd={!Number.isFinite(iv.to) ? `url(#${id}-ray)` : undefined} />
            {Number.isFinite(iv.from) && <circle cx={a} cy={y} r={6} fill={iv.openFrom ? '#fff' : PALETTE.blue} stroke={PALETTE.blue} strokeWidth={2.4} />}
            {Number.isFinite(iv.to) && <circle cx={b} cy={y} r={6} fill={iv.openTo ? '#fff' : PALETTE.blue} stroke={PALETTE.blue} strokeWidth={2.4} />}
          </g>
        )
      })}
      {spec.points.map((p, i) => (
        <g key={`p${i}`}>
          <circle cx={sx(p.at)} cy={y} r={6} fill={p.open ? '#fff' : PALETTE.red} stroke={PALETTE.red} strokeWidth={2.4} />
          {p.label && <Label x={sx(p.at)} y={y - 16} size={12} color={PALETTE.red} weight={600}>{cleanLabel(p.label)}</Label>}
        </g>
      ))}
    </svg>
  )
}

// ── Labeled diagrams ────────────────────────────────────────────────────────

const NODE_TINT: Record<Color, { fill: string; stroke: string; text: string }> = {
  blue: { fill: '#eff6ff', stroke: '#93c5fd', text: '#1e3a8a' },
  red: { fill: '#fff1f2', stroke: '#fda4af', text: '#881337' },
  green: { fill: '#ecfdf5', stroke: '#6ee7b7', text: '#064e3b' },
  orange: { fill: '#fff7ed', stroke: '#fdba74', text: '#7c2d12' },
  purple: { fill: '#f5f3ff', stroke: '#c4b5fd', text: '#4c1d95' },
  gray: { fill: '#f8fafc', stroke: '#cbd5e1', text: '#1e293b' },
}

function DiagramFigure({ spec }: { spec: DiagramSpec }) {
  const id = useId().replace(/:/g, '')
  const layout = useMemo(() => layoutDiagram(spec.data), [spec.data])
  const byId = new Map(layout.nodes.map((n) => [n.id, n]))
  const cx = layout.width / 2, cy = layout.height / 2
  // Curved edges and their labels can reach past the boxes; grow the view to fit.
  const bows = layout.edges.map((e) => {
    const a = byId.get(e.from), b = byId.get(e.to)
    if (!a || !b || a === b) return null
    const bow = e.back || spec.data.layout === 'cycle'
    let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2
    if (bow) {
      const dx = b.x - a.x, dy = b.y - a.y
      const len = Math.hypot(dx, dy) || 1
      let nx = -dy / len, ny = dx / len
      if ((mx - cx) * nx + (my - cy) * ny < 0) { nx = -nx; ny = -ny }
      const k = spec.data.layout === 'cycle' ? 0.18 * len : Math.max(40, 0.35 * len)
      mx += nx * k; my += ny * k
    }
    return { mx, my, bow }
  })
  const halfLabel = (i: number) => ((layout.edges[i].label?.length ?? 0) * 6.2) / 2 + 6
  const vx0 = Math.min(0, ...bows.map((b, i) => (b ? b.mx - halfLabel(i) : 0)))
  const vx1 = Math.max(layout.width, ...bows.map((b, i) => (b ? b.mx + halfLabel(i) : 0)))
  const vy0 = Math.min(0, ...bows.map((b) => (b ? b.my - 12 : 0)))
  const vy1 = Math.max(layout.height, ...bows.map((b) => (b ? b.my + 12 : 0)))
  return (
    <svg viewBox={`${vx0} ${vy0} ${vx1 - vx0} ${vy1 - vy0}`} className="mx-auto block h-auto w-full" style={{ maxWidth: Math.max(260, vx1 - vx0) }} role="img" aria-label={describeGraph(spec)}>
      <defs>
        <marker id={`${id}-h`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto-start-reverse">
          <path d="M0,1 L10,5 L0,9 z" fill={AXIS} />
        </marker>
      </defs>
      {layout.edges.map((e, i) => {
        const a = byId.get(e.from), b = byId.get(e.to)
        if (!a || !b || a === b) return null
        // Loops and cycle layouts bow outward; forward edges are straight.
        const { mx, my, bow } = bows[i]!
        const [x1, y1] = boxExit(a, mx, my)
        const [x2, y2] = boxExit(b, mx, my)
        const d = bow ? `M${x1},${y1} Q${2 * mx - (x1 + x2) / 2},${2 * my - (y1 + y2) / 2} ${x2},${y2}` : `M${x1},${y1} L${x2},${y2}`
        const lx = bow ? mx : (x1 + x2) / 2, ly = bow ? my : (y1 + y2) / 2
        return (
          <g key={i}>
            <path d={d} fill="none" stroke={AXIS} strokeWidth={1.6}
              markerEnd={e.arrow !== 'none' ? `url(#${id}-h)` : undefined}
              markerStart={e.arrow === 'both' ? `url(#${id}-h)` : undefined} />
            {e.label && <Label x={lx} y={ly} size={11} color={MUTED} weight={500}>{cleanLabel(e.label)}</Label>}
          </g>
        )
      })}
      {layout.nodes.map((n) => {
        const tint = NODE_TINT[n.color ?? 'blue']
        return (
          <g key={n.id}>
            <rect x={n.x - n.w / 2} y={n.y - n.h / 2} width={n.w} height={n.h} rx={9} fill={tint.fill} stroke={tint.stroke} strokeWidth={1.4} />
            {n.lines.map((line, k) => (
              <text key={k} x={n.x} y={n.y - ((n.lines.length - 1) * 17) / 2 + k * 17} textAnchor="middle" dominantBaseline="central" fontSize={13} fontWeight={600} fill={tint.text} style={{ fontFamily: 'inherit' }}>
                {cleanLabel(line)}
              </text>
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ── Public components ───────────────────────────────────────────────────────

function Drawing({ spec }: { spec: GraphSpec }) {
  switch (spec.kind) {
    case 'plane': return <PlaneFigure spec={spec} />
    case 'geometry': return <GeometryFigure spec={spec} />
    case 'scatter': return <ScatterFigure spec={spec} />
    case 'bar': return <BarFigure spec={spec} />
    case 'histogram': return <HistogramFigure spec={spec} />
    case 'dotplot': return <DotplotFigure spec={spec} />
    case 'boxplot': return <BoxplotFigure spec={spec} />
    case 'numberline': return <NumberlineFigure spec={spec} />
    case 'reaction': return <ReactionFigure spec={spec} />
    case 'lewis': return <LewisFigure spec={spec} />
    case 'vsepr': return <VseprFigure spec={spec} />
    case 'molecule': return <MoleculeFigure spec={spec} />
    case 'diagram': return <DiagramFigure spec={spec} />
    case 'punnett': return <PunnettFigure spec={spec} />
    case 'pedigree': return <PedigreeFigure spec={spec} />
    case 'free-body': return <FreeBodyFigure data={spec.data} />
  }
}

const FIGURE_NAMES: Record<GraphSpec['kind'], string> = {
  plane: 'graph', geometry: 'geometry figure', scatter: 'scatterplot', bar: 'bar chart', histogram: 'histogram',
  dotplot: 'dot plot', boxplot: 'box plot', numberline: 'number line', diagram: 'diagram', 'free-body': 'free-body diagram',
  reaction: 'energy diagram', lewis: 'Lewis structure', vsepr: '3D shape', molecule: 'molecule model',
  punnett: 'Punnett square', pedigree: 'pedigree',
}

function figureName(spec: GraphSpec): string {
  if (spec.kind === 'plane' && spec.yLabel?.startsWith('Potential energy')) return 'energy curve'
  return FIGURE_NAMES[spec.kind]
}

/** Text of the few blocks just before and after a figure: what the guide says about it. */
function textAround(el: HTMLElement | null): string {
  if (!el) return ''
  const parts: string[] = []
  let prev = el.previousElementSibling
  for (let i = 0; prev && i < 3; i++, prev = prev.previousElementSibling) parts.unshift(prev.textContent ?? '')
  const next = el.nextElementSibling
  if (next) parts.push(next.textContent ?? '')
  return parts.join('\n').replace(/[ \t]+/g, ' ').trim().slice(-1800)
}

export function GraphFigure({ spec, source, className, compact = false, allowExplain = true }: {
  spec: GraphSpec; source?: string; className?: string; compact?: boolean
  /** Off while a quiz/practice question is unanswered, so the figure can't be used to get the answer. */
  allowExplain?: boolean
}) {
  const desmos = useDesmos()
  const explain = useExplain()
  const figRef = useRef<HTMLElement>(null)
  const askAboutFigure = () => {
    const name = figureName(spec)
    const around = textAround(figRef.current)
    explain?.ask({
      label: `Explain this ${name}${spec.title ? `: ${cleanLabel(spec.title)}` : ''}`,
      prompt: [
        `Explain this ${name} from my study guide: what it shows, how to read it, and what I should take away from it.`,
        `What it shows: ${describeGraph(spec)}`,
        source ? `How the app draws it (for your reference only):\n${source}` : '',
        around ? `What the guide says around it:\n"""\n${around}\n"""` : '',
      ].filter(Boolean).join('\n\n'),
    })
  }
  const canExplore = !!desmos && (spec.kind === 'plane' ? spec.plots.length > 0 || spec.points.length > 0 : spec.kind === 'scatter')
  const notes = [
    ...spec.notes,
    ...(spec.kind === 'geometry' && spec.notToScale ? ['Note: Figure not drawn to scale.'] : []),
  ]
  return (
    <figure ref={figRef} className={cn(frame, compact && 'my-4 p-3 sm:p-4', 'relative bg-white', className)}>
      {explain && allowExplain && (
        <button
          type="button"
          onClick={askAboutFigure}
          className="absolute right-2 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold text-blue-700 shadow-sm ring-1 ring-blue-200 backdrop-blur transition hover:bg-blue-50 hover:ring-blue-400 print:hidden"
          aria-label={`Explain this ${figureName(spec)}`}
        >
          <MessageCircleQuestion className="h-3.5 w-3.5" /> Explain
        </button>
      )}
      {spec.title && <div className={cn('mb-2 text-center text-sm font-semibold text-slate-800', explain && allowExplain && 'px-20')}>{cleanLabel(spec.title)}</div>}
      {/* Inside a question the figure supports the text, so keep it smaller. */}
      <div className={cn('mx-auto', spec.kind === 'diagram' || spec.kind === 'pedigree' || spec.kind === 'punnett' ? 'max-w-full' : compact ? 'max-w-[380px]' : 'max-w-[520px]')}>
        <Drawing spec={spec} />
      </div>
      {(spec.caption || notes.length > 0 || canExplore) && (
        <figcaption className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-slate-500">
          {spec.caption && <span>{cleanLabel(spec.caption)}</span>}
          {notes.map((n, i) => <span key={i} className="italic">{cleanLabel(n)}</span>)}
          {canExplore && (
            <button
              type="button"
              onClick={() => desmos!.openWith(spec)}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium text-blue-700 hover:bg-blue-50 print:hidden"
            >
              <LineChart className="h-3.5 w-3.5" /> Open in Desmos
            </button>
          )}
        </figcaption>
      )}
    </figure>
  )
}

/** Parses and draws a ```graph fence body. */
export const GraphFence = memo(function GraphFence({ text, compact, allowExplain }: { text: string; compact?: boolean; allowExplain?: boolean }) {
  const result = useMemo(() => parseGraphSpec(text), [text])
  if (!result.ok) {
    return (
      <div className="not-prose my-4 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-500">
        <LineChart className="h-4 w-4 shrink-0" /> This figure could not be drawn.
      </div>
    )
  }
  return <GraphFigure spec={result.spec} source={text} compact={compact} allowExplain={allowExplain} />
})
