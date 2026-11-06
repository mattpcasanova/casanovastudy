import { describe, expect, it } from 'vitest'
import { normalizeStandards, standardCodes, standardEntries, standardsInstructions, topicStandard, topicsAreStandards, STANDARDS_MAX } from './standards'

describe('normalizeStandards', () => {
  it('tidies whitespace and caps the length', () => {
    expect(normalizeStandards('  MA.8.AR.2.1 ,   MA.8.AR.2.2 \n\n  ')).toBe('MA.8.AR.2.1 , MA.8.AR.2.2')
    expect(normalizeStandards('x'.repeat(2000)).length).toBe(STANDARDS_MAX)
    expect(normalizeStandards(undefined)).toBe('')
    expect(normalizeStandards(42)).toBe('')
  })
})

describe('standardEntries', () => {
  it('splits a list of codes', () => {
    expect(standardCodes('MA.8.AR.2.1, MA.8.AR.2.2; SC.7.L.15.2')).toEqual(['MA.8.AR.2.1', 'MA.8.AR.2.2', 'SC.7.L.15.2'])
    expect(standardCodes('CCSS.MATH.CONTENT.8.EE.C.7\nMS-PS1-2\nNGSS HS-LS1-5')).toEqual(['CCSS.MATH.CONTENT.8.EE.C.7', 'MS-PS1-2', 'NGSS HS-LS1-5'])
  })
  it('keeps wording as wording, with its code in front', () => {
    expect(standardEntries('MA.8.AR.2.1: Solve multi-step linear equations in one variable, with rational coefficients.')).toEqual([
      { text: 'MA.8.AR.2.1', code: true },
      { text: 'Solve multi-step linear equations in one variable, with rational coefficients.', code: false },
    ])
    expect(standardEntries('Students compare fractions, decimals and percents')).toEqual([{ text: 'Students compare fractions, decimals and percents', code: false }])
  })
  it('does not take ordinary words for codes', () => {
    expect(standardCodes('fractions, decimals')).toEqual([])
    expect(standardCodes('well-known')).toEqual([])
  })
  it('is empty for nothing', () => {
    expect(standardEntries(null)).toEqual([])
    expect(standardEntries('   ')).toEqual([])
  })
})

describe('standardsInstructions', () => {
  it('is empty without standards', () => {
    expect(standardsInstructions('', 'quiz')).toBe('')
  })
  it('quotes what was typed and adds the item rule for item formats', () => {
    const quiz = standardsInstructions('MA.8.AR.2.1', 'quiz')
    expect(quiz).toContain('MA.8.AR.2.1')
    expect(quiz).toContain('Every item assesses')
    expect(standardsInstructions('MA.8.AR.2.1', 'outline')).not.toContain('Every item assesses')
  })
})

describe('results by standard', () => {
  it('asks for one section per standard on scored work with two or more codes', () => {
    const quiz = standardsInstructions('MA.8.AR.2.1, MA.8.AR.3.2', 'quiz')
    expect(quiz).toContain('one ## section per standard')
    expect(quiz).toContain('(MA.8.AR.2.1)')
    expect(standardsInstructions('MA.8.AR.2.1, MA.8.AR.3.2', 'adaptive')).toContain('every CONCEPT belongs to exactly one')
    // One standard, or a format without scores: codes stay out of the guide.
    expect(standardsInstructions('MA.8.AR.2.1', 'quiz')).toContain("Don't print standards codes")
    expect(standardsInstructions('MA.8.AR.2.1, MA.8.AR.3.2', 'outline')).toContain("Don't print standards codes")
  })
  it('reads the code a topic name ends with', () => {
    expect(topicStandard('Solving Multi-Step Equations (MA.8.AR.2.1)')).toBe('MA.8.AR.2.1')
    expect(topicStandard('Forces (NGSS MS-PS2-2)')).toBe('NGSS MS-PS2-2')
    expect(topicStandard('Mitosis (cell division)')).toBeNull()
    expect(topicStandard('World War 2')).toBeNull()
    expect(topicsAreStandards(['A (MA.8.AR.2.1)', 'B (MA.8.AR.3.2)'])).toBe(true)
    expect(topicsAreStandards(['A (MA.8.AR.2.1)', 'Review'])).toBe(false)
  })
})
