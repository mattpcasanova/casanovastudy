import { describe, expect, it } from 'vitest'
import { isNumberCorrect, parseNumber } from './numeric'

describe('decimal commas', () => {
  it('reads 3,5 as 3.5 but 1,200 as 1200', () => {
    expect(parseNumber('3,5')).toBe(3.5)
    expect(parseNumber('-0,25')).toBe(-0.25)
    expect(parseNumber('1,200')).toBe(1200)
    expect(isNumberCorrect('2,75', ['2.75'])).toBe(true)
  })
})
