// VSEPR models: ideal 3D positions for a central atom's electron domains,
// with lone pairs placed where the theory puts them (equatorial first for 5
// domains, opposite each other for 6). Pure and unit-tested; drawn by
// Model3D in components/formats/chem-figures.tsx.

export type Vec3 = [number, number, number]

export interface Atom3D { symbol: string; pos: Vec3 }
export interface Bond3D { a: number; b: number; order: number }
export interface Model3DData { atoms: Atom3D[]; bonds: Bond3D[]; lonePairs: { from: number; dir: Vec3 }[] }

export interface VseprModel extends Model3DData {
  shape: string
  electronGeometry: string
  angles: string
  axe: string // "AX4E1"
}

const norm = (v: Vec3): Vec3 => { const l = Math.hypot(...v) || 1; return [v[0] / l, v[1] / l, v[2] / l] }
const ring = (y: number, r: number, n: number, offset = 0): Vec3[] =>
  Array.from({ length: n }, (_, i) => {
    const t = offset + (2 * Math.PI * i) / n
    return [r * Math.cos(t), y, r * Math.sin(t)] as Vec3
  })

// Domain directions per steric number, listed in the order lone pairs fill them.
function domains(sn: number): Vec3[] {
  switch (sn) {
    case 1: return [[1, 0, 0]]
    case 2: return [[1, 0, 0], [-1, 0, 0]]
    case 3: return [[0, 1, 0], [-Math.cos(Math.PI / 6), -0.5, 0], [Math.cos(Math.PI / 6), -0.5, 0]]
    case 4: return ([[0, 1, 0] as Vec3, ...ring(-1 / 3, Math.sqrt(8 / 9), 3, Math.PI / 2)]).map(norm)
    // Lone pairs go equatorial first, so the equatorial directions come first.
    case 5: return [...ring(0, 1, 3, Math.PI / 2), [0, 1, 0], [0, -1, 0]]
    // First two lone pairs take opposite (axial) positions.
    case 6: return [[0, 1, 0], [0, -1, 0], [1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1]]
    default: return []
  }
}

const ELECTRON_GEOMETRY: Record<number, string> = {
  1: 'linear', 2: 'linear', 3: 'trigonal planar', 4: 'tetrahedral', 5: 'trigonal bipyramidal', 6: 'octahedral',
}

const SHAPES: Record<string, [string, string]> = {
  '1-0': ['linear', '180°'], '1-1': ['linear', '180°'], '1-2': ['linear', '180°'], '1-3': ['linear', '180°'],
  '2-0': ['linear', '180°'],
  '3-0': ['trigonal planar', '120°'], '2-1': ['bent', '<120°'],
  '4-0': ['tetrahedral', '109.5°'], '3-1': ['trigonal pyramidal', '<109.5° (about 107°)'], '2-2': ['bent', '<109.5° (about 104.5°)'],
  '5-0': ['trigonal bipyramidal', '90°, 120°'], '4-1': ['seesaw', '<90°, <120°'], '3-2': ['T-shaped', '<90°'], '2-3': ['linear', '180°'],
  '6-0': ['octahedral', '90°'], '5-1': ['square pyramidal', '<90°'], '4-2': ['square planar', '90°'], '3-3': ['T-shaped', '<90°'], '2-4': ['linear', '180°'],
}

export interface VseprInput { center: string; bonded: { symbol: string; order: number }[]; lone: number }

export function buildVsepr({ center, bonded, lone }: VseprInput): VseprModel | string {
  const n = bonded.length
  const sn = n + lone
  if (n < 1) return 'A VSEPR model needs at least one bonded atom'
  if (sn > 6) return 'VSEPR models support up to 6 electron domains'
  if (lone < 0) return 'Lone pairs cannot be negative'
  const dirs = domains(sn)
  // Lone pairs fill the first `lone` directions; bonds take the rest.
  const loneDirs = dirs.slice(0, lone)
  const bondDirs = dirs.slice(lone)
  // For 2 domains + lone pairs (only possible when sn >= 3) nothing special is needed.
  const atoms: Atom3D[] = [{ symbol: center, pos: [0, 0, 0] }]
  const bonds: Bond3D[] = []
  bondDirs.forEach((d, i) => {
    atoms.push({ symbol: bonded[i].symbol, pos: d })
    bonds.push({ a: 0, b: i + 1, order: bonded[i].order })
  })
  const [shape, angles] = SHAPES[`${n}-${lone}`] ?? ['', '']
  return {
    atoms, bonds,
    lonePairs: loneDirs.map((dir) => ({ from: 0, dir })),
    shape, angles,
    electronGeometry: ELECTRON_GEOMETRY[sn] ?? '',
    axe: `AX${n}${lone ? `E${lone}` : ''}`,
  }
}
