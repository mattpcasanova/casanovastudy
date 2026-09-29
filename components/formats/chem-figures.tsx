"use client"

// Chemistry figures for ```graph fences (specs in lib/chem/specs.ts):
// Lewis structures, reaction energy diagrams, and 3D ball-and-stick models
// (VSEPR shapes computed by lib/chem/vsepr.ts, real molecules fetched from
// PubChem by name). Energy wells are drawn as coordinate planes by
// graph-figure.tsx. Everything is SVG, so it prints; 3D models are rotatable
// by drag or arrow keys.

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react'
import { elementInfo } from '@/lib/chem/elements'
import { reactionPath } from '@/lib/chem/energy'
import { parseSdf } from '@/lib/chem/sdf'
import type { LewisSpec, MoleculeSpec, ReactionSpec, VseprSpec } from '@/lib/chem/specs'
import type { Model3DData, Vec3 } from '@/lib/chem/vsepr'

const INK = '#1e293b'
const MUTED = '#64748b'
const AXIS = '#475569'
const BLUE = '#2563eb'
const RED = '#e11d48'
const W = 440

// ── 3D ball-and-stick ───────────────────────────────────────────────────────

function rotate([x, y, z]: Vec3, yaw: number, pitch: number): Vec3 {
  const cy = Math.cos(yaw), sy = Math.sin(yaw)
  const x1 = x * cy + z * sy
  const z1 = -x * sy + z * cy
  const cp = Math.cos(pitch), sp = Math.sin(pitch)
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp]
}

