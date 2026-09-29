// Punnett squares computed from the parents' genotypes, so the grid and the
// ratios are always right. Handles any number of autosomal genes (Tt, RrYy)
// and X-linked crosses (XᴴXʰ × XᴴY, written XHXh x XHY or X^H X^h x X^H Y).
// Pure and unit-tested; drawn by PunnettFigure in components/formats/bio-figures.tsx.

export type Dominance = 'complete' | 'incomplete'

export interface PunnettInput {
  cross: string // "Tt x Tt"
  dominance?: Dominance
  dominantName?: string // single-gene / X-linked phenotype names
  recessiveName?: string
}

export interface PunnettCell { genotype: string[]; phenotype: string; dominantTrait: boolean }
export interface PunnettResult {
  xLinked: boolean
  parents: [string[], string[]] // allele pairs per gene, display form
  top: string[][] // gametes of parent 1 (columns): allele list per gamete
  side: string[][] // gametes of parent 2 (rows)
  cells: PunnettCell[][] // [row][col]
  genotypeRatio: { genotype: string; count: number }[]
  phenotypeRatio: { phenotype: string; count: number }[]
  total: number
}

/** Dominant allele first; in X-linked crosses the Y chromosome goes last. */
const alleleOrder = (xLinked: boolean) => (a: string, b: string) => {
  const ka = a.replace(/^X/, ''), kb = b.replace(/^X/, '')
  if (xLinked && a === 'Y') return 1
  if (xLinked && b === 'Y') return -1
  const ua = ka === ka.toUpperCase(), ub = kb === kb.toUpperCase()
  return ua === ub ? ka.localeCompare(kb) : ua ? -1 : 1
}

/** "RrYy" → [["R","r"],["Y","y"]]; "XHXh" → [["XH","Xh"]]; "XHY" → [["XH","Y"]]. */
export function parseGenotype(raw: string): { genes: string[][]; xLinked: boolean } | null {
  const g = raw.replace(/[\s^_{}]/g, '').replace(/[ᴬ-ᵡ]/g, '')
  if (!g) return null
  if (/^X/.test(g)) {
    const alleles = g.match(/X[A-Za-z]|Y/g)
    if (!alleles || alleles.join('') !== g || alleles.length !== 2) return null
    return { genes: [alleles], xLinked: true }
  }
  if (!/^[A-Za-z]+$/.test(g) || g.length % 2 !== 0) return null
  const genes: string[][] = []
  for (let i = 0; i < g.length; i += 2) {
    const a = g[i], b = g[i + 1]
    if (a.toLowerCase() !== b.toLowerCase()) return null
    genes.push([a, b])
  }
  return genes.length > 3 ? null : { genes, xLinked: false }
}

function gametes(genes: string[][]): string[][] {
  return genes.reduce<string[][]>((acc, pair) => {
    // Homozygous parents still get both (identical) gametes: the standard full grid.
    return acc.flatMap((g) => pair.map((a) => [...g, a]))
  }, [[]])
}

export function computePunnett(input: PunnettInput): PunnettResult | string {
  // Lowercase "x" between spaces, "×" or "*": capital X is part of X-linked genotypes.
  const parts = input.cross.split(/\s*×\s*|\s+x\s+|\s*\*\s*/).map((p) => p.trim()).filter(Boolean)
  if (parts.length !== 2) return 'Write the cross as "Tt x Tt"'
  const p1 = parseGenotype(parts[0])
  const p2 = parseGenotype(parts[1])
  if (!p1 || !p2) return `Could not read the genotypes in "${input.cross}"`
  if (p1.xLinked !== p2.xLinked) return 'Both parents must be X-linked, or neither'
  const xLinked = p1.xLinked
  if (!xLinked) {
    if (p1.genes.length !== p2.genes.length) return 'Both parents need the same genes'
    for (let i = 0; i < p1.genes.length; i++) {
      if (p1.genes[i][0].toLowerCase() !== p2.genes[i][0].toLowerCase()) return 'Parents list different genes'
    }
  }
  const top = gametes(p1.genes)
  const side = gametes(p2.genes)
  // Keep the square readable: gene order fixed, dominant alleles first.
  const dominance = input.dominance ?? 'complete'

  const phenotypeOf = (genotype: string[][]): { name: string; dominantTrait: boolean } => {
    if (xLinked) {
      const [a, b] = genotype[0]
      const male = a === 'Y' || b === 'Y'
      const alleles = [a, b].filter((x) => x !== 'Y')
      const dom = alleles.some((x) => x[1] === x[1].toUpperCase())
      const trait = dom ? (input.dominantName ?? 'dominant trait') : (input.recessiveName ?? 'recessive trait')
      const carrier = !male && dom && alleles.some((x) => x[1] === x[1].toLowerCase())
      return { name: `${male ? 'Male' : 'Female'}, ${trait}${carrier ? ' (carrier)' : ''}`, dominantTrait: dom }
    }
    if (genotype.length === 1) {
      const [a, b] = genotype[0]
      const hasDom = a === a.toUpperCase() || b === b.toUpperCase()
      if (dominance === 'incomplete') {
        const het = a !== b
        const name = het ? 'intermediate' : hasDom ? (input.dominantName ?? a + a) : (input.recessiveName ?? a + a)
        return { name, dominantTrait: hasDom && !het }
      }
      return { name: hasDom ? (input.dominantName ?? 'dominant') : (input.recessiveName ?? 'recessive'), dominantTrait: hasDom }
    }
    // Several genes: A_B_, A_bb, aaB_, aabb.
    const name = genotype.map(([a, b]) => {
      const up = a.toUpperCase(), lo = a.toLowerCase()
      return a === up || b === up ? `${up}_` : `${lo}${lo}`
    }).join('')
    return { name, dominantTrait: genotype.every(([a, b]) => a === a.toUpperCase() || b === b.toUpperCase()) }
  }

  const cells: PunnettCell[][] = side.map((g2) => top.map((g1) => {
    const genotype = g1.map((a, i) => [a, g2[i]].sort(alleleOrder(xLinked)))
    const ph = phenotypeOf(genotype)
    return { genotype: genotype.map((pair) => pair.join('')), phenotype: ph.name, dominantTrait: ph.dominantTrait }
  }))

  const tally = (key: (c: PunnettCell) => string) => {
    const m = new Map<string, number>()
    cells.flat().forEach((c) => m.set(key(c), (m.get(key(c)) ?? 0) + 1))
    return [...m.entries()]
  }
  // Dominant-first genotypes; X-linked: females (no Y) before males.
  const genotypeOrder = (g: string) => (xLinked ? (g.includes('Y') ? '1' : '0') + g.replace(/X/g, '') : '') + g.split('').map((ch) => (ch === ch.toUpperCase() ? '0' : '1')).join('')
  return {
    xLinked,
    parents: [p1.genes.map((p) => p.join('')), p2.genes.map((p) => p.join(''))],
    top, side, cells,
    genotypeRatio: tally((c) => c.genotype.join('')).map(([genotype, count]) => ({ genotype, count })).sort((a, b) => genotypeOrder(a.genotype).localeCompare(genotypeOrder(b.genotype))),
    phenotypeRatio: tally((c) => c.phenotype).map(([phenotype, count]) => ({ phenotype, count })).sort((a, b) => b.count - a.count),
    total: top.length * side.length,
  }
}

/** Display form: "XH" → X with superscript H handled by the renderer; here "Xᴴ"-free plain text. */
export function alleleParts(allele: string): { base: string; sup?: string } {
  return allele.length === 2 && allele[0] === 'X' ? { base: 'X', sup: allele[1] } : { base: allele }
}
