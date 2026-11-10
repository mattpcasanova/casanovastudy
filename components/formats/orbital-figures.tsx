// Orbital diagrams (boxes and arrows) and orbital shapes for ```graph fences.
// The filling is computed in lib/chem/orbitals.ts; this only draws it. Plain
// HTML and SVG, so rows wrap on a phone and everything prints.

import { describeGraph } from '@/lib/graphs/spec'
import { SUBSHELL_SHAPES, type OrbitalBox } from '@/lib/chem/orbitals'
import type { OrbitalDiagramSpec, OrbitalsSpec } from '@/lib/chem/specs'
import { cn } from '@/lib/utils'

const mlText = (ml: number) => (ml > 0 ? `+${ml}` : ml < 0 ? `−${-ml}` : '0')

function Arrow({ up, x }: { up: boolean; x: number }) {
  const d = up ? `M${x},26 L${x},7 M${x - 4.5},12.5 L${x},7 L${x + 4.5},12.5` : `M${x},6 L${x},25 M${x - 4.5},19.5 L${x},25 L${x + 4.5},19.5`
  return <path d={d} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
}

function Box({ box, highlight, showMl }: { box: OrbitalBox; highlight: boolean; showMl: boolean }) {
  const lit = highlight && box.last
  const both = box.up && box.down
  return (
    <span className="flex flex-col items-center">
      <span className={cn('flex h-10 w-8 items-center justify-center rounded-md border', lit ? 'border-amber-400 bg-amber-100 text-amber-950' : 'border-slate-300 bg-white text-slate-800')}>
        <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
          {box.up && <Arrow up x={both ? 10 : 16} />}
          {box.down && <Arrow up={false} x={22} />}
        </svg>
      </span>
      {showMl && <span className="mt-1 text-xs tabular-nums text-slate-500">{mlText(box.ml)}</span>}
    </span>
  )
}

