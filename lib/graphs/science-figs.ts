// Science and economics figures for ```graph fences. The guide gives the
// givens; curves, equivalence points, circuit values, complementary strands,
// amino acids and equilibrium changes are computed here.
//
// kind: periodic        highlight: group 17 | Halogens   highlight: Na, Mg | reactive metals
//                       trend: atomic radius   show: main (hides the f block)
// kind: titration       analyte: weak acid | pKa: 4.76 | 0.100 M | 25.0 mL
//                       titrant: strong base | 0.100 M   labels: hide
// kind: heating-curve   substance: water   melting: 0   boiling: 100   from: -25   to: 125
//                       direction: cooling   labels: hide
// kind: circuit         battery: 12   resistor: R1 | 4   parallel: 6, 3   resistor: 2   answers: hide
// kind: dna             coding: ATGGCCTAA   (or template: TACCGGATT)   show: mrna, protein
// kind: supply-demand   shift: demand right   shift: supply left   floor: on | ceiling: on   result: hide

import { falsy, named, num, pipes, tidy, type CommonFields, type Line } from './lines'

// ── Periodic table ──────────────────────────────────────────────────────────

export const ALL_SYMBOLS = ('H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe ' +
  'Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og').split(' ')

export interface Cell { z: number; symbol: string; /** 1-18 */ group: number; /** 1-7 */ period: number; block: 's' | 'p' | 'd' | 'f'; /** Row and column in the drawn grid (f block on rows 8-9). */ row: number; col: number }

/** Where element z sits. Lanthanides and actinides are drawn in two rows under the table. */
export function cellOf(z: number): Cell {
  const symbol = ALL_SYMBOLS[z - 1]
  const starts = [1, 3, 11, 19, 37, 55, 87, 119]
  const period = starts.findIndex((s, i) => z >= s && z < starts[i + 1]) + 1
  const k = z - starts[period - 1] // position within the period, from 0
  if (period === 1) return { z, symbol, group: z === 1 ? 1 : 18, period, block: 's', row: 1, col: z === 1 ? 1 : 18 }
  if (period <= 3) { const group = k < 2 ? k + 1 : k + 11; return { z, symbol, group, period, block: k < 2 ? 's' : 'p', row: period, col: group } }
  if (period <= 5) { const group = k + 1; return { z, symbol, group, period, block: group <= 2 ? 's' : group <= 12 ? 'd' : 'p', row: period, col: group } }
  if (k < 2) return { z, symbol, group: k + 1, period, block: 's', row: period, col: k + 1 }
  if (k < 17) return { z, symbol, group: 3, period, block: 'f', row: period + 2, col: k + 1 }
  const group = k - 13
  return { z, symbol, group, period, block: group <= 12 ? 'd' : 'p', row: period, col: group }
}

const METALLOIDS = new Set(['B', 'Si', 'Ge', 'As', 'Sb', 'Te'])
const NONMETALS = new Set(['H', 'C', 'N', 'O', 'P', 'S', 'Se', 'F', 'Cl', 'Br', 'I', 'At', 'He', 'Ne', 'Ar', 'Kr', 'Xe', 'Rn', 'Og', 'Ts'])
const FAMILIES: Array<[RegExp, (c: Cell) => boolean, string]> = [
  [/alkali metals?/, (c) => c.group === 1 && c.z !== 1, 'Alkali metals'],
  [/alkaline earth( metals?)?/, (c) => c.group === 2, 'Alkaline earth metals'],
  [/transition metals?/, (c) => c.block === 'd', 'Transition metals'],
  [/halogens?/, (c) => c.group === 17, 'Halogens'],
  [/noble gas(es)?/, (c) => c.group === 18, 'Noble gases'],
  [/lanthanides?/, (c) => c.z >= 57 && c.z <= 71, 'Lanthanides'],
  [/actinides?/, (c) => c.z >= 89 && c.z <= 103, 'Actinides'],
  [/metalloids?|semimetals?/, (c) => METALLOIDS.has(c.symbol), 'Metalloids'],
  [/non-?metals?/, (c) => NONMETALS.has(c.symbol), 'Nonmetals'],
  [/metals?/, (c) => !NONMETALS.has(c.symbol) && !METALLOIDS.has(c.symbol), 'Metals'],
]

