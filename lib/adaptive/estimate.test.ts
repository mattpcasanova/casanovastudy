import { describe, expect, it } from 'vitest'
import { bankShape, estimateAdaptive, estimateText, questionRangeText, sessionSeconds } from './estimate'
import { parseAdaptive } from './format'

describe('estimateAdaptive', () => {
  it('gives the default five-topic session about 15 to 30 minutes', () => {
    const e = estimateAdaptive({ concepts: 5, explain: true })
    expect(e).toEqual({ minQuestions: 20, maxQuestions: 25, minMinutes: 15, maxMinutes: 30 })
    expect(estimateText(e)).toBe('About 15 to 30 minutes')
    expect(questionRangeText(e)).toBe('20 to 25 questions')
  })

  it('gets shorter without the explain question and longer with more questions per topic', () => {
    expect(estimateAdaptive({ concepts: 5, explain: true }, { explain: false })).toMatchObject({ minQuestions: 15, maxQuestions: 20, minMinutes: 10, maxMinutes: 20 })
    expect(estimateAdaptive({ concepts: 5, explain: true }, { perConcept: 8 })).toMatchObject({ maxQuestions: 45, maxMinutes: 50 })
    // A bank with no explain questions never counts them.
    expect(estimateAdaptive({ concepts: 4, explain: false }, { explain: true }).minQuestions).toBe(12)
  })

  it('never reads as a range that runs backwards', () => {
    const e = estimateAdaptive({ concepts: 1, explain: false }, { perConcept: 3 })
    expect(e.maxMinutes).toBeGreaterThanOrEqual(e.minMinutes)
    expect(estimateText(e)).toBe('About 5 minutes')
  })
})

describe('bankShape', () => {
  it('counts concepts, the thinnest concept and whether every concept can be explained', () => {
    const q = (type: string) => `Q: 2 | ${type}\nStatement\nANSWER: True`
    const md = `# T\n\nCONCEPT: One\nLESSON: l\n\n${[q('tf'), q('tf'), q('tf'), q('explain')].join('\n\n')}\n\nCONCEPT: Two\nLESSON: l\n\n${[q('tf'), q('tf')].join('\n\n')}`
    expect(bankShape(parseAdaptive(md))).toEqual({ concepts: 2, perConcept: 2, explain: false })
  })
})

describe('sessionSeconds', () => {
  it('adds the gaps between answers, caps breaks and counts the first question', () => {
    const at = (s: number) => ({ at: 1_700_000_000_000 + s * 1000 })
    expect(sessionSeconds([at(0), at(30), at(60), at(90)])).toBe(120)
    expect(sessionSeconds([at(0), at(30), at(3600)])).toBe(495) // 30 + 300 (capped), plus their average for the first
    expect(sessionSeconds([at(0)])).toBeNull()
    expect(sessionSeconds([{}, {}])).toBeNull()
  })
})
