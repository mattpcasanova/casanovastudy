import { describe, expect, it } from 'vitest'
import { sortClasses } from './sort'

const list = [
  { name: 'AP Stats', period: '10', created_at: '2026-08-01' },
  { name: 'AP Chem', period: '2', created_at: '2026-08-03' },
  { name: 'Homeroom', period: null, created_at: '2026-08-05' },
  { name: 'AP Stats', period: '3B', created_at: '2026-08-02' },
  { name: 'AP Stats', period: '3', created_at: '2026-08-04' },
]

describe('sortClasses', () => {
  it('by period, numbers in order, no period last', () => {
    expect(sortClasses(list).map((c) => `${c.name} ${c.period ?? '-'}`)).toEqual(['AP Chem 2', 'AP Stats 3', 'AP Stats 3B', 'AP Stats 10', 'Homeroom -'])
  })
  it('by name, then period', () => {
    expect(sortClasses(list, 'name').map((c) => c.period)).toEqual(['2', '3', '3B', '10', null])
  })
  it('newest first', () => {
    expect(sortClasses(list, 'newest').map((c) => c.created_at)).toEqual(['2026-08-05', '2026-08-04', '2026-08-03', '2026-08-02', '2026-08-01'])
  })
})
