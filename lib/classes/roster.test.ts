import { describe, expect, it } from 'vitest'
import { parseRosterPaste, rosterRowForStudent } from './roster'

describe('parseRosterPaste', () => {
  it('reads plain, comma and numbered lists and drops duplicates', () => {
    expect(parseRosterPaste('Student names\n1. Sean Miller\nLee, Mary Ann\n\n- Ava Kim\nsean miller\n')).toEqual([
      { firstName: 'Sean', lastName: 'Miller' },
      { firstName: 'Mary Ann', lastName: 'Lee' },
      { firstName: 'Ava', lastName: 'Kim' },
    ])
  })
  it('reads spreadsheet columns with a header row', () => {
    expect(parseRosterPaste('ID\tLast Name\tFirst Name\n101\tMiller\tSean\n102\tKim\tAva')).toEqual([
      { firstName: 'Sean', lastName: 'Miller', studentNumber: '101' },
      { firstName: 'Ava', lastName: 'Kim', studentNumber: '102' },
    ])
    expect(parseRosterPaste('Student Name,Period,Email\nSean Miller,2,s@x.org')).toEqual([{ firstName: 'Sean', lastName: 'Miller', email: 's@x.org' }])
  })
  it('treats header-less two-column rows as Last<TAB>First', () => {
    expect(parseRosterPaste('Miller\tSean')).toEqual([{ firstName: 'Sean', lastName: 'Miller' }])
  })
})

describe('rosterRowForStudent', () => {
  const roster = [
    { id: 'a', firstName: 'Sean', lastName: 'Miller', linked: false },
    { id: 'b', firstName: 'Ava', lastName: 'Kim', linked: true },
  ]
  it('links a confident match to an unlinked row only', () => {
    expect(rosterRowForStudent({ firstName: 'Sean', lastName: 'Miller' }, roster)).toBe('a')
    expect(rosterRowForStudent({ firstName: 'Ava', lastName: 'Kim' }, roster)).toBeNull()
    expect(rosterRowForStudent({ firstName: 'Zed', lastName: 'Ortiz' }, roster)).toBeNull()
  })
})
