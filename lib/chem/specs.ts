// Chemistry kinds for ```graph fences (see lib/graphs/spec.ts for the shared
// "key: value | option" format):
//
// kind: energy-well   bond: H–H   length: 74   depth: 432   (pm, kJ/mol)
//                     compare: 128 | 242 | Cl–Cl            (extra curves)
//   → drawn as a coordinate plane (Morse curve + dashed guides to the minimum)
// kind: reaction      reactants: 50 | A + B   transition: 120   intermediate: 70
//                     products: 20 | C   catalyzed: 90 (one per transition)
//                     show: Ea, ΔH
// kind: lewis         center: S | lone: 1
//                     atom: F | bond: 1 | lone: 3   (one line per atom)
//                     charge: -1   formal: on
// kind: vsepr         center: S   bonded: F, F, F, F   lone: 1   name: hide
//                     (bonded atoms may be written O= or =O for double bonds)
// kind: molecule      name: caffeine   style: 3d | 2d   hydrogens: hide
//   → fetched from PubChem by name in the browser

import { parseExpr } from '@/lib/graphs/expr'
import type { PlaneSpec } from '@/lib/graphs/spec'
import { normalizeSymbol } from './elements'
import { layoutLewis, type LewisLayout } from './lewis'
import { buildVsepr, type VseprModel } from './vsepr'
import { morseExpr, type ReactionLevel } from './energy'

interface CommonFields { title?: string; caption?: string; xLabel?: string; yLabel?: string; notes: string[] }
type Line = { key: string; value: string; raw: string }

export interface ReactionSpec extends CommonFields {
  kind: 'reaction'
  levels: ReactionLevel[]
  catalyzed: number[] // one lowered energy per transition state
  showEa: boolean
  showDH: boolean
}
export interface LewisSpec extends CommonFields { kind: 'lewis'; layout: LewisLayout }
export interface VseprSpec extends CommonFields { kind: 'vsepr'; model: VseprModel; center: string; showName: boolean }
export interface MoleculeSpec extends CommonFields { kind: 'molecule'; name: string; style: '3d' | '2d'; hydrogens: boolean }

export type ChemSpec = ReactionSpec | LewisSpec | VseprSpec | MoleculeSpec

function number(s: string | undefined): number | null {
  if (!s) return null
  const t = s.trim().replace(/[−–]/g, '-').replace(/\s*(pm|kj\/mol|kj|kcal\/mol|ev|å)$/i, '')
  const v = Number(t)
  return Number.isFinite(v) ? v : null
}

/** "lone: 3" / "3 lone pairs" / "bond: 2" / "double" from pipe parts. */
function field(parts: string[], key: 'lone' | 'bond'): number | null {
  for (const p of parts) {
    const t = p.trim().toLowerCase()
    const kv = t.match(/^(lone(?: pairs?)?|lp|bond(?: order)?|bonds?)\s*[:=]\s*(\d+)$/)
    if (kv && kv[1].startsWith(key === 'lone' ? 'l' : 'b')) return Number(kv[2])
    if (key === 'lone') { const m = t.match(/^(\d+)\s*lone(?: pairs?)?$/); if (m) return Number(m[1]) }
    if (key === 'bond') {
      if (/^(single)$/.test(t)) return 1
      if (/^(double)$/.test(t)) return 2
      if (/^(triple)$/.test(t)) return 3
    }
  }
  return null
}

function parseCharge(v: string): number | null {
  const t = v.trim().replace(/[−–]/g, '-')
  if (/^[+-]$/.test(t)) return t === '+' ? 1 : -1
  let m = t.match(/^([+-]?)(\d+)$/)
  if (m) return (m[1] === '-' ? -1 : 1) * Number(m[2])
  m = t.match(/^(\d+)([+-])$/)
  if (m) return (m[2] === '-' ? -1 : 1) * Number(m[1])
  return null
}

const truthy = (v: string) => /^(on|yes|true|show|1)$/i.test(v.trim())
const falsy = (v: string) => /^(off|no|false|hide|hidden|0)$/i.test(v.trim())

// ── energy well → plane ─────────────────────────────────────────────────────

