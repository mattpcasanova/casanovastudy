// Math, statistics and computer science figures for ```graph fences. The guide
// gives the givens; every number shown (areas, coordinates, products, shares,
// path probabilities, place values) is computed here, so a figure can't
// disagree with the math.
//
// kind: normal         mean: 100   sd: 15   shade: between 85 and 115   rule: on   area: hide
// kind: unit-circle    angle: 150   angle: 5pi/4   coords: hide
// kind: fraction-bar   bar: 3/4   bar: 2/3 | of the pizza
// kind: area-model     multiply: 23 x 14      multiply: (x + 3)(x + 2)   answers: hide
// kind: tape           tape: Boys | 3   tape: Girls | 5   total: 32   (or unit: 4, or known: Boys | 12)
// kind: probability-tree   branch: Rain | 0.3   branch: Rain > Late | 0.4   answers: hide
// kind: place-value    number: 3,482.5        number: 1011 | base: 2
// kind: array          array: 3, 8, 1, 9   pointer: i | 1   highlight: 2, 3 | sorted   name: nums

import { falsy, named, num, pipes, tidy, type CommonFields, type Line } from './lines'

// ── Normal curve ────────────────────────────────────────────────────────────

/** Standard normal CDF (Abramowitz and Stegun 7.1.26, error under 1.5e-7). */
export function phi(z: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2)
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2)
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2
}

export type Shade = { type: 'below'; a: number } | { type: 'above'; a: number } | { type: 'between' | 'outside'; a: number; b: number }
export interface NormalSpec extends CommonFields { kind: 'normal'; mean: number; sd: number; shade: Shade | null; rule: boolean; showArea: boolean }

/** The shaded probability, for a shade in the curve's own units. */
export function shadedArea(mean: number, sd: number, s: Shade): number {
  const z = (x: number) => (x - mean) / sd
  if (s.type === 'below') return phi(z(s.a))
  if (s.type === 'above') return 1 - phi(z(s.a))
  const inside = phi(z(Math.max(s.a, s.b))) - phi(z(Math.min(s.a, s.b)))
  return s.type === 'between' ? inside : 1 - inside
}

