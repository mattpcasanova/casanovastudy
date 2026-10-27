import { describe, expect, it } from 'vitest'
import { pageForQuestion, pickPaperPages } from './paper-pages'

describe('pageForQuestion', () => {
  it('spreads questions evenly over the pages', () => {
    // 12 questions on 4 pages: 3 per page
    expect(pageForQuestion(0, 12, 4)).toBe(0)
    expect(pageForQuestion(2, 12, 4)).toBe(0)
    expect(pageForQuestion(3, 12, 4)).toBe(1)
    expect(pageForQuestion(11, 12, 4)).toBe(3)
  })
  it('never leaves the paper', () => {
    expect(pageForQuestion(40, 12, 4)).toBe(3)
    expect(pageForQuestion(-1, 12, 4)).toBe(0)
    expect(pageForQuestion(5, 0, 4)).toBe(0)
    expect(pageForQuestion(5, 12, 0)).toBe(0)
  })
  it('one page: always that page', () => {
    for (let i = 0; i < 10; i++) expect(pageForQuestion(i, 10, 1)).toBe(0)
  })
  it('more pages than questions: later questions land on later pages', () => {
    expect(pageForQuestion(0, 2, 9)).toBe(0)
    expect(pageForQuestion(1, 2, 9)).toBe(4)
  })
})

describe('pickPaperPages', () => {
  it('keeps http urls only and names the rest', () => {
    expect(pickPaperPages([{ url: 'https://x/a.jpg', name: 'IMG_1' }, { url: 'javascript:alert(1)' }, { url: 'https://x/b.jpg' }, null, 'https://x/c.jpg']))
      .toEqual([{ url: 'https://x/a.jpg', name: 'IMG_1' }, { url: 'https://x/b.jpg', name: 'Page 2' }])
    expect(pickPaperPages('nope')).toEqual([])
    expect(pickPaperPages([{ url: 'https://x/a' }, { url: 'https://x/b' }], 1)).toHaveLength(1)
  })
})
