"use client"

// On-demand Desmos calculator for math/science guides (the SAT and several AP
// exams give students Desmos, so practicing with it matters). The API script
// loads only when the student opens the panel. Hidden entirely unless
// NEXT_PUBLIC_DESMOS_API_KEY is set. Calculator state is a per-browser
// convenience, saved in localStorage under cs:desmos:<guideId>:<mode>; the
// calculator the student last picked for a guide is cs:desmos:<guideId>:mode.

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Calculator, GripHorizontal, RotateCcw, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toLatex, type Expr } from '@/lib/graphs/expr'
import type { GraphSpec, Pt } from '@/lib/graphs/spec'
import type { CalculatorMode as Mode } from '@/lib/formats/figures'
import { DesmosContext, DesmosSheetContext, type DesmosApi } from './desmos-context'

const MODES: { value: Mode; label: string }[] = [
  { value: 'basic', label: 'Basic' },
  { value: 'scientific', label: 'Scientific' },
  { value: 'graphing', label: 'Graphing' },
]

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
      FourFunctionCalculator: (el: HTMLElement, opts?: Record<string, unknown>) => DesmosCalc
    }
  }
}

const API_KEY = process.env.NEXT_PUBLIC_DESMOS_API_KEY
const API_VERSION = 'v1.11'

// The script is ~1 MB gzipped (~4 MB parsed) and Desmos only lets browsers
// cache it for 5 minutes, so on a slow connection it can take a while. Callers
// start it early (preload) when a student is about to need it, and a stalled
// download gives up after LOAD_TIMEOUT_MS so the panel can offer "Try again".
const LOAD_TIMEOUT_MS = 25_000
let loader: Promise<void> | null = null
function loadDesmos(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.Desmos) return Promise.resolve()
  loader ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement('script')
    const fail = () => {
      clearTimeout(timer)
      s.remove()
      loader = null
      reject(new Error('Desmos failed to load'))
    }
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS)
    s.src = `https://www.desmos.com/api/${API_VERSION}/calculator.js?apiKey=${encodeURIComponent(API_KEY ?? '')}`
    s.async = true
    s.onload = () => { clearTimeout(timer); window.Desmos ? resolve() : fail() }
    s.onerror = fail
    document.head.appendChild(s)
  })
  return loader
}

/** Starts downloading Desmos in the background; safe to call often. */
function preloadDesmos() {
  if (API_KEY) loadDesmos().catch(() => { /* the panel shows the error if it's opened */ })
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

/** A walkthrough's expressions (+ optional data table) as Desmos expression objects. */
export function setupToDesmos(setup: DesmosSetup): { exprs: Record<string, unknown>[]; bounds?: DesmosSetup['bounds'] } {
  const exprs: Record<string, unknown>[] = setup.expressions.slice(0, 20).map((latex, i) => ({ id: `help-${i}`, latex, color: CYCLE[i % CYCLE.length] }))
  if (setup.table?.length) {
    exprs.unshift({
      id: 'help-table',
      type: 'table',
      columns: [
        { latex: 'x_{1}', values: setup.table.map((p) => n(p[0])) },
        { latex: 'y_{1}', values: setup.table.map((p) => n(p[1])), points: true, lines: false, color: '#2563eb' },
      ],
    })
  }
  return { exprs, bounds: setup.bounds }
}

// ── Provider + panel ────────────────────────────────────────────────────────

function storageKey(guideId: string, mode: Mode) {
  return `cs:desmos:${guideId}:${mode}`
}
const modeKey = (guideId: string) => `cs:desmos:${guideId}:mode`

function savedMode(guideId: string): Mode | null {
  try {
    const v = localStorage.getItem(modeKey(guideId))
    return MODES.some((m) => m.value === v) ? (v as Mode) : null
  } catch { return null }
}

/** Expressions (Desmos LaTeX) plus optional data table and window, e.g. from a "Solve it in Desmos" answer. */
export interface DesmosSetup { expressions: string[]; table?: Pt[]; bounds?: { left: number; right: number; bottom: number; top: number } }
type Pending = { kind: 'figure'; spec: GraphSpec } | { kind: 'setup'; setup: DesmosSetup }

/**
 * Wraps a guide view. When `mode` is set (and an API key exists) it shows a
 * floating "Calculator" button (or lets the Explain dock show it, with
 * showButton={false}) and lets figures and Desmos walkthroughs load into it.
 */
export function DesmosProvider({ guideId, mode, showButton = true, children }: { guideId: string; mode: Mode | null; showButton?: boolean; children: ReactNode }) {
  const enabled = !!API_KEY && !!mode
  const [open, setOpen] = useState(false)
  const [active, setActiveState] = useState<Mode>(mode ?? 'graphing')
  const [pending, setPending] = useState<Pending | null>(null)
  // Phone sheet height lives here so the Explain panel can split the screen with it.
  const [sheetVh, setSheetVh] = useState(55)
  const desktop = useIsDesktop()

  // The guide's default (basic for middle school), unless the student picked another one here before.
  useEffect(() => { if (mode) setActiveState(savedMode(guideId) ?? mode) }, [guideId, mode])
  const setActive = useCallback((m: Mode) => {
    setActiveState(m)
    try { localStorage.setItem(modeKey(guideId), m) } catch { /* storage unavailable */ }
  }, [guideId])

  const api = useMemo<DesmosApi | null>(() => (enabled ? {
    // Figures and walkthroughs need graphing; switching for them isn't remembered.
    openWith: (spec) => { setActiveState('graphing'); setPending({ kind: 'figure', spec }); setOpen(true) },
    load: (setup) => { setActiveState('graphing'); setPending({ kind: 'setup', setup }); setOpen(true) },
    open: () => setOpen(true),
    preload: preloadDesmos,
    graphing: mode === 'graphing',
  } : null), [enabled, mode])

  if (!enabled) return <>{children}</>
  return (
    <DesmosContext.Provider value={api}>
      <DesmosSheetContext.Provider value={open && !desktop ? sheetVh : null}>
        {children}
      </DesmosSheetContext.Provider>
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
          desktop={desktop}
          sheetVh={sheetVh}
          onSheetVh={setSheetVh}
        />
      )}
    </DesmosContext.Provider>
  )
}

