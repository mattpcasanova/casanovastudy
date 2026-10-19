import { describe, expect, it } from 'vitest'
import { classroomDue, matchClassroomStudents, matchClassForCourse, periodFromSection, periodIn, signState, studentToRoster, studentWork, uploadAssignments, verifyState } from './classroom'

describe('OAuth state', () => {
  const user = '5e51e47f-d060-493d-b346-40d89595bc96'
  it('round-trips and expires', () => {
    process.env.GOOGLE_STATE_SECRET = 'test-secret'
    const state = signState(user, 1_000, '/grade-exam/batch/abc?classroom=1')
    expect(verifyState(state, 2_000)).toEqual({ userId: user, next: '/grade-exam/batch/abc?classroom=1' })
    expect(verifyState(signState(user, 1_000, 'https://evil.com'), 2_000)).toEqual({ userId: user, next: null })
    expect(verifyState(signState(user, 1_000, '//evil.com'), 2_000)).toEqual({ userId: user, next: null })
    expect(verifyState(state, 1_000 + 16 * 60 * 1000)).toBeNull()
  })
  it('rejects tampering', () => {
    process.env.GOOGLE_STATE_SECRET = 'test-secret'
    const [body, sig] = signState(user).split('.')
    const forged = Buffer.from(Buffer.from(body, 'base64url').toString().replace(user, '00000000-0000-0000-0000-000000000000')).toString('base64url')
    expect(forged).not.toBe(body)
    expect(verifyState(`${forged}.${sig}`)).toBeNull()
    expect(verifyState(null)).toBeNull()
  })
})

describe('mapping', () => {
  it('reads periods from course sections', () => {
    expect(periodFromSection('Period 2')).toBe('2')
    expect(periodFromSection('P3')).toBe('3')
    expect(periodFromSection('4B')).toBe('4B')
    expect(periodFromSection('Honors')).toBe('Honors')
    expect(periodFromSection(undefined)).toBeNull()
  })
  it('turns Classroom students into roster names', () => {
    expect(studentToRoster({ profile: { name: { givenName: 'Sean', familyName: 'Miller' }, emailAddress: 'Sean.Miller@School.org' } })).toEqual({ firstName: 'Sean', lastName: 'Miller', email: 'sean.miller@school.org' })
    expect(studentToRoster({ profile: { name: { fullName: 'Mary Ann Lee' } } })).toEqual({ firstName: 'Mary Ann', lastName: 'Lee', email: null })
    expect(studentToRoster({ profile: {} })).toBeNull()
  })
})

describe('assignment uploads', () => {
  it('lists upload assignments with due dates and folders', () => {
    expect(uploadAssignments([
      { id: 'w1', title: 'Unit 3 test', workType: 'ASSIGNMENT', maxPoints: 40, dueDate: { year: 2026, month: 10, day: 9 }, assignment: { studentWorkFolder: { id: 'f1' } } },
      { id: 'w2', title: 'Exit poll', workType: 'SHORT_ANSWER_QUESTION' },
    ])).toEqual([{ id: 'w1', title: 'Unit 3 test', due: '2026-10-09', maxPoints: 40, folderId: 'f1' }])
  })
  it('groups each student\'s files under their name', () => {
    const students = [
      { userId: 'u1', profile: { name: { givenName: 'Sean', familyName: 'Miller' }, emailAddress: 'Sean@School.org' } },
      { userId: 'u2', profile: { name: { givenName: 'Mya', familyName: 'Adams' } } },
    ]
    const work = studentWork([
      { id: 's1', userId: 'u1', state: 'TURNED_IN', late: true, assignmentSubmission: { attachments: [{ driveFile: { id: 'd1', title: 'IMG_1.jpg' } }, { driveFile: { id: 'd2', title: 'IMG_2.jpg' } }] } },
      { id: 's2', userId: 'u2', state: 'CREATED' },
      { id: 's3', userId: 'gone', state: 'TURNED_IN' },
    ], students)
    expect(work.map((w) => [w.lastName, w.turnedIn, w.late, w.files.length, w.email])).toEqual([
      ['Adams', false, false, 0, null],
      ['Miller', true, true, 2, 'sean@school.org'],
    ])
  })
})

describe('matching a Classroom course to a class', () => {
  const classes = [
    { id: 'p1', name: 'AP Statistics', period: '1' },
    { id: 'p2', name: 'AP Statistics', period: '2' },
    { id: 'c1', name: 'AP Chemistry', period: '1' },
    { id: 'c4', name: 'AP Chemistry', period: '4' },
  ]
  it('reads periods anywhere', () => {
    expect(periodIn('Period 01 (Colegia)')).toBe('1')
    expect(periodIn('AP Stats P3')).toBe('3')
    expect(periodIn('AP STAT-522112103200100')).toBeNull()
  })
  it('same period, then the name decides', () => {
    expect(matchClassForCourse({ name: 'Period 01 (Colegia)', section: 'AP STAT-522112103200100' }, classes)).toBe('p1')
    expect(matchClassForCourse({ name: 'Period 4', section: null }, classes)).toBe('c4')
    expect(matchClassForCourse({ name: 'Period 1', section: null }, classes)).toBeNull() // two period-1 classes, no name
    expect(matchClassForCourse({ name: 'Period 6', section: 'AP Stats' }, classes)).toBeNull()
  })
})

describe('posting practice to Classroom', () => {
  it('due dates in UTC, none once passed', () => {
    expect(classroomDue('2026-10-24T03:59:00Z', Date.parse('2026-10-20T00:00:00Z'))).toEqual({ dueDate: { year: 2026, month: 10, day: 24 }, dueTime: { hours: 3, minutes: 59 } })
    expect(classroomDue('2026-10-01T00:00:00Z', Date.parse('2026-10-20T00:00:00Z'))).toBeNull()
    expect(classroomDue(null)).toBeNull()
  })
  it('matches roster names to Classroom students by email, then name, and fills missing emails', () => {
    const students = [
      { userId: 'g1', profile: { name: { givenName: 'Lianna', familyName: 'Wysocki' }, emailAddress: 'lw@school.org' } },
      { userId: 'g2', profile: { name: { givenName: 'Mya', familyName: 'Adams' }, emailAddress: 'MA@school.org' } },
    ]
    const out = matchClassroomStudents([
      { id: 'r1', firstName: 'Lianna Christine', lastName: 'Wysocki', email: null },
      { id: 'r2', firstName: 'Mya', lastName: 'Adams', email: 'ma@school.org' },
      { id: 'r3', firstName: 'Noah', lastName: 'Zed', email: null },
    ], students)
    expect([...out.userIdByRoster.entries()]).toEqual([['r1', 'g1'], ['r2', 'g2']])
    expect(out.emailFill).toEqual([{ rosterId: 'r1', email: 'lw@school.org' }])
    expect(out.unmatched).toEqual(['Noah Zed'])
  })
})
