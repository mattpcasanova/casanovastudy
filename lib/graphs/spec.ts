// Parser for ```graph fences: a small line-based description of a figure that
// GraphFigure draws as SVG. The generator writes the numbers; we draw them
// exactly, so a figure can't disagree with the question it belongs to.
//
// Every line is "key: value", with optional " | " parts after the value:
// modifiers (dashed, open, closed, hide, red/blue/green/orange/purple/gray)
// or a label. Unknown or malformed lines are skipped with a warning; the parse
// only fails when nothing drawable is left.
//
// kind: plane      x: -6, 6 / y: -4, 8 / grid: 1
//                  plot: x^2 - 2x - 3 | f      (optional "for -2 <= x <= 3")
//                  point: (3, 0) | P            segment: (0,0) (2,4) | dashed
//                  line: (0,1) (2,5)            vline: x = 1 | dashed
//                  shade: y > 2x + 1            polygon: (0,0) (4,0) (0,3)
//                  circle: (0,0) 5              text: (2, 3) | label
// kind: geometry   point: A (0, 0)   polygon: A B C (| shaded)   segment: A C | dashed
//                  sector: O A B     (shaded wedge from OA to OB)
//                  side: A B | 6     angle: A B C | 40°  right-angle: A B C
//                  tick: A B | 2     circle: O 5  (or "circle: O A" through A)
//                  note: not drawn to scale
// kind: scatter    data: (1, 62) (2, 65) …   fit: 4.1x + 58
// kind: bar        bar: Label | 12
// kind: histogram  bin: 0-10 | 4
// kind: dotplot    data: 1, 2, 2, 3   (or  value: 3 | 4  = four dots at 3)
// kind: boxplot    box: min, q1, median, q3, max | label
// kind: numberline point: 4 | open   interval: (-2, 3]   (inf / -inf for rays)
// Chemistry kinds (energy-well, reaction, lewis, vsepr, molecule): lib/chem/specs.ts
// Shared: title:, caption:, x-label:, y-label:

import { ExprError, evaluate, parseExpr, type Expr } from './expr'
import { parseDiagram, type DiagramData } from './diagram'
import { parsePedigree, parsePunnett, type BioSpec } from '@/lib/bio/specs'
import { parseFreeBody, type FreeBodyData } from '@/lib/physics/fbd'
import { parseEnergyWell, parseLewis, parseMolecule, parseReaction, parseVsepr, type ChemSpec } from '@/lib/chem/specs'

export type Color = 'blue' | 'red' | 'green' | 'orange' | 'purple' | 'gray'
export type Pt = [number, number]

interface Mods {
  dashed: boolean
  open: boolean
  hide: boolean
  shaded: boolean
  color?: Color
  label?: string
}

export interface PlotItem { expr: Expr; source: string; label?: string; dashed: boolean; color?: Color; domain?: [number, number] }
export interface PointItem { at: Pt; label?: string; open: boolean; color?: Color }
export interface SegItem { from: Pt; to: Pt; label?: string; dashed: boolean; color?: Color }
export interface ShadeItem { axis: 'y' | 'x'; op: '<' | '<=' | '>' | '>='; expr: Expr; source: string; color?: Color }
export interface PolyItem { pts: Pt[]; label?: string; dashed: boolean; color?: Color }
export interface CircleItem { center: Pt; r: number; dashed: boolean; color?: Color }
export interface TextItem { at: Pt; text: string }
export interface VectorItem { from: Pt; to: Pt; label?: string; color?: Color; components: boolean }

interface Common {
  title?: string
  caption?: string
  xLabel?: string
  yLabel?: string
  notes: string[]
}

export interface PlaneSpec extends Common {
  kind: 'plane'
  x: [number, number]
  y: [number, number]
  grid: number | null // step; null = auto
  plots: PlotItem[]
  points: PointItem[]
  segments: SegItem[]
  lines: SegItem[] // infinite lines through two points
  vlines: { x: number; label?: string; dashed: boolean; color?: Color }[]
  shades: ShadeItem[]
  polygons: PolyItem[]
  circles: CircleItem[]
  texts: TextItem[]
  vectors: VectorItem[]
}

export interface GeoPoint { name: string; at: Pt; hide: boolean }
export interface GeometrySpec extends Common {
  kind: 'geometry'
  points: GeoPoint[]
  polygons: { names: string[]; dashed: boolean; shaded: boolean; color?: Color }[]
  /** Shaded wedge of a circle: center, then the two points on its edges. */
  sectors: { center: string; a: string; b: string; color?: Color }[]
  segments: { a: string; b: string; dashed: boolean; label?: string; color?: Color }[]
  sides: { a: string; b: string; label: string }[]
  angles: { a: string; v: string; b: string; label?: string }[]
  rightAngles: { a: string; v: string; b: string }[]
  ticks: { a: string; b: string; count: number }[]
  circles: { center: string; r: number; dashed: boolean; color?: Color }[]
  notToScale: boolean
}

export interface ScatterSpec extends Common {
  kind: 'scatter'
  x?: [number, number]
  y?: [number, number]
  data: Pt[]
  fits: { expr: Expr; source: string; label?: string; dashed: boolean }[]
}

