// Pedigree charts from a family list. The generator lists people and couples;
// the app places generations in rows, partners side by side and children
// under their parents. Pure and unit-tested; PedigreeFigure draws it.
//
// kind: pedigree
// person: I-1 | male | affected
// person: I-2 | female | carrier
// couple: I-1 + I-2 | II-1, II-2, II-3
// person: II-2 | male | deceased
// carriers: dot            (dot in the center instead of half shading)
// Status words: affected, carrier, unaffected (default), deceased. Any other
// text becomes the label under the symbol.

export type Sex = 'male' | 'female' | 'unknown'
export interface Person { id: string; sex: Sex; affected: boolean; carrier: boolean; deceased: boolean; label?: string }
export interface Couple { a: string; b: string; children: string[] }
export interface PedigreeData { people: Person[]; couples: Couple[]; carrierStyle: 'half' | 'dot' }

export interface PedigreeLayout {
  placed: (Person & { x: number; gen: number })[]
  generations: number
  couples: (Couple & { x1: number; x2: number; gen: number; kids: number[] })[]
}

const ROMAN: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }
export const toRoman = (n: number) => Object.keys(ROMAN).find((k) => ROMAN[k] === n) ?? String(n)

export function parsePedigree(lines: { key: string; value: string; raw: string }[], w: string[]): PedigreeData | string {
  const d: PedigreeData = { people: [], couples: [], carrierStyle: 'half' }
  const get = (id: string) => d.people.find((p) => p.id.toLowerCase() === id.toLowerCase())
  const ensure = (id: string) => {
    const hit = get(id)
    if (hit) return hit
    const p: Person = { id, sex: 'unknown', affected: false, carrier: false, deceased: false }
    d.people.push(p)
    return p
  }
  for (const { key, value, raw } of lines) {
    if (key === 'person' || key === 'individual' || key === 'member') {
      const [id, ...rest] = value.split('|').map((s) => s.trim())
      if (!id) { w.push(`Bad person "${raw}"`); continue }
      const p = ensure(id)
      const labels: string[] = []
      for (const r of rest.flatMap((x) => x.split(/\s*,\s*/))) {
        const t = r.toLowerCase()
        if (/^(male|man|boy|m)$/.test(t)) p.sex = 'male'
        else if (/^(female|woman|girl|f)$/.test(t)) p.sex = 'female'
        else if (/^affected$/.test(t)) p.affected = true
        else if (/^(carrier|heterozygous|het)$/.test(t)) p.carrier = true
        else if (/^(deceased|dead)$/.test(t)) p.deceased = true
        else if (/^(unaffected|normal|healthy)$/.test(t)) continue
        else if (r) labels.push(r)
      }
      if (labels.length) p.label = labels.join(' ')
    } else if (key === 'couple' || key === 'parents' || key === 'mating') {
      const [pair, kids = ''] = value.split('|').map((s) => s.trim())
      const [a, b] = pair.split(/\s*[+&×]\s*|\s+x\s+|\s+and\s+/).map((s) => s.trim()).filter(Boolean)
      if (!a || !b) { w.push(`Bad couple "${raw}"`); continue }
      ensure(a); ensure(b)
      const children = kids.split(/[,;]/).map((s) => s.trim()).filter(Boolean)
      children.forEach(ensure)
      d.couples.push({ a: get(a)!.id, b: get(b)!.id, children: children.map((c) => get(c)!.id) })
    } else if (key === 'carriers' || key === 'carrier-style') {
      d.carrierStyle = /dot/i.test(value) ? 'dot' : 'half'
    } else if (key !== 'note') w.push(`Unknown line "${raw}"`)
  }
  if (d.people.length < 2) return 'A pedigree needs at least two people'
  if (d.people.length > 40) return 'Pedigrees support up to 40 people'
  return d
}

