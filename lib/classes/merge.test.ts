import { describe, expect, it } from 'vitest'
import { planRosterMerge } from './merge'

const focus = [
  { id: 'a', firstName: 'Ayden Lucas', lastName: 'Alonso', studentNumber: '1001', email: null },
  { id: 'b', firstName: 'Gabriella (Gaby)', lastName: 'Amador', studentNumber: '1002', email: null },
  { id: 'c', firstName: 'Jacob Alexander', lastName: 'Aquino', studentNumber: '1003', email: null },
]

describe('planRosterMerge', () => {
  it('puts Classroom emails on the Focus students (middle names, nicknames)', () => {
    const plan = planRosterMerge(focus, [
      { firstName: 'Ayden', lastName: 'Alonso', email: 'AAlonso@school.org' },
      { firstName: 'Gaby', lastName: 'Amador', email: 'gamador@school.org' },
      { firstName: 'Jacob', lastName: 'Aquino', email: 'jaquino@school.org' },
      { firstName: 'Zuri', lastName: 'Estama', email: 'zestama@school.org' },
    ], { fuzzy: true })
    expect(plan.fills).toEqual([
      { id: 'a', email: 'aalonso@school.org' },
      { id: 'b', email: 'gamador@school.org' },
      { id: 'c', email: 'jaquino@school.org' },
    ])
    expect(plan.fresh.map((n) => n.lastName)).toEqual(['Estama'])
    expect(plan.matched).toBe(3)
  })

  it('puts Focus IDs on Classroom students', () => {
    const classroom = [{ id: 'x', firstName: 'Ayden', lastName: 'Alonso', studentNumber: null, email: 'aalonso@school.org' }]
    const plan = planRosterMerge(classroom, [{ firstName: 'Ayden Lucas', lastName: 'Alonso', studentNumber: '1001' }], { fuzzy: true })
    expect(plan.fills).toEqual([{ id: 'x', studentNumber: '1001' }])
    expect(plan.fresh).toEqual([])
  })

  it('never matches across different IDs or emails, and claims each student once', () => {
    const plan = planRosterMerge(focus, [
      { firstName: 'Ayden', lastName: 'Alonso', studentNumber: '9999' },
      { firstName: 'Jacob', lastName: 'Aquino' },
      { firstName: 'Jacob A', lastName: 'Aquino' },
    ], { fuzzy: true })
    expect(plan.fresh.map((n) => `${n.firstName} ${n.lastName}`)).toEqual(['Ayden Alonso', 'Jacob A Aquino'])
    expect(plan.matched).toBe(1)
  })

  it('only exact names match without fuzzy (a name typed on purpose)', () => {
    const plan = planRosterMerge(focus, [{ firstName: 'Ayden', lastName: 'Alonso' }])
    expect(plan.fresh).toHaveLength(1)
  })

  it('leaves existing IDs and emails alone and skips repeats in one import', () => {
    const plan = planRosterMerge([{ id: 'a', firstName: 'Ann', lastName: 'Lee', studentNumber: '1', email: 'ann@s.org' }], [
      { firstName: 'Ann', lastName: 'Lee', studentNumber: '1', email: 'ann@s.org' },
      { firstName: 'Bo', lastName: 'Kim' },
      { firstName: 'Bo', lastName: 'Kim' },
    ])
    expect(plan.fills).toEqual([])
    expect(plan.fresh).toHaveLength(1)
  })
})
