import { describe, expect, it } from 'vitest'
import { aggregateInsights, type ResponseInput, type AttemptConceptInput } from './analytics'

const concepts = [
  { id: 'c1', name: 'Stoichiometry' },
  { id: 'c2', name: 'Bonding' },
]

// Helper to build an MC response.
function mc(
  concept: string,
  questionId: string,
  chosen: number,
  correctIndex: number,
  serveOffsetSec: number,
): ResponseInput {
  const served = new Date('2026-07-19T10:00:00Z')
  const answered = new Date(served.getTime() + serveOffsetSec * 1000)
  return {
    question_id: questionId,
    concept_id: concept,
    is_correct: chosen === correctIndex,
    score: null,
    answer: { index: chosen },
    question_snapshot: {
      type: 'multiple_choice',
      question_text: `Q ${questionId}`,
      options: ['A', 'B', 'C', 'D'],
      correct_answer: { index: correctIndex },
    },
    served_at: served.toISOString(),
    answered_at: answered.toISOString(),
  }
}

const attemptConcepts: AttemptConceptInput[] = [
  { concept_id: 'c1', status: 'in_progress' },
  { concept_id: 'c1', status: 'mastered' },
  { concept_id: 'c2', status: 'mastered' },
]

describe('aggregateInsights — concepts', () => {
  it('computes pct, avg time, mastered/total, and sorts worst-first', () => {
    const responses: ResponseInput[] = [
      // c1: 1 of 2 correct → 50%, times 10s + 20s → avg 15s
      mc('c1', 'q1', 0, 0, 10),
      mc('c1', 'q1', 1, 0, 20),
      // c2: 2 of 2 correct → 100%, times 5s + 5s → avg 5s
      mc('c2', 'q2', 3, 3, 5),
      mc('c2', 'q2', 3, 3, 5),
    ]
    const { concepts: out } = aggregateInsights(responses, attemptConcepts, concepts)

    // worst-first: c1 (50%) before c2 (100%)
    expect(out.map((c) => c.concept_id)).toEqual(['c1', 'c2'])
    const c1 = out[0]
    expect(c1.answered).toBe(2)
    expect(c1.correct).toBe(1)
    expect(c1.pct).toBe(50)
    expect(c1.avgTimeSec).toBe(15)
    expect(c1.masteredStudents).toBe(1)
    expect(c1.totalStudents).toBe(2)
    expect(out[1].pct).toBe(100)
  })

  it('excludes walk-away times (> 10 min) from the average', () => {
    const responses = [mc('c1', 'q1', 0, 0, 12), mc('c1', 'q1', 0, 0, 5000)]
    const { concepts: out } = aggregateInsights(responses, attemptConcepts, concepts)
    // only the 12s response counts toward avg
    expect(out.find((c) => c.concept_id === 'c1')?.avgTimeSec).toBe(12)
  })

  it('reports null pct for unanswered concepts and sinks them to the bottom', () => {
    const responses = [mc('c1', 'q1', 0, 0, 10)]
    const { concepts: out } = aggregateInsights(responses, attemptConcepts, concepts)
    expect(out[out.length - 1].concept_id).toBe('c2')
    expect(out[out.length - 1].pct).toBeNull()
  })
})

describe('aggregateInsights — questions', () => {
  it('tallies the MC distractor distribution with the correct option flagged', () => {
    const responses = [
      mc('c1', 'q1', 1, 0, 10), // wrong: B
      mc('c1', 'q1', 1, 0, 10), // wrong: B
      mc('c1', 'q1', 0, 0, 10), // correct: A
    ]
    const { questions } = aggregateInsights(responses, attemptConcepts, concepts)
    const q = questions.find((x) => x.question_id === 'q1')!
    expect(q.pct).toBe(33)
    expect(q.distribution).toEqual([
      { label: 'A', count: 1, isCorrect: true },
      { label: 'B', count: 2, isCorrect: false },
      { label: 'C', count: 0, isCorrect: false },
      { label: 'D', count: 0, isCorrect: false },
    ])
  })

  it('collects up to 3 distinct wrong answers + avg score for short answers', () => {
    const sa = (text: string, correct: boolean, score: number): ResponseInput => ({
      question_id: 'sq',
      concept_id: 'c1',
      is_correct: correct,
      score,
      answer: { text },
      question_snapshot: {
        type: 'short_answer',
        question_text: 'Explain',
        options: null,
        correct_answer: { sample_answer: 'the right answer' },
      },
      served_at: '2026-07-19T10:00:00Z',
      answered_at: '2026-07-19T10:00:30Z',
    })
    const responses = [
      sa('wrong one', false, 20),
      sa('wrong one', false, 20), // duplicate → not repeated
      sa('wrong two', false, 40),
      sa('correct', true, 100),
    ]
    const { questions } = aggregateInsights(responses, attemptConcepts, concepts)
    const q = questions.find((x) => x.question_id === 'sq')!
    expect(q.sampleWrong).toEqual(['wrong one', 'wrong two'])
    expect(q.avgScore).toBe(45) // (20+20+40+100)/4
    expect(q.distribution).toBeUndefined()
  })
})