export function Model3D({ data, ballScale, hideHydrogens = false, label }: {
  data: Model3DData; ballScale: number; hideHydrogens?: boolean; label: string
}) {
  const id = useId().replace(/:/g, '')
  const [yaw, setYaw] = useState(-0.55)
  const [pitch, setPitch] = useState(0.32)
  const drag = useRef<{ x: number; y: number } | null>(null)

  const { atoms, bonds, keep } = useMemo(() => {
    const keep = data.atoms.map((a) => !(hideHydrogens && a.symbol === 'H'))
    const shown = data.atoms.filter((_, i) => keep[i])
    const c: Vec3 = [0, 0, 0]
    shown.forEach((a) => { c[0] += a.pos[0] / shown.length; c[1] += a.pos[1] / shown.length; c[2] += a.pos[2] / shown.length })
    return {
      keep,
      atoms: data.atoms.map((a) => ({ ...a, pos: [a.pos[0] - c[0], a.pos[1] - c[1], a.pos[2] - c[2]] as Vec3 })),
      bonds: data.bonds.filter((b) => keep[b.a] && keep[b.b]),
    }
  }, [data, hideHydrogens])

  const extent = Math.max(0.8, ...atoms.filter((_, i) => keep[i]).map((a) => Math.hypot(...a.pos) + ballScale * elementInfo(a.symbol).radius))
  const lpExtent = data.lonePairs.length ? 1.25 : 0
  const H = 300
  const scale = (Math.min(W, H) / 2 - 18) / Math.max(extent, lpExtent)
  const proj = (p: Vec3) => { const r = rotate(p, yaw, pitch); return { x: W / 2 + r[0] * scale, y: H / 2 - r[1] * scale, z: r[2] } }

  type Item = { z: number; el: ReactNode }
  const items: Item[] = []
  const P = atoms.map((a) => proj(a.pos))

  bonds.forEach((b, i) => {
    const p = P[b.a], q = P[b.b]
    const dx = q.x - p.x, dy = q.y - p.y
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len, ny = dx / len
    const offsets = b.order === 1 ? [0] : b.order === 2 ? [-3.2, 3.2] : [-5, 0, 5]
    items.push({
      z: (p.z + q.z) / 2 - 0.01,
      el: (
        <g key={`b${i}`} stroke="#94a3b8" strokeWidth={b.order === 1 ? 6 : 3.4} strokeLinecap="round">
          {offsets.map((o, k) => <line key={k} x1={p.x + nx * o} y1={p.y + ny * o} x2={q.x + nx * o} y2={q.y + ny * o} />)}
        </g>
      ),
    })
  })

  data.lonePairs.forEach((lp, i) => {
    const from = atoms[lp.from].pos
    const tip: Vec3 = [from[0] + lp.dir[0] * 0.95, from[1] + lp.dir[1] * 0.95, from[2] + lp.dir[2] * 0.95]
    const mid: Vec3 = [from[0] + lp.dir[0] * 0.55, from[1] + lp.dir[1] * 0.55, from[2] + lp.dir[2] * 0.55]
    const a = proj(from), t = proj(tip), m = proj(mid)
    const len = Math.hypot(t.x - a.x, t.y - a.y)
    const angle = (Math.atan2(t.y - a.y, t.x - a.x) * 180) / Math.PI
    const rx = Math.max(10, len * 0.45)
    items.push({
      z: m.z,
      el: (
        <g key={`lp${i}`} transform={`rotate(${angle} ${m.x} ${m.y})`}>
          <ellipse cx={m.x} cy={m.y} rx={rx} ry={16} fill="#c4b5fd" fillOpacity={0.45} stroke="#8b5cf6" strokeOpacity={0.6} strokeWidth={1.2} />
          <circle cx={m.x + rx * 0.35} cy={m.y - 4} r={2.6} fill="#6d28d9" />
          <circle cx={m.x + rx * 0.35} cy={m.y + 4} r={2.6} fill="#6d28d9" />
        </g>
      ),
    })
  })

  atoms.forEach((a, i) => {
    if (!keep[i]) return
    const info = elementInfo(a.symbol)
    const r = ballScale * info.radius * scale
    const p = P[i]
    items.push({
      z: p.z,
      el: (
        <g key={`a${i}`}>
          <circle cx={p.x} cy={p.y} r={r} fill={`url(#${id}-g-${a.symbol})`} stroke="rgba(15,23,42,0.35)" strokeWidth={1} />
        </g>
      ),
    })
  })
  items.sort((u, v) => u.z - v.z)

  // Element letters go on top (sticks would cover them), but only for atoms
  // not hidden behind a nearer ball.
  const radii = atoms.map((a) => ballScale * elementInfo(a.symbol).radius * scale)
  const labels = atoms.map((a, i) => {
    if (!keep[i] || radii[i] < 9 || atoms.length > 40) return null
    const p = P[i]
    const hidden = atoms.some((_, j) => j !== i && keep[j] && P[j].z > p.z && Math.hypot(P[j].x - p.x, P[j].y - p.y) < radii[j] * 0.8)
    if (hidden) return null
    const info = elementInfo(a.symbol)
    return (
      <text key={`t${i}`} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" fontSize={Math.min(15, radii[i] * 0.9)} fontWeight={700}
        fill={info.text} stroke={info.color} strokeWidth={3} paintOrder="stroke" style={{ fontFamily: 'inherit', pointerEvents: 'none' }}>{a.symbol}</text>
    )
  })

  const symbols = [...new Set(atoms.map((a) => a.symbol))]
  const onDown = (e: PointerEvent<SVGSVGElement>) => { drag.current = { x: e.clientX, y: e.clientY }; e.currentTarget.setPointerCapture(e.pointerId) }
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (!drag.current) return
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y
    drag.current = { x: e.clientX, y: e.clientY }
    setYaw((v) => v + dx * 0.012)
    setPitch((v) => Math.max(-1.5, Math.min(1.5, v + dy * 0.012)))
  }
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    const step = 0.15
    if (e.key === 'ArrowLeft') setYaw((v) => v - step)
    else if (e.key === 'ArrowRight') setYaw((v) => v + step)
    else if (e.key === 'ArrowUp') setPitch((v) => Math.max(-1.5, v - step))
    else if (e.key === 'ArrowDown') setPitch((v) => Math.min(1.5, v + step))
    else return
    e.preventDefault()
  }

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="mx-auto block h-auto w-full cursor-grab touch-none select-none outline-none focus-visible:ring-2 focus-visible:ring-blue-300 active:cursor-grabbing"
      role="img"
      aria-label={`${label}. Drag or use arrow keys to rotate.`}
      tabIndex={0}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={() => { drag.current = null }}
      onPointerCancel={() => { drag.current = null }}
      onKeyDown={onKey}
    >
      <defs>
        {symbols.map((s) => {
          const c = elementInfo(s).color
          return (
            <radialGradient key={s} id={`${id}-g-${s}`} cx="35%" cy="30%" r="75%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity={0.95} />
              <stop offset="35%" stopColor={c} />
              <stop offset="100%" stopColor={c} stopOpacity={0.85} />
            </radialGradient>
          )
        })}
      </defs>
      {items.map((it) => it.el)}
      {labels}
    </svg>
  )
}

