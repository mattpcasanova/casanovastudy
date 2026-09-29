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