// ── Panel geometry: draggable + resizable on desktop, height-adjustable sheet on phones ──

interface Rect { x: number; y: number; w: number; h: number }
const RECT_KEY = 'cs:desmos:rect'
const MIN_W = 340
const MIN_H = 320

function useIsDesktop(): boolean {
  const [desktop, setDesktop] = useState(true)
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 640px)')
    setDesktop(mq.matches)
    const on = () => setDesktop(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return desktop
}

/** Default: left side, below the header, leaving the bottom-left dock visible. */
function defaultRect(): Rect {
  const vw = window.innerWidth, vh = window.innerHeight
  const w = Math.min(640, vw - 32)
  return { x: 16, y: 80, w, h: Math.max(MIN_H, vh - 80 - 120) }
}

function clampRect(r: Rect): Rect {
  const vw = window.innerWidth, vh = window.innerHeight
  const w = Math.min(Math.max(r.w, MIN_W), vw - 16)
  const h = Math.min(Math.max(r.h, MIN_H), vh - 16)
  return { w, h, x: Math.min(Math.max(r.x, 8), vw - w - 8), y: Math.min(Math.max(r.y, 8), vh - 48) }
}

/** Pointer-drag helper: calls onMove with the pointer delta since the drag started. */
function startDrag(e: React.PointerEvent, onMove: (dx: number, dy: number) => void, onEnd?: () => void) {
  if (e.button !== 0) return
  e.preventDefault()
  const sx = e.clientX, sy = e.clientY
  const prevSelect = document.body.style.userSelect
  document.body.style.userSelect = 'none'
  const move = (ev: PointerEvent) => onMove(ev.clientX - sx, ev.clientY - sy)
  const up = () => {
    window.removeEventListener('pointermove', move)
    window.removeEventListener('pointerup', up)
    window.removeEventListener('pointercancel', up)
    document.body.style.userSelect = prevSelect
    onEnd?.()
  }
  window.addEventListener('pointermove', move)
  window.addEventListener('pointerup', up)
  window.addEventListener('pointercancel', up)
}

