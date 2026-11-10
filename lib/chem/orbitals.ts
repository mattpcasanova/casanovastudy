// Electron configurations and orbital diagrams, computed (pure, unit-tested).
// The guide only names the element ("element: Fe" or "Fe | charge: +2"); the
// filling order, Hund's rule, the usual exceptions (Cr, Cu and the 4d ones),
// which electrons an ion loses, and the box holding the last electron all come
// from here, so a diagram can't disagree with the configuration beside it.

/** Atomic symbols by atomic number, through xenon (the f block is not drawn). */
export const SYMBOLS = [
  'H', 'He', 'Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne', 'Na', 'Mg', 'Al', 'Si', 'P', 'S', 'Cl', 'Ar',
  'K', 'Ca', 'Sc', 'Ti', 'V', 'Cr', 'Mn', 'Fe', 'Co', 'Ni', 'Cu', 'Zn', 'Ga', 'Ge', 'As', 'Se', 'Br', 'Kr',
  'Rb', 'Sr', 'Y', 'Zr', 'Nb', 'Mo', 'Tc', 'Ru', 'Rh', 'Pd', 'Ag', 'Cd', 'In', 'Sn', 'Sb', 'Te', 'I', 'Xe',
]

const L_OF: Record<string, number> = { s: 0, p: 1, d: 2 }
/** Filling order through 5p. */
const AUFBAU = ['1s', '2s', '2p', '3s', '3p', '4s', '3d', '4p', '5s', '4d', '5p']
const capacity = (name: string) => 2 * (2 * L_OF[name[1]] + 1)

// Ground states that break the filling order: [s electrons, d electrons] of the outer pair.
const EXCEPTIONS: Record<string, [string, number, string, number]> = {
  Cr: ['4s', 1, '3d', 5], Cu: ['4s', 1, '3d', 10],
  Nb: ['5s', 1, '4d', 4], Mo: ['5s', 1, '4d', 5], Ru: ['5s', 1, '4d', 7], Rh: ['5s', 1, '4d', 8], Pd: ['5s', 0, '4d', 10], Ag: ['5s', 1, '4d', 10],
}
const NOBLE = [2, 10, 18, 36, 54]

export interface Subshell {
  /** "3d" */
  name: string
  n: number
  l: number
  electrons: number
}

export interface OrbitalBox { ml: number; up: boolean; down: boolean; last: boolean }
export interface OrbitalGroup { name: string; boxes: OrbitalBox[] }
export interface OrbitalRow {
  symbol: string
  charge: number
  /** "Fe" or "Fe²⁺" */
  label: string
  /** "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶" */
  full: string
  /** "[Ar] 4s² 3d⁶" (the same as `full` up to neon's row) */
  short: string
  /** The noble gas core left out of `groups`, when the diagram is shortened. */
  core: string | null
  groups: OrbitalGroup[]
}

const SUP = '⁰¹²³⁴⁵⁶⁷⁸⁹'
const sup = (n: number) => String(n).split('').map((d) => SUP[Number(d)]).join('')

export function chargeLabel(symbol: string, charge: number): string {
  if (!charge) return symbol
  return `${symbol}${Math.abs(charge) > 1 ? sup(Math.abs(charge)) : ''}${charge > 0 ? '⁺' : '⁻'}`
}

/** "Fe", "fe", "Fe2+", "Fe³⁺", "O 2-", "Cl-" → symbol and charge. */
export function parseSpecies(text: string): { symbol: string; charge: number } | null {
  const t = text.trim().replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]/g, (d) => String(SUP.indexOf(d))).replace(/⁺/g, '+').replace(/[⁻−–]/g, '-')
  const m = t.match(/^([A-Za-z]{1,2})\s*\^?\s*(?:(\d)?\s*([+-])|([+-])\s*(\d))?$/)
  if (!m) return null
  const symbol = m[1][0].toUpperCase() + m[1].slice(1).toLowerCase()
  if (!SYMBOLS.includes(symbol)) return null
  const sign = m[3] ?? m[4]
  const size = Number(m[2] ?? m[5] ?? 1)
  return { symbol, charge: sign ? (sign === '+' ? size : -size) : 0 }
}

