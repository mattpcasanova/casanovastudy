import { describe, it, expect } from 'vitest'
import { parseDesmosBlock } from './desmos-setup'

describe('parseDesmosBlock', () => {
  it('reads expressions, a table and a window', () => {
    const s = parseDesmosBlock('y=x^2-2x-3\n1. y=2x+1\n$$y=\\frac{1}{2}x$$\ntable: (1, 62) (2, 65)\nwindow: -5, 10, -10, 20\n\ny_1\\sim mx_1+b')
    expect(s.expressions).toEqual(['y=x^2-2x-3', 'y=2x+1', 'y=\\frac{1}{2}x', 'y_1\\sim mx_1+b'])
    expect(s.table).toEqual([[1, 62], [2, 65]])
    expect(s.bounds).toEqual({ left: -5, right: 10, bottom: -10, top: 20 })
  })
  it('ignores a bad window', () => {
    expect(parseDesmosBlock('y=x\nwindow: 5, 1, 0, 2').bounds).toBeUndefined()
  })
})
