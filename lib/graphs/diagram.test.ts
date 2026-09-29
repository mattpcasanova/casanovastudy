import { describe, it, expect } from 'vitest'
import { layoutDiagram, wrapLabel, type DiagramData } from './diagram'

const chain: DiagramData = {
  layout: 'down',
  nodes: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }, { id: 'c', label: 'C' }, { id: 'd', label: 'D' }],
  edges: [{ from: 'a', to: 'b', arrow: 'to' }, { from: 'a', to: 'c', arrow: 'to' }, { from: 'b', to: 'd', arrow: 'to' }, { from: 'c', to: 'd', arrow: 'to' }, { from: 'd', to: 'a', arrow: 'to' }],
}

describe('layoutDiagram', () => {
  it('ranks nodes top to bottom and marks the loop edge', () => {
    const l = layoutDiagram(chain)
    const y = (id: string) => l.nodes.find((n) => n.id === id)!.y
    expect(y('a')).toBeLessThan(y('b'))
    expect(y('b')).toBeCloseTo(y('c'))
    expect(y('d')).toBeGreaterThan(y('b'))
    expect(l.edges.filter((e) => e.back)).toHaveLength(1)
    expect(l.nodes.every((n) => n.x - n.w / 2 >= 0 && n.y - n.h / 2 >= 0)).toBe(true)
  })
  it('lays out left to right', () => {
    const l = layoutDiagram({ ...chain, layout: 'right' })
    const x = (id: string) => l.nodes.find((n) => n.id === id)!.x
    expect(x('a')).toBeLessThan(x('d'))
  })
  it('puts cycle nodes on a ring', () => {
    const l = layoutDiagram({ ...chain, layout: 'cycle' })
    expect(l.nodes).toHaveLength(4)
    expect(new Set(l.nodes.map((n) => Math.round(n.x))).size).toBeGreaterThan(1)
  })
  it('wraps long labels', () => {
    expect(wrapLabel('Increased atmospheric carbon dioxide traps more heat')).toEqual(['Increased atmospheric', 'carbon dioxide traps', 'more heat'])
  })
})
