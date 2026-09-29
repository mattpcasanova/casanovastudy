// Lewis structure layout for a central atom with terminal atoms (covers
// AXnEm molecules, diatomics and polyatomic ions). Pure and unit-tested: it
// returns positions in px for atoms, bond lines and lone-pair dots; LewisFigure
// just draws them.
//
// Up to 4 electron domains use the textbook cross (right, left, down, up), so
// H2O is H-O-H with lone pairs above and below and NH3 has its lone pair on top.
// 5 or 6 domains spread the atoms evenly and put lone pairs in the widest gaps.

import { elementInfo } from './elements'

export interface LewisInput {
  center: { symbol: string; lone: number }
  atoms: { symbol: string; bond: number; lone: number }[]
  charge?: number
  showFormal?: boolean
}

export interface LewisLayout {
  atoms: { symbol: string; x: number; y: number; formal: number }[]
  bonds: { x1: number; y1: number; x2: number; y2: number; order: number }[]
  dots: { x: number; y: number }[]
  box: { minX: number; minY: number; maxX: number; maxY: number }
  charge: number
  showFormal: boolean
}

const BOND = 56 // center-to-atom distance
const ATOM_R = 13 // bond lines stop this far from atom centers
const PAIR_R = 17 // lone pair distance from its atom
const DOT_GAP = 3.6

const deg = (d: number) => (d * Math.PI) / 180
// Screen coordinates: y grows downward, so "up" is -y.
const dirOf = (a: number): [number, number] => [Math.cos(deg(a)), -Math.sin(deg(a))]

/** Adds `count` directions into the widest angular gaps between `taken` (degrees). */
function fillGaps(taken: number[], count: number): number[] {
  const angles = [...taken]
  const added: number[] = []
  for (let k = 0; k < count; k++) {
    if (angles.length === 0) { angles.push(90); added.push(90); continue }
    const sorted = [...angles].sort((a, b) => a - b)
    let best = 0
    let bestGap = -1
    for (let i = 0; i < sorted.length; i++) {
      const a = sorted[i]
      const b = i + 1 < sorted.length ? sorted[i + 1] : sorted[0] + 360
      if (b - a > bestGap + 1e-6) { bestGap = b - a; best = (a + (b - a) / 2) % 360 }
    }
    angles.push(best)
    added.push(best)
  }
  return added
}

const EVEN: Record<number, number[]> = {
  5: [90, 162, 234, 306, 18],
  6: [90, 150, 210, 270, 330, 30],
}

export function layoutLewis(input: LewisInput): LewisLayout | string {
  const { center, atoms } = input
  if (atoms.length < 1) return 'A Lewis structure needs at least two atoms'
  if (atoms.length > 6) return 'Lewis structures support up to 6 atoms around the center'
  const slots = atoms.length + center.lone
  if (slots > 8) return 'Too many electron domains'

  let atomAngles: number[]
  let loneAngles: number[]
  if (slots <= 4) {
    const cross = [0, 180, 270, 90]
    atomAngles = cross.slice(0, atoms.length)
    loneAngles = cross.slice(atoms.length, slots)
  } else {
    atomAngles = EVEN[atoms.length] ?? Array.from({ length: atoms.length }, (_, i) => (i * 360) / atoms.length)
    loneAngles = fillGaps(atomAngles, center.lone)
  }

  const out: LewisLayout = { atoms: [], bonds: [], dots: [], box: { minX: 0, minY: 0, maxX: 0, maxY: 0 }, charge: input.charge ?? 0, showFormal: !!input.showFormal }
  const addPair = (x: number, y: number, angle: number, r = PAIR_R) => {
    const [dx, dy] = dirOf(angle)
    const cx = x + dx * r
    const cy = y + dy * r
    // The two dots sit side by side, perpendicular to the pair's direction.
    out.dots.push({ x: cx - dy * DOT_GAP, y: cy + dx * DOT_GAP }, { x: cx + dy * DOT_GAP, y: cy - dx * DOT_GAP })
  }

  const bondSum = atoms.reduce((s, a) => s + a.bond, 0)
  out.atoms.push({ symbol: center.symbol, x: 0, y: 0, formal: elementInfo(center.symbol).valence - 2 * center.lone - bondSum })
  // Pairs squeezed between bonds sit a little further out so they don't touch the bond lines.
  loneAngles.forEach((a) => addPair(0, 0, a, slots > 4 ? PAIR_R + 7 : PAIR_R))

  atoms.forEach((a, i) => {
    const angle = atomAngles[i]
    const [dx, dy] = dirOf(angle)
    const x = dx * BOND
    const y = dy * BOND
    out.atoms.push({ symbol: a.symbol, x, y, formal: elementInfo(a.symbol).valence - 2 * a.lone - a.bond })
    out.bonds.push({ x1: dx * ATOM_R, y1: dy * ATOM_R, x2: x - dx * ATOM_R, y2: y - dy * ATOM_R, order: Math.max(1, Math.min(3, a.bond)) })
    // Terminal lone pairs point away from the bond: outward first, then the sides.
    const order = a.lone === 2 ? [angle + 90, angle - 90] : [angle, angle + 90, angle - 90, angle + 180]
    order.slice(0, Math.min(3, a.lone)).forEach((d) => addPair(x, y, d))
  })

  const xs = [...out.atoms.map((a) => a.x), ...out.dots.map((d) => d.x)]
  const ys = [...out.atoms.map((a) => a.y), ...out.dots.map((d) => d.y)]
  out.box = { minX: Math.min(...xs) - 16, minY: Math.min(...ys) - 16, maxX: Math.max(...xs) + 16, maxY: Math.max(...ys) + 16 }
  return out
}