export function parseEnergyWell(ls: Line[], c: CommonFields, w: string[]): PlaneSpec | string {
  const wells: { length: number; depth: number; label?: string }[] = []
  let length: number | null = null
  let depth: number | null = null
  let bond: string | undefined
  for (const { key, value, raw } of ls) {
    if (key === 'length' || key === 'bond-length' || key === 'distance') length = number(value)
    else if (key === 'depth' || key === 'energy' || key === 'bond-energy') depth = number(value)
    else if (key === 'bond' || key === 'label') bond = value.trim()
    else if (key === 'compare' || key === 'well') {
      const [l, d, label] = value.split('|').map((p) => p.trim())
      const L = number(l)
      const D = number(d)
      if (L && D && L > 0 && D > 0) wells.push({ length: L, depth: Math.abs(D), label: label || undefined })
      else w.push(`Bad compare "${raw}"`)
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!length || !depth || length <= 0) return 'An energy well needs length: and depth:'
  wells.unshift({ length, depth: Math.abs(depth), label: bond })
  const maxL = Math.max(...wells.map((x) => x.length))
  const maxD = Math.max(...wells.map((x) => x.depth))
  const spec: PlaneSpec = {
    ...c,
    xLabel: c.xLabel ?? 'Internuclear distance (pm)',
    yLabel: c.yLabel ?? 'Potential energy (kJ/mol)',
    kind: 'plane',
    x: [0, Math.ceil((maxL * 3.2) / 10) * 10],
    y: [-Math.ceil((maxD * 1.3) / 50) * 50, Math.ceil((maxD * 0.9) / 50) * 50],
    grid: null, plots: [], points: [], segments: [], lines: [], vlines: [], shades: [], polygons: [], circles: [], texts: [], vectors: [],
  }
  wells.forEach((well, i) => {
    const color = (['blue', 'red', 'green', 'purple'] as const)[i % 4]
    const src = morseExpr(well.length, well.depth)
    // Start where the repulsive wall re-enters the window, so it doesn't draw a vertical smear.
    spec.plots.push({ expr: parseExpr(src), source: src, dashed: false, color, domain: [well.length * 0.55, spec.x[1]] })
    // Label at the bottom of the well, where curves never overlap.
    spec.points.push({ at: [well.length, -well.depth], open: false, color, label: well.label })
    spec.segments.push({ from: [well.length, 0], to: [well.length, -well.depth], dashed: true, color: 'gray' })
    spec.segments.push({ from: [0, -well.depth], to: [well.length, -well.depth], dashed: true, color: 'gray' })
  })
  return spec
}

// ── reaction energy diagram ─────────────────────────────────────────────────

export function parseReaction(ls: Line[], c: CommonFields, w: string[]): ReactionSpec | string {
  const s: ReactionSpec = { ...c, kind: 'reaction', levels: [], catalyzed: [], showEa: false, showDH: false }
  for (const { key, value, raw } of ls) {
    const [v, ...rest] = value.split('|').map((p) => p.trim())
    const label = rest.join(' | ') || undefined
    const kinds: Record<string, ReactionLevel['kind']> = {
      reactants: 'reactants', reactant: 'reactants', transition: 'transition', 'transition-state': 'transition', ts: 'transition',
      intermediate: 'intermediate', intermediates: 'intermediate', products: 'products', product: 'products',
    }
    if (kinds[key]) {
      const e = number(v)
      if (e === null) { w.push(`Bad energy "${raw}"`); continue }
      s.levels.push({ energy: e, label, kind: kinds[key] })
    } else if (key === 'catalyzed' || key === 'catalyst') {
      for (const part of value.split(/[,|]/)) { const e = number(part); if (e !== null) s.catalyzed.push(e) }
    } else if (key === 'show' || key === 'arrows') {
      s.showEa = /ea|activation|all|on/i.test(value)
      s.showDH = /δh|dh|Δh|enthalpy|all|on/i.test(value)
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (s.levels.length < 2) return 'A reaction diagram needs reactants: and products:'
  if (s.levels[0].kind !== 'reactants' || s.levels[s.levels.length - 1].kind !== 'products') {
    w.push('Reaction levels should start with reactants and end with products')
  }
  if (s.levels.length > 9) s.levels = s.levels.slice(0, 9)
  return s
}

// ── Lewis ───────────────────────────────────────────────────────────────────

export function parseLewis(ls: Line[], c: CommonFields, w: string[]): LewisSpec | string {
  let center: { symbol: string; lone: number } | null = null
  const atoms: { symbol: string; bond: number; lone: number }[] = []
  let charge = 0
  let showFormal = false
  for (const { key, value, raw } of ls) {
    const parts = value.split('|').map((p) => p.trim())
    const symbol = normalizeSymbol(parts[0].replace(/[^A-Za-z]/g, ''))
    if (key === 'center' || key === 'central') {
      if (!symbol) { w.push(`Bad center "${raw}"`); continue }
      center = { symbol, lone: field(parts.slice(1), 'lone') ?? 0 }
    } else if (key === 'atom' || key === 'terminal') {
      if (!symbol) { w.push(`Bad atom "${raw}"`); continue }
      const count = Math.min(6, Math.max(1, Number(parts[0].match(/^(\d+)\s*[A-Za-z]/)?.[1] ?? 1)))
      const bond = Math.min(3, Math.max(1, field(parts.slice(1), 'bond') ?? 1))
      const lone = Math.min(3, Math.max(0, field(parts.slice(1), 'lone') ?? (symbol === 'H' ? 0 : 3)))
      for (let k = 0; k < count; k++) atoms.push({ symbol: normalizeSymbol(parts[0].replace(/^\d+\s*/, '').replace(/[^A-Za-z]/g, '')), bond, lone })
    } else if (key === 'charge') {
      const q = parseCharge(value)
      if (q === null) w.push(`Bad charge "${raw}"`); else charge = q
    } else if (key === 'formal' || key === 'formal-charges') showFormal = truthy(value)
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!center) return 'A Lewis structure needs center:'
  const layout = layoutLewis({ center, atoms, charge, showFormal })
  if (typeof layout === 'string') return layout
  return { ...c, kind: 'lewis', layout }
}

// ── VSEPR ───────────────────────────────────────────────────────────────────

export function parseVsepr(ls: Line[], c: CommonFields, w: string[]): VseprSpec | string {
  let center = ''
  const bonded: { symbol: string; order: number }[] = []
  let lone = 0
  let showName = true
  for (const { key, value, raw } of ls) {
    if (key === 'center' || key === 'central') center = normalizeSymbol(value.replace(/[^A-Za-z]/g, ''))
    else if (key === 'bonded' || key === 'atoms' || key === 'bonds') {
      for (const tok of value.split(/[,\s]+/).filter(Boolean)) {
        const order = /=/.test(tok) ? 2 : /[≡#]/.test(tok) ? 3 : 1
        const m = tok.replace(/[=≡#]/g, '').match(/^(\d+)?([A-Za-z]{1,2})$/)
        if (!m) { w.push(`Bad atom "${tok}"`); continue }
        for (let k = 0; k < Number(m[1] ?? 1) && bonded.length < 6; k++) bonded.push({ symbol: normalizeSymbol(m[2]), order })
      }
    } else if (key === 'lone' || key === 'lone-pairs') {
      const v = Number(value.trim())
      if (Number.isInteger(v) && v >= 0) lone = v; else w.push(`Bad lone pairs "${raw}"`)
    } else if (key === 'name' || key === 'shape-name' || key === 'labels') {
      if (falsy(value)) showName = false
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!center) return 'A VSEPR model needs center:'
  const model = buildVsepr({ center, bonded, lone })
  if (typeof model === 'string') return model
  return { ...c, kind: 'vsepr', model, center, showName }
}

// ── PubChem molecule ────────────────────────────────────────────────────────

export function parseMolecule(ls: Line[], c: CommonFields, w: string[]): MoleculeSpec | string {
  let name = ''
  let style: '3d' | '2d' = '3d'
  let hydrogens = true
  for (const { key, value, raw } of ls) {
    if (key === 'name' || key === 'compound' || key === 'molecule') name = value.trim()
    else if (key === 'style' || key === 'view') style = /2d|flat|structure/i.test(value) ? '2d' : '3d'
    else if (key === 'hydrogens' || key === 'h') hydrogens = !falsy(value)
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!name || name.length > 80 || !/^[\w\s,()'+-]+$/.test(name)) return 'A molecule needs name: (a compound name)'
  return { ...c, kind: 'molecule', name, style, hydrogens }
}