export interface BarSpec extends Common {
  kind: 'bar'
  bars: { label: string; value: number; color?: Color }[]
  y?: [number, number]
}

export interface HistogramSpec extends Common {
  kind: 'histogram'
  bins: { from: number; to: number; count: number }[]
  y?: [number, number]
}

export interface DotplotSpec extends Common {
  kind: 'dotplot'
  x?: [number, number]
  values: { value: number; count: number }[]
}

export interface BoxplotSpec extends Common {
  kind: 'boxplot'
  x?: [number, number]
  boxes: { five: [number, number, number, number, number]; label?: string }[]
}

export interface NumberlineSpec extends Common {
  kind: 'numberline'
  x?: [number, number]
  points: { at: number; open: boolean; label?: string }[]
  intervals: { from: number; to: number; openFrom: boolean; openTo: boolean }[]
}

export interface DiagramSpec extends Common { kind: 'diagram'; data: DiagramData }
export interface FreeBodySpec extends Common { kind: 'free-body'; data: FreeBodyData }

export type GraphSpec = PlaneSpec | GeometrySpec | ScatterSpec | BarSpec | HistogramSpec | DotplotSpec | BoxplotSpec | NumberlineSpec | DiagramSpec | FreeBodySpec | ChemSpec | BioSpec
// energy-well is not its own drawn kind: it parses into a plane.
export type GraphKind = GraphSpec['kind'] | 'energy-well'

export type ParseResult = { ok: true; spec: GraphSpec; warnings: string[] } | { ok: false; error: string; warnings: string[] }

export const GRAPH_FENCE_LANGS = /^(graph|plot|chart|figure|molecule|lewis|model|diagram)$/i

const MAX_ITEMS = 200
const MAX_SPAN = 1e6
const COLORS: Color[] = ['blue', 'red', 'green', 'orange', 'purple', 'gray']
const KIND_ALIASES: Record<string, GraphKind> = {
  plane: 'plane', coordinate: 'plane', 'coordinate-plane': 'plane', function: 'plane', functions: 'plane', graph: 'plane', xy: 'plane',
  geometry: 'geometry', figure: 'geometry',
  scatter: 'scatter', scatterplot: 'scatter', 'scatter-plot': 'scatter',
  bar: 'bar', 'bar-chart': 'bar', barchart: 'bar',
  histogram: 'histogram',
  dotplot: 'dotplot', 'dot-plot': 'dotplot',
  boxplot: 'boxplot', 'box-plot': 'boxplot', 'box-and-whisker': 'boxplot',
  numberline: 'numberline', 'number-line': 'numberline',
  'energy-well': 'energy-well', 'potential-energy': 'energy-well', 'bond-energy': 'energy-well', morse: 'energy-well', 'energy-curve': 'energy-well',
  reaction: 'reaction', 'reaction-energy': 'reaction', 'energy-diagram': 'reaction', 'reaction-coordinate': 'reaction',
  lewis: 'lewis', 'lewis-structure': 'lewis', 'lewis-dot': 'lewis',
  vsepr: 'vsepr', 'molecular-geometry': 'vsepr', shape: 'vsepr',
  molecule: 'molecule', '3d-molecule': 'molecule', compound: 'molecule',
  punnett: 'punnett', 'punnett-square': 'punnett', cross: 'punnett',
  'free-body': 'free-body', fbd: 'free-body', 'free-body-diagram': 'free-body', forces: 'free-body', 'force-diagram': 'free-body',
  pedigree: 'pedigree', 'pedigree-chart': 'pedigree', 'family-tree': 'pedigree',
  diagram: 'diagram', 'concept-map': 'diagram', flowchart: 'diagram', 'cause-effect': 'diagram', 'food-web': 'diagram', network: 'diagram', 'feedback-loop': 'diagram',
}

// ── Small helpers ───────────────────────────────────────────────────────────

/** A number, fraction or constant expression: "3", "-1/2", "sqrt(2)", "2pi". */
export function num(s: string): number | null {
  const t = s.trim().replace(/°$/, '')
  if (!t) return null
  if (/^[+-]?(inf|infinity|∞)$/i.test(t)) return t.startsWith('-') ? -Infinity : Infinity
  try {
    const e = parseExpr(t)
    if (usesX(e)) return null
    const v = evaluate(e, 0)
    return Number.isFinite(v) ? v : null
  } catch {
    return null
  }
}

function usesX(e: Expr): boolean {
  switch (e.t) {
    case 'x': return true
    case 'num': case 'const': return false
    case 'neg': case 'call': return usesX(e.a)
    case 'bin': return usesX(e.a) || usesX(e.b)
  }
}

/** Splits on top-level commas (ignores commas inside parentheses). */
function splitTop(s: string, sep = ','): string[] {
  const out: string[] = []
  let depth = 0
  let cur = ''
  for (const c of s) {
    if (c === '(' || c === '[') depth++
    if (c === ')' || c === ']') depth--
    if (c === sep && depth === 0) { out.push(cur); cur = ''; continue }
    cur += c
  }
  out.push(cur)
  return out.map((p) => p.trim()).filter(Boolean)
}

