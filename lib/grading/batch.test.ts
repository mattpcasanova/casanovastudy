import { describe, expect, it } from 'vitest'
import { groupPages, naturalCompare, resultsCsv, splitPoints, type PageHeader } from './batch'

const p = (name: string | null, firstPage = !!name): PageHeader => ({ name, firstPage })

describe('splitPoints + groupPages', () => {
  it('starts a new paper at each named page and keeps unnamed pages with it', () => {
    const headers = [p('Ava R.'), p(null), p(null), p('Ben K.'), p(null), p('Cara M.')]
    const groups = groupPages(splitPoints(headers), headers)
    expect(groups).toEqual([
      { name: 'Ava R.', pages: [0, 1, 2] },
      { name: 'Ben K.', pages: [3, 4] },
      { name: 'Cara M.', pages: [5] },
    ])
  })
  it('does not split when the same name is on every page', () => {
    const headers = [p('Ava R.'), p('ava r.'), p('Ben K.'), p('Ben  K.')]
    expect(groupPages(splitPoints(headers), headers).map((g) => g.pages)).toEqual([[0, 1], [2, 3]])
  })
  it('splits on a first page with no readable name and labels it', () => {
    const headers = [p('Ava R.'), p(null), p(null, true), p(null)]
    const groups = groupPages(splitPoints(headers), headers)
    expect(groups).toEqual([{ name: 'Ava R.', pages: [0, 1] }, { name: 'Student 1', pages: [2, 3] }])
  })
  it('respects teacher edits: toggled split points and removed pages', () => {
    const headers = [p('Ava R.'), p(null), p(null), p(null)]
    const starts = splitPoints(headers)
    starts[2] = true // teacher: page 3 starts a new student
    const groups = groupPages(starts, headers, new Set([3]))
    expect(groups).toEqual([{ name: 'Ava R.', pages: [0, 1] }, { name: 'Student 1', pages: [2] }])
  })
})

describe('naturalCompare', () => {
  it('orders camera-roll names numerically', () => {
    expect(['IMG_1001.HEIC', 'IMG_998.HEIC', 'IMG_999.HEIC'].sort(naturalCompare)).toEqual(['IMG_998.HEIC', 'IMG_999.HEIC', 'IMG_1001.HEIC'])
  })
})

describe('resultsCsv', () => {
  it('quotes names and rounds percentages', () => {
    expect(resultsCsv([{ name: 'O"Neil, Sam', marks: 4, possible: 6, percentage: 66.666, grade: 'D' }]))
      .toBe('"Student","Marks","Out of","Percent","Grade"\n"O""Neil, Sam","4","6","66.7","D"')
  })
})