export function OrbitalDiagramFigure({ spec }: { spec: OrbitalDiagramSpec }) {
  return (
    <div role="figure" aria-label={describeGraph(spec)} className="text-left">
      <div className="divide-y divide-slate-200">
        {spec.rows.map((row, i) => (
          <div key={i} className="flex flex-col gap-x-5 gap-y-2 py-3 sm:flex-row sm:items-center">
            {spec.showLabel && (
              <div className="shrink-0 sm:w-24">
                <p className="text-lg font-semibold leading-tight text-slate-900">{row.label}</p>
                <p className="text-sm text-slate-600">{row.short}</p>
              </div>
            )}
            <div className="flex min-w-0 flex-wrap items-start gap-x-2 gap-y-3">
              {row.core && (
                <span className="flex flex-col items-center">
                  <span className="mb-1 text-xs text-transparent" aria-hidden="true">0</span>
                  <span className="flex h-10 items-center rounded-md border border-dashed border-slate-300 bg-slate-50 px-2.5 text-sm font-semibold text-slate-700">[{row.core}]</span>
                </span>
              )}
              {row.groups.map((g) => (
                <span key={g.name} className="flex flex-col items-center">
                  <span className="mb-1 text-xs font-medium text-slate-600">{g.name}</span>
                  <span className="flex">{g.boxes.map((b, k) => <Box key={k} box={b} highlight={spec.highlight} showMl={spec.showMl} />)}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      {(spec.highlight || spec.showMl) && (
        <p className="mt-1 flex items-center gap-2 text-xs text-slate-600">
          {spec.highlight && <span className="inline-block h-3.5 w-3.5 shrink-0 rounded border border-amber-400 bg-amber-100" aria-hidden="true" />}
          <span>
            {[spec.highlight && 'Shaded box: where the last electron went', spec.showMl && <>the number under a box is its m<sub>ℓ</sub></>]
              .filter(Boolean)
              .map((part, k) => <span key={k}>{k > 0 ? '; ' : ''}{part}</span>)}
          </span>
        </p>
      )}
    </div>
  )
}

// ── Shapes ──────────────────────────────────────────────────────────────────

const TINT: Record<string, { fill: string; stroke: string }> = {
  s: { fill: '#dbeafe', stroke: '#1d4ed8' },
  p: { fill: '#d1fae5', stroke: '#047857' },
  d: { fill: '#ede9fe', stroke: '#6d28d9' },
}

const NAMES: Record<string, [string, string]> = {
  s: ['s', ''], px: ['p', 'x'], py: ['p', 'y'], pz: ['p', 'z'],
  dxy: ['d', 'xy'], dxz: ['d', 'xz'], dyz: ['d', 'yz'], 'dx2-y2': ['d', 'x²−y²'], dz2: ['d', 'z²'],
}

/** Lobes at the given angles (degrees clockwise from up), `reach` from the middle. */
function Lobes({ angles, reach, rx, ry }: { angles: number[]; reach: number; rx: number; ry: number }) {
  return <>{angles.map((a) => <ellipse key={a} cx={50} cy={50 - reach} rx={rx} ry={ry} transform={`rotate(${a} 50 50)`} />)}</>
}

function Shape({ orbital }: { orbital: string }) {
  const tint = TINT[orbital[0]]
  const [letter, sub] = NAMES[orbital]
  return (
    <span className="flex w-[4.5rem] flex-col items-center">
      <svg viewBox="0 0 100 100" className="h-[4.5rem] w-[4.5rem]" aria-hidden="true" fill={tint.fill} stroke={tint.stroke} strokeWidth={1.4}>
        {orbital === 's' && <circle cx={50} cy={50} r={26} />}
        {orbital === 'px' && <Lobes angles={[90, 270]} reach={24} rx={14} ry={22} />}
        {orbital === 'py' && <Lobes angles={[45, 225]} reach={24} rx={14} ry={22} />}
        {orbital === 'pz' && <Lobes angles={[0, 180]} reach={24} rx={14} ry={22} />}
        {(orbital === 'dxy' || orbital === 'dxz' || orbital === 'dyz') && <Lobes angles={[45, 135, 225, 315]} reach={25} rx={10.5} ry={19} />}
        {orbital === 'dx2-y2' && <Lobes angles={[0, 90, 180, 270]} reach={25} rx={10.5} ry={19} />}
        {orbital === 'dz2' && (
          <>
            <Lobes angles={[0, 180]} reach={25} rx={11.5} ry={20} />
            <ellipse cx={50} cy={50} rx={23} ry={6.5} fill="none" strokeWidth={3.2} />
          </>
        )}
      </svg>
      <span className="text-sm text-slate-700">{letter}{sub && <sub>{sub}</sub>}</span>
    </span>
  )
}

export function OrbitalShapesFigure({ spec }: { spec: OrbitalsSpec }) {
  return (
    <div role="figure" aria-label={describeGraph(spec)} className="divide-y divide-slate-200 text-left">
      {spec.subshells.map((letter) => {
        const { l, orbitals } = SUBSHELL_SHAPES[letter]
        const mls = Array.from({ length: 2 * l + 1 }, (_, i) => mlText(i - l)).join(', ')
        return (
          <div key={letter} className="flex flex-col gap-x-5 gap-y-2 py-3 sm:flex-row sm:items-center">
            <div className="shrink-0 sm:w-40">
              <p className="text-lg font-semibold leading-tight text-slate-900">{letter} subshell</p>
              <p className="text-sm text-slate-600">ℓ = {l} · {orbitals.length} orbital{orbitals.length === 1 ? '' : 's'}</p>
              <p className="text-xs text-slate-500">m<sub>ℓ</sub> = {mls}</p>
            </div>
            <div className="flex min-w-0 flex-wrap gap-x-2 gap-y-2">{orbitals.map((o) => <Shape key={o} orbital={o} />)}</div>
          </div>
        )
      })}
    </div>
  )
}
