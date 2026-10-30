import { describe, expect, it } from 'vitest'
import { materialKind, materialTitle, pickMaterialIds, trimForGuide } from './materials'

describe('materialKind', () => {
  it('sorts files by what they are', () => {
    expect(materialKind('Unit 4.pptx')).toBe('slides')
    expect(materialKind('notes.docx')).toBe('document')
    expect(materialKind('notes.txt')).toBe('document')
    expect(materialKind('scan.pdf')).toBe('pdf')
    expect(materialKind('photo.jpg')).toBe('other')
  })
})

describe('materialTitle', () => {
  it('drops the extension and underscores', () => {
    expect(materialTitle('Unit_4_Slides.pptx')).toBe('Unit 4 Slides')
    expect(materialTitle('Ch. 3 Notes.pdf')).toBe('Ch. 3 Notes')
    expect(materialTitle('.pptx')).toBe('.pptx')
  })
})

describe('trimForGuide', () => {
  it('labels each file and keeps short ones whole', () => {
    expect(trimForGuide([{ name: 'A', content: ' hello ' }])).toEqual([{ name: 'From your teacher: A', content: 'hello' }])
  })
  it('splits the budget so a later file is not starved', () => {
    const big = 'x'.repeat(10_000)
    const out = trimForGuide([{ name: 'A', content: big }, { name: 'B', content: big }], 10_000)
    expect(out).toHaveLength(2)
    expect(out[0].content.length).toBe(5_000)
    expect(out[1].content.length).toBe(5_000)
  })
  it('skips empty files', () => {
    expect(trimForGuide([{ name: 'A', content: '  ' }, { name: 'B', content: 'b' }]).map((m) => m.name)).toEqual(['From your teacher: B'])
  })
})

describe('pickMaterialIds', () => {
  const id = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, '0')}`
  it('keeps unique uuids, at most the limit', () => {
    expect(pickMaterialIds([id(1), id(1), 'nope', 3, id(2)])).toEqual([id(1), id(2)])
    expect(pickMaterialIds(Array.from({ length: 12 }, (_, i) => id(i)))).toHaveLength(8)
    expect(pickMaterialIds('x')).toEqual([])
  })
})
