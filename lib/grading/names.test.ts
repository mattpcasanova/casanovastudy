import { describe, expect, it } from 'vitest'
import { matchRoster, nameScore, parseName, sameStudent, type RosterName, compareNames, displayName } from './names'

const roster: RosterName[] = [
  { id: 'r1', firstName: 'Sean', lastName: 'Miller' },
  { id: 'r2', firstName: 'Mary Ann', lastName: 'Lee' },
  { id: 'r3', firstName: 'Ava', lastName: 'Rodriguez' },
  { id: 'r4', firstName: 'Ava', lastName: 'Kim' },
  { id: 'r5', firstName: 'José', lastName: 'Núñez' },
]

describe('parseName', () => {
  it('splits common forms', () => {
    expect(parseName('Miller, Sean')).toEqual({ firstName: 'Sean', lastName: 'Miller' })
    expect(parseName('Mary Ann Lee')).toEqual({ firstName: 'Mary Ann', lastName: 'Lee' })
    expect(parseName('  Sean  ')).toEqual({ firstName: 'Sean', lastName: '' })
    expect(parseName('')).toEqual({ firstName: '', lastName: '' })
  })
})

describe('matchRoster', () => {
  it('is sure about exact, reordered and slightly misread names', () => {
    expect(matchRoster('Sean Miller', roster)).toMatchObject({ rosterId: 'r1', confidence: 'sure' })
    expect(matchRoster('Miller, Sean', roster)).toMatchObject({ rosterId: 'r1', confidence: 'sure' })
    expect(matchRoster('Sean Millr', roster)).toMatchObject({ rosterId: 'r1', confidence: 'sure' })
    expect(matchRoster('Jose Nunez', roster)).toMatchObject({ rosterId: 'r5', confidence: 'sure' })
    expect(matchRoster('Ava R.', roster)).toMatchObject({ rosterId: 'r3', confidence: 'sure' })
  })
  it('asks the teacher to check when two students fit', () => {
    expect(matchRoster('Ava', roster).confidence).toBe('check')
  })
  it('finds nothing for a name that is not on the roster', () => {
    expect(matchRoster('Brandon Okafor', roster)).toMatchObject({ rosterId: null, confidence: 'none' })
    expect(matchRoster(null, roster).confidence).toBe('none')
  })
})

describe('sameStudent', () => {
  it('treats small misreads as the same student', () => {
    expect(sameStudent('Sean Miller', 'sean  miller')).toBe(true)
    expect(sameStudent('Sean Miller', 'Sean Millr')).toBe(true)
    expect(sameStudent('Ava Rodriguez', 'Ava R.')).toBe(true)
  })
  it('keeps different students apart', () => {
    expect(sameStudent('Ava R.', 'Ava K.')).toBe(false)
    expect(sameStudent('Sean Miller', 'Mary Ann Lee')).toBe(false)
    expect(nameScore('Ben Kim', 'Ava Kim')).toBeLessThan(0.85)
  })
  it('uses the roster to separate look-alike names', () => {
    const r: RosterName[] = [{ id: 'a', firstName: 'Sam', lastName: 'Lee' }, { id: 'b', firstName: 'Sam', lastName: 'Lew' }]
    expect(sameStudent('Sam Lee', 'Sam Lew', r)).toBe(false)
  })
})

describe('compareNames', () => {
  const people = [{ firstName: 'Sean', lastName: 'Miller' }, { firstName: 'Ava', lastName: 'Zed' }, { firstName: 'Ben', lastName: 'miller' }, { firstName: 'Cher', lastName: '' }]
  it('sorts by last name, first name breaking ties, case-insensitive', () => {
    expect([...people].sort((a, b) => compareNames(a, b, 'last')).map((p) => p.firstName)).toEqual(['Cher', 'Ben', 'Sean', 'Ava'])
  })
  it('sorts by first name', () => {
    expect([...people].sort((a, b) => compareNames(a, b, 'first')).map((p) => p.firstName)).toEqual(['Ava', 'Ben', 'Cher', 'Sean'])
  })
  it('shows Last, First only when sorting by last name', () => {
    expect(displayName({ firstName: 'Mary Ann', lastName: 'Lee' }, 'last')).toBe('Lee, Mary Ann')
    expect(displayName({ firstName: 'Mary Ann', lastName: 'Lee' }, 'first')).toBe('Mary Ann Lee')
    expect(displayName({ firstName: 'Cher', lastName: '' }, 'last')).toBe('Cher')
  })
})