export function VseprFigure({ spec }: { spec: VseprSpec }) {
  const m = spec.model
  const terminals = m.atoms.slice(1).map((a) => a.symbol)
  // Hydrides of groups 16-17 are written hydrogen first (H₂O, H₂S, HF); others center first (NH₃, CH₄).
  const hFirst = terminals.every((t) => t === 'H') && ['O', 'S', 'Se', 'Te', 'F', 'Cl', 'Br', 'I'].includes(spec.center)
  const formula = hFirst ? `${summarize(terminals)}${spec.center}` : `${spec.center}${summarize(terminals)}`
  return (
    <div>
      <Model3D data={m} ballScale={0.3} label={`3D model of ${formula}${spec.showName ? `, ${m.shape}` : ''}`} />
      <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600">
        {spec.showName ? (
          <>
            <span className="font-semibold text-slate-800">{formula}: {m.shape}</span>
            <span>Electron geometry: {m.electronGeometry}</span>
            <span>Bond angles: {m.angles}</span>
            <span className="font-mono">{m.axe}</span>
          </>
        ) : (
          <span className="font-semibold text-slate-800">{formula}</span>
        )}
        {m.lonePairs.length > 0 && <span className="inline-flex items-center gap-1"><span className="inline-block h-2.5 w-3.5 rounded-full bg-violet-300/70 ring-1 ring-violet-500/60" /> lone pair</span>}
        <span className="text-slate-400 print:hidden">Drag to rotate</span>
      </div>
    </div>
  )
}

/** ["F","F","F","F"] → "F₄"; ["H","H","O"] → "H₂O". */
function summarize(symbols: string[]): string {
  const sub = '₀₁₂₃₄₅₆₇₈₉'
  const counts = new Map<string, number>()
  symbols.forEach((s) => counts.set(s, (counts.get(s) ?? 0) + 1))
  return [...counts.entries()].map(([s, n]) => (n > 1 ? s + String(n).split('').map((d) => sub[Number(d)]).join('') : s)).join('')
}

// ── PubChem molecules ───────────────────────────────────────────────────────

const PUBCHEM = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name'
const cache = new Map<string, Promise<Model3DData | null>>()

function fetch3D(name: string): Promise<Model3DData | null> {
  const key = name.toLowerCase()
  if (!cache.has(key)) {
    cache.set(key, fetch(`${PUBCHEM}/${encodeURIComponent(name)}/SDF?record_type=3d`)
      .then((r) => (r.ok ? r.text() : null))
      .then((t) => (t ? parseSdf(t) : null))
      .catch(() => null))
  }
  return cache.get(key)!
}

export function MoleculeFigure({ spec }: { spec: MoleculeSpec }) {
  const [state, setState] = useState<{ status: 'loading' | 'ready' | 'flat' | 'error'; data?: Model3DData }>({ status: spec.style === '2d' ? 'flat' : 'loading' })
  const [imgFailed, setImgFailed] = useState(false)

  useEffect(() => {
    if (spec.style === '2d') return
    let alive = true
    fetch3D(spec.name).then((data) => {
      if (!alive) return
      // No 3D conformer (common for inorganic compounds): show the 2D structure instead.
      setState(data ? { status: 'ready', data } : { status: 'flat' })
    })
    return () => { alive = false }
  }, [spec.name, spec.style])

  const name = spec.name.replace(/\b\w/g, (c) => c.toUpperCase())
  if (state.status === 'loading') {
    return <div className="flex h-48 items-center justify-center text-sm text-slate-500">Loading {spec.name} model…</div>
  }
  if (state.status === 'ready' && state.data) {
    return (
      <div>
        <Model3D data={state.data} ballScale={0.32} hideHydrogens={!spec.hydrogens} label={`3D model of ${spec.name}`} />
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-600">
          <span className="font-semibold text-slate-800">{name}</span>
          {[...new Set(state.data.atoms.map((a) => a.symbol))].filter((sym) => spec.hydrogens || sym !== 'H').map((sym) => (
            <span key={sym} className="inline-flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full ring-1 ring-slate-400/60" style={{ background: elementInfo(sym).color }} />{sym}
            </span>
          ))}
          <span className="text-slate-400 print:hidden">Drag to rotate</span>
          <span className="text-slate-400">Structure: PubChem</span>
        </div>
      </div>
    )
  }
  if (imgFailed) return <div className="py-6 text-center text-sm text-slate-500">No structure found for “{spec.name}”.</div>
  return (
    <div className="text-center">
      {/* eslint-disable-next-line @next/next/no-img-element -- external PubChem image */}
      <img
        src={`${PUBCHEM}/${encodeURIComponent(spec.name)}/PNG?image_size=300x300`}
        alt={`2D structure of ${spec.name}`}
        className="mx-auto h-auto w-full max-w-[300px] mix-blend-multiply"
        onError={() => setImgFailed(true)}
      />
      <div className="mt-1 text-xs text-slate-600"><span className="font-semibold text-slate-800">{name}</span> <span className="text-slate-400">· Structure: PubChem</span></div>
    </div>
  )
}