/** All "(x, y)" pairs in a string, in order. */
export function pairs(s: string): Pt[] {
  const out: Pt[] = []
  let depth = 0
  let start = -1
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '(') { if (depth === 0) start = i; depth++ }
    else if (s[i] === ')') {
      depth--
      if (depth === 0 && start >= 0) {
        const parts = splitTop(s.slice(start + 1, i))
        if (parts.length === 2) {
          const a = num(parts[0])
          const b = num(parts[1])
          if (a !== null && b !== null && Number.isFinite(a) && Number.isFinite(b)) out.push([a, b])
        }
        start = -1
      }
    }
  }
  return out
}

function range(s: string): [number, number] | null {
  const parts = splitTop(s.trim().replace(/^[[(]|[\])]$/g, '').replace(/\bto\b|\.\.|…/g, ','))
  if (parts.length !== 2) return null
  const a = num(parts[0])
  const b = num(parts[1])
  if (a === null || b === null || !Number.isFinite(a) || !Number.isFinite(b) || a >= b || b - a > MAX_SPAN) return null
  return [a, b]
}

function splitMods(value: string): { main: string; mods: Mods } {
  // Split on " | " but keep absolute-value bars balanced: "|x - 2| | dashed".
  const raw = value.split(/\s+\|\s+/)
  const parts: string[] = []
  for (const r of raw) {
    const prev = parts[parts.length - 1]
    if (prev !== undefined && parts.length === 1 && (prev.match(/\|/g)?.length ?? 0) % 2 === 1) parts[0] = `${prev} | ${r}`
    else parts.push(r)
  }
  const [main, ...rest] = parts.map((p) => p.trim())
  const mods: Mods = { dashed: false, open: false, hide: false, shaded: false }
  const labels: string[] = []
  for (const r of rest) {
    const w = r.toLowerCase()
    if (w === 'dashed' || w === 'dotted') mods.dashed = true
    else if (w === 'open' || w === 'hollow') mods.open = true
    else if (w === 'closed' || w === 'filled' || w === 'solid') continue
    else if (w === 'hide' || w === 'hidden') mods.hide = true
    else if (w === 'shaded' || w === 'shade' || w === 'filled-in') mods.shaded = true
    else if ((COLORS as string[]).includes(w)) mods.color = w as Color
    else if (r) labels.push(r)
  }
  if (labels.length) mods.label = labels.join(' | ')
  return { main: main ?? '', mods }
}

function normKey(k: string): string {
  return k.trim().toLowerCase().replace(/[\s_]+/g, '-')
}

// ── Parse ───────────────────────────────────────────────────────────────────

export function parseGraphSpec(text: string): ParseResult {
  const warnings: string[] = []
  const lines: { key: string; value: string; raw: string }[] = []
  for (const raw of text.split('\n')) {
    const t = raw.trim().replace(/^[-*•]\s+/, '')
    if (!t || t.startsWith('#') || t.startsWith('//')) continue
    // Diagram edges ("A -> B | label") aren't key: value lines.
    const keyed = t.match(/^([A-Za-z][\w -]{0,20}?)\s*:/)
    if (/(<->|->|→|⟶|\s--\s|\s—\s)/.test(t) && (!keyed || /^edge$/i.test(keyed[1].trim()))) {
      lines.push({ key: 'edge', value: t.replace(/^edge\s*:\s*/i, ''), raw: t })
      continue
    }
    const m = t.match(/^([A-Za-z][\w -]{0,20}?)\s*:\s*(.*)$/)
    if (!m) { warnings.push(`Skipped "${t}"`); continue }
    lines.push({ key: normKey(m[1]), value: m[2].trim(), raw: t })
  }
  if (lines.length > MAX_ITEMS * 2) return { ok: false, error: 'Figure is too large', warnings }

  const kindLine = lines.find((l) => l.key === 'kind' || l.key === 'type')
  let kind: GraphKind | undefined = kindLine ? KIND_ALIASES[normKey(kindLine.value)] : undefined
  if (kindLine && !kind) warnings.push(`Unknown kind "${kindLine.value}"`)
  kind ??= inferKind(lines.map((l) => l.key), lines)

  const common: Common = { notes: [] }
  for (const { key, value } of lines) {
    if (key === 'title') common.title = value
    else if (key === 'caption') common.caption = value
    else if (key === 'x-label' || key === 'xlabel' || key === 'x-axis') common.xLabel = value
    else if (key === 'y-label' || key === 'ylabel' || key === 'y-axis') common.yLabel = value
    else if (key === 'note') common.notes.push(value)
  }
  const rest = lines.filter((l) => !['kind', 'type', 'title', 'caption', 'x-label', 'xlabel', 'x-axis', 'y-label', 'ylabel', 'y-axis'].includes(l.key))

  const parsers: Record<GraphKind, (ls: typeof rest, c: Common, w: string[]) => GraphSpec | string> = {
    plane: parsePlane,
    geometry: parseGeometry,
    scatter: parseScatter,
    bar: parseBar,
    histogram: parseHistogram,
    dotplot: parseDotplot,
    boxplot: parseBoxplot,
    numberline: parseNumberline,
    'energy-well': parseEnergyWell,
    reaction: parseReaction,
    lewis: parseLewis,
    vsepr: parseVsepr,
    molecule: parseMolecule,
    punnett: parsePunnett,
    'free-body': (ls, c, w) => {
      const d = parseFreeBody(ls, w)
      return typeof d === 'string' ? d : { ...c, kind: 'free-body', data: d }
    },
    pedigree: parsePedigree,
    diagram: (ls, c, w) => {
      const d = parseDiagram(ls, w)
      return typeof d === 'string' ? d : { ...c, kind: 'diagram', data: d }
    },
  }
  const result = parsers[kind](rest, common, warnings)
  if (typeof result === 'string') return { ok: false, error: result, warnings }
  return { ok: true, spec: result, warnings }
}