function neutral(z: number, symbol: string): Subshell[] {
  let left = z
  const shells: Subshell[] = []
  for (const name of AUFBAU) {
    if (left <= 0) break
    const electrons = Math.min(left, capacity(name))
    shells.push({ name, n: Number(name[0]), l: L_OF[name[1]], electrons })
    left -= electrons
  }
  const ex = EXCEPTIONS[symbol]
  if (ex) {
    for (const s of shells) {
      if (s.name === ex[0]) s.electrons = ex[1]
      if (s.name === ex[2]) s.electrons = ex[3]
    }
  }
  return shells
}

/**
 * Subshells in filling order with their electrons. Cations lose electrons from
 * the highest shell first (4s before 3d, so Fe²⁺ is [Ar] 3d⁶); anions are
 * filled like the atom with that many electrons.
 */
export function electronConfig(symbol: string, charge = 0): Subshell[] | string {
  const z = SYMBOLS.indexOf(symbol) + 1
  if (!z) return `Unknown element "${symbol}" (hydrogen to xenon are drawn)`
  if (charge >= z) return `${symbol} has no electrons left at that charge`
  if (z - charge > 54) return 'Only configurations up to xenon are drawn'
  if (charge < 0) return neutral(z - charge, '')
  const shells = neutral(z, symbol)
  for (let lost = 0; lost < charge; lost++) {
    const outer = shells.filter((s) => s.electrons > 0).sort((a, b) => b.n - a.n || b.l - a.l)[0]
    outer.electrons--
  }
  return shells.filter((s) => s.electrons > 0)
}

export const configText = (shells: Subshell[]) => shells.map((s) => `${s.name}${sup(s.electrons)}`).join(' ')

/** The noble gas whose electrons are all in `shells`, as [symbol, how many subshells it covers]. */
function nobleCore(shells: Subshell[]): [string, number] | null {
  const total = shells.reduce((n, s) => n + s.electrons, 0)
  let best: [string, number] | null = null
  for (const z of NOBLE) {
    if (z >= total) break
    const core = neutral(z, '')
    if (core.every((c, i) => shells[i]?.name === c.name && shells[i].electrons === c.electrons)) best = [SYMBOLS[z - 1], core.length]
  }
  return best
}

/** One subshell's boxes by Hund's rule: one up arrow in each box before any pair. */
export function fillBoxes(l: number, electrons: number): Array<Omit<OrbitalBox, 'last'>> {
  const count = 2 * l + 1
  return Array.from({ length: count }, (_, i) => ({ ml: i - l, up: electrons > i, down: electrons > count + i }))
}

/**
 * The diagram for one atom or ion. `core`: 'full' draws every subshell, 'short'
 * starts after the noble gas core, 'auto' shortens once the atom is past zinc
 * (more than 15 boxes), so iron still shows every box.
 */
export function orbitalRow(symbol: string, charge = 0, core: 'auto' | 'full' | 'short' = 'auto'): OrbitalRow | string {
  const shells = electronConfig(symbol, charge)
  if (typeof shells === 'string') return shells
  const noble = nobleCore(shells)
  const boxes = shells.reduce((n, s) => n + 2 * s.l + 1, 0)
  const shorten = !!noble && (core === 'short' || (core === 'auto' && boxes > 15))
  const drawn = shorten && noble ? shells.slice(noble[1]) : shells
  const lastShell = shells[shells.length - 1]
  const groups = drawn.map((s): OrbitalGroup => {
    const count = 2 * s.l + 1
    // The electron added last sits in the last subshell filled: the next empty up slot, or the next pair.
    const lastIndex = s === lastShell ? (s.electrons <= count ? s.electrons - 1 : s.electrons - count - 1) : -1
    return { name: s.name, boxes: fillBoxes(s.l, s.electrons).map((b, i) => ({ ...b, last: i === lastIndex })) }
  })
  const full = configText(shells)
  return {
    symbol, charge, label: chargeLabel(symbol, charge), full,
    short: noble ? `[${noble[0]}] ${configText(shells.slice(noble[1]))}`.trim() : full,
    core: shorten && noble ? noble[0] : null,
    groups,
  }
}

/** The shapes drawn for a subshell letter, in the order students meet them. */
export const SUBSHELL_SHAPES: Record<string, { l: number; orbitals: string[] }> = {
  s: { l: 0, orbitals: ['s'] },
  p: { l: 1, orbitals: ['px', 'py', 'pz'] },
  d: { l: 2, orbitals: ['dxy', 'dxz', 'dyz', 'dx2-y2', 'dz2'] },
}
