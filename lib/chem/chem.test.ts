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

import { configText, electronConfig, fillBoxes, orbitalRow, parseSpecies } from './orbitals'

describe('electron configurations', () => {
  const cfg = (symbol: string, charge = 0) => { const s = electronConfig(symbol, charge); return typeof s === 'string' ? s : configText(s) }
  it('fills in order, with the usual exceptions', () => {
    expect(cfg('Li')).toBe('1s² 2s¹')
    expect(cfg('O')).toBe('1s² 2s² 2p⁴')
    expect(cfg('Fe')).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d⁶')
    expect(cfg('Cr')).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d⁵')
    expect(cfg('Cu')).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d¹⁰')
    expect(cfg('Xe').endsWith('5s² 4d¹⁰ 5p⁶')).toBe(true)
  })
  it('takes a cation\'s electrons from the highest shell first and fills anions like the next atoms', () => {
    expect(cfg('Fe', 2)).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁶')
    expect(cfg('Fe', 3)).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 3d⁵')
    expect(cfg('Cu', 1)).toBe('1s² 2s² 2p⁶ 3s² 3p⁶ 3d¹⁰')
    expect(cfg('Na', 1)).toBe('1s² 2s² 2p⁶')
    expect(cfg('O', -2)).toBe('1s² 2s² 2p⁶')
    expect(cfg('Cl', -1)).toBe(cfg('Ar'))
  })
  it('refuses what it cannot draw', () => {
    expect(cfg('Au')).toMatch(/Unknown element/)
    expect(cfg('H', 1)).toMatch(/no electrons/)
    expect(cfg('Xe', -1)).toMatch(/up to xenon/)
  })
  it('follows Hund\'s rule', () => {
    expect(fillBoxes(1, 4)).toEqual([{ ml: -1, up: true, down: true }, { ml: 0, up: true, down: false }, { ml: 1, up: true, down: false }])
    expect(fillBoxes(2, 3).map((b) => [b.up, b.down])).toEqual([[true, false], [true, false], [true, false], [false, false], [false, false]])
  })
  it('builds a row: noble gas shorthand, the last electron, a shortened core for heavy atoms', () => {
    const fe = orbitalRow('Fe')
    if (typeof fe === 'string') throw new Error(fe)
    expect(fe.short).toBe('[Ar] 4s² 3d⁶')
    expect(fe.core).toBeNull()
    expect(fe.groups.map((g) => g.name)).toEqual(['1s', '2s', '2p', '3s', '3p', '4s', '3d'])
    expect(fe.groups[6].boxes.map((b) => b.last)).toEqual([true, false, false, false, false])
    const o = orbitalRow('O')
    if (typeof o === 'string') throw new Error(o)
    expect(o.short).toBe('[He] 2s² 2p⁴')
    expect(o.groups[2].boxes.findIndex((b) => b.last)).toBe(0)
    const n = orbitalRow('N')
    if (typeof n === 'string') throw new Error(n)
    expect(n.groups[2].boxes.findIndex((b) => b.last)).toBe(2)
    const br = orbitalRow('Br')
    if (typeof br === 'string') throw new Error(br)
    expect(br.core).toBe('Ar')
    expect(br.groups.map((g) => g.name)).toEqual(['4s', '3d', '4p'])
    const fe3 = orbitalRow('Fe', 3)
    if (typeof fe3 === 'string') throw new Error(fe3)
    expect([fe3.label, fe3.short]).toEqual(['Fe³⁺', '[Ar] 3d⁵'])
    const ne = orbitalRow('Ne')
    if (typeof ne === 'string') throw new Error(ne)
    expect(ne.short).toBe('[He] 2s² 2p⁶')
  })
  it('reads species as students and the model write them', () => {
    expect(parseSpecies('Fe')).toEqual({ symbol: 'Fe', charge: 0 })
    expect(parseSpecies('fe2+')).toEqual({ symbol: 'Fe', charge: 2 })
    expect(parseSpecies('Fe³⁺')).toEqual({ symbol: 'Fe', charge: 3 })
    expect(parseSpecies('O 2-')).toEqual({ symbol: 'O', charge: -2 })
    expect(parseSpecies('Cl⁻')).toEqual({ symbol: 'Cl', charge: -1 })
    expect(parseSpecies('Na+')).toEqual({ symbol: 'Na', charge: 1 })
    expect(parseSpecies('iron')).toBeNull()
  })
  it('parses the two fences', () => {
    const d = parseGraphSpec('kind: orbital-diagram\nelement: Li\nelement: O\nelement: Fe | charge: +2\nlabel: hide')
    expect(d.ok && d.spec.kind === 'orbital-diagram' && [d.spec.rows.map((r) => r.label), d.spec.showLabel]).toEqual([['Li', 'O', 'Fe²⁺'], false])
    const inferred = parseGraphSpec('element: Cu, Zn')
    expect(inferred.ok && inferred.spec.kind === 'orbital-diagram' && inferred.spec.rows.length).toBe(2)
    const s = parseGraphSpec('kind: orbitals\nsubshells: p, d')
    expect(s.ok && s.spec.kind === 'orbitals' && s.spec.subshells).toEqual(['p', 'd'])
    expect(parseGraphSpec('kind: orbital-diagram\nelement: Zz').ok).toBe(false)
  })
})