function inferKind(keys: string[], lines: { key: string; value: string }[]): GraphKind {
  const has = (k: string) => keys.includes(k)
  if (has('force')) return 'free-body'
  if (has('cross')) return 'punnett'
  if (has('person') || has('couple')) return 'pedigree'
  if (has('node') || (has('edge') && !has('point') && !has('plot'))) return 'diagram'
  if (has('depth') || has('bond-energy')) return 'energy-well'
  if (has('reactants') || has('transition')) return 'reaction'
  if (has('bonded')) return 'vsepr'
  if (has('center') || has('central')) return 'lewis'
  if (has('name') && !has('point')) return 'molecule'
  if (has('bar')) return 'bar'
  if (has('bin')) return 'histogram'
  if (has('box')) return 'boxplot'
  if (has('interval')) return 'numberline'
  if (has('fit')) return 'scatter'
  if (has('side') || has('angle') || has('right-angle') || has('tick')) return 'geometry'
  // "point: A (0, 0)" (named points) is geometry; "point: (3, 0)" is a plane.
  if (lines.some((l) => l.key === 'point' && /^[A-Za-z][A-Za-z0-9']*\s*\(/.test(l.value))) return 'geometry'
  if (has('data') && !has('plot')) return 'scatter'
  return 'plane'
}

type Lines = { key: string; value: string; raw: string }[]

function parsePlane(ls: Lines, c: Common, w: string[]): PlaneSpec | string {
  const s: PlaneSpec = {
    ...c, kind: 'plane', x: [-10, 10], y: [-10, 10], grid: null,
    plots: [], points: [], segments: [], lines: [], vlines: [], shades: [], polygons: [], circles: [], texts: [], vectors: [],
  }
  let xSet = false
  let ySet = false
  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    const count = s.plots.length + s.points.length + s.segments.length + s.polygons.length + s.texts.length
    if (count > MAX_ITEMS) { w.push('Too many items; the rest were dropped'); break }
    switch (key) {
      case 'x': case 'x-range': case 'xrange': case 'x-window': {
        const r = range(main); if (r) { s.x = r; xSet = true } else w.push(`Bad range "${raw}"`); break
      }
      case 'y': case 'y-range': case 'yrange': case 'y-window': {
        const r = range(main); if (r) { s.y = r; ySet = true } else w.push(`Bad range "${raw}"`); break
      }
      case 'window': {
        const ps = splitTop(main)
        const rx = ps.length === 4 ? range(`${ps[0]}, ${ps[1]}`) : null
        const ry = ps.length === 4 ? range(`${ps[2]}, ${ps[3]}`) : null
        if (rx && ry) { s.x = rx; s.y = ry; xSet = ySet = true } else w.push(`Bad window "${raw}"`)
        break
      }
      case 'grid': {
        const g = num(main)
        if (g !== null && g > 0) s.grid = g
        else if (/^(off|none|no)$/i.test(main)) s.grid = 0
        break
      }
      case 'plot': case 'function': case 'fn': {
        const dm = main.match(/^(.*?)\s*(?:,|\bfor\b|\{)\s*(.+?)\s*(<=?|≤)\s*x\s*(<=?|≤)\s*(.+?)\}?$/i)
        const src = dm ? dm[1] : main
        try {
          const expr = parseExpr(src)
          let domain: [number, number] | undefined
          if (dm) {
            const a = num(dm[2]); const b = num(dm[5])
            if (a !== null && b !== null && a < b) domain = [a, b]
          }
          s.plots.push({ expr, source: src, label: mods.label, dashed: mods.dashed, color: mods.color, domain })
        } catch (e) {
          w.push(`Bad function "${src}": ${e instanceof ExprError ? e.message : 'parse error'}`)
        }
        break
      }
      case 'point': case 'points': {
        const ps = pairs(main)
        if (!ps.length) { w.push(`Bad point "${raw}"`); break }
        for (const p of ps) s.points.push({ at: p, label: ps.length === 1 ? mods.label : undefined, open: mods.open, color: mods.color })
        break
      }
      case 'segment': case 'line': case 'ray': {
        const ps = pairs(main)
        if (ps.length !== 2) { w.push(`Bad ${key} "${raw}"`); break }
        const item = { from: ps[0], to: ps[1], label: mods.label, dashed: mods.dashed, color: mods.color }
        if (key === 'segment') s.segments.push(item); else s.lines.push(item)
        break
      }
      case 'vline': case 'vertical': case 'asymptote': {
        const m = main.match(/^(?:x\s*=\s*)?(.+)$/i)
        const v = m ? num(m[1]) : null
        if (v === null) { w.push(`Bad vline "${raw}"`); break }
        s.vlines.push({ x: v, label: mods.label, dashed: mods.dashed || key === 'asymptote', color: mods.color })
        break
      }
      case 'hline': case 'horizontal': {
        const m = main.match(/^(?:y\s*=\s*)?(.+)$/i)
        const v = m ? num(m[1]) : null
        if (v === null) { w.push(`Bad hline "${raw}"`); break }
        s.plots.push({ expr: { t: 'num', v }, source: String(v), label: mods.label, dashed: mods.dashed, color: mods.color })
        break
      }
      case 'shade': case 'inequality': {
        const m = main.match(/^([xy])\s*(<=|>=|<|>|≤|≥)\s*(.+)$/i)
        if (!m) { w.push(`Bad shade "${raw}"`); break }
        const op = ({ '≤': '<=', '≥': '>=' } as Record<string, ShadeItem['op']>)[m[2]] ?? (m[2] as ShadeItem['op'])
        try {
          const expr = parseExpr(m[3])
          const axis = m[1].toLowerCase() as 'x' | 'y'
          if (axis === 'x' && usesX(expr)) { w.push(`Bad shade "${raw}"`); break }
          s.shades.push({ axis, op, expr, source: m[3], color: mods.color })
        } catch { w.push(`Bad shade "${raw}"`) }
        break
      }
      case 'polygon': case 'triangle': case 'rectangle': {
        const ps = pairs(main)
        if (ps.length < 3) { w.push(`Bad polygon "${raw}"`); break }
        s.polygons.push({ pts: ps, label: mods.label, dashed: mods.dashed, color: mods.color })
        break
      }
      case 'circle': {
        const ps = pairs(main)
        const r = num(main.slice(main.lastIndexOf(')') + 1).replace(/^[\s,]*(r\s*=\s*)?/i, ''))
        if (ps.length !== 1 || r === null || r <= 0) { w.push(`Bad circle "${raw}"`); break }
        s.circles.push({ center: ps[0], r, dashed: mods.dashed, color: mods.color })
        break
      }
      case 'vector': case 'arrow': {
        const ps = pairs(main)
        if (ps.length < 1 || ps.length > 2) { w.push(`Bad vector "${raw}"`); break }
        const [from, to] = ps.length === 1 ? [[0, 0] as Pt, ps[0]] : [ps[0], ps[1]]
        const components = /\bcomponents?\b/i.test(value)
        const label = mods.label?.replace(/\bcomponents?\b/i, '').replace(/^\s*\|\s*|\s*\|\s*$/g, '').trim() || undefined
        s.vectors.push({ from, to, label, color: mods.color, components })
        break
      }
      case 'text': case 'label': {
        const ps = pairs(main)
        if (ps.length !== 1 || !mods.label) { w.push(`Bad text "${raw}"`); break }
        s.texts.push({ at: ps[0], text: mods.label })
        break
      }
      case 'note': break
      default: w.push(`Unknown line "${raw}"`)
    }
  }
  if (!s.plots.length && !s.points.length && !s.segments.length && !s.lines.length && !s.polygons.length && !s.circles.length && !s.shades.length && !s.vlines.length && !s.vectors.length) {
    return 'Nothing to draw'
  }
  if (!xSet || !ySet) autoWindow(s, xSet, ySet)
  return s
}

/** Fits the window around explicit points/shapes when x:/y: were not given. */
function autoWindow(s: PlaneSpec, xSet: boolean, ySet: boolean) {
  const xs: number[] = []
  const ys: number[] = []
  const add = ([x, y]: Pt) => { xs.push(x); ys.push(y) }
  s.points.forEach((p) => add(p.at))
  s.segments.forEach((p) => { add(p.from); add(p.to) })
  s.lines.forEach((p) => { add(p.from); add(p.to) })
  s.polygons.forEach((p) => p.pts.forEach(add))
  s.circles.forEach((c) => { add([c.center[0] - c.r, c.center[1] - c.r]); add([c.center[0] + c.r, c.center[1] + c.r]) })
  s.texts.forEach((t) => add(t.at))
  s.vectors.forEach((v) => { add(v.from); add(v.to) })
  s.vlines.forEach((v) => xs.push(v.x))
  if (!xSet && xs.length) s.x = padRange(Math.min(0, ...xs), Math.max(0, ...xs))
  if (!ySet && ys.length) s.y = padRange(Math.min(0, ...ys), Math.max(0, ...ys))
  if (!ySet && !ys.length && s.plots.length) {
    // Only functions: sample them over the x window and fit y.
    const vals: number[] = []
    for (const p of s.plots) {
      for (let i = 0; i <= 60; i++) {
        const x = s.x[0] + ((s.x[1] - s.x[0]) * i) / 60
        const v = evaluate(p.expr, x)
        if (Number.isFinite(v)) vals.push(v)
      }
    }
    if (vals.length) {
      vals.sort((a, b) => a - b)
      // Trim extreme tails so asymptotes don't flatten everything.
      const lo = vals[Math.floor(vals.length * 0.05)]
      const hi = vals[Math.ceil(vals.length * 0.95) - 1]
      s.y = padRange(Math.min(0, lo), Math.max(0, hi))
    }
  }
}

function padRange(lo: number, hi: number): [number, number] {
  if (hi - lo < 1e-9) { lo -= 5; hi += 5 }
  const pad = Math.max(1, (hi - lo) * 0.12)
  return [Math.floor(lo - pad), Math.ceil(hi + pad)]
}

function parseGeometry(ls: Lines, c: Common, w: string[]): GeometrySpec | string {
  const s: GeometrySpec = {
    ...c, kind: 'geometry', points: [], polygons: [], sectors: [], segments: [], sides: [], angles: [], rightAngles: [], ticks: [], circles: [],
    notToScale: c.notes.some((n) => /not\s+(drawn\s+)?to\s+scale/i.test(n)),
  }
  s.notes = c.notes.filter((n) => !/not\s+(drawn\s+)?to\s+scale/i.test(n))
  const names = (str: string) => str.split(/[\s,]+/).map((n) => n.trim()).filter(Boolean)
  const known = (ns: string[], raw: string) => {
    const missing = ns.filter((n) => !s.points.some((p) => p.name === n))
    if (missing.length) w.push(`Unknown point ${missing.join(', ')} in "${raw}"`)
    return missing.length === 0
  }

  // Points first so later lines can reference any of them.
  for (const { key, value, raw } of ls) {
    if (key !== 'point' && key !== 'points') continue
    for (const part of value.split(/;/)) {
      const { main, mods } = splitMods(part)
      const re = /([A-Za-z][A-Za-z0-9']*)\s*(?:=\s*)?\(([^()]*)\)/g
      let found = false
      for (let m = re.exec(main); m; m = re.exec(main)) {
        const p = pairs(`(${m[2]})`)[0]
        if (!p) continue
        found = true
        s.points = s.points.filter((q) => q.name !== m![1])
        s.points.push({ name: m[1], at: p, hide: mods.hide })
      }
      if (!found) w.push(`Bad point "${raw}"`)
    }
  }
  if (s.points.length > MAX_ITEMS) return 'Figure is too large'

  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    switch (key) {
      case 'point': case 'points': case 'note': break
      case 'polygon': case 'triangle': case 'quadrilateral': case 'rectangle': case 'shape': {
        const ns = names(main)
        if (ns.length < 3 || !known(ns, raw)) { if (ns.length < 3) w.push(`Bad polygon "${raw}"`); break }
        s.polygons.push({ names: ns, dashed: mods.dashed, shaded: mods.shaded, color: mods.color })
        break
      }
      case 'segment': case 'line': {
        const ns = names(main)
        if (ns.length !== 2 || !known(ns, raw)) { if (ns.length !== 2) w.push(`Bad segment "${raw}"`); break }
        s.segments.push({ a: ns[0], b: ns[1], dashed: mods.dashed, label: mods.label, color: mods.color })
        break
      }
      case 'side': case 'length': {
        const ns = names(main)
        if (ns.length !== 2 || !mods.label || !known(ns, raw)) { if (ns.length !== 2 || !mods.label) w.push(`Bad side "${raw}"`); break }
        s.sides.push({ a: ns[0], b: ns[1], label: mods.label })
        break
      }
      case 'angle': {
        const ns = names(main)
        if (ns.length !== 3 || !known(ns, raw)) { if (ns.length !== 3) w.push(`Bad angle "${raw}"`); break }
        s.angles.push({ a: ns[0], v: ns[1], b: ns[2], label: mods.label })
        break
      }
      case 'sector': case 'wedge': {
        const ns = names(main)
        if (ns.length !== 3 || !known(ns, raw)) { if (ns.length !== 3) w.push(`Bad sector "${raw}"`); break }
        s.sectors.push({ center: ns[0], a: ns[1], b: ns[2], color: mods.color })
        break
      }
      case 'right-angle': case 'rightangle': case 'right': {
        const ns = names(main)
        if (ns.length !== 3 || !known(ns, raw)) { if (ns.length !== 3) w.push(`Bad right angle "${raw}"`); break }
        s.rightAngles.push({ a: ns[0], v: ns[1], b: ns[2] })
        break
      }
      case 'tick': case 'ticks': case 'congruent': {
        const ns = names(main)
        const count = mods.label ? num(mods.label) : 1
        if (ns.length !== 2 || !known(ns, raw)) { if (ns.length !== 2) w.push(`Bad tick "${raw}"`); break }
        s.ticks.push({ a: ns[0], b: ns[1], count: Math.min(3, Math.max(1, Math.round(count ?? 1))) })
        break
      }
      case 'circle': {
        const [center, second] = names(main)
        if (!center || !second || !known([center], raw)) { if (!center || !second) w.push(`Bad circle "${raw}"`); break }
        const cp = s.points.find((p) => p.name === center)!.at
        const through = s.points.find((p) => p.name === second)
        const r = through ? Math.hypot(through.at[0] - cp[0], through.at[1] - cp[1]) : num(second.replace(/^r=/i, ''))
        if (!r || r <= 0) { w.push(`Bad circle "${raw}"`); break }
        s.circles.push({ center, r, dashed: mods.dashed, color: mods.color })
        break
      }
      default: w.push(`Unknown line "${raw}"`)
    }
  }
  if (!s.polygons.length && !s.segments.length && !s.circles.length && !s.sectors.length) return 'Nothing to draw'
  return s
}

function parseScatter(ls: Lines, c: Common, w: string[]): ScatterSpec | string {
  const s: ScatterSpec = { ...c, kind: 'scatter', data: [], fits: [] }
  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    if (key === 'data' || key === 'point' || key === 'points') s.data.push(...pairs(main))
    else if (key === 'fit' || key === 'plot' || key === 'line') {
      try { s.fits.push({ expr: parseExpr(main), source: main, label: mods.label, dashed: mods.dashed }) } catch { w.push(`Bad fit "${raw}"`) }
    } else if (key === 'x') { const r = range(main); if (r) s.x = r }
    else if (key === 'y') { const r = range(main); if (r) s.y = r }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (s.data.length > MAX_ITEMS) s.data = s.data.slice(0, MAX_ITEMS)
  if (!s.data.length) return 'No data points'
  return s
}

function parseBar(ls: Lines, c: Common, w: string[]): BarSpec | string {
  const s: BarSpec = { ...c, kind: 'bar', bars: [] }
  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    if (key === 'bar') {
      const v = mods.label ? num(mods.label) : null
      if (v === null || !main) { w.push(`Bad bar "${raw}"`); continue }
      s.bars.push({ label: main, value: v, color: mods.color })
    } else if (key === 'y') { const r = range(main); if (r) s.y = r }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!s.bars.length) return 'No bars'
  s.bars = s.bars.slice(0, 40)
  return s
}

function parseHistogram(ls: Lines, c: Common, w: string[]): HistogramSpec | string {
  const s: HistogramSpec = { ...c, kind: 'histogram', bins: [] }
  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    if (key === 'bin') {
      const m = main.match(/^(-?[\d.]+)\s*(?:-|–|to|,)\s*(-?[\d.]+)$/)
      const count = mods.label ? num(mods.label) : null
      if (!m || count === null || count < 0) { w.push(`Bad bin "${raw}"`); continue }
      const from = parseFloat(m[1]); const to = parseFloat(m[2])
      if (!(to > from)) { w.push(`Bad bin "${raw}"`); continue }
      s.bins.push({ from, to, count })
    } else if (key === 'y') { const r = range(main); if (r) s.y = r }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!s.bins.length) return 'No bins'
  s.bins.sort((a, b) => a.from - b.from)
  s.bins = s.bins.slice(0, 60)
  return s
}

function parseDotplot(ls: Lines, c: Common, w: string[]): DotplotSpec | string {
  const counts = new Map<number, number>()
  let x: [number, number] | undefined
  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    if (key === 'data') {
      for (const part of splitTop(main)) {
        const v = num(part)
        if (v === null) { w.push(`Bad value "${part}"`); continue }
        counts.set(v, (counts.get(v) ?? 0) + 1)
      }
    } else if (key === 'value') {
      const v = num(main)
      const n = mods.label ? num(mods.label) : 1
      if (v === null || n === null || n < 0) { w.push(`Bad value "${raw}"`); continue }
      counts.set(v, (counts.get(v) ?? 0) + Math.round(n))
    } else if (key === 'x') { const r = range(main); if (r) x = r }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!counts.size) return 'No data'
  const values = [...counts.entries()].map(([value, count]) => ({ value, count: Math.min(count, 50) })).sort((a, b) => a.value - b.value)
  return { ...c, kind: 'dotplot', x, values: values.slice(0, 60) }
}

