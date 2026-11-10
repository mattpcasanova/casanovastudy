import { describe, expect, it } from 'vitest'
import { parseGraphSpec } from './spec'
import { phi, shadedArea, radianText, exactTrig, parseAngle, splitFactor, areaModel, termText } from './math-figs'
import { cellOf, selectElements, ALL_SYMBOLS, titrationPH, solveCircuit, translate, equilibrium, shiftResult } from './science-figs'

const ok = (text: string) => { const r = parseGraphSpec(text); if (!r.ok) throw new Error(r.error); return r.spec }
const near = (a: number, b: number, tol = 0.01) => expect(Math.abs(a - b)).toBeLessThan(tol)

describe('normal curve', () => {
  it('computes areas', () => {
    near(phi(0), 0.5, 1e-6); near(phi(1), 0.8413, 1e-4); near(phi(-1.96), 0.025, 1e-4)
    near(shadedArea(100, 15, { type: 'between', a: 85, b: 115 }), 0.6827, 1e-4)
    near(shadedArea(100, 15, { type: 'above', a: 130 }), 0.0228, 1e-4)
    near(shadedArea(0, 1, { type: 'outside', a: -1.96, b: 1.96 }), 0.05, 1e-4)
  })
  it('reads the shade as written', () => {
    const s = ok('kind: normal\nmean: 100\nsd: 15\nshade: between 85 and 115')
    expect(s.kind === 'normal' && s.shade).toEqual({ type: 'between', a: 85, b: 115 })
    const b = ok('kind: normal\nshade: below -1.5\narea: hide')
    expect(b.kind === 'normal' && [b.shade, b.showArea, b.mean, b.sd]).toEqual([{ type: 'below', a: -1.5 }, false, 0, 1])
    const r = ok('mean: 50\nsd: 5\nrule: on')
    expect(r.kind === 'normal' && [r.rule, r.shade]).toEqual([true, null])
  })
})

describe('unit circle', () => {
  it('reads angles and gives exact values', () => {
    expect(parseAngle('150')).toBe(150)
    near(parseAngle('5pi/6')!, 150, 1e-9); near(parseAngle('-π/4')!, -45, 1e-9); near(parseAngle('2π')!, 360, 1e-9)
    expect([radianText(150), radianText(180), radianText(45), radianText(-90), radianText(0)]).toEqual(['5π/6', 'π', 'π/4', '−π/2', '0'])
    expect([exactTrig(Math.cos(Math.PI / 6)), exactTrig(Math.sin(Math.PI / 6)), exactTrig(Math.cos((2 * Math.PI) / 3)), exactTrig(Math.sin(Math.PI))]).toEqual(['√3/2', '1/2', '−1/2', '0'])
    const s = ok('kind: unit-circle\nangle: 150, 5pi/4')
    expect(s.kind === 'unit-circle' && s.angles.map((a) => [a.degreeText, a.cos, a.sin])).toEqual([['150°', '−√3/2', '1/2'], ['225°', '−√2/2', '−√2/2']])
  })
})