export function parseNormal(ls: Line[], c: CommonFields, w: string[]): NormalSpec | string {
  let mean = 0, sd = 1, rule = false, showArea = true
  let shade: Shade | null = null
  for (const { key, value, raw } of ls) {
    const v = value.trim().replace(/[−–]/g, '-')
    if (key === 'mean' || key === 'mu' || key === 'center') { const n = num(v); if (n === null) w.push(`Bad mean "${raw}"`); else mean = n }
    else if (key === 'sd' || key === 'sigma' || key === 'standard-deviation' || key === 'spread') { const n = num(v); if (n === null || n <= 0) w.push(`Bad sd "${raw}"`); else sd = n }
    else if (key === 'rule' || key === 'empirical' || key === 'empirical-rule') rule = !falsy(v)
    else if (key === 'area' || key === 'answers' || key === 'probability') { if (falsy(v)) showArea = false }
    else if (key === 'shade' || key === 'region') {
      const nums = [...v.matchAll(/-?\d*\.?\d+/g)].map((m) => Number(m[0]))
      if (/between|from/i.test(v) && nums.length >= 2) shade = { type: 'between', a: Math.min(nums[0], nums[1]), b: Math.max(nums[0], nums[1]) }
      else if (/outside|tails|beyond/i.test(v) && nums.length >= 2) shade = { type: 'outside', a: Math.min(nums[0], nums[1]), b: Math.max(nums[0], nums[1]) }
      else if (/below|less|under|left|<|at most/i.test(v) && nums.length) shade = { type: 'below', a: nums[0] }
      else if (/above|greater|more|over|right|>|at least/i.test(v) && nums.length) shade = { type: 'above', a: nums[0] }
      else w.push(`Bad shade "${raw}"`)
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  return { ...c, kind: 'normal', mean, sd, shade, rule, showArea }
}

// ── Unit circle ─────────────────────────────────────────────────────────────

export interface CircleAngle { degrees: number; degreeText: string; radianText: string; cos: string; sin: string; x: number; y: number }
export interface UnitCircleSpec extends CommonFields { kind: 'unit-circle'; angles: CircleAngle[]; showCoords: boolean }

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

/** 150 → "5π/6"; other angles as a decimal number of radians. */
export function radianText(degrees: number): string {
  if (!Number.isInteger(degrees)) return `${tidy((degrees * Math.PI) / 180, 3)} rad`
  if (degrees === 0) return '0'
  const g = gcd(degrees, 180)
  const n = degrees / g, d = 180 / g
  return `${n === 1 ? '' : n === -1 ? '−' : String(n).replace('-', '−')}π${d === 1 ? '' : `/${d}`}`
}

/** Exact sine or cosine for the special angles ("√3/2", "−1/2"), else three decimals. */
export function exactTrig(value: number): string {
  const sign = value < -1e-9 ? '−' : ''
  const a = Math.abs(value)
  const exact: Array<[number, string]> = [[0, '0'], [0.5, '1/2'], [Math.SQRT2 / 2, '√2/2'], [Math.sqrt(3) / 2, '√3/2'], [1, '1']]
  for (const [v, text] of exact) if (Math.abs(a - v) < 1e-9) return v === 0 ? '0' : sign + text
  return sign + tidy(a, 3)
}

/** "150", "150°", "5pi/6", "2π/3", "-pi/4", "1.2 rad" → degrees. */
export function parseAngle(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/[−–]/g, '-').replace(/\s+/g, '')
  const pi = t.match(/^(-?\d*\.?\d*)\*?(?:pi|π)(?:\/(\d+))?$/)
  if (pi) {
    const n = pi[1] === '' ? 1 : pi[1] === '-' ? -1 : Number(pi[1])
    return Number.isFinite(n) ? (n * 180) / Number(pi[2] ?? 1) : null
  }
  const rad = t.match(/^(-?\d*\.?\d+)rad(ians?)?$/)
  if (rad) return (Number(rad[1]) * 180) / Math.PI
  const deg = t.match(/^(-?\d*\.?\d+)(°|deg(rees?)?)?$/)
  return deg ? Number(deg[1]) : null
}

export function circleAngle(degrees: number): CircleAngle {
  const r = (degrees * Math.PI) / 180
  const x = Math.cos(r), y = Math.sin(r)
  return { degrees, degreeText: `${tidy(degrees, 1)}°`, radianText: radianText(degrees), cos: exactTrig(x), sin: exactTrig(y), x, y }
}

export function parseUnitCircle(ls: Line[], c: CommonFields, w: string[]): UnitCircleSpec | string {
  const angles: CircleAngle[] = []
  let showCoords = true
  for (const { key, value, raw } of ls) {
    if (key === 'angle' || key === 'angles' || key === 'theta') {
      for (const part of value.split(',')) {
        const d = parseAngle(part)
        if (d === null) { w.push(`Bad angle "${raw}"`); continue }
        if (angles.length < 4) angles.push(circleAngle(d))
      }
    } else if (key === 'coords' || key === 'coordinates' || key === 'answers' || key === 'values') { if (falsy(value)) showCoords = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!angles.length) return 'A unit circle needs angle:'
  return { ...c, kind: 'unit-circle', angles, showCoords }
}

// ── Fraction bars ───────────────────────────────────────────────────────────

export interface FractionBarSpec extends CommonFields { kind: 'fraction-bar'; bars: Array<{ n: number; d: number; label?: string; wholes: number }> }

export function parseFractionBar(ls: Line[], c: CommonFields, w: string[]): FractionBarSpec | string {
  const bars: FractionBarSpec['bars'] = []
  for (const { key, value, raw } of ls) {
    if (key === 'bar' || key === 'fraction') {
      const [frac, label] = pipes(value)
      const m = frac.replace(/\s+/g, '').match(/^(\d+)\/(\d+)$/)
      const n = Number(m?.[1]), d = Number(m?.[2])
      if (!m || d < 1 || d > 24 || n > d * 4) { w.push(`Bad fraction "${raw}"`); continue }
      if (bars.length < 5) bars.push({ n, d, label: label || undefined, wholes: Math.max(1, Math.ceil(n / d)) })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!bars.length) return 'Fraction bars need "bar: 3/4"'
  return { ...c, kind: 'fraction-bar', bars }
}

// ── Area model ──────────────────────────────────────────────────────────────

/** One term: a coefficient times x to a power (power 0 is a plain number). */
export interface Term { coef: number; power: number; variable: string }
export interface AreaModelSpec extends CommonFields { kind: 'area-model'; rows: string[]; cols: string[]; cells: string[][]; left: string; right: string; total: string; showAnswers: boolean }

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
export function termText(t: Term, lead = true): string {
  const sign = t.coef < 0 ? (lead ? '−' : '− ') : lead ? '' : '+ '
  const a = Math.abs(t.coef)
  if (t.power === 0) return sign + tidy(a)
  const power = t.power === 1 ? '' : String(t.power).split('').map((d) => SUP[Number(d)]).join('')
  return `${sign}${a === 1 ? '' : tidy(a)}${t.variable}${power}`
}

function parseTerm(text: string): Term | null {
  const t = text.replace(/\s+/g, '').replace(/[−–]/g, '-').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => `^${SUP.indexOf(d)}`)
  const m = t.match(/^([+-]?\d*\.?\d*)([a-z])?(?:\^(\d))?$/i)
  if (!m || (!m[1] && !m[2])) return null
  const coef = m[1] === '' || m[1] === '+' ? 1 : m[1] === '-' ? -1 : Number(m[1])
  if (!Number.isFinite(coef)) return null
  return { coef, power: m[2] ? Number(m[3] ?? 1) : 0, variable: m[2] ?? 'x' }
}

/** "23" → 20 + 3; "(x + 3)" → x, 3; "2x - 5" → 2x, −5. */
export function splitFactor(text: string): Term[] | null {
  const t = text.trim().replace(/^\(|\)$/g, '').replace(/[−–]/g, '-')
  if (/^\d+$/.test(t)) {
    const digits = t.split('')
    const terms = digits.map((d, i) => ({ coef: Number(d) * 10 ** (digits.length - 1 - i), power: 0, variable: 'x' })).filter((x) => x.coef !== 0)
    return terms.length ? terms : [{ coef: 0, power: 0, variable: 'x' }]
  }
  const pieces = t.replace(/\s+/g, '').replace(/-/g, '+-').split('+').filter(Boolean)
  const terms = pieces.map(parseTerm)
  return terms.length && terms.every(Boolean) ? (terms as Term[]) : null
}

export function areaModel(a: Term[], b: Term[]): { cells: Term[][]; total: Term[] } {
  const cells = a.map((x) => b.map((y) => ({ coef: x.coef * y.coef, power: x.power + y.power, variable: x.power ? x.variable : y.variable })))
  const byPower = new Map<number, Term>()
  for (const t of cells.flat()) {
    const have = byPower.get(t.power)
    if (have) have.coef += t.coef
    else byPower.set(t.power, { ...t })
  }
  return { cells, total: [...byPower.values()].sort((x, y) => y.power - x.power).filter((t, _, all) => t.coef !== 0 || all.length === 1) }
}

const sumText = (terms: Term[]) => terms.map((t, i) => termText(t, i === 0)).join(' ')

export function parseAreaModel(ls: Line[], c: CommonFields, w: string[]): AreaModelSpec | string {
  let factors: string[] = []
  let showAnswers = true
  for (const { key, value, raw } of ls) {
    if (key === 'multiply' || key === 'product' || key === 'factors') {
      const v = value.trim()
      const paren = v.match(/^\((.+?)\)\s*[x×*·]?\s*\((.+?)\)$/)
      factors = paren ? [paren[1], paren[2]] : v.split(/\s*(?:×|\*|·|\bx\b|\bby\b|\btimes\b)\s*/i)
    } else if (key === 'a' || key === 'b') factors[key === 'a' ? 0 : 1] = value
    else if (key === 'answers' || key === 'products') { if (falsy(value)) showAnswers = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (factors.length !== 2 || !factors[0] || !factors[1]) return 'An area model needs "multiply: 23 x 14" or "multiply: (x + 3)(x + 2)"'
  const a = splitFactor(factors[0]), b = splitFactor(factors[1])
  if (!a || !b || a.length > 4 || b.length > 4) return 'Could not read the two factors'
  const { cells, total } = areaModel(a, b)
  const numeric = [...a, ...b].every((t) => t.power === 0)
  const show = (ts: Term[]) => (numeric ? tidy(ts.reduce((n, t) => n + t.coef, 0)) : `(${sumText(ts)})`)
  return {
    ...c, kind: 'area-model',
    rows: a.map((t) => termText(t)), cols: b.map((t) => termText(t)),
    cells: cells.map((r) => r.map((t) => termText(t))),
    left: numeric ? `${show(a)} × ${show(b)}` : `${show(a)}${show(b)}`,
    right: cells.flat().map((t, i) => termText(t, i === 0)).join(' '),
    total: sumText(total),
    showAnswers,
  }
}

// ── Tape diagram ────────────────────────────────────────────────────────────

export interface TapeSpec extends CommonFields { kind: 'tape'; tapes: Array<{ label: string; units: number; value: number | null }>; unit: number | null; total: number | null; showAnswers: boolean }

export function parseTape(ls: Line[], c: CommonFields, w: string[]): TapeSpec | string {
  const tapes: Array<{ label: string; units: number }> = []
  let unit: number | null = null, total: number | null = null, showAnswers = true
  let known: { label: string; value: number } | null = null
  for (const { key, value, raw } of ls) {
    if (key === 'tape' || key === 'bar' || key === 'quantity') {
      const [label, n] = pipes(value)
      const units = num(n)
      if (!label || units === null || !Number.isInteger(units) || units < 1 || units > 12) { w.push(`Bad tape "${raw}"`); continue }
      if (tapes.length < 4) tapes.push({ label, units })
    } else if (key === 'unit' || key === 'each') unit = num(value)
    else if (key === 'total' || key === 'sum') total = num(value)
    else if (key === 'known') { const [label, v] = pipes(value); const n = num(v); if (label && n !== null) known = { label, value: n }; else w.push(`Bad known "${raw}"`) }
    else if (key === 'answers' || key === 'values') { if (falsy(value)) showAnswers = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!tapes.length) return 'A tape diagram needs "tape: Label | number of units"'
  const all = tapes.reduce((n, t) => n + t.units, 0)
  if (unit === null && total !== null) unit = total / all
  if (unit === null && known) { const t = tapes.find((x) => x.label.toLowerCase() === known!.label.toLowerCase()); if (t) unit = known.value / t.units }
  return { ...c, kind: 'tape', tapes: tapes.map((t) => ({ ...t, value: unit === null ? null : t.units * unit })), unit, total: unit === null ? null : all * unit, showAnswers }
}

// ── Probability tree ────────────────────────────────────────────────────────

export interface TreeNode { label: string; text: string; p: number; children: TreeNode[]; /** Product of the probabilities from the root. */ path: number; pathText: string }
export interface ProbabilityTreeSpec extends CommonFields { kind: 'probability-tree'; roots: TreeNode[]; leaves: number; depth: number; showAnswers: boolean }

type Ratio = { n: number; d: number } | null
function ratioOf(text: string): Ratio {
  const m = text.replace(/\s+/g, '').match(/^(\d+)\/(\d+)$/)
  return m && Number(m[2]) ? { n: Number(m[1]), d: Number(m[2]) } : null
}

export function parseProbabilityTree(ls: Line[], c: CommonFields, w: string[]): ProbabilityTreeSpec | string {
  type Raw = TreeNode & { ratio: Ratio; pathRatio: Ratio }
  const roots: Raw[] = []
  let showAnswers = true
  for (const { key, value, raw } of ls) {
    if (key === 'branch' || key === 'path') {
      const [pathPart, pText] = pipes(value)
      const p = num(pText)
      const names = pathPart.split(/\s*(?:>|->|→)\s*/).map((s) => s.trim()).filter(Boolean)
      if (p === null || p < 0 || p > 1 || !names.length || names.length > 3) { w.push(`Bad branch "${raw}"`); continue }
      let level = roots
      let parent: Raw | null = null
      for (const name of names.slice(0, -1)) {
        const found: Raw | undefined = level.find((n) => n.label.toLowerCase() === name.toLowerCase())
        if (!found) { parent = null; level = []; break }
        parent = found
        level = found.children as Raw[]
      }
      if (names.length > 1 && !parent) { w.push(`Branch "${raw}" comes before its parent`); continue }
      const ratio = ratioOf(pText)
      const up = parent ? { path: parent.path, ratio: parent.pathRatio } : { path: 1, ratio: { n: 1, d: 1 } as Ratio }
      const pathRatio = ratio && up.ratio ? { n: ratio.n * up.ratio.n, d: ratio.d * up.ratio.d } : null
      const reduced = pathRatio ? (() => { const g = gcd(pathRatio.n, pathRatio.d) || 1; return `${pathRatio.n / g}/${pathRatio.d / g}` })() : null
      level.push({ label: names[names.length - 1], text: pText.trim(), p, children: [], path: up.path * p, pathText: reduced ?? tidy(up.path * p), ratio, pathRatio })
    } else if (key === 'answers' || key === 'products') { if (falsy(value)) showAnswers = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (roots.length < 2) return 'A probability tree needs at least two "branch: Outcome | probability" lines'
  const check = (nodes: TreeNode[]) => {
    if (nodes.length && Math.abs(nodes.reduce((n, x) => n + x.p, 0) - 1) > 0.011) w.push(`Branches ${nodes.map((n) => n.label).join(', ')} do not add to 1`)
    nodes.forEach((n) => check(n.children))
  }
  check(roots)
  const leaves = (nodes: TreeNode[]): number => nodes.reduce((n, x) => n + (x.children.length ? leaves(x.children) : 1), 0)
  const depth = (nodes: TreeNode[]): number => (nodes.length ? 1 + Math.max(...nodes.map((x) => depth(x.children))) : 0)
  if (leaves(roots) > 12) return 'That tree has too many branches to draw'
  return { ...c, kind: 'probability-tree', roots, leaves: leaves(roots), depth: depth(roots), showAnswers }
}

// ── Place value ─────────────────────────────────────────────────────────────

export interface PlaceValueSpec extends CommonFields { kind: 'place-value'; base: number; columns: Array<{ digit: string; place: string; weight: string; value: string; point?: boolean }>; total: string; written: string }

const PLACES = ['Ones', 'Tens', 'Hundreds', 'Thousands', 'Ten thousands', 'Hundred thousands', 'Millions', 'Ten millions', 'Hundred millions', 'Billions']
const SMALL = ['Tenths', 'Hundredths', 'Thousandths', 'Ten-thousandths']

export function parsePlaceValue(ls: Line[], c: CommonFields, w: string[]): PlaceValueSpec | string {
  let text = '', base = 10
  for (const { key, value, raw } of ls) {
    if (key === 'number' || key === 'value') {
      const parts = pipes(value)
      text = parts[0].replace(/[\s,_]/g, '')
      const b = named(parts.slice(1), /base/)
      if (b) base = b
    } else if (key === 'base') base = num(value) ?? 10
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (![2, 8, 10, 16].includes(base)) return 'Place value is drawn for base 2, 8, 10 or 16'
  const [whole = '', frac = ''] = text.toUpperCase().split('.')
  const digitValue = (d: string) => parseInt(d, 16)
  if (!whole || whole.length > 10 || frac.length > 4 || (frac && base !== 10) || [...whole, ...frac].some((d) => Number.isNaN(digitValue(d)) || digitValue(d) >= base)) return `"${text}" is not a base ${base} number that can be drawn`
  const columns: PlaceValueSpec['columns'] = []
  let total = 0
  whole.split('').forEach((d, i) => {
    const power = whole.length - 1 - i
    const weight = base ** power
    total += digitValue(d) * weight
    columns.push({ digit: d, place: base === 10 ? PLACES[power] : `${base}${power === 1 ? '' : String(power).split('').map((x) => SUP[Number(x)]).join('')}`.replace(new RegExp(`^${base}⁰$`), '1'), weight: weight.toLocaleString('en-US'), value: (digitValue(d) * weight).toLocaleString('en-US') })
  })
  frac.split('').filter(Boolean).forEach((d, i) => {
    const weight = 10 ** -(i + 1)
    total += Number(d) * weight
    columns.push({ digit: d, place: SMALL[i], weight: tidy(weight, 4), value: tidy(Number(d) * weight, 4), point: i === 0 })
  })
  return { ...c, kind: 'place-value', base, columns, total: base === 10 ? tidy(total, 4) : String(total), written: text.toUpperCase() }
}

// ── Array (computer science) ────────────────────────────────────────────────

export interface ArraySpec extends CommonFields { kind: 'array'; name?: string; cells: string[]; pointers: Array<{ name: string; index: number }>; highlights: Array<{ indexes: number[]; label?: string }> }

export function parseArray(ls: Line[], c: CommonFields, w: string[]): ArraySpec | string {
  let cells: string[] = []
  let name: string | undefined
  const pointers: ArraySpec['pointers'] = []
  const highlights: ArraySpec['highlights'] = []
  for (const { key, value, raw } of ls) {
    if (key === 'array' || key === 'list' || key === 'values') cells = value.replace(/^\[|\]$/g, '').split(',').map((s) => s.trim()).filter((s) => s !== '').slice(0, 14)
    else if (key === 'name') name = value.trim().slice(0, 20)
    else if (key === 'pointer' || key === 'index') {
      const [n, i] = pipes(value)
      const index = num(i)
      if (!n || index === null || !Number.isInteger(index)) { w.push(`Bad pointer "${raw}"`); continue }
      if (pointers.length < 4) pointers.push({ name: n, index })
    } else if (key === 'highlight' || key === 'mark') {
      const [list, label] = pipes(value)
      const range = list.match(/^(\d+)\s*(?:-|to|\.\.)\s*(\d+)$/)
      const indexes = range ? Array.from({ length: Number(range[2]) - Number(range[1]) + 1 }, (_, k) => Number(range[1]) + k) : list.split(',').map((s) => Number(s.trim())).filter((n) => Number.isInteger(n))
      if (!indexes.length) { w.push(`Bad highlight "${raw}"`); continue }
      if (highlights.length < 3) highlights.push({ indexes, label: label || undefined })
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!cells.length) return 'An array needs "array: 3, 8, 1"'
  return { ...c, kind: 'array', name, cells, pointers: pointers.filter((p) => p.index >= 0 && p.index < cells.length), highlights }
}

export type MathSpec = NormalSpec | UnitCircleSpec | FractionBarSpec | AreaModelSpec | TapeSpec | ProbabilityTreeSpec | PlaceValueSpec | ArraySpec

export function describeMath(spec: MathSpec): string {
  switch (spec.kind) {
    case 'normal': {
      const s = spec.shade
      const region = !s ? '' : s.type === 'below' ? ` shaded below ${s.a}` : s.type === 'above' ? ` shaded above ${s.a}` : ` shaded ${s.type} ${s.a} and ${s.b}`
      return `Normal curve with mean ${spec.mean} and standard deviation ${spec.sd}${region}${s && spec.showArea ? `, area ${tidy(shadedArea(spec.mean, spec.sd, s))}` : ''}.`
    }
    case 'unit-circle': return `Unit circle with ${spec.angles.map((a) => `${a.degreeText}${spec.showCoords ? ` at (${a.cos}, ${a.sin})` : ''}`).join(', ')}.`
    case 'fraction-bar': return `Fraction bars: ${spec.bars.map((b) => `${b.n}/${b.d}${b.label ? ` ${b.label}` : ''}`).join(', ')}.`
    case 'area-model': return `Area model for ${spec.left}${spec.showAnswers ? ` = ${spec.total}` : ''}.`
    case 'tape': return `Tape diagram: ${spec.tapes.map((t) => `${t.label} ${t.units} part${t.units === 1 ? '' : 's'}${spec.showAnswers && t.value !== null ? ` (${tidy(t.value)})` : ''}`).join(', ')}.`
    case 'probability-tree': return `Probability tree with ${spec.leaves} outcomes; first branches: ${spec.roots.map((r) => `${r.label} ${r.text}`).join(', ')}.`
    case 'place-value': return `Place value chart of ${spec.written}${spec.base === 10 ? '' : ` in base ${spec.base} (${spec.total} in base 10)`}.`
    case 'array': return `Array${spec.name ? ` ${spec.name}` : ''}: ${spec.cells.join(', ')}${spec.pointers.length ? `; ${spec.pointers.map((p) => `${p.name} at index ${p.index}`).join(', ')}` : ''}.`
  }
}
