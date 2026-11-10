import { describe, expect, it } from 'vitest'
import { scoreBands } from './score-bands'

describe('scoreBands', () => {
  it('counts students in each band, edges going to the higher band', () => {
    expect(scoreBands([100, 80, 79.9, 65, 64, 50, 49.9, 0])).toEqual([2, 2, 2, 2])
    expect(scoreBands([])).toEqual([0, 0, 0, 0])
    expect(scoreBands([105])).toEqual([1, 0, 0, 0])
  })
})