describe('fraction, area, tape, tree, place value, array', () => {
  it('fraction bars keep improper fractions', () => {
    const s = ok('kind: fraction-bar\nbar: 3/4\nbar: 5/4 | cups')
    expect(s.kind === 'fraction-bar' && s.bars.map((b) => [b.n, b.d, b.wholes])).toEqual([[3, 4, 1], [5, 4, 2]])
  })
  it('area model: numbers by place value, and binomials', () => {
    expect(splitFactor('23')!.map((t) => t.coef)).toEqual([20, 3])
    expect(splitFactor('105')!.map((t) => t.coef)).toEqual([100, 5])
    const n = ok('kind: area-model\nmultiply: 23 x 14')
    expect(n.kind === 'area-model' && [n.rows, n.cols, n.cells, n.total, n.left]).toEqual([['20', '3'], ['10', '4'], [['200', '80'], ['30', '12']], '322', '23 × 14'])
    const a = ok('kind: area-model\nmultiply: (x + 3)(x - 2)\nanswers: hide')
    expect(a.kind === 'area-model' && [a.cells, a.total, a.showAnswers]).toEqual([[['x²', '−2x'], ['3x', '−6']], 'x² + x − 6', false])
    const m = areaModel(splitFactor('2x + 1')!, splitFactor('2x - 1')!)
    expect(m.total.map((t, i) => termText(t, i === 0)).join(' ')).toBe('4x² − 1')
  })
  it('tape diagram finds the unit from the total or a known part', () => {
    const s = ok('kind: tape\ntape: Boys | 3\ntape: Girls | 5\ntotal: 32')
    expect(s.kind === 'tape' && [s.unit, s.tapes.map((t) => t.value)]).toEqual([4, [12, 20]])
    const k = ok('kind: tape\ntape: Red | 2\ntape: Blue | 7\nknown: Red | 10')
    expect(k.kind === 'tape' && [k.unit, k.total]).toEqual([5, 45])
  })
  it('probability tree multiplies along each path, in fractions when given fractions', () => {
    const s = ok('kind: probability-tree\nbranch: Rain | 0.3\nbranch: Rain > Late | 0.4\nbranch: Rain > On time | 0.6\nbranch: Dry | 0.7\nbranch: Dry > Late | 0.1\nbranch: Dry > On time | 0.9')
    expect(s.kind === 'probability-tree' && [s.leaves, s.depth, s.roots[0].children.map((c) => c.pathText), s.roots[1].children[0].pathText]).toEqual([4, 2, ['0.12', '0.18'], '0.07'])
    const f = ok('kind: probability-tree\nbranch: Red | 2/5\nbranch: Red > Red | 1/4\nbranch: Red > Blue | 3/4\nbranch: Blue | 3/5')
    expect(f.kind === 'probability-tree' && f.roots[0].children.map((c) => c.pathText)).toEqual(['1/10', '3/10'])
    const bad = parseGraphSpec('kind: probability-tree\nbranch: A | 0.5\nbranch: B | 0.2')
    expect(bad.ok && bad.warnings.length).toBe(1)
  })
  it('place value in base 10 and base 2', () => {
    const s = ok('kind: place-value\nnumber: 3,482.5')
    expect(s.kind === 'place-value' && [s.columns.map((c) => c.place), s.columns.map((c) => c.value), s.total]).toEqual([['Thousands', 'Hundreds', 'Tens', 'Ones', 'Tenths'], ['3,000', '400', '80', '2', '0.5'], '3482.5'])
    const b = ok('kind: place-value\nnumber: 1011 | base: 2')
    expect(b.kind === 'place-value' && [b.columns.map((c) => c.weight), b.total]).toEqual([['8', '4', '2', '1'], '11'])
    expect(parseGraphSpec('kind: place-value\nnumber: 129 | base: 2').ok).toBe(false)
  })
  it('array with pointers and a highlighted range', () => {
    const s = ok('kind: array\nname: nums\narray: [3, 8, 1, 9]\npointer: i | 1\npointer: j | 9\nhighlight: 2-3 | sorted')
    expect(s.kind === 'array' && [s.cells, s.pointers, s.highlights]).toEqual([['3', '8', '1', '9'], [{ name: 'i', index: 1 }], [{ indexes: [2, 3], label: 'sorted' }]])
  })
})

describe('periodic table', () => {
  it('places every element', () => {
    expect(ALL_SYMBOLS.length).toBe(118)
    const at = (sym: string) => { const c = cellOf(ALL_SYMBOLS.indexOf(sym) + 1); return [c.period, c.group, c.block] }
    expect([at('H'), at('He'), at('C'), at('Na'), at('Cl'), at('Fe'), at('Kr'), at('Ba'), at('Hf'), at('Au'), at('Rn'), at('Og')]).toEqual([[1, 1, 's'], [1, 18, 's'], [2, 14, 'p'], [3, 1, 's'], [3, 17, 'p'], [4, 8, 'd'], [4, 18, 'p'], [6, 2, 's'], [6, 4, 'd'], [6, 11, 'd'], [6, 18, 'p'], [7, 18, 'p']])
    expect([cellOf(57).block, cellOf(57).row, cellOf(71).col, cellOf(92).row]).toEqual(['f', 8, 17, 9])
    const seen = new Set(ALL_SYMBOLS.map((_, i) => { const c = cellOf(i + 1); return `${c.row},${c.col}` }))
    expect(seen.size).toBe(118)
  })
  it('selects groups, families and symbols', () => {
    const cells = ALL_SYMBOLS.map((_, i) => cellOf(i + 1))
    const sym = (sel: string) => selectElements(sel, cells)!.z.map((z) => ALL_SYMBOLS[z - 1])
    expect(sym('group 17')).toEqual(['F', 'Cl', 'Br', 'I', 'At', 'Ts'])
    expect(sym('alkali metals')).toEqual(['Li', 'Na', 'K', 'Rb', 'Cs', 'Fr'])
    expect(sym('period 2')).toEqual(['Li', 'Be', 'B', 'C', 'N', 'O', 'F', 'Ne'])
    expect(sym('na, cl')).toEqual(['Na', 'Cl'])
    expect(sym('metalloids')).toEqual(['B', 'Si', 'Ge', 'As', 'Sb', 'Te'])
    expect(selectElements('group 19', cells)).toBeNull()
    const s = ok('kind: periodic\nhighlight: halogens\nhighlight: Na, K | very reactive\ntrend: atomic radius\nshow: main')
    expect(s.kind === 'periodic' && [s.highlights.map((h) => h.label), s.trend, s.cells.length]).toEqual([['Halogens', 'very reactive'], 'radius', 88])
  })
})

