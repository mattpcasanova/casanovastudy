import { describe, expect, it } from 'vitest'
import { balanceChoices, canReorder, relabel } from './balance'
import { parseQuizContent } from './quiz'

describe('balanceChoices', () => {
  it('spreads correct answers evenly and keeps the right option', () => {
    const slots = Array.from({ length: 20 }, (_, i) => ({ options: [`right ${i}`, `w1 ${i}`, `w2 ${i}`, `w3 ${i}`], correct: 0 }))
    const out = balanceChoices(slots, 'seed')
    const counts = [0, 0, 0, 0]
    out.forEach((m, i) => {
      expect(m).not.toBeNull()
      expect(m!.options[m!.correct]).toBe(`right ${i}`)
      expect([...m!.options].sort()).toEqual([...slots[i].options].sort())
      counts[m!.correct]++
    })
    expect(counts).toEqual([5, 5, 5, 5])
  })

  it('never puts the answer on the same letter three times in a row', () => {
    const slots = Array.from({ length: 30 }, () => ({ options: ['a', 'b', 'c', 'd'], correct: 2 }))
    const pos = balanceChoices(slots, 'x').map((m) => m!.correct)
    for (let i = 2; i < pos.length; i++) expect(pos[i] === pos[i - 1] && pos[i] === pos[i - 2]).toBe(false)
  })

  it('is deterministic per seed and changes with it', () => {
    const slots = Array.from({ length: 8 }, () => ({ options: ['a', 'b', 'c', 'd'], correct: 0 }))
    expect(balanceChoices(slots, 's1')).toEqual(balanceChoices(slots, 's1'))
    expect(balanceChoices(slots, 's1')).not.toEqual(balanceChoices(slots, 's2'))
  })

  it('leaves options that refer to other options alone', () => {
    expect(canReorder(['1', '2', 'Both A and B', 'Neither'])).toBe(false)
    expect(canReorder(['x', 'y', 'z', 'All of the above'])).toBe(false)
    expect(canReorder(['I only', 'I and II only', 'II and III only', 'I, II and III'])).toBe(true)
    expect(canReorder(['a cat', 'a dog and a bird', 'only a fish', 'none'])).toBe(true)
    expect(balanceChoices([{ options: ['x', 'y', 'z', 'None of these'], correct: 0 }], 's')).toEqual([null])
  })
})

describe('relabel', () => {
  // old A,B,C,D now sit at C,A,D,B: order = [B, D, A, C] as original indexes
  const order = [1, 3, 0, 2]
  it('rewrites letter references once each', () => {
    expect(relabel('Option A forgets the sign. Choices B and D add instead.', order)).toBe('Option C forgets the sign. Choices A and B add instead.')
    expect(relabel('The answer is (C), not (A).', order)).toBe('The answer is (D), not (C).')
    expect(relabel('not about the parameter (A, D).', order)).toBe('not about the parameter (C, B).')
    expect(relabel('B is wrong because it adds. A student might pick it.', order)).toBe('A is wrong because it adds. A student might pick it.')
  })
  it('leaves articles and plain text alone', () => {
    expect(relabel('A number squared is never negative.', order)).toBe('A number squared is never negative.')
  })
})

describe('parseQuizContent balancing', () => {
  it('keeps the keyed answer correct after reordering', () => {
    const md = Array.from({ length: 8 }, (_, i) => `MC_QUESTION: Q${i}?\nA) right${i}\nB) w${i}a\nC) w${i}b\nD) w${i}c\nCorrect Answer: A\nExplanation: Option B is a trap.`).join('\n\n')
    const qs = parseQuizContent(md)
    const positions = qs.map((q) => (q.type === 'mc' ? q.options.indexOf(q.correctAnswer) : -1))
    qs.forEach((q, i) => q.type === 'mc' && expect(q.correctAnswer).toBe(`right${i}`))
    expect(new Set(positions).size).toBe(4)
    expect(parseQuizContent(md, 'attempt-2').map((q) => (q.type === 'mc' ? q.options.join() : ''))).not.toEqual(qs.map((q) => (q.type === 'mc' ? q.options.join() : '')))
  })
})

describe('numbers in order', () => {
  it('keeps ascending numeric options in place', () => {
    expect(canReorder(['0.5', '1', '2', '18'])).toBe(false)
    expect(canReorder(['$12', '$15', '$20', '$24'])).toBe(false)
    expect(canReorder(['1/2', '3/4', '1', '5/4'])).toBe(false)
    expect(canReorder(['18', '0.5', '2', '1'])).toBe(true)
    expect(canReorder(['4 cm', '8 cm', '12 cm', '16 cm'])).toBe(false)
  })
})
