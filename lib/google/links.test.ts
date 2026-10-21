import { describe, expect, it } from 'vitest'
import { classroomWorkUrl } from './links'

describe('classroomWorkUrl', () => {
  it('matches the alternateLink Classroom returned for a real assignment', () => {
    expect(classroomWorkUrl('871738965408', '893532706582')).toBe('https://classroom.google.com/c/ODcxNzM4OTY1NDA4/a/ODkzNTMyNzA2NTgy/details')
  })
  it('needs both numeric ids', () => {
    expect(classroomWorkUrl(null, '1')).toBeNull()
    expect(classroomWorkUrl('12', 'abc')).toBeNull()
  })
})
