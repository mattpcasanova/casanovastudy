import { describe, expect, it } from 'vitest'
import { parseClassImport, parseDelimited } from './import'

describe('parseDelimited', () => {
  it('handles quotes, escaped quotes and commas inside fields', () => {
    expect(parseDelimited('Name,Note\n"Miller, Sean","said ""hi"""\r\n')).toEqual([['Name', 'Note'], ['Miller, Sean', 'said "hi"']])
  })
})

describe('parseClassImport', () => {
  it('splits one gradebook export into classes by course and period', () => {
    const csv = [
      'Student ID,Last Name,First Name,Course,Period',
      '1001,Miller,Sean,AP Statistics,2',
      '1002,Lee,Mary Ann,AP Statistics,2',
      '1003,Kim,Ava,AP Statistics,Period 4',
      '1004,Nunez,José,AP Chemistry,6',
      ',,,,',
    ].join('\n')
    const { classes } = parseClassImport(csv)
    expect(classes.map((c) => [c.name, c.period, c.students.length])).toEqual([
      ['AP Chemistry', '6', 1],
      ['AP Statistics', '2', 2],
      ['AP Statistics', '4', 1],
    ])
    expect(classes[1].students[0]).toEqual({ firstName: 'Sean', lastName: 'Miller', studentNumber: '1001' })
  })
  it('falls back to one class for a plain list', () => {
    const { classes } = parseClassImport('Sean Miller\nAva Kim', 'Period 3')
    expect(classes).toHaveLength(1)
    expect(classes[0]).toMatchObject({ name: 'Period 3', period: null })
    expect(classes[0].students.map((s) => s.lastName)).toEqual(['Miller', 'Kim'])
  })
  it('reads a single "Last, First" name column', () => {
    const { classes } = parseClassImport('Student,Grade\n"Miller, Sean",10')
    expect(classes[0].students[0]).toEqual({ firstName: 'Sean', lastName: 'Miller' })
  })
})

describe('one-column lists', () => {
  it('keeps "Last, First" whole under a single Name heading', () => {
    const { classes } = parseClassImport('Student Name\n1. Sean Miller\nLee, Mary Ann\nAva Kim')
    expect(classes[0].students).toEqual([
      { firstName: 'Sean', lastName: 'Miller' },
      { firstName: 'Mary Ann', lastName: 'Lee' },
      { firstName: 'Ava', lastName: 'Kim' },
    ])
  })
})