describe('titration', () => {
  it('matches the textbook numbers', () => {
    const weak = { acid: true, strong: false, pK: 4.76, conc: 0.1, volume: 25, titrantConc: 0.1 }
    near(titrationPH(weak, 0), 2.88, 0.01)      // 0.1 M acetic acid
    near(titrationPH(weak, 12.5), 4.76, 0.01)   // half-equivalence: pH = pKa
    near(titrationPH(weak, 25), 8.73, 0.02)     // equivalence, 0.05 M acetate
    const strong = { acid: true, strong: true, pK: null, conc: 0.1, volume: 25, titrantConc: 0.1 }
    near(titrationPH(strong, 0), 1, 0.01); near(titrationPH(strong, 25), 7, 0.01); near(titrationPH(strong, 50), 12.52, 0.02)
    const base = { acid: false, strong: false, pK: 4.75, conc: 0.1, volume: 25, titrantConc: 0.1 }
    near(titrationPH(base, 0), 11.12, 0.02)     // 0.1 M ammonia
    near(titrationPH(base, 12.5), 9.25, 0.01)
  })
  it('parses the lines', () => {
    const s = ok('kind: titration\nanalyte: weak acid | pKa: 4.76 | 0.100 M | 25.0 mL\ntitrant: strong base | 0.200 M')
    expect(s.kind === 'titration' && [s.input.strong, s.input.acid, s.equivalence.volume, s.half?.volume]).toEqual([false, true, 12.5, 6.25])
    expect(parseGraphSpec('kind: titration\nanalyte: weak acid | 0.1 M | 25 mL').ok).toBe(false)
  })
})

describe('circuit, DNA, supply and demand, heating curve', () => {
  it('solves series and parallel', () => {
    const s = solveCircuit(12, [{ type: 'resistor', name: 'R1', ohms: 4 }, { type: 'parallel', branches: [{ name: 'R2', ohms: 6 }, { name: 'R3', ohms: 3 }] }])
    near(s.total, 6, 1e-9); near(s.amps, 2, 1e-9)
    expect(s.parts[0].type === 'resistor' && s.parts[0].r.volts).toBe(8)
    expect(s.parts[1].type === 'parallel' && s.parts[1].branches.map((b) => Number(b.amps.toFixed(4)))).toEqual([0.6667, 1.3333])
    const p = ok('kind: circuit\nbattery: 12 V\nresistor: 4\nparallel: 6, 3\nanswers: hide')
    expect(p.kind === 'circuit' && [p.total, p.showAnswers, p.parts.length]).toEqual([6, false, 2])
  })
  it('pairs, transcribes and translates', () => {
    expect(translate('AUGGCCUAAGGG')).toEqual(['Met', 'Ala', 'Stop'])
    const s = ok('kind: dna\ncoding: ATGGCCTAA\nshow: mrna, protein')
    expect(s.kind === 'dna' && [s.template, s.mrna, s.protein]).toEqual(['TACCGGATT', 'AUGGCCUAA', ['Met', 'Ala', 'Stop']])
    const t = ok('kind: dna\ntemplate: TACGGA')
    expect(t.kind === 'dna' && [t.coding, t.mrna]).toEqual(['ATGCCT', null])
  })
  it('moves the equilibrium the right way', () => {
    expect(equilibrium(0, 0)).toEqual({ q: 5, p: 5 })
    expect(equilibrium(1, 0)).toEqual({ q: 6.25, p: 6.25 })
    expect(equilibrium(0, 1)).toEqual({ q: 6.25, p: 3.75 })
    expect(shiftResult(1, 0)).toEqual({ price: 'rises', quantity: 'rises' })
    expect(shiftResult(0, -1)).toEqual({ price: 'rises', quantity: 'falls' })
    expect(shiftResult(1, 1).quantity).toBe('rises')
    expect(shiftResult(1, 1).price).toMatch(/could rise or fall/)
    expect(shiftResult(1, -1).quantity).toMatch(/could rise or fall/)
    const s = ok('kind: supply-demand\nshift: demand right\nshift: supply left\nceiling: on')
    expect(s.kind === 'supply-demand' && [s.demand, s.supply, s.control]).toEqual([1, -1, 'ceiling'])
  })
  it('heating curve needs both points in order', () => {
    const s = ok('kind: heating-curve\nsubstance: water\nmelting: 0\nboiling: 100\nfrom: -25\nto: 125')
    expect(s.kind === 'heating-curve' && [s.from, s.to, s.cooling]).toEqual([-25, 125, false])
    expect(parseGraphSpec('kind: heating-curve\nmelting: 100\nboiling: 0').ok).toBe(false)
  })
})

describe('writing figures', () => {
  it('annotated text gives the same role the same tone', () => {
    const s = ok('kind: annotated\npart: Claim | Schools should start later.\npart: Evidence | A study found teens sleep more | and score higher.\npart: Reasoning | Sleep helps memory.\npart: Evidence | Attendance also rose.')
    expect(s.kind === 'annotated' && [s.roles, s.parts.map((p) => p.tone), s.parts[1].text]).toEqual([['Claim', 'Evidence', 'Reasoning'], [0, 1, 2, 1], 'A study found teens sleep more | and score higher.'])
  })
  it('plot puts the stages in order', () => {
    const s = ok('kind: plot\nclimax: The duel\nexposition: Verona, two feuding families\nrising: They meet\nrising: They marry in secret\nresolution: The families make peace')
    expect(s.kind === 'plot' && s.points.map((p) => p.stage)).toEqual(['exposition', 'rising', 'rising', 'climax', 'resolution'])
    expect(parseGraphSpec('kind: plot\nexposition: a\nrising: b').ok).toBe(false)
  })
})
