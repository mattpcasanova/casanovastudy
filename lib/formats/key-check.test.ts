import { describe, expect, it } from 'vitest'
import { keyProblem, numberKeyProblem, questionKeyProblem } from './key-check'

describe('keyProblem', () => {
  it('flags the real AP Chem question keyed to the wrong option', () => {
    expect(keyProblem({
      options: ['0.410 atm', '0.615 atm', '1.23 atm', '0.205 atm'],
      correct: 0,
      explanation: 'n(O₂) = 3.20/32.0 = 0.100 mol, so P = nRT/V = (0.100)(0.08206)(300)/4.00 = 0.616 atm, closest to the option listed.',
    })).toBe('hedged')
    expect(keyProblem({
      options: ['0.410 atm', '0.615 atm', '1.23 atm', '0.205 atm'],
      correct: 0,
      explanation: 'n(O₂) = 3.20/32.0 = 0.100 mol, so P = nRT/V = (0.100)(0.08206)(300)/4.00 = 0.616 atm.',
    })).toBe('mismatch')
  })

  it('flags a worked answer that is not among the options', () => {
    expect(keyProblem({
      options: ['0.375 atm', '1.00 atm', '1.20 atm', '2.00 atm'],
      correct: 1,
      explanation: 'n(CH₄) = 0.500 mol and n(N₂) = 2.00 mol, so X(CH₄) = 0.500/2.50 = 0.200. P = 0.200 × 3.00 = 0.600 atm.',
    })).toBe('mismatch')
  })

  it('passes keys that match the working, within rounding', () => {
    expect(keyProblem({
      options: ['0.88 atm', '1.56 atm', '1.33 atm', '4.00 atm'],
      correct: 1,
      explanation: 'P₂ = P₁(V₁/V₂)(T₂/T₁) = 1.00 × (2.00/1.50) × (348/298) = 1.56 atm.',
    })).toBeNull()
    expect(keyProblem({
      options: ['0.410 atm', '0.615 atm', '1.23 atm', '0.205 atm'],
      correct: 1,
      explanation: 'P = (0.100)(0.08206)(300)/4.00 = 0.616 atm.',
    })).toBeNull()
    expect(keyProblem({
      options: ['2.88 g/mol', '32.0 g/mol', '0.0320 g/mol', '0.0312 g/mol'],
      correct: 1,
      explanation: 'M = mRT/PV = (0.975)(0.08206)(300)/((1.00)(0.750)) = 32.0 g/mol, which matches O₂.',
    })).toBeNull()
  })

  it('leaves a key alone when its number appears in the working before a side step', () => {
    expect(keyProblem({
      options: ['12', '6', '3', '24'],
      correct: 0,
      explanation: 'The area is 12, since each half = 6.',
    })).toBeNull()
  })

  it('says nothing about options in words, repeated values or powers of ten', () => {
    expect(keyProblem({ options: ['It doubles', 'It halves'], correct: 0, explanation: 'P = 2.0 atm = 2 × the start.' })).toBeNull()
    expect(keyProblem({ options: ['1/2', '0.5', '2', '4'], correct: 0, explanation: 'x = 2' })).toBeNull()
    expect(keyProblem({ options: ['6.0 × 10⁻³ M', '3.0 × 10⁻³ M'], correct: 0, explanation: 'M = 3.0' })).toBeNull()
    expect(keyProblem({ options: ['3', '4'], correct: 0, explanation: 'Conceptual, no working.' })).toBeNull()
    expect(keyProblem({ options: ['3', '4'], correct: 5, explanation: 'x = 4' })).toBeNull()
  })
})

describe('keyProblem on fractions, percents and minus signs', () => {
  it('reads the notations real quizzes use', () => {
    expect(keyProblem({ options: ['27/80', '27/50', '2/5', '3/5'], correct: 3, explanation: 'so the probability is 54/90 = 3/5. Choice B divides by the total.' })).toBeNull()
    expect(keyProblem({ options: ['32/125', '2/5', '4/25', '5/8'], correct: 0, explanation: '32 + 93 = 125 people do not use the app, and 32 of them are under 30, so the probability is 32/125.' })).toBeNull()
    expect(keyProblem({ options: ['35%', '60%', '53%', '30%'], correct: 1, explanation: '3/5 = 60/100 = 60%.' })).toBeNull()
    expect(keyProblem({ options: ['30%', '57%', '21%', '40%'], correct: 1, explanation: 'so seniors make up 12 ÷ 21 ≈ 57%.' })).toBeNull()
    expect(keyProblem({ options: ['15', '−15', '−5', '17'], correct: 1, explanation: '|−5| = 5, and 5 • (−3) = −15.' })).toBeNull()
    expect(keyProblem({ options: ['−2', '0', '2', '6'], correct: 0, explanation: 'm + b = 2 + (−4) = −2; choice C adds them.' })).toBeNull()
  })
  it('still flags a fraction key the working contradicts', () => {
    expect(keyProblem({ options: ['1/4', '1/2', '5/8', '2/5'], correct: 1, explanation: '50 of 200, so 50/200 = 1/4.' })).toBe('mismatch')
  })
})

describe('numberKeyProblem', () => {
  it('flags a numeric key the working contradicts, or an explanation that corrects itself', () => {
    expect(numberKeyProblem({ answers: ['2.71'], explanation: 'P = (1.150)(0.08206)(300)/10.0 = 2.83 atm.' })).toBe('mismatch')
    expect(numberKeyProblem({ answers: ['7.55'], explanation: 'P = 7.55 atm. Wait, correcting the key: the working gives 7.55 atm.' })).toBe('hedged')
  })
  it('passes matching keys, equivalent forms and percents', () => {
    expect(numberKeyProblem({ answers: ['0.400', '0.40'], explanation: 'X = 0.167, and P = 0.167 × 2.40 atm = 0.400 atm.' })).toBeNull()
    expect(numberKeyProblem({ answers: ['3.5', '7/2'], explanation: 'x = 7/2' })).toBeNull()
    expect(numberKeyProblem({ answers: ['45%'], explanation: '9/20 = 0.45' })).toBeNull()
    expect(numberKeyProblem({ answers: ['12'], explanation: 'No working here.' })).toBeNull()
  })
  it('questionKeyProblem routes by type', () => {
    expect(questionKeyProblem({ type: 'num', options: [], correct: -1, answers: ['2.71'], explanation: 'P = nRT/V = 2.83' })).toBe('mismatch')
    expect(questionKeyProblem({ type: 'tf', options: ['True', 'False'], correct: 0, answers: [], explanation: 'x = 4' })).toBeNull()
  })
})
