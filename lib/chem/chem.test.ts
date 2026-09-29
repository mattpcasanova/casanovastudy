import { describe, it, expect } from 'vitest'
import { buildVsepr, type Vec3 } from './vsepr'
import { layoutLewis } from './lewis'
import { parseSdf } from './sdf'
import { reactionPath } from './energy'
import { parseGraphSpec } from '@/lib/graphs/spec'
import { evaluate } from '@/lib/graphs/expr'

const angle = (a: Vec3, b: Vec3) => (Math.acos(a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) * 180) / Math.PI
const F = (n: number) => Array.from({ length: n }, () => ({ symbol: 'F', order: 1 }))

describe('VSEPR', () => {
  it.each([
    [2, 0, 'linear'], [3, 0, 'trigonal planar'], [2, 1, 'bent'], [4, 0, 'tetrahedral'], [3, 1, 'trigonal pyramidal'],
    [2, 2, 'bent'], [5, 0, 'trigonal bipyramidal'], [4, 1, 'seesaw'], [3, 2, 'T-shaped'], [2, 3, 'linear'],
    [6, 0, 'octahedral'], [5, 1, 'square pyramidal'], [4, 2, 'square planar'],
  ])('%i bonded + %i lone → %s', (n, lone, shape) => {
    const m = buildVsepr({ center: 'X', bonded: F(n), lone })
    if (typeof m === 'string') throw new Error(m)
    expect(m.shape).toBe(shape)
    expect(m.atoms).toHaveLength(n + 1)
    expect(m.lonePairs).toHaveLength(lone)
  })

  it('uses ideal angles', () => {
    const t = buildVsepr({ center: 'C', bonded: F(4), lone: 0 })
    if (typeof t === 'string') throw new Error(t)
    expect(angle(t.atoms[1].pos, t.atoms[2].pos)).toBeCloseTo(109.47, 1)
  })

  it('puts XeF4 lone pairs opposite each other (square planar)', () => {
    const m = buildVsepr({ center: 'Xe', bonded: F(4), lone: 2 })
    if (typeof m === 'string') throw new Error(m)
    expect(angle(m.lonePairs[0].dir, m.lonePairs[1].dir)).toBeCloseTo(180)
    expect(m.axe).toBe('AX4E2')
  })

  it('puts the SF4 lone pair equatorial (seesaw)', () => {
    const m = buildVsepr({ center: 'S', bonded: F(4), lone: 1 })
    if (typeof m === 'string') throw new Error(m)
    expect(m.lonePairs[0].dir[1]).toBeCloseTo(0) // equatorial plane is y = 0
  })

  it('rejects impossible counts', () => {
    expect(typeof buildVsepr({ center: 'X', bonded: F(6), lone: 1 })).toBe('string')
    expect(typeof buildVsepr({ center: 'X', bonded: [], lone: 2 })).toBe('string')
  })
})

describe('Lewis layout', () => {
  it('draws water as H-O-H with lone pairs above and below', () => {
    const l = layoutLewis({ center: { symbol: 'O', lone: 2 }, atoms: [{ symbol: 'H', bond: 1, lone: 0 }, { symbol: 'H', bond: 1, lone: 0 }] })
    if (typeof l === 'string') throw new Error(l)
    expect(l.atoms.map((a) => a.symbol)).toEqual(['O', 'H', 'H'])
    expect(l.atoms[1].y).toBeCloseTo(0)
    expect(l.dots).toHaveLength(4)
    expect(l.dots.some((d) => d.y < -10) && l.dots.some((d) => d.y > 10)).toBe(true)
    expect(l.atoms.every((a) => a.formal === 0)).toBe(true)
  })

  it('computes formal charges (nitrate)', () => {
    const l = layoutLewis({
      center: { symbol: 'N', lone: 0 },
      atoms: [{ symbol: 'O', bond: 2, lone: 2 }, { symbol: 'O', bond: 1, lone: 3 }, { symbol: 'O', bond: 1, lone: 3 }],
      charge: -1,
    })
    if (typeof l === 'string') throw new Error(l)
    expect(l.atoms.map((a) => a.formal)).toEqual([1, 0, -1, -1])
    expect(l.charge).toBe(-1)
  })

  it('draws a triple bond for N2 with one lone pair each', () => {
    const l = layoutLewis({ center: { symbol: 'N', lone: 1 }, atoms: [{ symbol: 'N', bond: 3, lone: 1 }] })
    if (typeof l === 'string') throw new Error(l)
    expect(l.bonds[0].order).toBe(3)
    expect(l.dots).toHaveLength(4)
  })
})

