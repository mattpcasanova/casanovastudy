// Energy diagrams for chemistry figures.
//  - Bond potential energy well (energy vs internuclear distance): a Morse
//    curve with its minimum at (bond length, -bond energy).
//  - Reaction energy diagram: flat plateaus for reactants/intermediates/products
//    joined by smooth humps at each transition state.

/** Morse curve V(r) = D(1 - e^{-a(r - re)})² - D as an expression string in x. */
export function morseExpr(length: number, depth: number): string {
  // Width chosen so the well reads like textbook curves (steep wall, gentle tail).
  const a = 2.2 / length
  return `${depth} * (1 - exp(-${a.toFixed(6)} * (x - ${length})))^2 - ${depth}`
}

export interface ReactionLevel { energy: number; label?: string; kind: 'reactants' | 'transition' | 'intermediate' | 'products' }

/**
 * Samples the reaction path. Stationary points are evenly spaced along the
 * reaction coordinate; plateaus flatten the ends and cosine easing joins them.
 * Returns points in (0..1, energy) space.
 */
export function reactionPath(levels: ReactionLevel[], samples = 160): [number, number][] {
  if (levels.length < 2) return []
  const n = levels.length
  const xs = levels.map((_, i) => 0.08 + (0.84 * i) / (n - 1))
  const pts: [number, number][] = [[0, levels[0].energy], [xs[0], levels[0].energy]]
  for (let i = 0; i < n - 1; i++) {
    const [x0, x1] = [xs[i], xs[i + 1]]
    const [e0, e1] = [levels[i].energy, levels[i + 1].energy]
    const steps = Math.max(8, Math.round(samples / (n - 1)))
    for (let k = 1; k <= steps; k++) {
      const t = k / steps
      const ease = (1 - Math.cos(Math.PI * t)) / 2
      pts.push([x0 + (x1 - x0) * t, e0 + (e1 - e0) * ease])
    }
  }
  pts.push([1, levels[n - 1].energy])
  return pts
}