export type TrendKey = 'radius' | 'electronegativity' | 'ionization' | 'affinity' | 'metallic'
/** Which way each property grows: across a period (to the right or left) and in a group (down or up). */
export const TRENDS: Record<TrendKey, { name: string; across: 'right' | 'left'; group: 'down' | 'up' }> = {
  radius: { name: 'Atomic radius', across: 'left', group: 'down' },
  electronegativity: { name: 'Electronegativity', across: 'right', group: 'up' },
  ionization: { name: 'Ionization energy', across: 'right', group: 'up' },
  affinity: { name: 'Electron affinity', across: 'right', group: 'up' },
  metallic: { name: 'Metallic character', across: 'left', group: 'down' },
}

export interface PeriodicSpec extends CommonFields { kind: 'periodic'; cells: Cell[]; highlights: Array<{ label: string; z: number[] }>; trend: TrendKey | null; fBlock: boolean }

/** The elements a "highlight:" selector names, with a default label. */
export function selectElements(selector: string, cells: Cell[]): { z: number[]; label: string } | null {
  const t = selector.trim().toLowerCase()
  const pick = (test: (c: Cell) => boolean, label: string) => ({ z: cells.filter(test).map((c) => c.z), label })
  const g = t.match(/^groups?\s*(\d+)(?:\s*(?:-|to)\s*(\d+))?$/)
  if (g) { const a = Number(g[1]), b = Number(g[2] ?? g[1]); return a >= 1 && b <= 18 && a <= b ? pick((c) => c.block !== 'f' && c.group >= a && c.group <= b, a === b ? `Group ${a}` : `Groups ${a} to ${b}`) : null }
  const p = t.match(/^periods?\s*(\d)$/)
  if (p) return pick((c) => c.period === Number(p[1]), `Period ${p[1]}`)
  const b = t.match(/^([spdf])[ -]?block$|^block\s*([spdf])$/)
  if (b) { const letter = (b[1] ?? b[2]) as Cell['block']; return pick((c) => c.block === letter, `${letter} block`) }
  for (const [re, test, label] of FAMILIES) if (new RegExp(`^(${re.source})$`).test(t)) return pick(test, label)
  const symbols = selector.split(/[,\s]+/).filter(Boolean).map((s) => s[0].toUpperCase() + s.slice(1).toLowerCase())
  const z = symbols.map((s) => ALL_SYMBOLS.indexOf(s) + 1)
  return symbols.length && z.every((n) => n > 0) ? { z, label: symbols.join(', ') } : null
}

