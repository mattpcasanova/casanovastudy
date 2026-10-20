import { describe, expect, it } from 'vitest'
import { emailOnDomain, schoolOverview, weekStart } from './overview'

const now = Date.parse('2026-10-20T15:00:00Z') // a Tuesday
const daysAgo = (n: number) => new Date(now - n * 86400000).toISOString()

describe('schoolOverview', () => {
  const teachers = [
    { id: 'a', name: 'Ada Lovelace', email: 'ada@school.org' },
    { id: 'b', name: 'Ben Okafor', email: 'ben@school.org' },
    { id: 'c', name: 'Cy Quiet', email: 'cy@school.org' },
  ]
  const o = schoolOverview({
    now,
    teachers,
    gradings: [
      { userId: 'a', batchId: 's1', createdAt: daysAgo(1) },
      { userId: 'a', batchId: 's1', createdAt: daysAgo(1) },
      { userId: 'a', batchId: 's2', createdAt: daysAgo(40) },
      { userId: 'b', batchId: null, createdAt: daysAgo(2) },
      { userId: 'x', batchId: 's9', createdAt: daysAgo(1) }, // not at this school
    ],
    guides: [{ userId: 'b', createdAt: daysAgo(3) }],
    practice: [{ teacherId: 'a', id: 'p1', createdAt: daysAgo(5), students: 4, finished: 3 }, { teacherId: 'a', id: 'p2', createdAt: daysAgo(6), students: 2, finished: 5 }],
    classes: [{ teacherId: 'a', id: 'c1', students: 25 }, { teacherId: 'b', id: 'c2', students: 30 }],
  })

  it('counts per teacher, ignoring other schools', () => {
    const a = o.teachers.find((t) => t.id === 'a')!
    expect(a).toMatchObject({ papers: 3, papersRecent: 2, sets: 2, classes: 1, students: 25, practiceAssigned: 2, practiceStudents: 6, practiceFinished: 5 })
    expect(o.teachers.find((t) => t.id === 'b')).toMatchObject({ papers: 1, sets: 0, guides: 1, students: 30 })
  })

  it('totals and active teachers', () => {
    expect(o.totals).toMatchObject({ teachers: 3, activeTeachers: 2, papers: 4, sets: 2, classes: 2, students: 55, practiceAssigned: 2, guides: 1 })
  })

  it('sorts the busiest teacher first and inactive last', () => {
    expect(o.teachers.map((t) => t.id)).toEqual(['a', 'b', 'c'])
    expect(o.teachers[2].lastActive).toBeNull()
  })

  it('builds 12 Monday weeks ending this week', () => {
    expect(o.weeks).toHaveLength(12)
    expect(o.weeks[11].start).toBe('2026-10-19')
    expect(o.weeks[11].papers).toBe(2) // Monday (1 day ago)
    expect(o.weeks[10].papers).toBe(1) // Sunday (2 days ago) is last week
    expect(o.weeks.reduce((n, w) => n + w.papers, 0)).toBe(4)
  })
})

describe('helpers', () => {
  it('weekStart is Monday', () => {
    expect(new Date(weekStart(now)).toISOString().slice(0, 10)).toBe('2026-10-19')
  })
  it('emailOnDomain', () => {
    expect(emailOnDomain('t@school.org', 'school.org')).toBe(true)
    expect(emailOnDomain('t@staff.school.org', 'school.org')).toBe(true)
    expect(emailOnDomain('t@myschool.org', 'school.org')).toBe(false)
    expect(emailOnDomain(null, 'school.org')).toBe(false)
  })
})