function parseBoxplot(ls: Lines, c: Common, w: string[]): BoxplotSpec | string {
  const s: BoxplotSpec = { ...c, kind: 'boxplot', boxes: [] }
  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    if (key === 'box' || key === 'data' || key === 'summary') {
      const vs = splitTop(main).map(num)
      if (vs.length !== 5 || vs.some((v) => v === null || !Number.isFinite(v))) { w.push(`Bad box "${raw}"`); continue }
      const five = vs as [number, number, number, number, number]
      if (five.some((v, i) => i > 0 && v < five[i - 1])) { w.push(`Box values must increase: "${raw}"`); continue }
      s.boxes.push({ five, label: mods.label })
    } else if (key === 'x') { const r = range(main); if (r) s.x = r }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!s.boxes.length) return 'No boxes'
  s.boxes = s.boxes.slice(0, 6)
  return s
}

function parseNumberline(ls: Lines, c: Common, w: string[]): NumberlineSpec | string {
  const s: NumberlineSpec = { ...c, kind: 'numberline', points: [], intervals: [] }
  for (const { key, value, raw } of ls) {
    const { main, mods } = splitMods(value)
    if (key === 'point') {
      const v = num(main)
      if (v === null || !Number.isFinite(v)) { w.push(`Bad point "${raw}"`); continue }
      s.points.push({ at: v, open: mods.open, label: mods.label })
    } else if (key === 'interval' || key === 'ray') {
      const ineq = main.match(/^x\s*(<=|>=|<|>|≤|≥)\s*(.+)$/i)
      if (ineq) {
        const v = num(ineq[2])
        if (v === null) { w.push(`Bad interval "${raw}"`); continue }
        const strict = ineq[1] === '<' || ineq[1] === '>'
        if (ineq[1].includes('<') || ineq[1] === '≤') s.intervals.push({ from: -Infinity, to: v, openFrom: true, openTo: strict })
        else s.intervals.push({ from: v, to: Infinity, openFrom: strict, openTo: true })
        continue
      }
      const m = main.match(/^([([])\s*(.+?)\s*,\s*(.+?)\s*([)\]])$/)
      const a = m ? num(m[2]) : null
      const b = m ? num(m[3]) : null
      if (!m || a === null || b === null || a >= b) { w.push(`Bad interval "${raw}"`); continue }
      s.intervals.push({ from: a, to: b, openFrom: m[1] === '(' || !Number.isFinite(a), openTo: m[4] === ')' || !Number.isFinite(b) })
    } else if (key === 'x') { const r = range(main); if (r) s.x = r }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!s.points.length && !s.intervals.length) return 'Nothing to draw'
  return s
}

