import { describe, expect, it } from 'vitest'
import { estimateGradingSeconds, groupPages, measuredSecondsPerPage, mostCommon, pageCountLooksOff, remainingSeconds, naturalCompare, resultsCsv, splitNameAndPeriod, splitPoints, typicalPageCount, type PageHeader } from './batch'

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
  // A class set's papers are all about the same length. Phone photos of a page
  // held up show the next cover underneath, so inside pages come back with a
  // name (and sometimes "first page"); those must not split a 9-page paper.
  const stack = (papers: Array<{ name: string; pages: number; stray?: Array<[number, PageHeader]> }>) => {
    const headers: PageHeader[] = []
    const truth: number[] = []
    for (const paper of papers) {
      truth.push(headers.length)
      const start = headers.length
      for (let k = 0; k < paper.pages; k++) headers.push(k === 0 ? p(paper.name) : p(null))
      for (const [offset, h] of paper.stray ?? []) headers[start + offset] = h
    }
    return { headers, truth }
  }
  const startsOf = (starts: boolean[]) => starts.map((s, i) => (s ? i : -1)).filter((i) => i >= 0)
  it('ignores names and "first pages" read on inside pages when papers have a usual length', () => {
    const { headers, truth } = stack([
      { name: 'Ava R.', pages: 9, stray: [[6, p('Ben K.')], [7, { name: 'Ben K.', firstPage: true }]] },
      { name: 'Ben K.', pages: 9, stray: [[5, p('Cara M.')]] },
      { name: 'Cara M.', pages: 10, stray: [[8, { name: null, firstPage: true }]] },
      { name: 'Dan P.', pages: 9 },
      { name: 'Eve S.', pages: 9, stray: [[2, p('Ava R.')]] },
    ])
    expect(startsOf(splitPoints(headers))).toEqual(truth)
  })
  it('still splits a real first page whose name could not be read', () => {
    const { headers, truth } = stack([
      { name: 'Ava R.', pages: 9 },
      { name: 'Ben K.', pages: 9 },
      { name: '', pages: 9, stray: [[0, { name: null, firstPage: true }]] },
      { name: 'Dan P.', pages: 9 },
    ])
    expect(startsOf(splitPoints(headers))).toEqual(truth)
    expect(groupPages(splitPoints(headers), headers)[2]).toEqual({ name: 'Student 1', pages: [18, 19, 20, 21, 22, 23, 24, 25, 26] })
  })
  it('uses a name on an inside page when it is the only sign of a missed cover', () => {
    const { headers, truth } = stack([
      { name: 'Ava R.', pages: 9 },
      { name: 'Ben K.', pages: 9 },
      { name: '', pages: 9, stray: [[0, { name: 'Cara M.', firstPage: false }]] },
      { name: 'Dan P.', pages: 9 },
    ])
    expect(startsOf(splitPoints(headers))).toEqual(truth)
  })
  it('keeps a paper a page short or long (a photo missed or an extra sheet)', () => {
    const { headers, truth } = stack([
      { name: 'Ava R.', pages: 8 },
      { name: 'Ben K.', pages: 10 },
      { name: 'Cara M.', pages: 9 },
      { name: 'Dan P.', pages: 9 },
    ])
    expect(startsOf(splitPoints(headers))).toEqual(truth)
  })
  it('splits every candidate when there are too few sure first pages to know the length', () => {
    const headers = [p('Ava R.'), p(null), p(null, true), p(null), p('Ben K.')]
    expect(startsOf(splitPoints(headers))).toEqual([0, 2, 4])
  })
  it('one-page quizzes: every named page is a paper', () => {
    const headers = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => p(n))
    expect(startsOf(splitPoints(headers))).toEqual([0, 1, 2, 3, 4, 5])
  })
  it('respects teacher edits: toggled split points and removed pages', () => {
    const headers = [p('Ava R.'), p(null), p(null), p(null)]
    const starts = splitPoints(headers)
    starts[2] = true // teacher: page 3 starts a new student
    const groups = groupPages(starts, headers, new Set([3]))
    expect(groups).toEqual([{ name: 'Ava R.', pages: [0, 1] }, { name: 'Student 1', pages: [2] }])
  })
})

describe('typicalPageCount + pageCountLooksOff', () => {
  it('flags papers two or more pages off the usual length', () => {
    expect(typicalPageCount([9, 9, 10, 9, 2, 16])).toBe(9)
    expect(pageCountLooksOff(2, 9)).toBe(true)
    expect(pageCountLooksOff(16, 9)).toBe(true)
    expect(pageCountLooksOff(10, 9)).toBe(false)
    expect(pageCountLooksOff(8, 9)).toBe(false)
    expect(pageCountLooksOff(2, 1)).toBe(false)
    expect(pageCountLooksOff(3, 1)).toBe(true)
    expect(pageCountLooksOff(5, null)).toBe(false)
    expect(typicalPageCount([])).toBeNull()
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
    expect(estimateGradingSeconds([9], 3)).toBe(60)
    // 5 students x 9 pages: 60 + 4*60/3
    expect(estimateGradingSeconds([9, 9, 9, 9, 9], 3)).toBe(140)
  })
})

describe('measuredSecondsPerPage + remainingSeconds', () => {
  it('learns the per-page time from finished papers', () => {
    expect(measuredSecondsPerPage([])).toBeUndefined()
    expect(measuredSecondsPerPage([{ pages: 9, seconds: 60 }, { pages: 9, seconds: 60 }])).toBe(5)
    expect(measuredSecondsPerPage([{ pages: 1, seconds: 8 }])).toBe(2) // floor
  })
  it('shares the work left across the workers', () => {
    expect(remainingSeconds([], 5)).toBe(0)
    // 10 waiting 9-page papers, 5 at a time: 10*60/5
    expect(remainingSeconds(Array.from({ length: 10 }, () => ({ pages: 9 })), 5)).toBe(120)
    // one paper nearly done is at least 10 s, and never less than the longest one left
    expect(remainingSeconds([{ pages: 9, elapsed: 200 }], 5)).toBe(10)
    expect(remainingSeconds([{ pages: 9, elapsed: 55 }, { pages: 1 }], 5)).toBe(20)
  })
})

describe('splitPoints with misreads', () => {
  it('keeps a slightly misread repeat of the name on the same paper', () => {
    const headers = [p('Sean Miller'), p('Sean Millr'), p('Ava Kim'), p('Ava Kirn')]
    expect(groupPages(splitPoints(headers), headers).map((g) => g.pages)).toEqual([[0, 1], [2, 3]])
  })
})

describe('resultsCsv with statuses', () => {
  it('adds Student ID and Status columns only when used', () => {
    expect(resultsCsv([
      { name: 'Sean Miller', marks: 8, possible: 10, percentage: 80, grade: 'B', studentNumber: '1001' },
      { name: 'Ava Kim', marks: null, possible: null, percentage: null, grade: '', status: 'Absent' },
    ])).toBe('"Student ID","Student","Marks","Out of","Percent","Grade","Status"\n"1001","Sean Miller","8","10","80.0","B",""\n"","Ava Kim","","","","","Absent"')
  })
})
