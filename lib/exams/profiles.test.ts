import { describe, it, expect } from 'vitest'
import { detectExam, examInstructions, readScores } from './profiles'
import { parseQuizContent } from '@/lib/formats/quiz'
import { EXAM_PROFILES } from './profiles'
import { SAT_MATH } from './sat-math'

describe('detectExam', () => {
  it('finds SAT Math and the domain the learner named', () => {
    const m = detectExam('Help me study for the problem-solving and data analysis portion of the SAT (going from a 630 to an 800).', 'mathematics')
    expect(m?.profile.id).toBe('sat-math')
    expect(m?.domains.map((d) => d.id)).toEqual(['psda'])
  })
  it('matches a plan unit that names the test and the topic', () => {
    const m = detectExam('SAT Math Study Plan: From 630 to 700+, Unit 8: Probability, Two-Way Tables, and Statistical Inference', 'mathematics')
    expect(m?.profile.id).toBe('sat-math')
    expect(m?.domains.map((d) => d.id)).toContain('psda')
  })
  it('a whole-section request has no domains (all of them)', () => {
    expect(detectExam('SAT Math', 'mathematics')?.domains).toEqual([])
    expect(detectExam('SAT math practice, I got a 630', null)?.domains).toEqual([])
  })
  it('PSAT counts', () => {
    expect(detectExam('PSAT algebra: linear equations and systems', 'mathematics')?.domains.map((d) => d.id)).toEqual(['algebra'])
  })
  it('Reading and Writing requests get the R&W profile, with their domains', () => {
    const m = detectExam('SAT Reading and Writing: transitions and punctuation', 'english')
    expect(m?.profile.id).toBe('sat-rw')
    expect(m?.domains.map((d) => d.id)).toEqual(['conventions', 'expression'])
    expect(detectExam('SAT reading comprehension', null)?.profile.id).toBe('sat-rw')
    expect(detectExam('help me with the SAT', 'english')?.profile.id).toBe('sat-rw')
    expect(detectExam('SAT grammar, I got a 590', 'general')?.score).toEqual({ current: 590 })
  })
  it('ACT sections: the capitalized name or "act <section>", never "act" as a word', () => {
    expect(detectExam('ACT English: commas and transitions', 'english')?.profile.id).toBe('act-english')
    expect(detectExam('act math, I got a 24 and want a 30', 'mathematics')).toMatchObject({ profile: { id: 'act-math' }, score: { current: 24, target: 30 } })
    expect(detectExam('ACT reading passages', null)?.profile.id).toBe('act-reading')
    expect(detectExam('ACT science data representation', 'science')?.profile.id).toBe('act-science')
    expect(detectExam('ACT', 'mathematics')?.profile.id).toBe('act-math')
    expect(detectExam('the Stamp Act and the Townshend Acts', 'history')).toBeNull()
    expect(detectExam('Act 1 of Hamlet', 'english')).toBeNull()
    expect(detectExam('the act of reading', 'english')).toBeNull()
  })
  it('AP courses by name; "AP" alone or another AP course matches nothing yet', () => {
    expect(detectExam('AP Chemistry Unit 7: equilibrium', 'chemistry')).toMatchObject({ profile: { id: 'ap-chemistry' }, domains: [{ id: 'equilibrium' }] })
    expect(detectExam('AP Chem kinetics and rate laws', null)?.domains.map((d) => d.id)).toEqual(['reactions'])
    expect(detectExam('AP Stats inference for means', 'mathematics')?.profile.id).toBe('ap-statistics')
    expect(detectExam('AP Statistics', 'general')?.domains).toEqual([])
    expect(detectExam('AP Bio Unit 4 cell communication', 'biology')).toMatchObject({ profile: { id: 'ap-biology' }, domains: [{ id: 'signaling' }] })
    expect(detectExam('AP Calculus BC series', 'mathematics')).toBeNull()
    expect(detectExam('AP exams in general', null)).toBeNull()
  })
  it('the section named outright wins over the picked subject', () => {
    expect(detectExam('SAT math, I keep missing the hard ones', 'english')?.profile.id).toBe('sat-math')
    expect(detectExam('the reading and writing part of the SAT', 'mathematics')?.profile.id).toBe('sat-rw')
  })
  it('a bare "SAT" with no math words and no subject is not assumed to be math', () => {
    expect(detectExam('help me with the SAT', null)).toBeNull()
    expect(detectExam('help me with the SAT', 'mathematics')?.profile.id).toBe('sat-math')
  })
  it('ignores other subjects and unrelated words', () => {
    expect(detectExam('SAT chemistry subject test', 'chemistry')).toBeNull()
    expect(detectExam('saturated solutions and solubility', 'chemistry')).toBeNull()
    expect(detectExam('AP Calculus: derivatives', 'mathematics')).toBeNull()
  })
})

