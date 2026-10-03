import { describe, expect, it } from 'vitest'
import { splitExplanation } from './explanation'

describe('splitExplanation', () => {
  it('leaves short explanations whole', () => {
    expect(splitExplanation('Subtract 5 from both sides, then divide by 4 to get x = 6.')).toEqual({ short: 'Subtract 5 from both sides, then divide by 4 to get x = 6.', rest: '' })
  })
  it('keeps the solution and moves the wrong-option walkthrough behind More', () => {
    const text = 'Using (-1, 6) and (3, -2), the slope of f is -8/4 = -2, so f is y = -2x + 4 with x-intercept (2, 0). Line g has slope 1/2 (the negative reciprocal), so y = (1/2)(x - 2) = (1/2)x - 1, and its y-intercept is -1. The other choices come from common errors: 1 uses the reciprocal without changing the sign (-1/2), -4 changes the sign without taking the reciprocal (slope 2), and 4 is the y-intercept of f itself.'
    const { short, rest } = splitExplanation(text)
    expect(short).toMatch(/^Using \(-1, 6\)/)
    expect(short).toMatch(/y-intercept is -1\.$/)
    expect(rest).toMatch(/^The other choices/)
  })
  it('does not split inside decimals', () => {
    const text = '30% = 0.30, and 0.30 × 80 = 24 which is the answer here after you multiply the decimal by the whole number carefully. Choosing 2.4 comes from misplacing the decimal point by one place to the left, which is a very common slip on percent questions like this one.'
    expect(splitExplanation(text)).toEqual({
      short: '30% = 0.30, and 0.30 × 80 = 24 which is the answer here after you multiply the decimal by the whole number carefully.',
      rest: 'Choosing 2.4 comes from misplacing the decimal point by one place to the left, which is a very common slip on percent questions like this one.',
    })
  })
  it('falls back to a word budget when no sentence is about the wrong options', () => {
    const text = 'Photosynthesis turns light energy into chemical energy stored in glucose. It happens in the chloroplasts of plant cells, mostly in the leaves. The light reactions make ATP and NADPH, and the Calvin cycle then uses them to build sugar from carbon dioxide taken in through the stomata.'
    const { short, rest } = splitExplanation(text)
    expect(short).toMatch(/leaves\.$/)
    expect(rest).toMatch(/^The light reactions/)
  })
})
