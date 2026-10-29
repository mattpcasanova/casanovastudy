import { describe, it, expect } from 'vitest'
import { parseQuizContent } from './quiz'

const PLAIN = `# Linear Functions Quiz
*Practice for slope and intercepts.*

## Slope
MC_QUESTION: What is the slope of y = 3x + 2?
A) 2
B) 3
C) 5
D) 1/3
Correct Answer: B
Explanation: The coefficient of x is the slope.

TF_QUESTION: A horizontal line has slope 0.
Answer: True
Explanation: Rise is zero.

## Intercepts
SA_QUESTION: How do you find the x-intercept?
Sample Answer: Set y to 0 and solve for x.
This gives the point where the line crosses the x-axis.`

describe('parseQuizContent', () => {
  it('parses plain quizzes unchanged', () => {
    const qs = parseQuizContent(PLAIN)
    expect(qs.map((q) => q.id)).toEqual(['q-0', 'q-1', 'q-2'])
    expect(qs[0]).toMatchObject({ type: 'mc', correctAnswer: '3', section: 'Slope' })
    expect(qs[1]).toMatchObject({ type: 'tf', correctAnswer: true })
    expect(qs[2]).toMatchObject({ type: 'sa', section: 'Intercepts' })
    if (qs[2].type === 'sa') expect(qs[2].sampleAnswer).toContain('crosses the x-axis')
    expect(qs.every((q) => !q.figure)).toBe(true)
  })

  it('attaches a graph fence under a question line', () => {
    const qs = parseQuizContent(`## Graphs
MC_QUESTION: The graph of f is shown. What is f(2)?
\`\`\`graph
kind: plane
x: -5, 5
y: -5, 5
plot: x - 1 | f
\`\`\`
A) 0
B) 1
C) 2
D) 3
Correct Answer: B
Explanation: At x = 2 the line is at y = 1.

MC_QUESTION: What is 2 + 2?
A) 3
B) 4
Correct Answer: B`)
    expect(qs).toHaveLength(2)
    expect(qs[0].figure).toContain('plot: x - 1 | f')
    expect(qs[0].figure).toContain('\n') // line structure preserved
    if (qs[0].type === 'mc') {
      expect(qs[0].options).toEqual(['0', '1', '2', '3'])
      expect(qs[0].correctAnswer).toBe('1')
    }
    expect(qs[1].figure).toBeUndefined()
  })

  it('attaches a figure placed just before its question', () => {
    const qs = parseQuizContent(`MC_QUESTION: First?
A) x
B) y
Correct Answer: A

\`\`\`graph
kind: geometry
point: A (0,0)
point: B (4,0)
point: C (0,3)
polygon: A B C
\`\`\`
SA_QUESTION: In the triangle shown, find BC.
Sample Answer: 5, by the Pythagorean theorem.`)
    expect(qs[0].figure).toBeUndefined()
    expect(qs[1].figure).toContain('polygon: A B C')
    if (qs[1].type === 'sa') expect(qs[1].sampleAnswer).toBe('5, by the Pythagorean theorem.')
  })

  it('never reads option-like lines inside fences', () => {
    const qs = parseQuizContent(`MC_QUESTION: Which output?
\`\`\`python
A) print(1)
\`\`\`
A) 1
B) 2
Correct Answer: A`)
    expect(qs).toHaveLength(1)
    if (qs[0].type === 'mc') expect(qs[0].options).toEqual(['1', '2'])
  })
})

describe('statement stems', () => {
  it('keeps I/II/III statements with the question', () => {
    const qs = parseQuizContent(`MC_QUESTION: MgO has a higher melting point than NaF. Which factors explain this?
I. Mg²⁺ is more positively charged than Na⁺
II. O²⁻ is more negatively charged than F⁻
III. O²⁻ is smaller than F⁻
A) I and II only
B) I and III only
C) II and III only
D) I, II, and III
Correct Answer: D
Explanation: All three strengthen coulombic attraction.`)
    expect(qs).toHaveLength(1)
    expect(qs[0].question.split('\n')).toEqual([
      'MgO has a higher melting point than NaF. Which factors explain this?',
      'I. Mg²⁺ is more positively charged than Na⁺',
      'II. O²⁻ is more negatively charged than F⁻',
      'III. O²⁻ is smaller than F⁻',
    ])
    if (qs[0].type === 'mc') expect(qs[0].correctAnswer).toBe('I, II, and III')
  })
})