// ── Lewis structures ────────────────────────────────────────────────────────

export function LewisFigure({ spec }: { spec: LewisSpec }) {
  const L = spec.layout
  const pad = L.charge ? 26 : 10
  const minX = L.box.minX - pad, minY = L.box.minY - pad
  const w = L.box.maxX - L.box.minX + pad * 2 + (L.charge ? 18 : 0)
  const h = L.box.maxY - L.box.minY + pad * 2
  const chargeText = L.charge ? `${Math.abs(L.charge) > 1 ? Math.abs(L.charge) : ''}${L.charge > 0 ? '+' : '−'}` : ''
  return (
    <svg viewBox={`${minX} ${minY} ${w} ${h}`} className="mx-auto block h-auto w-full" style={{ maxWidth: Math.min(360, w * 1.6) }} role="img" aria-label={`Lewis structure of ${L.atoms.map((a) => a.symbol).join('')}`}>
      {L.bonds.map((b, i) => {
        const dx = b.x2 - b.x1, dy = b.y2 - b.y1
        const len = Math.hypot(dx, dy) || 1
        const nx = -dy / len, ny = dx / len
        const offs = b.order === 1 ? [0] : b.order === 2 ? [-3.5, 3.5] : [-6, 0, 6]
        return <g key={i} stroke={INK} strokeWidth={2} strokeLinecap="round">{offs.map((o, k) => <line key={k} x1={b.x1 + nx * o} y1={b.y1 + ny * o} x2={b.x2 + nx * o} y2={b.y2 + ny * o} />)}</g>
      })}
      {L.dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r={2.3} fill={INK} />)}
      {L.atoms.map((a, i) => (
        <g key={i}>
          <text x={a.x} y={a.y} textAnchor="middle" dominantBaseline="central" fontSize={20} fontWeight={600} fill={INK} style={{ fontFamily: 'inherit' }}>{a.symbol}</text>
          {L.showFormal && a.formal !== 0 && (
            <g>
              <circle cx={a.x + 13} cy={a.y - 13} r={7} fill="#fff" stroke={a.formal > 0 ? BLUE : RED} strokeWidth={1.2} />
              <text x={a.x + 13} y={a.y - 13} textAnchor="middle" dominantBaseline="central" fontSize={9} fontWeight={700} fill={a.formal > 0 ? BLUE : RED}>
                {`${Math.abs(a.formal) > 1 ? Math.abs(a.formal) : ''}${a.formal > 0 ? '+' : '−'}`}
              </text>
            </g>
          )}
        </g>
      ))}
      {L.charge !== 0 && (
        <g stroke={INK} strokeWidth={1.8} fill="none">
          <path d={`M${L.box.minX - 4},${L.box.minY - 8} h-8 V${L.box.maxY + 8} h8`} />
          <path d={`M${L.box.maxX + 4},${L.box.minY - 8} h8 V${L.box.maxY + 8} h-8`} />
          <text x={L.box.maxX + 16} y={L.box.minY - 8} fontSize={14} fontWeight={700} fill={INK} stroke="none" dominantBaseline="middle">{chargeText}</text>
        </g>
      )}
    </svg>
  )
}

// ── Reaction energy diagram ─────────────────────────────────────────────────

