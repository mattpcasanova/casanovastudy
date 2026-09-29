"use client"

// On-demand Desmos calculator for math/science guides (the SAT and several AP
// exams give students Desmos, so practicing with it matters). The API script
// loads only when the student opens the panel. Hidden entirely unless
// NEXT_PUBLIC_DESMOS_API_KEY is set. Calculator state is a per-browser
// convenience, saved in localStorage under cs:desmos:<guideId>:<mode>.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Calculator, Maximize2, Minimize2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toLatex, type Expr } from '@/lib/graphs/expr'
import type { GraphSpec, Pt } from '@/lib/graphs/spec'
import { DesmosContext, type DesmosApi } from './desmos-context'

type Mode = 'graphing' | 'scientific'

interface DesmosCalc {
  setExpression: (e: Record<string, unknown>) => void
  removeExpressions: (e: { id: string }[]) => void
  getExpressions: () => { id: string }[]
  getState: () => unknown
  setState: (s: unknown) => void
  setMathBounds?: (b: { left: number; right: number; bottom: number; top: number }) => void
  observeEvent: (name: string, cb: () => void) => void
  resize: () => void
  destroy: () => void
}

declare global {
  interface Window {
    Desmos?: {
      GraphingCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalc
      ScientificCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalc
    }
  }
}

const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY
const API_VERSION = 'v1.11'

let loader: Promise<void> | null = null
function loadDesmos(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.Desmos) return Promise.resolve()
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://www.desmos.com/api/${API_VERSION}/calculator.js?apiKey=${encodeURIComponent(API_KEY ?? '')}`
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => { loader = null; reject(new Error('Desmos failed to load')) }
    document.head.appendChild(s)
  })
  return loader
}

// ── Figure → Desmos expressions ─────────────────────────────────────────────

const HEX: Record<string, string> = { blue: '#2563eb', red: '#e11d48', green: '#059669', orange: '#d97706', purple: '#7c3aed', gray: '#64748b' }
const CYCLE = ['#2563eb', '#e11d48', '#059669', '#7c3aed', '#d97706']
const n = (v: number) => String(Number(v.toFixed(6)))
const pt = ([x, y]: Pt) => `\\left(${n(x)},${n(y)}\\right)`
const OPS: Record<string, string> = { '<': '<', '>': '>', '<=': '\\le ', '>=': '\\ge ' }

export function figureToDesmos(spec: GraphSpec): { exprs: Record<string, unknown>[]; bounds?: { left: number; right: number; bottom: number; top: number } } {
  const exprs: Record<string, unknown>[] = []
  const add = (e: Record<string, unknown>) => exprs.push({ id: `fig-${exprs.length}`, ...e })
  const latex = (e: Expr) => toLatex(e)

  if (spec.kind === 'plane') {
    spec.plots.forEach((p, i) => {
      const domain = p.domain ? `\\left\\{${n(p.domain[0])}\\le x\\le ${n(p.domain[1])}\\right\\}` : ''
      add({ latex: `y=${latex(p.expr)}${domain}`, color: p.color ? HEX[p.color] : CYCLE[i % CYCLE.length], lineStyle: p.dashed ? 'DASHED' : 'SOLID' })
    })
    spec.shades.forEach((s, i) => add({ latex: `${s.axis}${OPS[s.op]}${latex(s.expr)}`, color: s.color ? HEX[s.color] : CYCLE[i % CYCLE.length] }))
    spec.vlines.forEach((v) => add({ latex: `x=${n(v.x)}`, lineStyle: v.dashed ? 'DASHED' : 'SOLID', color: '#64748b' }))
    spec.lines.forEach((l) => {
      const [[x0, y0], [x1, y1]] = [l.from, l.to]
      add({ latex: Math.abs(x1 - x0) < 1e-12 ? `x=${n(x0)}` : `y=${n((y1 - y0) / (x1 - x0))}\\left(x-${n(x0)}\\right)+${n(y0)}`, lineStyle: l.dashed ? 'DASHED' : 'SOLID' })
    })
    // A two-point polygon draws as a segment.
    spec.segments.forEach((s) => add({ latex: `\\operatorname{polygon}\\left(${pt(s.from)},${pt(s.to)}\\right)`, fillOpacity: 0, lineStyle: s.dashed ? 'DASHED' : 'SOLID', color: '#64748b' }))
    spec.polygons.forEach((p) => add({ latex: `\\operatorname{polygon}\\left(${p.pts.map(pt).join(',')}\\right)` }))
    spec.circles.forEach((c) => add({ latex: `\\left(x-${n(c.center[0])}\\right)^{2}+\\left(y-${n(c.center[1])}\\right)^{2}=${n(c.r * c.r)}` }))
    spec.points.forEach((p) => add({ latex: pt(p.at), label: p.label ?? '', showLabel: !!p.label, pointStyle: p.open ? 'OPEN' : 'POINT', color: '#1e293b' }))
    return { exprs, bounds: { left: spec.x[0], right: spec.x[1], bottom: spec.y[0], top: spec.y[1] } }
  }
  if (spec.kind === 'scatter') {
    exprs.push({
      id: 'fig-table',
      type: 'table',
      columns: [
        { latex: 'x_{1}', values: spec.data.map((p) => n(p[0])) },
        { latex: 'y_{1}', values: spec.data.map((p) => n(p[1])), points: true, lines: false, color: '#2563eb' },
      ],
    })
    spec.fits.forEach((f) => add({ latex: `y=${latex(f.expr)}`, color: '#e11d48', lineStyle: f.dashed ? 'DASHED' : 'SOLID' }))
    const xs = spec.data.map((p) => p[0])
    const ys = spec.data.map((p) => p[1])
    const pad = (lo: number, hi: number) => { const d = (hi - lo || 1) * 0.15; return [lo - d, hi + d] as const }
    const [left, right] = spec.x ?? pad(Math.min(...xs), Math.max(...xs))
    const [bottom, top] = spec.y ?? pad(Math.min(...ys), Math.max(...ys))
    return { exprs, bounds: { left, right, bottom, top } }
  }
  return { exprs }
}

