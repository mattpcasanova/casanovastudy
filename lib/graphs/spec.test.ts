import { describe, it, expect } from 'vitest'
import { describeGraph, parseGraphSpec, pairs, num, type GraphSpec } from './spec'

function ok(text: string): GraphSpec {
  const r = parseGraphSpec(text)
  if (!r.ok) throw new Error(r.error)
  return r.spec
}

describe('helpers', () => {
  it('parses numbers, fractions and constants', () => {
    expect(num('3')).toBe(3)
    expect(num('-1/2')).toBe(-0.5)
    expect(num('sqrt(4)')).toBe(2)
    expect(num('40°')).toBe(40)
    expect(num('x')).toBeNull()
    expect(num('-inf')).toBe(-Infinity)
  })
  it('finds coordinate pairs', () => {
    expect(pairs('(1, 2) (3,-4) (1/2, sqrt(9))')).toEqual([[1, 2], [3, -4], [0.5, 3]])
  })
})

describe('plane', () => {
  it('parses functions, points, shading and window', () => {
    const s = ok(`kind: plane
x: -6, 6
y: -4, 8
plot: x^2 - 2x - 3 | f
plot: 2x + 1 | dashed | red
point: (3, 0) | P
shade: y > 2x + 1
vline: x = 1 | dashed
title: Two graphs`)
    if (s.kind !== 'plane') throw new Error()
    expect(s.x).toEqual([-6, 6])
    expect(s.y).toEqual([-4, 8])
    expect(s.plots).toHaveLength(2)
    expect(s.plots[0].label).toBe('f')
    expect(s.plots[1]).toMatchObject({ dashed: true, color: 'red' })
    expect(s.points[0]).toMatchObject({ at: [3, 0], label: 'P' })
    expect(s.shades[0]).toMatchObject({ axis: 'y', op: '>' })
    expect(s.vlines[0]).toMatchObject({ x: 1, dashed: true })
    expect(s.title).toBe('Two graphs')
  })

  it('keeps absolute value bars out of the modifier split', () => {
    const s = ok('plot: |x - 2| | dashed')
    if (s.kind !== 'plane') throw new Error()
    expect(s.plots[0].source).toBe('|x - 2|')
    expect(s.plots[0].dashed).toBe(true)
  })

  it('reads a restricted domain', () => {
    const s = ok('plot: 2x + 1 for -2 <= x <= 3')
    if (s.kind !== 'plane') throw new Error()
    expect(s.plots[0].domain).toEqual([-2, 3])
  })

  it('auto-fits the window around points when none is given', () => {
    const s = ok('point: (20, 30)\npoint: (25, 35)')
    if (s.kind !== 'plane') throw new Error()
    expect(s.x[1]).toBeGreaterThan(25)
    expect(s.y[1]).toBeGreaterThan(35)
    expect(s.x[0]).toBeLessThanOrEqual(0)
  })

  it('skips bad lines but keeps good ones', () => {
    const r = parseGraphSpec('plot: 2y + 1\nplot: x + 1\nfoo bar')
    expect(r.ok).toBe(true)
    expect(r.warnings.length).toBe(2)
  })

  it('fails when nothing is drawable', () => {
    expect(parseGraphSpec('kind: plane\nx: -5, 5').ok).toBe(false)
    expect(parseGraphSpec('').ok).toBe(false)
  })
})

describe('geometry', () => {
  const tri = `kind: geometry
point: A (0, 0)
point: B (6, 0)
point: C (0, 4)
polygon: A B C
side: A B | 6
side: A C | 4
right-angle: B A C
angle: A B C | x°
tick: A B | 2
note: not drawn to scale`

  it('parses a labeled triangle', () => {
    const s = ok(tri)
    if (s.kind !== 'geometry') throw new Error()
    expect(s.points.map((p) => p.name)).toEqual(['A', 'B', 'C'])
    expect(s.sides).toHaveLength(2)
    expect(s.angles[0]).toMatchObject({ a: 'A', v: 'B', b: 'C', label: 'x°' })
    expect(s.rightAngles).toHaveLength(1)
    expect(s.ticks[0].count).toBe(2)
    expect(s.notToScale).toBe(true)
    expect(describeGraph(s)).toContain('not drawn to scale')
  })

  it('infers geometry from named points and supports circles', () => {
    const s = ok('point: O (0, 0)\npoint: A (3, 4)\ncircle: O A\nsegment: O A | r')
    if (s.kind !== 'geometry') throw new Error()
    expect(s.circles[0].r).toBe(5)
    expect(s.segments[0].label).toBe('r')
  })

  it('parses shaded sectors and polygons', () => {
    const s = ok('point: O (0, 0)\npoint: A (10, 0)\npoint: B (3.09, 9.51)\ncircle: O A\nsector: O A B\npoint: C (0, -5)\npolygon: O A C | shaded')
    if (s.kind !== 'geometry') throw new Error()
    expect(s.sectors).toEqual([{ center: 'O', a: 'A', b: 'B', color: undefined }])
    expect(s.polygons[0].shaded).toBe(true)
  })

  it('warns about unknown point names', () => {
    const r = parseGraphSpec('kind: geometry\npoint: A (0,0)\npoint: B (1,0)\nsegment: A B\nsegment: A Z')
    expect(r.ok).toBe(true)
    expect(r.warnings.some((w) => w.includes('Z'))).toBe(true)
  })
})

