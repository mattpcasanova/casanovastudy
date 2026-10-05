import { describe, expect, it } from 'vitest'
import { estimateGradingSeconds, groupPages, measuredSecondsPerPage, mostCommon, remainingSeconds, naturalCompare, resultsCsv, splitNameAndPeriod, splitPoints, type PageHeader } from './batch'

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

describe('splitNameAndPeriod', () => {
  it('pulls a period off the end of a name', () => {
    expect(splitNameAndPeriod('Sean Miller P2')).toEqual({ name: 'Sean Miller', period: '2' })
    expect(splitNameAndPeriod('Tyler Munne Period 2')).toEqual({ name: 'Tyler Munne', period: '2' })
    expect(splitNameAndPeriod('Ava Ross, Per. 3b')).toEqual({ name: 'Ava Ross', period: '3B' })
    expect(splitNameAndPeriod('Ben K (P4)')).toEqual({ name: 'Ben K', period: '4' })
    expect(splitNameAndPeriod('Cara M - 5th period')).toEqual({ name: 'Cara M', period: '5' })
  })
  it('leaves plain names alone', () => {
    expect(splitNameAndPeriod('Sophia Duncan')).toEqual({ name: 'Sophia Duncan', period: null })
    expect(splitNameAndPeriod('Philip Pratt')).toEqual({ name: 'Philip Pratt', period: null })
    expect(splitNameAndPeriod('P2')).toEqual({ name: 'P2', period: null })
  })
})

describe('mostCommon', () => {
  it('picks the most frequent value, ignoring case and blanks', () => {
    expect(mostCommon(['Unit 3 Test', null, 'unit 3 test', 'Quiz', ''])).toBe('Unit 3 Test')
    expect(mostCommon([null, undefined, ' '])).toBeNull()
  })
})

describe('estimateGradingSeconds', () => {
  it('runs the first paper alone, then the rest in parallel', () => {
    expect(estimateGradingSeconds([], 3)).toBe(0)
    expect(estimateGradingSeconds([9], 3)).toBe(155)
    // 5 students x 9 pages: 155 + 4*155/3
    expect(estimateGradingSeconds([9, 9, 9, 9, 9], 3)).toBe(362)
  })
})

describe('measuredSecondsPerPage + remainingSeconds', () => {
  it('learns the per-page time from finished papers', () => {
    expect(measuredSecondsPerPage([])).toBeUndefined()
    expect(measuredSecondsPerPage([{ pages: 9, seconds: 155 }, { pages: 9, seconds: 155 }])).toBe(15)
    expect(measuredSecondsPerPage([{ pages: 1, seconds: 8 }])).toBe(5) // floor
  })
  it('shares the work left across the workers', () => {
    expect(remainingSeconds([], 5)).toBe(0)
    // 10 waiting 9-page papers, 5 at a time: 10*155/5
    expect(remainingSeconds(Array.from({ length: 10 }, () => ({ pages: 9 })), 5)).toBe(310)
    // one paper nearly done is at least 10 s, and never less than the longest one left
    expect(remainingSeconds([{ pages: 9, elapsed: 200 }], 5)).toBe(10)
    expect(remainingSeconds([{ pages: 9, elapsed: 55 }, { pages: 1 }], 5)).toBe(100)
  })
})