function DesmosPanel({ guideId, mode, onMode, onClose, pending, onPendingApplied, desktop, sheetVh, onSheetVh }: {
  guideId: string; mode: Mode; onMode: (m: Mode) => void; onClose: () => void
  pending: Pending | null; onPendingApplied: () => void
  desktop: boolean; sheetVh: number; onSheetVh: (vh: number) => void
}) {
  // State, not a ref: on desktop the panel renders nothing until its saved
  // position is read, so the calculator must wait for the container to exist.
  // (With a ref, an already-loaded Desmos resolved before the container
  // mounted and the panel sat on "Loading calculator…" forever.)
  const [host, setHost] = useState<HTMLDivElement | null>(null)
  const calcRef = useRef<DesmosCalc | null>(null)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [attempt, setAttempt] = useState(0)
  const [rect, setRect] = useState<Rect | null>(null)
  const rectRef = useRef<Rect | null>(null)
  rectRef.current = rect

  // Restore the last position/size (clamped to this window).
  useEffect(() => {
    let saved: Rect | null = null
    try { saved = JSON.parse(localStorage.getItem(RECT_KEY) || 'null') } catch { /* ignore */ }
    setRect(clampRect(saved ?? defaultRect()))
    const onResize = () => setRect((r) => (r ? clampRect(r) : r))
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])
  const persist = () => {
    try { if (rectRef.current) localStorage.setItem(RECT_KEY, JSON.stringify(rectRef.current)) } catch { /* storage unavailable */ }
  }

  const save = useCallback(() => {
    const calc = calcRef.current
    if (!calc) return
    try { localStorage.setItem(storageKey(guideId, mode), JSON.stringify(calc.getState())) } catch { /* storage unavailable */ }
  }, [guideId, mode])

  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | undefined
    setStatus('loading')
    if (!host) return
    loadDesmos().then(() => {
      if (cancelled || !window.Desmos) return
      const opts = { settingsMenu: false, border: false, expressionsCollapsed: false }
      const calc = mode === 'graphing' ? window.Desmos.GraphingCalculator(host, opts)
        : mode === 'scientific' ? window.Desmos.ScientificCalculator(host, { border: false })
        : window.Desmos.FourFunctionCalculator(host, { border: false })
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
  }, [host, guideId, mode, save, attempt])

  // Desmos has to be told when its container changes size.
  useEffect(() => {
    if (!host) return
    const ro = new ResizeObserver(() => calcRef.current?.resize())
    ro.observe(host)
    return () => ro.disconnect()
  }, [host])

  // Load a figure or a walkthrough setup once the graphing calculator is up.
  useEffect(() => {
    const calc = calcRef.current
    if (!pending || status !== 'ready' || !calc || mode !== 'graphing') return
    const old = calc.getExpressions().filter((e) => /^(fig|help)-/.test(String(e.id)))
    if (old.length) calc.removeExpressions(old)
    const { exprs, bounds } = pending.kind === 'figure' ? figureToDesmos(pending.spec) : setupToDesmos(pending.setup)
    for (const e of exprs) {
      try { calc.setExpression(e) } catch { /* skip anything Desmos rejects */ }
    }
    if (bounds) calc.setMathBounds?.(bounds)
    onPendingApplied()
  }, [pending, status, mode, onPendingApplied])

  const header = (
    <div
      className={cn('flex items-center gap-2 border-b border-slate-200 px-3 py-2', desktop && 'cursor-move touch-none')}
      onPointerDown={desktop ? (e) => {
        if ((e.target as HTMLElement).closest('button')) return
        const start = rectRef.current
        if (!start) return
        startDrag(e, (dx, dy) => setRect(clampRect({ ...start, x: start.x + dx, y: start.y + dy })), persist)
      } : undefined}
    >
      {desktop && <GripHorizontal className="h-4 w-4 shrink-0 text-slate-300" aria-hidden />}
      <div className="flex rounded-lg bg-slate-100 p-0.5 text-sm">
        {MODES.map((m) => (
          <button
            key={m.value}
            type="button"
            onClick={() => onMode(m.value)}
            className={cn('rounded-md px-2.5 py-1 font-medium transition', m.value === mode ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
          >
            {m.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-1">
        {desktop && (
          <button type="button" onClick={() => { const r = clampRect(defaultRect()); setRect(r); rectRef.current = r; persist() }} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Reset size and position" title="Reset size and position">
            <RotateCcw className="h-4 w-4" />
          </button>
        )}
        <button type="button" onClick={onClose} className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800" aria-label="Close calculator">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )

  const body = (
    <div className="relative isolate min-h-0 flex-1">
      {/* isolate: Desmos's own z-indexes stay inside, so the resize grip stays on top. */}
      <div ref={setHost} className="absolute inset-0" />
      {status === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-sm text-slate-500">Loading calculator…</div>}
      {status === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-sm text-slate-500">
          The calculator could not load. Check your connection and try again.
          <button type="button" onClick={() => setAttempt((a) => a + 1)} className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white hover:bg-blue-700">Try again</button>
        </div>
      )}
    </div>
  )

  if (!desktop) {
    return (
      <aside style={{ height: `${sheetVh}vh` }} className="fixed inset-x-0 bottom-0 z-50 flex flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl print:hidden" aria-label="Desmos calculator">
        {/* Drag the handle to make the sheet taller or shorter. */}
        <div
          className="flex h-5 shrink-0 touch-none items-center justify-center"
          onPointerDown={(e) => {
            const start = sheetVh
            startDrag(e, (_dx, dy) => onSheetVh(Math.min(85, Math.max(30, start - (dy / window.innerHeight) * 100))))
          }}
          aria-label="Resize calculator"
        >
          <span className="h-1.5 w-10 rounded-full bg-slate-300" />
        </div>
        {header}
        {body}
      </aside>
    )
  }

  if (!rect) return null
  return (
    <aside
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
      className="fixed z-50 flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl print:hidden"
      aria-label="Desmos calculator"
    >
      {header}
      {body}
      {/* Corner grip: drag to resize. */}
      <div
        className="absolute bottom-0 right-0 z-20 h-6 w-6 cursor-nwse-resize touch-none rounded-tl-md bg-white/80"
        onPointerDown={(e) => {
          const start = rectRef.current
          if (!start) return
          startDrag(e, (dx, dy) => setRect(clampRect({ ...start, w: start.w + dx, h: start.h + dy })), persist)
        }}
        aria-label="Resize calculator"
        title="Drag to resize"
      >
        <svg viewBox="0 0 10 10" className="absolute bottom-1 right-1 h-2.5 w-2.5 text-slate-400" aria-hidden>
          <path d="M9 1 L1 9 M9 5 L5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </div>
    </aside>
  )
}
