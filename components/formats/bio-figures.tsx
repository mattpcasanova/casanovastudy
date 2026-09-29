"use client"

// Biology figures for ```graph fences (specs in lib/bio/specs.ts): Punnett
// squares (grid + ratios computed from the parents' genotypes) and pedigree
// charts (standard symbols, laid out by lib/bio/pedigree.ts).

import { useId, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { PedigreeSpec, PunnettSpec } from '@/lib/bio/specs'
import { toRoman } from '@/lib/bio/pedigree'

const INK = '#1e293b'
const MUTED = '#64748b'

/** "XHXh" → X^H X^h; "Tt" stays as is. */
function Genotype({ text, xLinked }: { text: string; xLinked: boolean }) {
  if (!xLinked) return <>{text}</>
  const parts = text.match(/X[A-Za-z]|Y|[A-Za-z]/g) ?? [text]
  return (
    <>
      {parts.map((p, i) => (p.length === 2 && p[0] === 'X'
        ? <span key={i}>X<sup className="text-[0.7em] leading-none">{p[1]}</sup></span>
        : <span key={i}>{p}</span>))}
    </>
  )
}

const pct = (n: number, total: number) => `${Math.round((n / total) * 1000) / 10}%`

export function PunnettFigure({ spec }: { spec: PunnettSpec }) {
  const r = spec.result
  const big = r.top.length > 2
  const [p1, p2] = spec.cross.split(/\s*×\s*|\s+x\s+|\s*\*\s*/)
  return (
    <div className="text-center">
      <p className="mb-2 text-sm text-slate-600">
        <span className="font-semibold text-slate-800"><Genotype text={(p1 ?? '').replace(/[\s^]/g, '')} xLinked={r.xLinked} /></span>
        <span className="mx-1.5 text-slate-400">×</span>
        <span className="font-semibold text-slate-800"><Genotype text={(p2 ?? '').replace(/[\s^]/g, '')} xLinked={r.xLinked} /></span>
      </p>
      <div className="inline-block overflow-x-auto">
        <table className={cn('border-collapse text-center font-semibold', big ? 'text-sm' : 'text-lg')}>
          <thead>
            <tr>
              <th className="p-1" />
              {r.top.map((g, i) => (
                <th key={i} className={cn('rounded-t-lg bg-slate-100 text-slate-700', big ? 'px-2 py-1' : 'px-4 py-1.5')}>
                  <Genotype text={g.join('')} xLinked={r.xLinked} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.side.map((g, row) => (
              <tr key={row}>
                <th className={cn('rounded-l-lg bg-slate-100 text-slate-700', big ? 'px-2' : 'px-3')}>
                  <Genotype text={g.join('')} xLinked={r.xLinked} />
                </th>
                {r.cells[row].map((cell, col) => (
                  <td
                    key={col}
                    title={cell.phenotype}
                    className={cn(
                      'border-2 border-white',
                      big ? 'h-11 w-14' : 'h-16 w-20',
                      cell.dominantTrait ? 'bg-blue-50 text-blue-900' : 'bg-amber-50 text-amber-900',
                    )}
                  >
                    <Genotype text={cell.genotype.join('')} xLinked={r.xLinked} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {spec.showRatios && (
        <div className="mx-auto mt-3 max-w-md space-y-1 text-sm text-slate-700">
          <p>
            <span className="font-semibold">Genotypes: </span>
            {r.genotypeRatio.map((g, i) => (
              <span key={g.genotype}>{i > 0 && ' : '}{g.count} <Genotype text={g.genotype} xLinked={r.xLinked} /></span>
            ))}
          </p>
          <p>
            <span className="font-semibold">Phenotypes: </span>
            {r.phenotypeRatio.map((p, i) => (
              <span key={p.phenotype}>{i > 0 && ' : '}{p.count} {p.phenotype} <span className="text-slate-400">({pct(p.count, r.total)})</span></span>
            ))}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Pedigree ────────────────────────────────────────────────────────────────

const UNIT = 62
const ROW = 92
const S = 28 // symbol size

export function PedigreeFigure({ spec }: { spec: PedigreeSpec }) {
  const id = useId().replace(/:/g, '')
  const { placed, couples, generations } = spec.layout
  const left = 44
  const maxX = Math.max(...placed.map((p) => p.x))
  const w = left + maxX * UNIT + S + 24
  const h = 22 + (generations - 1) * ROW + S + 34
  const X = (x: number) => left + S / 2 + x * UNIT
  const Y = (g: number) => 20 + S / 2 + (g - 1) * ROW
  const hasCarrier = placed.some((p) => p.carrier)
  const hasAffected = placed.some((p) => p.affected)

  const symbol = (p: (typeof placed)[number]): ReactNode => {
    const cx = X(p.x), cy = Y(p.gen)
    const fill = p.affected ? '#334155' : '#fff'
    const shape = (props: { fill: string; stroke?: string; clip?: string }) => {
      const common = { fill: props.fill, stroke: props.stroke ?? INK, strokeWidth: 1.8, clipPath: props.clip }
      if (p.sex === 'male') return <rect x={cx - S / 2} y={cy - S / 2} width={S} height={S} {...common} />
      if (p.sex === 'female') return <circle cx={cx} cy={cy} r={S / 2} {...common} />
      return <rect x={cx - S / 2.8} y={cy - S / 2.8} width={S / 1.4} height={S / 1.4} transform={`rotate(45 ${cx} ${cy})`} {...common} />
    }
    return (
      <g key={p.id}>
        {shape({ fill })}
        {p.carrier && !p.affected && spec.data.carrierStyle === 'half' && (
          <>
            <clipPath id={`${id}-h-${p.id.replace(/\W/g, '')}`}><rect x={cx - S} y={cy - S} width={S} height={S * 2} /></clipPath>
            {shape({ fill: '#334155', stroke: 'none', clip: `url(#${id}-h-${p.id.replace(/\W/g, '')})` })}
            {shape({ fill: 'none' })}
          </>
        )}
        {p.carrier && !p.affected && spec.data.carrierStyle === 'dot' && <circle cx={cx} cy={cy} r={4} fill="#334155" />}
        {p.deceased && <line x1={cx - S * 0.75} y1={cy + S * 0.75} x2={cx + S * 0.75} y2={cy - S * 0.75} stroke={INK} strokeWidth={1.6} />}
        <text x={cx} y={cy + S / 2 + 14} textAnchor="middle" fontSize={11} fill={MUTED}>{p.label ?? p.id}</text>
      </g>
    )
  }

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="mx-auto block h-auto w-full" style={{ maxWidth: Math.max(240, w) }} role="img" aria-label={`Pedigree chart`}>
        {Array.from({ length: generations }, (_, i) => (
          <text key={i} x={8} y={Y(i + 1)} dominantBaseline="central" fontSize={13} fontWeight={700} fill={MUTED} style={{ fontFamily: 'inherit' }}>{toRoman(i + 1)}</text>
        ))}
        {couples.map((c, i) => {
          const y = Y(c.gen)
          const mid = (X(c.x1) + X(c.x2)) / 2
          const barY = y + ROW / 2
          const kidXs = c.kids.map(X)
          return (
            <g key={i} stroke={INK} strokeWidth={1.6} fill="none">
              <line x1={X(c.x1) + S / 2} x2={X(c.x2) - S / 2} y1={y} y2={y} />
              {kidXs.length > 0 && (
                <>
                  <line x1={mid} x2={mid} y1={y} y2={barY} />
                  <line x1={Math.min(mid, ...kidXs)} x2={Math.max(mid, ...kidXs)} y1={barY} y2={barY} />
                  {kidXs.map((kx, k) => <line key={k} x1={kx} x2={kx} y1={barY} y2={Y(c.gen + 1) - S / 2} />)}
                </>
              )}
            </g>
          )
        })}
        {placed.map(symbol)}
      </svg>
      {(hasAffected || hasCarrier) && (
        <div className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 border-[1.5px] border-slate-800 bg-white" />unaffected</span>
          {hasAffected && <span className="inline-flex items-center gap-1"><span className="inline-block h-3 w-3 border-[1.5px] border-slate-800 bg-slate-700" />affected</span>}
          {hasCarrier && (
            <span className="inline-flex items-center gap-1">
              {spec.data.carrierStyle === 'dot'
                ? <span className="relative inline-block h-3 w-3 rounded-full border-[1.5px] border-slate-800 bg-white"><span className="absolute left-1/2 top-1/2 h-1 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-700" /></span>
                : <span className="inline-block h-3 w-3 border-[1.5px] border-slate-800 bg-[linear-gradient(90deg,#334155_50%,#fff_50%)]" />}
              carrier
            </span>
          )}
          <span className="text-slate-400">□ male ○ female</span>
        </div>
      )}
    </div>
  )
}
