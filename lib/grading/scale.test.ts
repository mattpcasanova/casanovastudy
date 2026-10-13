import { describe, expect, it } from 'vitest'
import { DEFAULT_SCALE, gradeFor, hasGrades, normalizeScale, presetScale } from './scale'

describe('gradeFor', () => {
  it('keeps the old US letters by default', () => {
    expect(gradeFor(null, 9, 10)).toBe('A')
    expect(gradeFor(DEFAULT_SCALE, 8, 10)).toBe('B')
    expect(gradeFor(undefined, 59.9, 100)).toBe('F')
  })
  it('uses raw-mark boundaries when basis is marks', () => {
    const scale = { ...presetScale('a_level'), basis: 'marks' as const, bands: [{ grade: 'A*', min: 52 }, { grade: 'A', min: 45 }, { grade: 'B', min: 38 }, { grade: 'C', min: 31 }, { grade: 'D', min: 24 }, { grade: 'E', min: 17 }] }
    expect(gradeFor(scale, 52, 60)).toBe('A*')
    expect(gradeFor(scale, 44.5, 60)).toBe('B')
    expect(gradeFor(scale, 10, 60)).toBe('U')
  })
  it('handles percent-only and no grade', () => {
    expect(gradeFor(presetScale('percent'), 17, 20)).toBe('85%')
    expect(gradeFor(presetScale('none'), 17, 20)).toBe('')
    expect(hasGrades(presetScale('percent'))).toBe(false)
    expect(hasGrades(presetScale('ib'))).toBe(true)
  })
  it('does not care about band order', () => {
    const scale = { preset: 'custom' as const, basis: 'percent' as const, bands: [{ grade: 'Pass', min: 50 }, { grade: 'Merit', min: 70 }], below: 'Fail' }
    expect(gradeFor(scale, 75, 100)).toBe('Merit')
    expect(gradeFor(scale, 55, 100)).toBe('Pass')
    expect(gradeFor(scale, 0, 0)).toBe('Fail')
  })
})

describe('normalizeScale', () => {
  it('rejects junk and cleans bands', () => {
    expect(normalizeScale(null)).toBeNull()
    expect(normalizeScale({ preset: 'nope' })).toBeNull()
    const s = normalizeScale({ preset: 'custom', basis: 'marks', bands: [{ grade: ' B ', min: '30' }, { grade: '', min: 5 }, { grade: 'A', min: 40 }, { grade: 'X', min: -1 }], below: 'U' })
    expect(s).toEqual({ preset: 'custom', basis: 'marks', bands: [{ grade: 'A', min: 40 }, { grade: 'B', min: 30 }], below: 'U' })
  })
})