describe('data charts', () => {
  it('scatter with a fit line', () => {
    const s = ok('kind: scatter\ndata: (1, 62) (2, 65) (3, 71)\nfit: 4.5x + 57\nx-label: Hours\ny-label: Score')
    if (s.kind !== 'scatter') throw new Error()
    expect(s.data).toHaveLength(3)
    expect(s.fits).toHaveLength(1)
    expect(s.xLabel).toBe('Hours')
  })

  it('bar chart', () => {
    const s = ok('kind: bar\nbar: Mon | 12\nbar: Tue | 7 | red')
    if (s.kind !== 'bar') throw new Error()
    expect(s.bars).toEqual([{ label: 'Mon', value: 12, color: undefined }, { label: 'Tue', value: 7, color: 'red' }])
  })

  it('histogram bins sorted', () => {
    const s = ok('kind: histogram\nbin: 10-20 | 5\nbin: 0-10 | 3')
    if (s.kind !== 'histogram') throw new Error()
    expect(s.bins.map((b) => b.from)).toEqual([0, 10])
  })

  it('dot plot from a list or counts', () => {
    const s = ok('kind: dotplot\ndata: 1, 2, 2, 3\nvalue: 5 | 3')
    if (s.kind !== 'dotplot') throw new Error()
    expect(s.values).toEqual([{ value: 1, count: 1 }, { value: 2, count: 2 }, { value: 3, count: 1 }, { value: 5, count: 3 }])
  })

  it('box plot requires five increasing values', () => {
    const s = ok('kind: boxplot\nbox: 2, 5, 7, 9, 14 | Class A\nbox: 1, 2, 3 | bad')
    if (s.kind !== 'boxplot') throw new Error()
    expect(s.boxes).toHaveLength(1)
    expect(s.boxes[0].label).toBe('Class A')
  })

  it('number line intervals and rays', () => {
    const s = ok('kind: numberline\ninterval: (-2, 3]\ninterval: x >= 5\npoint: 4 | open')
    if (s.kind !== 'numberline') throw new Error()
    expect(s.intervals[0]).toEqual({ from: -2, to: 3, openFrom: true, openTo: false })
    expect(s.intervals[1]).toMatchObject({ from: 5, to: Infinity, openFrom: false })
    expect(s.points[0]).toMatchObject({ at: 4, open: true })
  })
})

describe('diagram', () => {
  it('parses nodes, edges and labels (inferred kind)', () => {
    const r = parseGraphSpec('node: stamp | Stamp Act (1765) | red\nnode: protest | Colonial protests\nstamp -> protest | taxation without representation\nprotest -> Repeal\nRepeal <-> stamp\nnote: sketch')
    if (!r.ok || r.spec.kind !== 'diagram') throw new Error(r.ok ? r.spec.kind : r.error)
    const d = r.spec.data
    expect(d.nodes.map((n) => n.label)).toEqual(['Stamp Act (1765)', 'Colonial protests', 'Repeal'])
    expect(d.nodes[0].color).toBe('red')
    expect(d.edges[0]).toMatchObject({ from: 'stamp', to: 'protest', label: 'taxation without representation', arrow: 'to' })
    expect(d.edges[2].arrow).toBe('both')
  })
  it('does not read arrows inside other kinds as edges', () => {
    const r = parseGraphSpec('kind: plane\nplot: x\ntext: (1, 2) | x → y')
    expect(r.ok && r.spec.kind === 'plane' && r.spec.texts[0].text).toBe('x → y')
  })
})