export function ReactionFigure({ spec }: { spec: ReactionSpec }) {
  const id = useId().replace(/:/g, '')
  const energies = [...spec.levels.map((l) => l.energy), ...spec.catalyzed]
  const lo = Math.min(...energies), hi = Math.max(...energies)
  const span = hi - lo || 1
  const H = 280
  const left = 44, right = W - 16, top = 30, bottom = H - 36
  const sx = (t: number) => left + 8 + t * (right - left - 16)
  const sy = (e: number) => bottom - 14 - ((e - lo) / span) * (bottom - top - 40)
  const path = (pts: [number, number][]) => pts.map(([t, e], i) => `${i ? 'L' : 'M'}${sx(t).toFixed(1)},${sy(e).toFixed(1)}`).join('')

  const main = reactionPath(spec.levels)
  let ti = 0
  const catLevels = spec.catalyzed.length
    ? spec.levels.map((l) => (l.kind === 'transition' && ti < spec.catalyzed.length ? { ...l, energy: spec.catalyzed[ti++] } : l))
    : null
  const n = spec.levels.length
  const xAt = (i: number) => 0.08 + (0.84 * i) / (n - 1)
  const first = spec.levels[0]
  const last = spec.levels[n - 1]
  const tsIndex = spec.levels.findIndex((l) => l.kind === 'transition')
  const peak = tsIndex >= 0 ? spec.levels[tsIndex] : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block h-auto w-full" role="img" aria-label={`Reaction energy diagram`}>
      <defs>
        <marker id={`${id}-a`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0,1 L9,5 L0,9 z" fill={AXIS} />
        </marker>
      </defs>
      <line x1={left} y1={bottom} x2={right} y2={bottom} stroke={AXIS} strokeWidth={1.4} markerEnd={`url(#${id}-a)`} />
      <line x1={left} y1={bottom} x2={left} y2={top - 10} stroke={AXIS} strokeWidth={1.4} markerEnd={`url(#${id}-a)`} />
      <text x={(left + right) / 2} y={H - 10} textAnchor="middle" fontSize={12} fill={AXIS}>{spec.xLabel ?? 'Reaction progress'}</text>
      <text x={16} y={(top + bottom) / 2} textAnchor="middle" fontSize={12} fill={AXIS} transform={`rotate(-90 16 ${(top + bottom) / 2})`}>{spec.yLabel ?? 'Potential energy'}</text>

      {catLevels && <path d={path(reactionPath(catLevels))} fill="none" stroke={RED} strokeWidth={2.2} strokeDasharray="7 5" />}
      <path d={path(main)} fill="none" stroke={BLUE} strokeWidth={2.6} strokeLinejoin="round" />

      {spec.levels.map((l, i) => l.label ? (
        <text key={i} x={sx(xAt(i))} y={sy(l.energy) - 10} textAnchor="middle" fontSize={12} fontWeight={600} fill={INK} stroke="#fff" strokeWidth={3.5} paintOrder="stroke">{l.label}</text>
      ) : null)}

      {spec.showEa && peak && (
        <g>
          <line x1={sx(0.02)} x2={sx(xAt(tsIndex))} y1={sy(first.energy)} y2={sy(first.energy)} stroke={MUTED} strokeDasharray="4 4" />
          <line x1={sx(xAt(tsIndex))} x2={sx(xAt(tsIndex))} y1={sy(first.energy)} y2={sy(peak.energy) + 4} stroke={AXIS} strokeWidth={1.5} markerEnd={`url(#${id}-a)`} markerStart={`url(#${id}-a)`} />
          <text x={sx(xAt(tsIndex)) - 6} y={(sy(first.energy) + sy(peak.energy)) / 2} textAnchor="end" fontSize={12} fontWeight={600} fill={AXIS} stroke="#fff" strokeWidth={3.5} paintOrder="stroke">Eₐ</text>
        </g>
      )}
      {spec.showDH && (
        <g>
          <line x1={sx(0.02)} x2={sx(0.99)} y1={sy(first.energy)} y2={sy(first.energy)} stroke={MUTED} strokeDasharray="4 4" />
          <line x1={sx(0.97)} x2={sx(0.97)} y1={sy(first.energy)} y2={sy(last.energy)} stroke={AXIS} strokeWidth={1.5} markerEnd={`url(#${id}-a)`} />
          <text x={sx(0.97) - 6} y={(sy(first.energy) + sy(last.energy)) / 2} textAnchor="end" fontSize={12} fontWeight={600} fill={AXIS}>ΔH</text>
        </g>
      )}
      {catLevels && (
        <g fontSize={11}>
          <line x1={right - 190} x2={right - 168} y1={top - 12} y2={top - 12} stroke={BLUE} strokeWidth={2.4} />
          <text x={right - 164} y={top - 12} dominantBaseline="middle" fill={AXIS}>uncatalyzed</text>
          <line x1={right - 62} x2={right - 40} y1={top - 12} y2={top - 12} stroke={RED} strokeWidth={2.2} strokeDasharray="5 4" />
          <text x={right - 36} y={top - 12} dominantBaseline="middle" fill={AXIS}>catalyzed</text>
        </g>
      )}
    </svg>
  )
}
