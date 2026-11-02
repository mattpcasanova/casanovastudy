import { describe, expect, it } from 'vitest'
import { NO_COURSE, emailOnDomain, schoolOverview, weekStart, weeksBetween } from './overview'

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
      { userId: 'a', batchId: 's1', createdAt: daysAgo(1), course: 'AP Chem' },
      { userId: 'a', batchId: 's1', createdAt: daysAgo(1), course: 'AP Chem' },
      { userId: 'a', batchId: 's2', createdAt: daysAgo(40), course: 'AP Chem' },
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

describe('schoolOverview ranges and breakdowns', () => {
  const teachers = [{ id: 'a', name: 'Ada', email: null }, { id: 'b', name: 'Ben', email: null }]
  const input = {
    now, teachers,
    gradings: [
      { userId: 'a', batchId: 's1', createdAt: daysAgo(1), course: 'AP Chem' },
      { userId: 'a', batchId: 's2', createdAt: daysAgo(40), course: 'AP Chem' },
      { userId: 'b', batchId: 's3', createdAt: daysAgo(2), course: null },
      { userId: 'b', batchId: 's4', createdAt: daysAgo(95), course: 'Bio' },
    ],
    guides: [{ userId: 'a', createdAt: daysAgo(50) }],
    practice: [{ teacherId: 'a', id: 'p1', createdAt: daysAgo(45), students: 3, finished: 1 }],
    classes: [{ teacherId: 'a', id: 'c1', students: 20 }],
  }

  it('from/to limit activity but not classes', () => {
    const o = schoolOverview({ ...input, from: now - 30 * 86400000 })
    expect(o.totals).toMatchObject({ papers: 2, guides: 0, practiceAssigned: 0, classes: 1, students: 20 })
    const prev = schoolOverview({ ...input, from: now - 60 * 86400000, to: now - 30 * 86400000 })
    expect(prev.totals).toMatchObject({ papers: 1, guides: 1, practiceAssigned: 1 })
    expect(prev.teachers.find((t) => t.id === 'a')?.papersRecent).toBe(1) // recent is relative to `to`
  })

  it('weeks can cover a longer span and each teacher gets a weekly series', () => {
    const o = schoolOverview({ ...input, weeks: 20 })
    expect(o.weeks).toHaveLength(20)
    const a = o.teachers.find((t) => t.id === 'a')!
    expect(a.weekly).toHaveLength(20)
    expect(a.weekly.reduce((x, y) => x + y, 0)).toBe(2)
    expect(a.weekly[19]).toBe(1)
    expect(weeksBetween(Date.parse('2026-07-01T04:00:00Z'), now)).toBe(17)
  })

  it('groups papers by course, busiest first, with a bucket for papers outside a class', () => {
    const o = schoolOverview(input)
    expect(o.courses.map((c) => [c.course, c.papers, c.sets, c.teachers])).toEqual([['AP Chem', 2, 2, 1], ['Bio', 1, 1, 1], [NO_COURSE, 1, 1, 1]])
    expect(o.courses[0].lastGraded).toBe(daysAgo(1))
  })
})