describe('hints', () => {
  it('reads Hint lines without mixing them into the stem or options', () => {
    const qs = parseQuizContent(`## Slope
MC_QUESTION: What is the slope of y = 3x + 2?
A) 2
B) 3
C) 5
D) 1/3
Correct Answer: B
Hint: In y = mx + b, which letter is the slope?
Explanation: The coefficient of x is the slope.

TF_QUESTION: A horizontal line has slope 0.
Answer: True
Hint: How much does y change as x moves?
Explanation: y never changes.

SA_QUESTION: What does the y-intercept mean?
Sample Answer: Where the line crosses the y-axis.
Hint: Set x = 0.`)
    expect(qs.map((q) => q.hint)).toEqual(['In y = mx + b, which letter is the slope?', 'How much does y change as x moves?', 'Set x = 0.'])
    expect(qs[0]).toMatchObject({ question: 'What is the slope of y = 3x + 2?', options: ['2', '3', '5', '1/3'], correctAnswer: '3' })
    expect(qs[2]).toMatchObject({ sampleAnswer: 'Where the line crosses the y-axis.' })
  })
})

describe('NUM_QUESTION (student-produced numeric responses)', () => {
  const src = `# SAT
## Algebra
NUM_QUESTION: In the given system, k is a constant. If the system has infinitely many solutions, what is the value of k?
2x - 7y = 9
kx - 21y = 27
Answer: 6
Hint: Compare the two equations as multiples of each other.
Explanation: Multiplying the first equation by 3 gives 6x - 21y = 27.

NUM_QUESTION: What is one possible value of x?
Correct Answer: 7/2 | 3.5

MC_QUESTION: After it?
A) yes
B) no
Correct Answer: A
`
  it('parses the answer, alternates, stem lines, hint and explanation', async () => {
    const { isObjectiveCorrect, answerText } = await import('./quiz')
    const qs = parseQuizContent(src)
    expect(qs.map((q) => q.type)).toEqual(['num', 'num', 'mc'])
    const q = qs[0]
    if (q.type !== 'num') throw new Error('expected num')
    expect(q.answers).toEqual(['6'])
    expect(q.question).toContain('kx - 21y = 27')
    expect(q.hint).toMatch(/multiples/)
    expect(q.explanation).toMatch(/Multiplying/)
    expect(isObjectiveCorrect(q, '6')).toBe(true)
    expect(isObjectiveCorrect(q, '6.0')).toBe(true)
    expect(isObjectiveCorrect(q, '5')).toBe(false)
    expect(isObjectiveCorrect(q, undefined)).toBe(false)
    const alt = qs[1]
    if (alt.type !== 'num') throw new Error('expected num')
    expect(alt.answers).toEqual(['7/2', '3.5'])
    expect(isObjectiveCorrect(alt, '3.5')).toBe(true)
    expect(isObjectiveCorrect(alt, '7/2')).toBe(true)
    expect(answerText(alt)).toBe('7/2')
  })
  it('drops a NUM_QUESTION with no answer line', () => {
    expect(parseQuizContent('# T\nNUM_QUESTION: What is x?\nHint: think\n')).toEqual([])
  })
})

describe('passage fences (reading items)', () => {
  const src = `# SAT R&W
## Craft and Structure
MC_QUESTION: Which choice completes the text with the most logical transition?
\`\`\`passage
Text 1
Early broadcasters assumed listeners wanted music. ______ news bulletins became the most popular programs.

- a note
- another note
\`\`\`
A) Likewise,
B) However,
C) For example,
D) In other words,
Correct Answer: B
Explanation: Contrast.

\`\`\`passage
Placed before the next question.
\`\`\`
MC_QUESTION: What is the main idea?
A) x
B) y
Correct Answer: A

MC_QUESTION: No passage here.
A) x
B) y
Correct Answer: B
`
  it('attaches the passage to its question, keeps its lines, and never reads it as options', () => {
    const qs = parseQuizContent(src)
    expect(qs).toHaveLength(3)
    expect(qs[0].passage).toContain('Text 1')
    expect(qs[0].passage).toContain('- a note')
    expect(qs[0].question).toBe('Which choice completes the text with the most logical transition?')
    if (qs[0].type === 'mc') { expect(qs[0].options).toHaveLength(4); expect(qs[0].correctAnswer).toBe('However,') }
    expect(qs[1].passage).toBe('Placed before the next question.')
    expect(qs[2].passage).toBeUndefined()
  })
})