// ── Provider + panel ────────────────────────────────────────────────────────

function storageKey(guideId: string, mode: Mode) {
  return `cs:desmos:${guideId}:${mode}`
}

/**
 * Wraps a guide view. When `mode` is set (and an API key exists) it shows a
 * floating "Calculator" button (or lets the Explain dock show it, with
 * showButton={false}) and lets figures open in Desmos.
 */
export function DesmosProvider({ guideId, mode, showButton = true, children }: { guideId: string; mode: Mode | null; showButton?: boolean; children: ReactNode }) {
  const enabled = !!API_KEY && !!mode
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<Mode>(mode ?? 'graphing')
  const [pending, setPending] = useState<GraphSpec | null>(null)

  const api = useMemo<DesmosApi | null>(() => (enabled ? {
    openWith: (spec) => { setActive('graphing'); setPending(spec); setOpen(true) },
    open: () => setOpen(true),
  } : null), [enabled])

  if (!enabled) return <>{children}</>
  return (
    <DesmosContext.Provider value={api}>
      {children}
      {!open && showButton && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 left-6 z-40 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-lg transition hover:border-blue-300 hover:text-blue-700 print:hidden"
        >
          <Calculator className="h-4 w-4 text-blue-600" /> Calculator
        </button>
      )}
      {open && (
        <DesmosPanel
          guideId={guideId}
          mode={active}
          onMode={setActive}
          onClose={() => setOpen(false)}
          pending={pending}
          onPendingApplied={() => setPending(null)}
        />
      )}
    </DesmosContext.Provider>
  )
}

function DesmosPanel({ guideId, mode, onMode, onClose, pending, onPendingApplied }: {
  guideId: string; mode: Mode; onMode: (m: Mode) => void; onClose: () => void
  pending: GraphSpec | null; onPendingApplied: () => void
}) {
  const hostRef = useRef<HTMLDivElement>(null)
  const calcRef = useRef<DesmosCalc | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  // Desmos switches to a cramped phone layout under ~500px, so start wide.
  const [wide, setWide] = useState(true)

  const save = useCallback(() => {
    const calc = calcRef.current
    if (!calc) return
    try { localStorage.setItem(storageKey(guideId, mode), JSON.stringify(calc.getState())) } catch { /* storage unavailable */ }
  }, [guideId, mode])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    setStatus('loading')
    loadDesmos().then(() => {
      if (cancelled || !hostRef.current || !window.Desmos) return
      const opts = { settingsMenu: false, border: false, expressionsCollapsed: false }
      const calc = mode === 'graphing' ? window.Desmos.GraphingCalculator(hostRef.current, opts) : window.Desmos.ScientificCalculator(hostRef.current, { border: false })
      calcRef.current = calc
      try {
        const saved = localStorage.getItem(storageKey(guideId, mode))
        if (saved) calc.setState(JSON.parse(saved))
      } catch { /* ignore bad saved state */ }
      calc.observeEvent('change', () => {
        clearTimeout(timer)
        timer = setTimeout(save, 600)
      })
      setStatus('ready')
    }).catch(() => { if (!cancelled) setStatus('error') })
    return () => {
      cancelled = true
      clearTimeout(timer)
      save()
      calcRef.current?.destroy()
      calcRef.current = null
    }
  }, [guideId, mode, save])

  // Load a figure once the graphing calculator is up.
  useEffect(() => {
    const calc = calcRef.current
    if (!pending || status !== 'ready' || !calc || mode !== 'graphing') return
    const { exprs, bounds } = figureToDesmos(pending)
    const old = calc.getExpressions().filter((e) => String(e.id).startsWith('fig-'))
    if (old.length) calc.removeExpressions(old)
    for (const e of exprs) {
      try { calc.setExpression(e) } catch { /* skip anything Desmos rejects */ }
    }
    if (bounds) calc.setMathBounds?.(bounds)
    onPendingApplied()
  }, [pending, status, mode, onPendingApplied])

  useEffect(() => { calcRef.current?.resize() }, [wide])

  return (
    <aside
      className={cn(
        'fixed inset-x-0 bottom-0 z-50 flex h-[62vh] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl print:hidden',
        'sm:inset-x-auto sm:bottom-24 sm:right-4 sm:top-20 sm:h-auto sm:rounded-2xl',
        wide ? 'sm:w-[min(680px,calc(100vw-2rem))]' : 'sm:w-[420px]',
      )}
      aria-label="Desmos calculator"
    >
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2">
        <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
          {(['graphing', 'scientific'] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onMode(m)}
              className={cn('rounded-md px-3 py-1 font-medium capitalize transition', m === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
            >
              {m}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-1">
          <button type="button" onClick={() => setWide((w) => !w)} className="hidden rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 sm:block" aria-label={wide ? 'Make narrower' : 'Make wider'}>
            {wide ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close calculator">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="relative min-h-0 flex-1">
        <div ref={hostRef} className="absolute inset-0" />
        {status === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Loading calculator…</div>}
        {status === 'error' && <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-slate-500">The calculator could not load. Check your connection and try again.</div>}
      </div>
    </aside>
  )
}
