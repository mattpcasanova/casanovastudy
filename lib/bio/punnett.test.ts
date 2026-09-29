import { describe, it, expect } from 'vitest'
import { computePunnett, parseGenotype } from './punnett'

const ok = (cross: string, extra = {}) => {
  const r = computePunnett({ cross, ...extra })
  if (typeof r === 'string') throw new Error(r)
  return r
}

describe('Punnett squares', () => {
  it('monohybrid Tt x Tt → 1:2:1 and 3:1', () => {
    const r = ok('Tt x Tt', { dominantName: 'tall', recessiveName: 'short' })
    expect(r.total).toBe(4)
    expect(r.genotypeRatio).toEqual([{ genotype: 'TT', count: 1 }, { genotype: 'Tt', count: 2 }, { genotype: 'tt', count: 1 }])
    expect(r.phenotypeRatio).toEqual([{ phenotype: 'tall', count: 3 }, { phenotype: 'short', count: 1 }])
  })

  it('homozygous parents still make a 2x2 grid', () => {
    const r = ok('TT x tt')
    expect(r.cells.flat().every((c) => c.genotype[0] === 'Tt')).toBe(true)
    expect(r.total).toBe(4)
  })

  it('dihybrid RrYy x RrYy → 9:3:3:1', () => {
    const r = ok('RrYy x RrYy')
    expect(r.total).toBe(16)
    expect(r.phenotypeRatio.map((p) => p.count)).toEqual([9, 3, 3, 1])
    expect(r.phenotypeRatio[0].phenotype).toBe('R_Y_')
    // A gene letter Y is not the Y chromosome: dominant allele comes first.
    expect(r.cells.flat().every((c) => !c.genotype.join('').includes('yY'))).toBe(true)
    expect(r.genotypeRatio[0]).toEqual({ genotype: 'RRYY', count: 1 })
  })

  it('incomplete dominance → 1:2:1 phenotypes', () => {
    const r = ok('Rr x Rr', { dominance: 'incomplete', dominantName: 'red', recessiveName: 'white' })
    expect(r.phenotypeRatio.map((p) => p.phenotype).sort()).toEqual(['intermediate', 'red', 'white'])
  })

  it('X-linked carrier mother x normal father', () => {
    for (const cross of ['XHXh x XHY', 'X^H X^h x X^H Y', 'XHXh × XHY']) {
      const r = ok(cross, { dominantName: 'normal', recessiveName: 'hemophilia' })
      expect(r.xLinked).toBe(true)
      const names = r.cells.flat().map((c) => c.phenotype).sort()
      expect(names).toEqual(['Female, normal', 'Female, normal (carrier)', 'Male, hemophilia', 'Male, normal'])
    }
  })

  it('rejects bad input', () => {
    expect(parseGenotype('Tx')).toBeNull()
    expect(typeof computePunnett({ cross: 'Tt' })).toBe('string')
    expect(typeof computePunnett({ cross: 'Tt x RrYy' })).toBe('string')
    expect(typeof computePunnett({ cross: 'XHXh x Tt' })).toBe('string')
  })
})
