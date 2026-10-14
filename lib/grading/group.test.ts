import { describe, expect, it } from 'vitest'
import { groupLabel, groupMembersFrom } from './group'

describe('groupMembersFrom', () => {
  it('keeps the paper name first and drops duplicates/blanks', () => {
    expect(groupMembersFrom(['Ava Kim', ' sean  miller ', 'Sean Miller', '', { name: 'Liam Chen', rosterId: 'r9' }], { name: 'Sean Miller', rosterId: 'r1' }))
      .toEqual([{ name: 'Sean Miller', rosterId: 'r1' }, { name: 'Ava Kim', rosterId: null }, { name: 'Liam Chen', rosterId: 'r9' }])
  })
  it('is just the student without a group', () => {
    expect(groupMembersFrom(undefined, { name: 'Mya' })).toEqual([{ name: 'Mya', rosterId: null }])
  })
  it('labels groups', () => {
    expect(groupLabel([{ name: 'A' }, { name: 'B' }])).toBe('A, B')
    expect(groupLabel([{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }])).toBe('A, B and 2 more')
  })
})
