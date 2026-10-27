import { describe, expect, it } from 'vitest'
import { scoreSavedRun } from './saved-run'
import { parsePractice } from '@/lib/formats/practice'
import { parseQuizContent } from '@/lib/formats/quiz'

const PRACTICE = `## Cells

MATCH: Match each organelle to its job
- Nucleus = Stores DNA
- Mitochondria = Makes ATP
- Ribosome = Builds proteins

FILL: Cellular respiration happens in the {{mitochondria}}.

MC_QUESTION: Which organelle builds proteins?
A) Nucleus
B) Ribosome
Correct Answer: B
`

const QUIZ = `## Cells

MC_QUESTION: Which organelle makes ATP?
A) Nucleus
B) Mitochondria
Correct Answer: B

TF_QUESTION: The nucleus stores DNA.
Correct Answer: True

SA_QUESTION: What does a ribosome do?
Sample Answer: Builds proteins.
`

describe('scoreSavedRun', () => {
  it('practice: answered activities count, partial credit kept, the rest are 0', () => {
    const [m, f, c] = parsePractice(PRACTICE).map((a) => a.id)
    expect(c).toBeTruthy()
    const data = { updatedAt: 1, run: { index: 2, results: { [m]: { correct: false, score: 0.67, given: '2 of 3 pairs on the first try' }, [f]: { correct: true, given: 'mitochondria' } }, later: [], subset: null, streak: 1, bestStreak: 1 } }
    const s = scoreSavedRun('practice', PRACTICE, data)
    expect(s).toMatchObject({ correct: 1.67, total: 3, answered: 2, unit: 'activities' })
    expect(s?.answers).toEqual([
      { id: `p:${m}`, correct: false, given: '2 of 3 pairs on the first try', score: 0.67 },
      { id: `p:${f}`, correct: true, given: 'mitochondria' },
    ])
  })

  it('quiz: objective answers checked, short answers only when scored', () => {
    const [mc, tf, sa] = parseQuizContent(QUIZ)
    const run = { mode: 'practice', index: 2, answers: { [mc.id]: 'Mitochondria', [tf.id]: 'false', [sa.id]: 'makes proteins' }, checked: {}, hinted: {}, saScores: {}, marked: [], subset: null }
    expect(scoreSavedRun('quiz', QUIZ, { updatedAt: 1, run })).toMatchObject({ correct: 1, total: 3, answered: 3, unit: 'questions' })
    const scored = { ...run, saScores: { [sa.id]: { score: 1, feedback: 'ok', isCorrect: true } } }
    expect(scoreSavedRun('quiz', QUIZ, { updatedAt: 1, run: scored })?.correct).toBe(2)
  })

  it('nothing to send: no run, a finished/cleared run, a retry-missed run', () => {
    expect(scoreSavedRun('practice', PRACTICE, null)).toBeNull()
    expect(scoreSavedRun('practice', PRACTICE, { updatedAt: 1, run: null })).toBeNull()
    const [m] = parsePractice(PRACTICE).map((a) => a.id)
    expect(scoreSavedRun('practice', PRACTICE, { updatedAt: 1, run: { index: 0, results: { [m]: { correct: true } }, later: [], subset: [m] } })).toBeNull()
    expect(scoreSavedRun('outline', '# x', {})).toBeNull()
  })
})
