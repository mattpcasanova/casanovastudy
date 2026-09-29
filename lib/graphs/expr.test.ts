import { describe, it, expect } from 'vitest'
import { compileExpr, parseExpr, toLatex } from './expr'

const at = (src: string, x: number) => compileExpr(src)(x)

describe('expression parser', () => {
  it('handles precedence and powers', () => {
    expect(at('2 + 3 * x', 2)).toBe(8)
    expect(at('x^2 - 2x - 3', 3)).toBe(0)
    expect(at('-x^2', 3)).toBe(-9)
    expect(at('2^x', 3)).toBe(8)
    expect(at('2^-x', 1)).toBe(0.5)
    expect(at('2^3^2', 0)).toBe(512)
    expect(at('10 - 4 - 3', 0)).toBe(3)
  })

  it('supports implicit multiplication', () => {
    expect(at('2x', 4)).toBe(8)
    expect(at('3(x + 1)', 1)).toBe(6)
    expect(at('x(x - 2)', 5)).toBe(15)
    expect(at('(x + 1)(x - 1)', 3)).toBe(8)
    expect(at('2pi', 0)).toBeCloseTo(2 * Math.PI)
    expect(at('1/2x', 4)).toBe(2)
  })

  it('supports functions, abs bars and unicode', () => {
    expect(at('sqrt(x)', 9)).toBe(3)
    expect(at('|x - 2|', -1)).toBe(3)
    expect(at('|x| + |x - 2|', 1)).toBe(2)
    expect(at('abs(x)', -4)).toBe(4)
    expect(at('log(x)', 100)).toBe(2)
    expect(at('ln(e)', 0)).toBe(1)
    expect(at('x² − 1', 2)).toBe(3)
    expect(at('√x', 16)).toBe(4)
    expect(at('sin x', Math.PI / 2)).toBe(1)
  })

  it('strips y = and f(x) = prefixes', () => {
    expect(at('y = 2x + 1', 1)).toBe(3)
    expect(at('f(x) = x^2', 3)).toBe(9)
  })

  it('rejects unknown names and bad syntax', () => {
    expect(() => parseExpr('2y + 1')).toThrow()
    expect(() => parseExpr('alert(1)')).toThrow()
    expect(() => parseExpr('2 +')).toThrow()
    expect(() => parseExpr('(x + 1')).toThrow()
    expect(() => parseExpr('')).toThrow()
  })

  it('returns NaN/Infinity where undefined', () => {
    expect(at('1/x', 0)).toBe(Infinity)
    expect(Number.isNaN(at('sqrt(x)', -1))).toBe(true)
  })

  it('emits Desmos LaTeX', () => {
    expect(toLatex(parseExpr('x^2 - 2x - 3'))).toBe('x^{2}-2\\cdot x-3')
    expect(toLatex(parseExpr('1/(x - 1)'))).toBe('\\frac{1}{x-1}')
    expect(toLatex(parseExpr('sqrt(x + 1)'))).toBe('\\sqrt{x+1}')
    expect(toLatex(parseExpr('|x - 2|'))).toBe('\\left|x-2\\right|')
    expect(toLatex(parseExpr('(x + 1)^2'))).toBe('\\left(x+1\\right)^{2}')
    expect(toLatex(parseExpr('3 - (x + 1)'))).toBe('3-\\left(x+1\\right)')
    expect(toLatex(parseExpr('2pi'))).toBe('2\\cdot \\pi')
  })
})
