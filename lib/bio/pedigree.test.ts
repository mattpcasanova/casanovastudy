import { describe, it, expect } from 'vitest'
import { layoutPedigree, parsePedigree } from './pedigree'

const L = (text: string) => {
  const lines = text.split('\n').map((raw) => { const [k, ...v] = raw.split(':'); return { key: k.trim(), value: v.join(':').trim(), raw } })
  const d = parsePedigree(lines, [])
  if (typeof d === 'string') throw new Error(d)
  const l = layoutPedigree(d)
  if (typeof l === 'string') throw new Error(l)
  return { d, l, at: (id: string) => l.placed.find((p) => p.id === id)! }
}

describe('pedigree', () => {
  it('parses people and statuses', () => {
    const { d } = L('person: I-1 | male | affected\nperson: I-2 | female, carrier\ncouple: I-1 + I-2 | II-1, II-2')
    expect(d.people[0]).toMatchObject({ sex: 'male', affected: true })
    expect(d.people[1]).toMatchObject({ sex: 'female', carrier: true })
    expect(d.people).toHaveLength(4)
  })

  it('puts children one generation down, centered under parents', () => {
    const { l, at } = L('person: I-1 | male\nperson: I-2 | female\ncouple: I-1 + I-2 | II-1, II-2, II-3\nperson: II-1 | female\nperson: II-2 | male | affected\nperson: II-3 | female')
    expect(l.generations).toBe(2)
    expect(at('II-2').gen).toBe(2)
    const mid = (at('I-1').x + at('I-2').x) / 2
    expect(at('II-2').x).toBeCloseTo(mid)
    expect(new Set(l.placed.filter((p) => p.gen === 2).map((p) => p.x)).size).toBe(3)
  })

  it('places a married-in spouse beside their partner and infers generations without numerals', () => {
    const { at } = L('person: Grandpa | male\nperson: Grandma | female\ncouple: Grandpa + Grandma | Mom\nperson: Mom | female | carrier\nperson: Dad | male\ncouple: Mom + Dad | Son\nperson: Son | male | affected')
    expect(at('Mom').gen).toBe(2)
    expect(at('Dad').gen).toBe(2)
    expect(Math.abs(at('Dad').x - at('Mom').x)).toBe(1)
    expect(at('Son').gen).toBe(3)
  })

  it('never overlaps people in a row', () => {
    const { l } = L('couple: I-1 + I-2 | II-1, II-2\ncouple: I-3 + I-4 | II-3, II-4\ncouple: II-2 + II-3 | III-1')
    for (let g = 1; g <= l.generations; g++) {
      const xs = l.placed.filter((p) => p.gen === g).map((p) => p.x).sort((a, b) => a - b)
      xs.slice(1).forEach((v, i) => expect(v - xs[i]).toBeGreaterThanOrEqual(1))
    }
  })
})
