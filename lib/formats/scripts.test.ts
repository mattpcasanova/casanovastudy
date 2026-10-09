import { describe, it, expect } from 'vitest'
import { splitAccents, splitScripts, type ScriptPart } from './scripts'

// Compact rendering for assertions: sup → ^[..], sub → _[..]
const show = (parts: ScriptPart[]): string =>
  parts.map((p) => (typeof p === 'string' ? p : `${p.kind === 'sup' ? '^' : '_'}[${show(p.parts)}]`)).join('')
const s = (t: string) => show(splitScripts(t))

describe('splitScripts', () => {
  it('turns caret exponents into superscripts', () => {
    expect(s('x^x')).toBe('x^[x]')
    expect(s('e^x·ln(x)')).toBe('e^[x]·ln(x)')
    expect(s('x^(x-1)')).toBe('x^[x−1]')
    expect(s('e^(x²)')).toBe('e^[x²]')
    expect(s('2^-x')).toBe('2^[−x]')
    expect(s('(x + 1)^2')).toBe('(x + 1)^[2]')
    expect(s('x^{n+1}')).toBe('x^[n+1]')
    expect(s('10^23 atoms')).toBe('10^[23] atoms')
    expect(s('x^x(ln(x) + 1)')).toBe('x^[x](ln(x) + 1)')
  })

  it('nests exponents', () => {
    expect(s('e^(x^2)')).toBe('e^[x^[2]]')
  })

  it('handles letter subscripts but not snake_case', () => {
    expect(s('x_1 + x_2')).toBe('x_[1] + x_[2]')
    expect(s('a_n = a_{n-1} + 2')).toBe('a_[n] = a_[n-1] + 2')
    expect(s('use my_var here')).toBe('use my_var here')
    expect(s('max_value')).toBe('max_value')
  })

  it('leaves stray carets and underscores alone', () => {
    expect(s('press ^ to jump')).toBe('press ^ to jump')
    expect(s('^start')).toBe('^start')
    expect(s('x^')).toBe('x^')
    expect(s('x^()')).toBe('x^()')
    expect(s('snake _case')).toBe('snake _case')
    expect(s('plain text')).toBe('plain text')
  })
})

describe('splitAccents', () => {
  it('turns combining bars and hats into KaTeX', () => {
    expect(splitAccents('the sampling distribution of x\u0304 for samples')).toEqual(['the sampling distribution of ', { tex: '\\bar{x}' }, ' for samples'])
    expect(splitAccents('p\u0302 = 0.4')).toEqual([{ tex: '\\hat{p}' }, ' = 0.4'])
    expect(splitAccents('\u03bc\u0304')).toEqual([{ tex: '\\bar{\\mu}' }])
  })

  it('leaves precomposed letters and plain text alone', () => {
    expect(splitAccents('mañana, crème')).toEqual(['mañana, crème'])
    expect(splitAccents('no accents')).toEqual(['no accents'])
  })
})
