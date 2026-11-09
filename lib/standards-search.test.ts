import { describe, expect, it } from 'vitest'
import { gradeTags, searchStandards, standardLine, type StandardRow } from './standards-search'

const rows: StandardRow[] = [
  { code: 'MA.8.AR.3.2', text: 'Given a table, graph or written description of a linear relationship, determine the slope.', standard: 'Extend understanding of proportional relationships to two-variable linear equations.', subject: 'Mathematics (B.E.S.T.)', grade: '8', strand: 'Algebraic Reasoning', cpalms: 15510 },
  { code: 'MA.8.AR.3.3', text: 'Given a table, graph or written description of a linear relationship, write an equation in slope-intercept form.', standard: 'Extend understanding of proportional relationships to two-variable linear equations.', subject: 'Mathematics (B.E.S.T.)', grade: '8', strand: 'Algebraic Reasoning', cpalms: 15511 },
  { code: 'MA.912.AR.2.2', text: 'Write a linear two-variable equation to represent a relationship between quantities from a graph, a written description or a table of values within a mathematical or real-world context.', standard: 'Write, solve and graph linear equations.', subject: 'Mathematics (B.E.S.T.)', grade: '912', strand: 'Algebraic Reasoning', cpalms: 15600 },
  { code: 'SC.8.P.8.1', text: 'Explore the scientific theory of atoms (also known as atomic theory) by using models to explain the motion of particles in solids, liquids and gases.', standard: 'Properties of matter.', subject: 'Science', grade: '8', strand: 'Physical Science', cpalms: 1800 },
  { code: 'ELA.8.R.1.1', text: 'Analyze the interaction between character development, setting and plot in a literary text.', standard: 'Reading prose and poetry.', subject: 'English Language Arts (B.E.S.T.)', grade: '8', strand: 'Reading', cpalms: null },
]

describe('searchStandards', () => {
  it('matches a code prefix, exact first', () => {
    expect(searchStandards(rows, 'MA.8.AR.3').map((r) => r.code)).toEqual(['MA.8.AR.3.2', 'MA.8.AR.3.3'])
    expect(searchStandards(rows, 'ma.8.ar.3.3')[0].code).toBe('MA.8.AR.3.3')
    expect(searchStandards(rows, 'MA')[0].code.startsWith('MA.')).toBe(true)
  })
  it('matches every word in the wording, boosted by the guide grade and subject', () => {
    const hits = searchStandards(rows, 'slope linear', { grade: '6th-8th', subject: 'mathematics' })
    expect(hits.map((r) => r.code)).toEqual(['MA.8.AR.3.2', 'MA.8.AR.3.3'])
    const hs = searchStandards(rows, 'linear equation', { grade: '9th' })
    expect(hs[0].code).toBe('MA.912.AR.2.2')
    expect(hs.map((r) => r.code)).toContain('MA.8.AR.3.3')
  })
  it('ignores accents and case, needs two characters, caps the list', () => {
    expect(searchStandards(rows, 'ATÓMIC theory')[0]?.code).toBe('SC.8.P.8.1')
    expect(searchStandards(rows, 'a')).toEqual([])
    expect(searchStandards(rows, 'MA', { limit: 1 })).toHaveLength(1)
  })
  it('carries a CPALMS link when the export had one', () => {
    expect(searchStandards(rows, 'MA.8.AR.3.2')[0].url).toBe('https://www.cpalms.org/PreviewStandard/Preview/15510')
    expect(searchStandards(rows, 'ELA.8')[0].url).toBeNull()
  })
})

describe('gradeTags / standardLine', () => {
  it('maps app grade levels to CPALMS grade tags', () => {
    expect(gradeTags('6th-8th')).toContain('68')
    expect(gradeTags('10th')).toContain('912')
    expect(gradeTags('3rd')).toEqual(['3', 'K12', 'PK12'])
    expect(gradeTags('college')).toEqual([])
    expect(gradeTags(null)).toEqual([])
  })
  it('writes the picked line as code: wording', () => {
    expect(standardLine(rows[0])).toBe('MA.8.AR.3.2: Given a table, graph or written description of a linear relationship, determine the slope.')
  })
})
