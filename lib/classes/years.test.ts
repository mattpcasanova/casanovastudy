import { describe, expect, it } from 'vitest'
import { courseKey, courseName, nextSchoolYear, schoolYearFor, sortYears } from './years'

describe('school years', () => {
  it('start July 1 (Eastern time)', () => {
    expect(schoolYearFor(new Date('2026-10-13T12:00:00Z'))).toBe('2026-27')
    expect(schoolYearFor(new Date('2027-03-01T12:00:00Z'))).toBe('2026-27')
    expect(schoolYearFor(new Date('2026-07-01T12:00:00Z'))).toBe('2026-27')
    expect(schoolYearFor(new Date('2026-07-01T02:00:00Z'))).toBe('2025-26') // still June 30 in Florida
    expect(schoolYearFor(new Date('2099-08-01T12:00:00Z'))).toBe('2099-00')
  })
  it('steps and sorts', () => {
    expect(nextSchoolYear('2026-27')).toBe('2027-28')
    expect(nextSchoolYear('2099-00')).toBe('2100-01')
    expect(sortYears(['2025-26', '2026-27', '2025-26'])).toEqual(['2026-27', '2025-26'])
  })
})

describe('courses', () => {
  it('drops the period so periods and years link up', () => {
    expect(courseName('AP Chemistry - Period 2')).toBe('AP Chemistry')
    expect(courseName('AP Chemistry (P3)')).toBe('AP Chemistry')
    expect(courseName('Algebra 1 Block 4A')).toBe('Algebra 1')
    expect(courseName('Biology', 'Honors Biology')).toBe('Honors Biology')
    expect(courseKey('AP Chemistry P2')).toBe(courseKey('ap chemistry'))
    expect(courseName('Period 3')).toBe('Period 3')
  })
})