describe('readScores', () => {
  const r = { min: 200, max: 800 }
  it('reads the current score and the target', () => {
    expect(readScores('Help me study for the math portion of the SAT. I got a 630 last time.', r)).toEqual({ current: 630 })
    expect(readScores('going from a 630 to an 800', r)).toEqual({ current: 630, target: 800 })
    expect(readScores('I scored 650 and want 750+', r)).toEqual({ current: 650, target: 750 })
    expect(readScores('to move from a 630 to as close to an 800 as possible', r)).toEqual({ current: 630, target: 800 })
    expect(readScores('I got a 630 on my SAT math score', r)).toEqual({ current: 630 })
  })
  it('ignores numbers that are not section scores', () => {
    expect(readScores('SAT Math: Unit 8, 120 km in 2 hours, year 2010', r)).toBeUndefined()
    expect(readScores('I got a 95 on my quiz', r)).toBeUndefined()
    expect(readScores('I got a 1250 last time', r)).toBeUndefined()
  })
  it('a saved score is used when the request states none, and a stated score wins', () => {
    const saved = { 'sat-math': { current: 650, target: 760 } }
    expect(detectExam('SAT math quiz on functions', 'mathematics', saved)?.score).toEqual({ current: 650, target: 760 })
    expect(detectExam('SAT math, I got a 700 this time', 'mathematics', saved)?.score).toEqual({ current: 700 })
    expect(detectExam('SAT reading and writing', 'english', saved)?.score).toBeUndefined()
  })
  it('detectExam carries the score', () => {
    expect(detectExam('SAT math, I got a 630 last time', 'mathematics')?.score).toEqual({ current: 630 })
    const text = examInstructions(detectExam('SAT math, I got a 630 last time', 'mathematics')!, 'quiz', 'standard')
    expect(text).toContain('currently scores about 630')
  })
})

describe('examInstructions', () => {
  const match = detectExam('SAT Math: problem-solving and data analysis', 'mathematics')!
  it('quiz gets the item rules, the domain and the exemplars', () => {
    const text = examInstructions(match, 'quiz', 'hard')
    expect(text).toContain('TEST REFERENCE')
    expect(text).toContain('DOMAIN: Problem-Solving and Data Analysis')
    expect(text).not.toContain('DOMAIN: Algebra')
    expect(text).toContain('ITEM FORMAT')
    expect(text).toContain('NUM_QUESTION')
    expect(text).toContain('separate 700 from 800')
  })
  it('outline gets the domain but no exemplars', () => {
    const text = examInstructions(match, 'outline', 'standard')
    expect(text).toContain('DOMAIN: Problem-Solving')
    expect(text).not.toContain('EXEMPLAR ITEMS')
  })
  it('whole section lists every domain', () => {
    const text = examInstructions(detectExam('SAT Math', 'mathematics')!, 'practice', null)
    for (const d of SAT_MATH.domains) expect(text).toContain(`DOMAIN: ${d.name}`)
  })
  it('every exemplar parses with the quiz parser and keys an option that exists', () => {
    for (const p of EXAM_PROFILES) for (const d of p.domains) {
      for (const e of d.exemplars) {
        const [q] = parseQuizContent(`# T\n## ${d.name}\n${e}\n`)
        expect(q, e.slice(0, 40)).toBeDefined()
        if (q.type === 'mc') {
          expect(q.options, e.slice(0, 40)).toHaveLength(p.id === 'ap-statistics' ? 5 : 4)
          expect(q.options).toContain(q.correctAnswer)
          if (e.includes('```passage')) expect(q.passage, e.slice(0, 40)).toBeTruthy()
        } else if (q.type === 'num') {
          expect(q.answers.length).toBeGreaterThan(0)
        } else {
          expect(q.type).toBe('sa')
          if (q.type === 'sa') expect(q.sampleAnswer.length, e.slice(0, 40)).toBeGreaterThan(40)
        }
      }
    }
  })
})