describe('SDF', () => {
  it('parses atoms and bonds', () => {
    const sdf = `water
  test

  3  2  0     0  0  0  0  0  0999 V2000
    0.0000    0.0000    0.0000 O   0  0
    0.7570    0.5860    0.0000 H   0  0
   -0.7570    0.5860    0.0000 H   0  0
  1  2  1  0
  1  3  1  0
M  END`
    const m = parseSdf(sdf)
    expect(m?.atoms.map((a) => a.symbol)).toEqual(['O', 'H', 'H'])
    expect(m?.bonds).toEqual([{ a: 0, b: 1, order: 1 }, { a: 0, b: 2, order: 1 }])
  })
  it('rejects junk', () => {
    expect(parseSdf('Status: 404')).toBeNull()
  })
})

describe('reaction path', () => {
  it('starts at reactants, peaks at the transition state, ends at products', () => {
    const pts = reactionPath([{ energy: 50, kind: 'reactants' }, { energy: 120, kind: 'transition' }, { energy: 20, kind: 'products' }])
    expect(pts[0][1]).toBe(50)
    expect(pts[pts.length - 1][1]).toBe(20)
    expect(Math.max(...pts.map((p) => p[1]))).toBeCloseTo(120)
  })
})

describe('chemistry fences', () => {
  it('energy well becomes a plane with a minimum at (length, -depth)', () => {
    const r = parseGraphSpec('kind: energy-well\nbond: H–H\nlength: 74\ndepth: 432')
    if (!r.ok || r.spec.kind !== 'plane') throw new Error()
    expect(r.spec.points[0].at).toEqual([74, -432])
    expect(r.spec.yLabel).toMatch(/Potential energy/)
    expect(evaluate(r.spec.plots[0].expr, 74)).toBeCloseTo(-432)
  })

  it('reaction with catalyst and arrows', () => {
    const r = parseGraphSpec('kind: reaction\nreactants: 50 | A + B\ntransition: 120\nproducts: 20 | C\ncatalyzed: 90\nshow: Ea, ΔH')
    if (!r.ok || r.spec.kind !== 'reaction') throw new Error()
    expect(r.spec.levels).toHaveLength(3)
    expect(r.spec.catalyzed).toEqual([90])
    expect(r.spec.showEa && r.spec.showDH).toBe(true)
  })

  it('lewis with counted atoms and an ion charge (inferred kind)', () => {
    const r = parseGraphSpec('center: N | lone: 0\natom: 4 H | bond: 1\ncharge: +1')
    if (!r.ok || r.spec.kind !== 'lewis') throw new Error(r.ok ? r.spec.kind : r.error)
    expect(r.spec.layout.atoms).toHaveLength(5)
    expect(r.spec.layout.charge).toBe(1)
  })

  it('vsepr from a bonded list with double bonds', () => {
    const r = parseGraphSpec('kind: vsepr\ncenter: C\nbonded: =O, =O\nlone: 0\nname: hide')
    if (!r.ok || r.spec.kind !== 'vsepr') throw new Error()
    expect(r.spec.model.shape).toBe('linear')
    expect(r.spec.model.bonds.every((b) => b.order === 2)).toBe(true)
    expect(r.spec.showName).toBe(false)
  })

  it('molecule by name, rejecting odd input', () => {
    const r = parseGraphSpec('kind: molecule\nname: caffeine')
    expect(r.ok && r.spec.kind === 'molecule' && r.spec.name).toBe('caffeine')
    expect(parseGraphSpec('kind: molecule\nname: <script>').ok).toBe(false)
  })
})