export function layoutPedigree(d: PedigreeData): PedigreeLayout | string {
  // Generation: from Roman-numeral ids (II-3) when present, else from relationships.
  const gen = new Map<string, number>()
  for (const p of d.people) {
    const m = p.id.match(/^([IVX]+)\s*[-.]\s*\d+/i)
    if (m && ROMAN[m[1].toUpperCase()]) gen.set(p.id, ROMAN[m[1].toUpperCase()])
  }
  const childOf = new Map<string, Couple>()
  d.couples.forEach((c) => c.children.forEach((k) => childOf.set(k, c)))
  // Without numerals, couples where neither partner is anyone's child are founders.
  if (gen.size === 0) {
    for (const c of d.couples) if (!childOf.has(c.a) && !childOf.has(c.b)) { gen.set(c.a, 1); gen.set(c.b, 1); break }
  }
  for (let pass = 0; pass < 8; pass++) {
    for (const c of d.couples) {
      const g = gen.get(c.a) ?? gen.get(c.b) ?? (c.children.some((k) => gen.has(k)) ? Math.max(1, gen.get(c.children.find((k) => gen.has(k))!)! - 1) : undefined)
      if (g === undefined) continue
      if (!gen.has(c.a)) gen.set(c.a, g)
      if (!gen.has(c.b)) gen.set(c.b, g)
      c.children.forEach((k) => { if (!gen.has(k)) gen.set(k, g + 1) })
    }
  }
  d.people.forEach((p) => { if (!gen.has(p.id)) gen.set(p.id, 1) })
  const generations = Math.max(...gen.values())
  if (generations > 6) return 'Pedigrees support up to 6 generations'

  const x = new Map<string, number>()
  const spouseOf = (id: string) => {
    const c = d.couples.find((cc) => cc.a === id || cc.b === id)
    return c ? (c.a === id ? c.b : c.a) : null
  }
  for (let g = 1; g <= generations; g++) {
    let cursor = -Infinity
    const place = (id: string, at: number) => { const v = Math.max(at, cursor + 1); x.set(id, v); cursor = v }
    const inGen = d.people.filter((p) => gen.get(p.id) === g).map((p) => p.id)
    // Sibling groups under their parents (parents already placed one row up).
    const groups = d.couples
      .filter((c) => gen.get(c.a) === g - 1 && x.has(c.a) && x.has(c.b))
      .sort((c1, c2) => (x.get(c1.a)! + x.get(c1.b)!) - (x.get(c2.a)! + x.get(c2.b)!))
    for (const c of groups) {
      const members: string[] = []
      for (const k of c.children) {
        if (x.has(k) || gen.get(k) !== g) continue
        members.push(k)
        const sp = spouseOf(k)
        // A partner who married in (not a child in the chart) stands beside them.
        if (sp && !childOf.has(sp) && !x.has(sp) && gen.get(sp) === g && !members.includes(sp)) members.push(sp)
      }
      if (!members.length) continue
      const mid = (x.get(c.a)! + x.get(c.b)!) / 2
      const start = mid - (members.length - 1) / 2
      if (cursor > -Infinity) cursor += 0.4 // small gap between sibships
      members.forEach((m, i) => place(m, start + i))
    }
    // Everyone else in this generation (founders), couples kept together.
    for (const id of inGen) {
      if (x.has(id)) continue
      place(id, cursor === -Infinity ? 0 : cursor + 1)
      const sp = spouseOf(id)
      if (sp && !x.has(sp) && gen.get(sp) === g) place(sp, cursor + 1)
    }
  }
  const minX = Math.min(...x.values())
  const placed = d.people.map((p) => ({ ...p, x: x.get(p.id)! - minX, gen: gen.get(p.id)! }))
  const pos = new Map(placed.map((p) => [p.id, p.x]))
  return {
    placed,
    generations,
    couples: d.couples.map((c) => {
      const [x1, x2] = [pos.get(c.a)!, pos.get(c.b)!].sort((a, b) => a - b)
      return { ...c, x1, x2, gen: gen.get(c.a)!, kids: c.children.map((k) => pos.get(k)!) }
    }),
  }
}
