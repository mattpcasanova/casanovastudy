import { describe, it, expect } from 'vitest'
import { arrowLengths, directionAngle } from './fbd'
import { parseGraphSpec } from '@/lib/graphs/spec'

describe('free-body diagrams', () => {
  it('resolves incline-relative directions', () => {
    expect(directionAngle('normal', 30)).toBe(120)
    expect(directionAngle('down-slope', 30)).toBe(210)
    expect(directionAngle('up slope', 30)).toBe(30)
    expect(directionAngle('down', 30)).toBe(270)
    expect(directionAngle('135', 0)).toBe(135)
    expect(directionAngle('sideways', 0)).toBeNull()
  })

  it('parses an incline problem (inferred kind) with proportional arrows', () => {
    const r = parseGraphSpec('surface: incline 30\nforce: F_g | down | 49 N\nforce: N | normal | 42.4 N\nforce: f | up-slope | 10 N')
    if (!r.ok || r.spec.kind !== 'free-body') throw new Error(r.ok ? r.spec.kind : r.error)
    const d = r.spec.data
    expect(d.surface).toEqual({ kind: 'incline', angle: 30 })
    expect(d.forces.map((f) => f.angle)).toEqual([270, 120, 30])
    const L = arrowLengths(d)
    expect(L[0]).toBeGreaterThan(L[1])
    expect(L[1]).toBeGreaterThan(L[2])
  })

  it('uses equal arrows when magnitudes are unknown', () => {
    const r = parseGraphSpec('kind: free-body\nforce: T | up\nforce: W | down | mg')
    if (!r.ok || r.spec.kind !== 'free-body') throw new Error()
    expect(new Set(arrowLengths(r.spec.data)).size).toBe(1)
  })

  it('plane vectors with components', () => {
    const r = parseGraphSpec('kind: plane\nx: -1, 5\ny: -1, 5\nvector: (3, 4) | v | components\nvector: (0,0) (2,1) | u | red')
    if (!r.ok || r.spec.kind !== 'plane') throw new Error()
    expect(r.spec.vectors[0]).toMatchObject({ from: [0, 0], to: [3, 4], label: 'v', components: true })
    expect(r.spec.vectors[1]).toMatchObject({ label: 'u', color: 'red', components: false })
  })
})
