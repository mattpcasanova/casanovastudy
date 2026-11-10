import { describe, expect, it } from 'vitest'
import { parseGraphSpec, describeGraph } from './spec'

const ok = (text: string) => { const r = parseGraphSpec(text); if (!r.ok) throw new Error(r.error); return r.spec }

describe('general figures', () => {
  it('venn: two sets and what they share', () => {
    const s = ok('kind: venn\nset: Mitosis | one division; two identical cells\nset: Meiosis | two divisions; four different cells\nboth: DNA is copied first; cells divide')
    expect(s.kind === 'venn' && [s.sets[0].name, s.sets[1].items.length, s.both]).toEqual(['Mitosis', 2, ['DNA is copied first', 'cells divide']])
    expect(parseGraphSpec('kind: venn\nset: A | x').ok).toBe(false)
    expect(parseGraphSpec('kind: venn\nset: A | x\nset: B | y\nset: C | z').ok).toBe(false)
  })
  it('layers: a stack by default, a pyramid when asked (or by kind)', () => {
    const s = ok('kind: layers\nshape: pyramid\nlayer: Hawks | 10 kcal\nlayer: Snakes\nlayer: Grass | 10,000 kcal')
    expect(s.kind === 'layers' && [s.shape, s.layers.length, s.layers[0].detail]).toEqual(['pyramid', 3, '10 kcal'])
    const p = ok('kind: pyramid\nlayer: King\nlayer: Nobles\nlayer: Peasants')
    expect(p.kind === 'layers' && p.shape).toBe('pyramid')
    const st = ok('layer: Crust\nlayer: Mantle\nlayer: Core')
    expect(st.kind === 'layers' && st.shape).toBe('stack')
  })
  it('spectrum: marks to scale with numbers, evenly spread without', () => {
    const s = ok('kind: spectrum\nfrom: 0 | Acidic\nto: 14 | Basic\nmark: 7 | Pure water\nmark: 2 | Lemon juice')
    expect(s.kind === 'spectrum' && s.marks.map((m) => [m.label, m.at, m.value])).toEqual([['Pure water', 0.5, '7'], ['Lemon juice', 2 / 14, '2']])
    const w = ok('kind: spectrum\nfrom: Loose construction\nto: Strict construction\nmark: Hamilton\nmark: Madison\nmark: Jefferson')
    expect(w.kind === 'spectrum' && [w.from.value, w.marks.map((m) => m.at)]).toEqual([null, [0.25, 0.5, 0.75]])
    expect(parseGraphSpec('kind: spectrum\nfrom: 0\nmark: 3 | x').ok).toBe(false)
  })
  it('parts of a whole: shares add to one', () => {
    const s = ok('kind: parts\nunit: %\npart: 78 | Nitrogen\npart: 21 | Oxygen\npart: 1 | Other gases')
    expect(s.kind === 'parts' && [s.total, s.parts[0].share, s.unit]).toEqual([100, 0.78, '%'])
    const inferred = ok('part: 3 | shaded\npart: 5 | unshaded')
    expect(inferred.kind === 'parts' && inferred.parts[0].share).toBe(3 / 8)
    expect(parseGraphSpec('kind: parts\npart: 5 | only one').ok).toBe(false)
  })
  it('anatomy: pieces of text, some labelled', () => {
    const s = ok('kind: anatomy\npart: y | output\npart: =\npart: mx | slope times input\npart: + b | y-intercept')
    expect(s.kind === 'anatomy' && s.parts.map((p) => p.label ?? null)).toEqual(['output', null, 'slope times input', 'y-intercept'])
    const inferred = ok('part: The dog | subject\npart: barked | verb')
    expect(inferred.kind).toBe('anatomy')
    expect(parseGraphSpec('kind: anatomy\npart: a\npart: b').ok).toBe(false)
  })
  it('timeline: events in order', () => {
    const s = ok('kind: timeline\nevent: 1765 | Stamp Act\nevent: 1773 | Boston Tea Party\nevent: 1776 | Declaration')
    expect(s.kind === 'timeline' && s.events.map((e) => e.when)).toEqual(['1765', '1773', '1776'])
    expect(parseGraphSpec('kind: timeline\nevent: 1765 | only').ok).toBe(false)
  })
  it('describes each for screen readers', () => {
    expect(describeGraph(ok('kind: parts\npart: 1 | a\npart: 3 | b'))).toBe('Parts of a whole: a 1 (25%), b 3 (75%).')
    expect(describeGraph(ok('kind: timeline\nevent: 1765 | Stamp Act\nevent: 1776 | Declaration'))).toBe('Timeline: 1765 Stamp Act; 1776 Declaration.')
  })
})