export function parsePeriodic(ls: Line[], c: CommonFields, w: string[]): PeriodicSpec | string {
  const cells = ALL_SYMBOLS.map((_, i) => cellOf(i + 1))
  const highlights: PeriodicSpec['highlights'] = []
  let trend: TrendKey | null = null
  let fBlock = true
  for (const { key, value, raw } of ls) {
    if (key === 'highlight' || key === 'mark' || key === 'group' || key === 'show-group') {
      const [selector, label] = pipes(key === 'group' ? `group ${value}` : value)
      const found = selectElements(selector, cells)
      if (!found) { w.push(`Bad highlight "${raw}"`); continue }
      if (highlights.length < 5) highlights.push({ z: found.z, label: label || found.label })
    } else if (key === 'trend') {
      const v = value.toLowerCase()
      trend = /radius|size/.test(v) ? 'radius' : /electroneg/.test(v) ? 'electronegativity' : /ioni[sz]ation/.test(v) ? 'ionization' : /affinity/.test(v) ? 'affinity' : /metallic/.test(v) ? 'metallic' : null
      if (!trend) w.push(`Unknown trend "${raw}"`)
    } else if (key === 'show' || key === 'f-block') { if (/main/i.test(value) || falsy(value)) fBlock = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (highlights.some((h) => h.z.some((z) => cellOf(z).block === 'f'))) fBlock = true
  return { ...c, kind: 'periodic', cells: fBlock ? cells : cells.filter((x) => x.block !== 'f'), highlights, trend, fBlock }
}

// ── Titration curve ─────────────────────────────────────────────────────────

export interface TitrationInput { acid: boolean; strong: boolean; pK: number | null; conc: number; volume: number; titrantConc: number }
export interface TitrationSpec extends CommonFields {
  kind: 'titration'
  input: TitrationInput
  /** [mL of titrant added, pH] */
  points: Array<[number, number]>
  equivalence: { volume: number; pH: number }
  /** Weak analytes only: pH = pKa (or 14 − pKb) at half the equivalence volume. */
  half: { volume: number; pH: number } | null
  startPH: number
  showLabels: boolean
}

/** pH after adding `v` mL of strong titrant, from the charge balance (solved by bisection). */
export function titrationPH(t: TitrationInput, v: number): number {
  const total = t.volume + v
  const analyte = (t.conc * t.volume) / total
  const titrant = (t.titrantConc * v) / total
  const K = t.strong ? 1e9 : 10 ** -(t.pK ?? 4.76)
  // For an acid, x is [H+]; for a base everything mirrors and x is [OH-].
  const f = (x: number) => x + titrant - 1e-14 / x - (analyte * K) / (K + x)
  let lo = 1e-14, hi = 1
  for (let i = 0; i < 70; i++) {
    const mid = Math.sqrt(lo * hi)
    if (f(mid) > 0) hi = mid; else lo = mid
  }
  const p = -Math.log10(Math.sqrt(lo * hi))
  return t.acid ? p : 14 - p
}

export function parseTitration(ls: Line[], c: CommonFields, w: string[]): TitrationSpec | string {
  let acid = true, strong = true, pK: number | null = null, conc = 0.1, volume = 25, titrantConc = 0.1, showLabels = true
  let seen = false
  for (const { key, value, raw } of ls) {
    const parts = pipes(value)
    if (key === 'analyte' || key === 'acid' || key === 'base' || key === 'flask') {
      seen = true
      const kind = `${key} ${parts[0]}`.toLowerCase()
      acid = !/base/.test(kind)
      strong = !/weak/.test(kind)
      pK = named(parts, /pka|pkb|pk/)
      const ka = named(parts, /ka|kb/)
      if (pK === null && ka && ka > 0) pK = -Math.log10(ka)
      for (const p of parts.slice(1)) {
        if (/\bm\b|mol/i.test(p) && !/ml/i.test(p)) conc = num(p.replace(/mol\/l/i, 'M')) ?? conc
        else if (/ml/i.test(p)) volume = num(p) ?? volume
      }
      if (!strong && pK === null) return 'A weak acid or base needs its pKa (or pKb)'
    } else if (key === 'titrant' || key === 'buret' || key === 'burette') {
      const m = parts.map((p) => (/\bm\b|mol/i.test(p) ? num(p.replace(/mol\/l/i, 'M')) : null)).find((n) => n !== null)
      if (m) titrantConc = m
    } else if (key === 'labels' || key === 'answers') { if (falsy(value)) showLabels = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (!seen) return 'A titration needs "analyte: weak acid | pKa: 4.76 | 0.1 M | 25 mL"'
  if (conc <= 0 || volume <= 0 || titrantConc <= 0 || conc > 5 || titrantConc > 5) return 'Concentrations and volumes must be positive'
  const input: TitrationInput = { acid, strong, pK, conc, volume, titrantConc }
  const eq = (conc * volume) / titrantConc
  const points: Array<[number, number]> = []
  const end = eq * 2
  for (let i = 0; i <= 240; i++) {
    // More points close to the equivalence point, where the curve is steep.
    const u = i / 240
    const v = end * (u < 0.5 ? 0.5 - 0.5 * (1 - 2 * u) ** 1.8 : 0.5 + 0.5 * (2 * u - 1) ** 1.8)
    points.push([v, titrationPH(input, v)])
  }
  return {
    ...c, kind: 'titration', input, points,
    equivalence: { volume: eq, pH: titrationPH(input, eq) },
    half: strong ? null : { volume: eq / 2, pH: titrationPH(input, eq / 2) },
    startPH: titrationPH(input, 0),
    showLabels,
  }
}

// ── Heating curve ───────────────────────────────────────────────────────────

export interface HeatingCurveSpec extends CommonFields { kind: 'heating-curve'; substance: string; melting: number; boiling: number; from: number; to: number; cooling: boolean; showLabels: boolean }

export function parseHeatingCurve(ls: Line[], c: CommonFields, w: string[]): HeatingCurveSpec | string {
  let substance = '', melting: number | null = null, boiling: number | null = null, from: number | null = null, to: number | null = null, cooling = false, showLabels = true
  for (const { key, value, raw } of ls) {
    if (key === 'substance' || key === 'name') substance = value.trim().slice(0, 40)
    else if (key === 'melting' || key === 'melting-point' || key === 'freezing' || key === 'mp') melting = num(value)
    else if (key === 'boiling' || key === 'boiling-point' || key === 'bp') boiling = num(value)
    else if (key === 'from' || key === 'start') from = num(value)
    else if (key === 'to' || key === 'end') to = num(value)
    else if (key === 'direction' || key === 'curve') cooling = /cool/i.test(value)
    else if (key === 'labels' || key === 'answers') { if (falsy(value)) showLabels = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (melting === null || boiling === null || boiling <= melting) return 'A heating curve needs melting: and boiling: (boiling higher)'
  const span = boiling - melting
  const lo = from !== null && from < melting ? from : melting - span * 0.3
  const hi = to !== null && to > boiling ? to : boiling + span * 0.3
  return { ...c, kind: 'heating-curve', substance, melting, boiling, from: lo, to: hi, cooling, showLabels }
}

// ── Circuit ─────────────────────────────────────────────────────────────────

export interface Resistor { name: string; ohms: number; volts: number; amps: number }
export type CircuitPart = { type: 'resistor'; r: Resistor } | { type: 'parallel'; branches: Resistor[]; ohms: number; volts: number }
export interface CircuitSpec extends CommonFields { kind: 'circuit'; volts: number; parts: CircuitPart[]; total: number; amps: number; showAnswers: boolean }

/** Total resistance, the current, and each resistor's voltage drop and current. */
export function solveCircuit(volts: number, parts: Array<{ type: 'resistor'; name: string; ohms: number } | { type: 'parallel'; branches: Array<{ name: string; ohms: number }> }>): Pick<CircuitSpec, 'parts' | 'total' | 'amps'> {
  const eq = parts.map((p) => (p.type === 'resistor' ? p.ohms : 1 / p.branches.reduce((n, b) => n + 1 / b.ohms, 0)))
  const total = eq.reduce((n, r) => n + r, 0)
  const amps = volts / total
  return {
    total, amps,
    parts: parts.map((p, i): CircuitPart => {
      const drop = amps * eq[i]
      if (p.type === 'resistor') return { type: 'resistor', r: { name: p.name, ohms: p.ohms, volts: drop, amps } }
      return { type: 'parallel', ohms: eq[i], volts: drop, branches: p.branches.map((b) => ({ ...b, volts: drop, amps: drop / b.ohms })) }
    }),
  }
}

export function parseCircuit(ls: Line[], c: CommonFields, w: string[]): CircuitSpec | string {
  let volts: number | null = null, showAnswers = true, count = 0
  const parts: Parameters<typeof solveCircuit>[1] = []
  const sub = '₀₁₂₃₄₅₆₇₈₉'
  const auto = () => `R${String(++count).split('').map((d) => sub[Number(d)]).join('')}`
  for (const { key, value, raw } of ls) {
    if (key === 'battery' || key === 'voltage' || key === 'source') volts = num(pipes(value).pop())
    else if (key === 'resistor' || key === 'r' || key === 'bulb' || key === 'series') {
      for (const item of key === 'series' ? value.split(',') : [value]) {
        const bits = pipes(item)
        const ohms = num(bits[bits.length - 1])
        if (ohms === null || ohms <= 0) { w.push(`Bad resistor "${raw}"`); continue }
        const name = bits.length > 1 ? (count++, bits[0]) : auto()
        if (parts.length < 4) parts.push({ type: 'resistor', name, ohms })
      }
    } else if (key === 'parallel') {
      const branches = value.split(',').map((item) => {
        const bits = pipes(item)
        const ohms = num(bits[bits.length - 1])
        return ohms !== null && ohms > 0 ? { name: bits.length > 1 ? (count++, bits[0]) : auto(), ohms } : null
      })
      if (branches.length < 2 || branches.length > 3 || branches.some((b) => !b)) { w.push(`Bad parallel group "${raw}"`); continue }
      if (parts.length < 4) parts.push({ type: 'parallel', branches: branches as Array<{ name: string; ohms: number }> })
    } else if (key === 'answers' || key === 'values') { if (falsy(value)) showAnswers = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (volts === null || volts <= 0) return 'A circuit needs "battery: 12"'
  if (!parts.length) return 'A circuit needs at least one resistor'
  return { ...c, kind: 'circuit', volts, showAnswers, ...solveCircuit(volts, parts) }
}

// ── DNA, mRNA and protein ───────────────────────────────────────────────────

const CODONS: Record<string, string> = (() => {
  const bases = 'UCAG'
  const amino = 'Phe Phe Leu Leu Ser Ser Ser Ser Tyr Tyr Stop Stop Cys Cys Stop Trp Leu Leu Leu Leu Pro Pro Pro Pro His His Gln Gln Arg Arg Arg Arg Ile Ile Ile Met Thr Thr Thr Thr Asn Asn Lys Lys Ser Ser Arg Arg Val Val Val Val Ala Ala Ala Ala Asp Asp Glu Glu Gly Gly Gly Gly'.split(' ')
  const table: Record<string, string> = {}
  let i = 0
  for (const a of bases) for (const b of bases) for (const c3 of bases) table[a + b + c3] = amino[i++]
  return table
})()

const PAIR: Record<string, string> = { A: 'T', T: 'A', G: 'C', C: 'G' }

/** mRNA codons → amino acids, stopping after a stop codon. */
export function translate(mrna: string): string[] {
  const out: string[] = []
  for (let i = 0; i + 3 <= mrna.length; i += 3) {
    const aa = CODONS[mrna.slice(i, i + 3)]
    out.push(aa)
    if (aa === 'Stop') break
  }
  return out
}

export interface DnaSpec extends CommonFields { kind: 'dna'; /** 5′ → 3′ */ coding: string; /** 3′ → 5′, base for base under the coding strand */ template: string; mrna: string | null; protein: string[] | null }

export function parseDna(ls: Line[], c: CommonFields, w: string[]): DnaSpec | string {
  let coding = '', template = '', showMrna = false, showProtein = false
  const clean = (v: string) => v.toUpperCase().replace(/[^ACGTU]/g, '').replace(/U/g, 'T')
  for (const { key, value, raw } of ls) {
    if (key === 'coding' || key === 'strand' || key === 'dna' || key === 'sequence') coding = clean(value)
    else if (key === 'template') template = clean(value)
    else if (key === 'show') { showMrna = /mrna|rna|transcri/i.test(value) || /protein|amino|translat/i.test(value); showProtein = /protein|amino|translat/i.test(value) }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  const complement = (s: string) => s.split('').map((b) => PAIR[b]).join('')
  if (!coding && template) coding = complement(template)
  if (coding.length < 3 || coding.length > 36) return 'A DNA strand needs 3 to 36 bases (A, T, G, C)'
  const mrna = coding.replace(/T/g, 'U')
  return { ...c, kind: 'dna', coding, template: complement(coding), mrna: showMrna ? mrna : null, protein: showProtein ? translate(mrna) : null }
}

// ── Supply and demand ───────────────────────────────────────────────────────

export type Shift = -1 | 0 | 1
export interface SupplyDemandSpec extends CommonFields { kind: 'supply-demand'; demand: Shift; supply: Shift; control: 'floor' | 'ceiling' | null; showResult: boolean }

const STEP = 2.5 // how far a curve moves, in quantity units on a 0-10 grid

/** Equilibrium of D: P = 10 + d − Q and S: P = Q − s, where d and s are the curves' shifts to the right. */
export function equilibrium(demand: Shift, supply: Shift): { q: number; p: number } {
  const d = demand * STEP, s = supply * STEP
  return { q: (10 + d + s) / 2, p: (10 + d - s) / 2 }
}

/** "Price rises and quantity rises." For a double shift one of the two is not determined. */
export function shiftResult(demand: Shift, supply: Shift): { price: string; quantity: string } {
  const word = (n: number) => (n > 0 ? 'rises' : n < 0 ? 'falls' : 'stays the same')
  const both = demand !== 0 && supply !== 0
  const price = demand - supply, quantity = demand + supply
  return {
    price: both && price === 0 ? 'could rise or fall (it depends on which shift is bigger)' : word(price),
    quantity: both && quantity === 0 ? 'could rise or fall (it depends on which shift is bigger)' : word(quantity),
  }
}

export function parseSupplyDemand(ls: Line[], c: CommonFields, w: string[]): SupplyDemandSpec | string {
  let demand: Shift = 0, supply: Shift = 0, control: SupplyDemandSpec['control'] = null, showResult = true
  for (const { key, value, raw } of ls) {
    const v = value.toLowerCase()
    if (key === 'shift' || key === 'demand' || key === 'supply') {
      const text = key === 'shift' ? v : `${key} ${v}`
      const dir: Shift | null = /\b(right|increases?|up|rises?|more|out(ward)?)\b/.test(text) ? 1 : /\b(left|decreases?|down|falls?|less|in(ward)?)\b/.test(text) ? -1 : /\b(none|no shift|same)\b/.test(text) ? 0 : null
      if (dir === null || !/demand|supply/.test(text)) { w.push(`Bad shift "${raw}"`); continue }
      if (/demand/.test(text)) demand = dir; else supply = dir
    } else if (key === 'floor' || key === 'price-floor') { if (!falsy(value)) control = 'floor' }
    else if (key === 'ceiling' || key === 'price-ceiling') { if (!falsy(value)) control = 'ceiling' }
    else if (key === 'result' || key === 'answers') { if (falsy(value)) showResult = false }
    else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  return { ...c, kind: 'supply-demand', demand, supply, control, showResult }
}

export type ScienceSpec = PeriodicSpec | TitrationSpec | HeatingCurveSpec | CircuitSpec | DnaSpec | SupplyDemandSpec

export function describeScience(spec: ScienceSpec): string {
  switch (spec.kind) {
    case 'periodic': return `Periodic table${spec.highlights.length ? ` highlighting ${spec.highlights.map((h) => h.label).join(', ')}` : ''}${spec.trend ? `; ${TRENDS[spec.trend].name.toLowerCase()} increases to the ${TRENDS[spec.trend].across} across a period and ${TRENDS[spec.trend].group} a group` : ''}.`
    case 'titration': {
      const a = spec.input
      return `Titration curve of a ${a.strong ? 'strong' : 'weak'} ${a.acid ? 'acid' : 'base'} with a strong ${a.acid ? 'base' : 'acid'}${spec.showLabels ? `: starts at pH ${tidy(spec.startPH, 2)}, equivalence point at ${tidy(spec.equivalence.volume, 2)} mL and pH ${tidy(spec.equivalence.pH, 2)}${spec.half ? `, half-equivalence at pH ${tidy(spec.half.pH, 2)}` : ''}` : ''}.`
    }
    case 'heating-curve': return `${spec.cooling ? 'Cooling' : 'Heating'} curve${spec.substance ? ` of ${spec.substance}` : ''}${spec.showLabels ? ` with flat parts at ${spec.melting}° (melting) and ${spec.boiling}° (boiling)` : ''}.`
    case 'circuit': return `Circuit with a ${tidy(spec.volts)} V battery and ${spec.parts.map((p) => (p.type === 'resistor' ? `${p.r.name} ${tidy(p.r.ohms)} Ω` : `${p.branches.map((b) => `${b.name} ${tidy(b.ohms)} Ω`).join(' and ')} in parallel`)).join(', then ')}${spec.showAnswers ? `; total resistance ${tidy(spec.total, 3)} Ω, current ${tidy(spec.amps, 3)} A` : ''}.`
    case 'dna': return `DNA coding strand ${spec.coding} with its template strand ${spec.template}${spec.mrna ? `, mRNA ${spec.mrna}` : ''}${spec.protein ? `, amino acids ${spec.protein.join('-')}` : ''}.`
    case 'supply-demand': {
      const r = shiftResult(spec.demand, spec.supply)
      const moves = [spec.demand && `demand shifts ${spec.demand > 0 ? 'right' : 'left'}`, spec.supply && `supply shifts ${spec.supply > 0 ? 'right' : 'left'}`].filter(Boolean)
      return `Supply and demand graph${moves.length ? `: ${moves.join(' and ')}` : ''}${spec.control ? ` with a price ${spec.control}` : ''}${spec.showResult && moves.length ? `; price ${r.price}, quantity ${r.quantity}` : ''}.`
    }
  }
}