// ── Summaries ───────────────────────────────────────────────────────────────

/** A short accessible description, used as the figure's aria-label. */
export function describeGraph(spec: GraphSpec): string {
  const t = spec.title ? `${spec.title}. ` : ''
  switch (spec.kind) {
    case 'plane': {
      const parts = [
        ...spec.plots.map((p) => `graph of y = ${p.source}`),
        ...spec.points.map((p) => `point ${p.label ?? ''} at (${p.at[0]}, ${p.at[1]})`.replace('  ', ' ')),
        ...spec.shades.map((s) => `region ${s.axis} ${s.op} ${s.source}`),
        ...spec.vectors.map((v) => `vector ${v.label ?? ''} from (${v.from[0]}, ${v.from[1]}) to (${v.to[0]}, ${v.to[1]})`.replace('  ', ' ')),
      ]
      return `${t}Coordinate plane${parts.length ? ` with ${parts.slice(0, 6).join('; ')}` : ''}.`
    }
    case 'geometry': return `${t}Geometry figure with points ${spec.points.filter((p) => !p.hide).map((p) => p.name).join(', ')}${spec.notToScale ? ' (not drawn to scale)' : ''}.`
    case 'scatter': return `${t}Scatterplot of ${spec.data.length} points${spec.fits.length ? ' with a line of best fit' : ''}.`
    case 'bar': return `${t}Bar chart: ${spec.bars.map((b) => `${b.label} ${b.value}`).join(', ')}.`
    case 'histogram': return `${t}Histogram: ${spec.bins.map((b) => `${b.from} to ${b.to}: ${b.count}`).join(', ')}.`
    case 'dotplot': return `${t}Dot plot: ${spec.values.map((v) => `${v.value} (${v.count})`).join(', ')}.`
    case 'boxplot': return `${t}Box plot${spec.boxes.length > 1 ? 's' : ''}: ${spec.boxes.map((b) => `${b.label ? b.label + ' ' : ''}min ${b.five[0]}, Q1 ${b.five[1]}, median ${b.five[2]}, Q3 ${b.five[3]}, max ${b.five[4]}`).join('; ')}.`
    case 'numberline': return `${t}Number line.`
    case 'reaction': return `${t}Reaction energy diagram: ${spec.levels.map((l) => `${l.label ?? l.kind} ${l.energy}`).join(', ')}.`
    case 'lewis': return `${t}Lewis structure of ${spec.layout.atoms.map((a) => a.symbol).join('')}.`
    case 'vsepr': return `${t}3D model of ${spec.center}${spec.model.atoms.slice(1).map((a) => a.symbol).join('')}${spec.showName ? `, ${spec.model.shape}` : ''}.`
    case 'molecule': return `${t}Model of ${spec.name}.`
    case 'free-body': return `${t}Free-body diagram with forces: ${spec.data.forces.map((f) => `${f.name}${f.magnitude ? ` (${f.magnitude})` : ''} at ${Math.round(f.angle)}°`).join(', ')}.`
    case 'punnett': return `${t}Punnett square for ${spec.cross}${spec.showRatios ? `: ${spec.result.phenotypeRatio.map((p) => `${p.count} ${p.phenotype}`).join(', ')} out of ${spec.result.total}` : ''}.`
    case 'pedigree': return `${t}Pedigree chart of ${spec.data.people.length} people over ${spec.layout.generations} generations; affected: ${spec.data.people.filter((p) => p.affected).map((p) => p.id).join(', ') || 'none'}.`
    case 'diagram': return `${t}Diagram: ${spec.data.edges.map((e) => {
      const name = (id: string) => spec.data.nodes.find((n) => n.id === id)?.label ?? id
      return `${name(e.from)} ${e.arrow === 'none' ? 'linked to' : 'leads to'} ${name(e.to)}${e.label ? ` (${e.label})` : ''}`
    }).join('; ')}.`
  }
}
