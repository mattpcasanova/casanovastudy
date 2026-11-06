import { describe, expect, it } from 'vitest'
import { translationLinesUp } from './translation'

const QUIZ = `# Quiz

MC_QUESTION: What is 2 + 2?
A) 3
B) 4
C) 5
Correct Answer: B

TF_QUESTION: 5 is odd.
Answer: True
`
const ES = `# Cuestionario

MC_QUESTION: ¿Cuánto es 2 + 2?
A) 3
B) 4
C) 5
Correct Answer: B

TF_QUESTION: 5 es impar.
Answer: True
`

describe('translationLinesUp', () => {
  it('accepts the same items in the same order', () => {
    expect(translationLinesUp('quiz', QUIZ, ES)).toBe(true)
  })
  it('refuses a translation with an item missing, added or changed in type', () => {
    expect(translationLinesUp('quiz', QUIZ, ES.replace(/TF_QUESTION[\s\S]*$/, ''))).toBe(false)
    expect(translationLinesUp('quiz', QUIZ + '\nTF_QUESTION: 2 is even.\nAnswer: True\n', ES)).toBe(false)
    expect(translationLinesUp('quiz', QUIZ, ES.replace('C) 5\n', ''))).toBe(false)
    expect(translationLinesUp('quiz', QUIZ, '')).toBe(false)
  })
  it('only checks prose for being cut short', () => {
    const outline = '# Title\n\n## One\n' + 'Text. '.repeat(100)
    expect(translationLinesUp('outline', outline, outline.replace(/Text/g, 'Texto'))).toBe(true)
    expect(translationLinesUp('outline', outline, '# Título\n\n## Uno\nTexto.')).toBe(false)
  })
})
