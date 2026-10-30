import { describe, expect, it } from 'vitest'
import { cleanPracticeRun, cleanQuizRun, parseSaved, stableJson } from './run-progress-rules'

describe('parseSaved', () => {
  it('needs updatedAt and a run key', () => {
    expect(parseSaved({ run: { a: 1 }, updatedAt: 5 })).toEqual({ run: { a: 1 }, updatedAt: 5 })
    expect(parseSaved({ run: null, updatedAt: 5 })).toEqual({ run: null, updatedAt: 5 })
    expect(parseSaved({ updatedAt: 5 })).toBeNull()
    expect(parseSaved({ run: {} })).toBeNull()
    expect(parseSaved(null)).toBeNull()
  })
})

describe('stableJson', () => {
  it('ignores key order', () => {
    expect(stableJson({ b: 1, a: { d: 2, c: [1, { z: 1, y: 2 }] } })).toBe(stableJson({ a: { c: [1, { y: 2, z: 1 }], d: 2 }, b: 1 }))
  })
})

describe('cleanPracticeRun', () => {
  const ids = ['p1', 'p2', 'p3', 'p4']
  it('keeps a run in progress', () => {
    const run = cleanPracticeRun({ index: 2, results: { p1: { correct: true }, p2: { correct: false, given: 'B' } }, later: [], subset: null, streak: 0, bestStreak: 1 }, ids)
    expect(run).toEqual({ index: 2, results: { p1: { correct: true }, p2: { correct: false, given: 'B' } }, later: [], subset: null, streak: 0, bestStreak: 1 })
  })
  it('drops activities the guide no longer has and clamps the index', () => {
    const run = cleanPracticeRun({ index: 9, results: { p1: { correct: true }, gone: { correct: true }, p2: 'bad' }, later: ['p3', 'gone'], subset: null }, ids)
    expect(run?.results).toEqual({ p1: { correct: true } })
    expect(run?.later).toEqual(['p3'])
    expect(run?.index).toBe(3)
  })
  it('clamps to a retry subset', () => {
    expect(cleanPracticeRun({ index: 5, results: { p2: { correct: true } }, subset: ['p2', 'p4'] }, ids)?.index).toBe(1)
  })
  it('has nothing to resume when untouched or broken', () => {
    expect(cleanPracticeRun({ index: 0, results: {} }, ids)).toBeNull()
    expect(cleanPracticeRun({ index: 1, results: {}, subset: ['gone'] }, ids)).toBeNull()
    expect(cleanPracticeRun('x', ids)).toBeNull()
  })
})

describe('cleanQuizRun', () => {
  const ids = ['q1', 'q2', 'q3']
  it('keeps answers, reveals, marks and short-answer scores', () => {
    const run = cleanQuizRun({
      mode: 'test', index: 1, answers: { q1: 'A', q9: 'B' }, checked: { q1: true, q2: false }, hinted: { q1: true },
      saScores: { q3: { score: 1, feedback: 'ok', isCorrect: true }, q2: { score: 'x' } }, marked: ['q2', 'q9'], subset: null,
    }, ids)
    expect(run).toEqual({
      mode: 'test', index: 1, answers: { q1: 'A' }, checked: { q1: true }, hinted: { q1: true },
      saScores: { q3: { score: 1, feedback: 'ok', isCorrect: true } }, marked: ['q2'], subset: null,
      timed: false, elapsed: 0, spent: {},
    })
  })
  it('defaults to practice mode', () => {
    expect(cleanQuizRun({ index: 0, answers: { q1: 'A' } }, ids)?.mode).toBe('practice')
  })
  it('keeps the timer', () => {
    const run = cleanQuizRun({ index: 0, answers: { q1: 'A' }, timed: true, elapsed: 61.5, spent: { q1: 40, q9: 3, q2: -1 } }, ids)
    expect(run?.timed).toBe(true)
    expect(run?.elapsed).toBe(61.5)
    expect(run?.spent).toEqual({ q1: 40 })
  })
  it('has nothing to resume when untouched', () => {
    expect(cleanQuizRun({ index: 0, answers: {}, marked: [] }, ids)).toBeNull()
  })
})
