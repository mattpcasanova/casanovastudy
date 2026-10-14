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

describe('Focus attendance export', () => {
  it('finds the heading row under a title row, ignores HTML headings, fixes ALL CAPS names', () => {
    const csv = [
      '"Previous Days",,,," ",,"Student Information",,,,"Oct 13, 2026"',
      '"Aug 10 2026","Aug 11 2026","Today\'s Attendance","Comment","Student","","Student ID","Grade","Course Title","Days Absent","Present<br /><span>(<span class=""x"">0</span>)</span>"',
      '"P","P","","","ABRAHAM, DANIEL JACOB","","614029077","12","AP STAT","2",""',
      '"P","AU","","","BALDO, JASON O","","614143378","12","AP STAT","0",""',
      '"P","P","","","O\'NEIL-SMITH, MARY ANN","","614000001","11","AP STAT","1",""',
      '"P","P","","","BLUZMANIS, TOBIAS MICHAEL (toby)","","615019568","12","AP STAT","0",""',
    ].join('\n')
    const { classes } = parseClassImport(csv)
    expect(classes).toHaveLength(1)
    expect(classes[0].name).toBe('AP STAT')
    expect(classes[0].students).toEqual([
      { firstName: 'Daniel Jacob', lastName: 'Abraham', studentNumber: '614029077' },
      { firstName: 'Jason', lastName: 'Baldo', studentNumber: '614143378' },
      { firstName: 'Mary Ann', lastName: "O'Neil-Smith", studentNumber: '614000001' },
      { firstName: 'Tobias Michael (Toby)', lastName: 'Bluzmanis', studentNumber: '615019568' },
    ])
  })
})

describe('Google Classroom grade export', () => {
  it('reads names and emails and skips the Date / Points / Class average rows', () => {
    const csv = [
      'Last Name,First Name,Email Address,Unit 1 Quiz,Lab 2',
      'Date,,,"Sep 4, 2026","Sep 11, 2026"',
      'Points,,,20,10',
      'Class average,,,16.5,8',
      'Miller,Sean,Sean.Miller@school.org,18,9',
      'Kim,Ava,ava.kim@school.org,15,',
    ].join('\n')
    const { classes } = parseClassImport(csv, 'AP Chem')
    expect(classes[0].students).toEqual([
      { firstName: 'Sean', lastName: 'Miller', email: 'sean.miller@school.org' },
      { firstName: 'Ava', lastName: 'Kim', email: 'ava.kim@school.org' },
    ])
  })
})
