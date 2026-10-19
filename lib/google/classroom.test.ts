import { describe, expect, it } from 'vitest'
import { periodFromSection, signState, studentToRoster, studentWork, uploadAssignments, verifyState } from './classroom'

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
