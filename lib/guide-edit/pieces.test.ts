import { describe, expect, it } from 'vitest'
import { parseQuizRaw } from '@/lib/formats/quiz'
import { parsePracticeRaw } from '@/lib/formats/practice'
import { editProblem, itemCount, joinFields, joinPieces, pieceFields, splitPieces } from './pieces'

const QUIZ = `# Cell Biology Quiz

## Organelles

MC_QUESTION: Which organelle makes most of the cell's ATP?
A) Ribosome
B) Mitochondrion
C) Golgi apparatus
D) Lysosome
Correct Answer: B
Hint: Think about where cellular respiration finishes.
Explanation: The mitochondrion carries out the last stages of respiration.

TF_QUESTION: Plant cells have a cell wall.
Answer: True
Explanation: Cellulose walls surround plant cells.

## Transport

NUM_QUESTION: A cell is 20 µm wide. How wide is it in mm?
\`\`\`graph
kind: numberline
# not a heading
min: 0
\`\`\`
Answer: 0.02 | 1/50
Explanation: Divide by 1000.

SA_QUESTION: Explain why osmosis needs no energy.
Sample Answer: Water moves down its own concentration gradient.
`

const PRACTICE = `# Practice

## Cells

MATCH: Match each organelle to its job
- Ribosome = builds proteins
- Nucleus = holds DNA

FILL: The {{mitochondria|mitochondrion}} make ATP.
Explanation: Respiration.

MC_QUESTION: Which is a prokaryote?
A) Yeast
B) E. coli
C) Moss
Answer: B
`

const CARDS = `# Flashcards

## Essential

**Q:** What is osmosis?
**A:** Water moving across a membrane.
It needs no energy.

Q: What is ATP?
A: The cell's energy currency.
`

describe('splitPieces / joinPieces', () => {
  it('cuts a quiz into title, headings and one piece per question', () => {
    const pieces = splitPieces('quiz', QUIZ)
    expect(pieces.map((p) => p.kind)).toEqual(['title', 'heading', 'item', 'item', 'heading', 'item', 'item'])
    expect(pieces[4].text).toBe('## Transport')
    // The "# not a heading" line inside the figure fence stays in its question.
    expect(pieces[5].text).toContain('# not a heading')
  })
  it('round-trips to the same parsed guide', () => {
    expect(parseQuizRaw(joinPieces(splitPieces('quiz', QUIZ)))).toEqual(parseQuizRaw(QUIZ))
    expect(parsePracticeRaw(joinPieces(splitPieces('practice', PRACTICE)))).toEqual(parsePracticeRaw(PRACTICE))
  })
  it('cuts flashcards per card and prose per heading', () => {
    expect(splitPieces('flashcards', CARDS).filter((p) => p.kind === 'item')).toHaveLength(2)
    const outline = '# Title\n\nIntro line.\n\n## Essential\n\n### Topic A\nBody a\n\n### Topic B\nBody b\n'
    expect(splitPieces('outline', outline).map((p) => p.kind)).toEqual(['title', 'section', 'section', 'section'])
    expect(itemCount('outline', outline)).toBeNull()
  })
})

describe('pieceFields / joinFields', () => {
  it('finds the labeled lines of a question and puts them back unchanged', () => {
    for (const piece of splitPieces('quiz', QUIZ)) expect(joinFields(pieceFields('quiz', piece.text))).toBe(piece.text)
    for (const piece of splitPieces('practice', PRACTICE)) expect(joinFields(pieceFields('practice', piece.text))).toBe(piece.text)
    for (const piece of splitPieces('flashcards', CARDS)) expect(joinFields(pieceFields('flashcards', piece.text))).toBe(piece.text)
  })
  it('labels a multiple-choice question', () => {
    const fields = pieceFields('quiz', splitPieces('quiz', QUIZ)[2].text)
    expect(fields.map((f) => (f.type === 'line' ? f.key : f.type === 'option' ? f.letter : f.type))).toEqual(['MC_QUESTION', 'A', 'B', 'C', 'D', 'CORRECT ANSWER', 'HINT', 'EXPLANATION'])
    expect(fields[0]).toMatchObject({ label: 'Multiple choice question', value: "Which organelle makes most of the cell's ATP?" })
  })
  it('keeps bold markers and card answers that run over lines', () => {
    const fields = pieceFields('flashcards', splitPieces('flashcards', CARDS)[2].text)
    expect(fields).toEqual([
      { type: 'line', key: 'Q', label: 'Front', prefix: '**Q:** ', value: 'What is osmosis?' },
      { type: 'line', key: 'A', label: 'Back', prefix: '**A:** ', value: 'Water moving across a membrane.' },
      { type: 'text', value: 'It needs no energy.' },
    ])
  })
  it('an edited value lands in the guide', () => {
    const pieces = splitPieces('quiz', QUIZ)
    const fields = pieceFields('quiz', pieces[2].text)
    const q = fields[2]
    if (q.type === 'option') q.value = 'Mitochondria'
    pieces[2] = { ...pieces[2], text: joinFields(fields) }
    const parsed = parseQuizRaw(joinPieces(pieces))[0]
    expect(parsed.type === 'mc' && parsed.correctAnswer).toBe('Mitochondria')
  })
})

describe('editProblem', () => {
  it('lets wording change on an assigned quiz but not the questions', () => {
    const reworded = QUIZ.replace('Plant cells have a cell wall.', 'Every plant cell has a cell wall.')
    expect(editProblem('quiz', QUIZ, reworded, true)).toBeNull()
    const pieces = splitPieces('quiz', QUIZ)
    const shorter = joinPieces(pieces.filter((_, i) => i !== 3))
    expect(editProblem('quiz', QUIZ, shorter, true)).toMatch(/assigned to students/)
    expect(editProblem('quiz', QUIZ, shorter, false)).toBeNull()
  })
  it('catches a key that is not one of the options, and an empty guide', () => {
    expect(editProblem('quiz', QUIZ, QUIZ.replace('Correct Answer: B', 'Correct Answer: E'), false)).toMatch(/Question 1 needs a correct answer/)
    expect(editProblem('quiz', QUIZ, '# Title only\n', false)).toMatch(/at least one question/)
    expect(editProblem('summary', 'x', '   ', false)).toMatch(/empty/)
  })
})

describe('adaptive banks', () => {
  const bank = `# Fractions
*Adding and comparing fractions*

CONCEPT: Adding fractions
LESSON: Find a common denominator first. Then add the numerators only.
TRAP: t1 | Adds the denominators

Q: 1 | mc
What is 1/2 + 1/4?
A) 2/6
B) 3/4
C) 1/6
D) 2/4
ANSWER: B
IF A: [t1] You added the denominators. Use a common denominator of 4 instead.
HINT: Rewrite 1/2 with a denominator of 4.
EXPLANATION: 1/2 = 2/4, and 2/4 + 1/4 = 3/4.

Q: 1 | tf
True or false: 1/3 + 1/3 = 2/6.
A) True
B) False
ANSWER: False
PROBES: t1
EXPLANATION: Keep the denominator: 1/3 + 1/3 = 2/3.

MORE: k1

Q: 2 | num
What is 3/4 + 1/8?
ANSWER: 7/8 | 0.875
EXPLANATION: 3/4 = 6/8, and 6/8 + 1/8 = 7/8.
`
  it('cuts a bank into title, topic headings, questions and MORE blocks, and joins it back', () => {
    const pieces = splitPieces('adaptive', bank)
    expect(pieces.map((p) => p.kind)).toEqual(['title', 'heading', 'item', 'item', 'heading', 'item'])
    expect(pieces[1].text.split('\n')[0]).toBe('CONCEPT: Adding fractions')
    expect(pieces[4].text).toBe('MORE: k1')
    expect(joinPieces(pieces).trim()).toBe(bank.trim())
    expect(itemCount('adaptive', bank)).toBe(3)
  })
  it('reads the Q header, options, answer and tagged feedback as fields', () => {
    const fields = pieceFields('adaptive', splitPieces('adaptive', bank)[2].text)
    expect(fields[0]).toMatchObject({ type: 'line', key: 'Q', value: '1 | mc' })
    expect(fields[1]).toMatchObject({ type: 'text', value: 'What is 1/2 + 1/4?' })
    expect(fields.filter((f) => f.type === 'option').map((f) => (f as { letter: string }).letter)).toEqual(['A', 'B', 'C', 'D'])
    expect(fields.find((f) => f.type === 'line' && f.key === 'IF A')).toMatchObject({ label: 'If they pick A', value: '[t1] You added the denominators. Use a common denominator of 4 instead.' })
    expect(joinFields(fields)).toBe(splitPieces('adaptive', bank)[2].text)
  })
  it('refuses a key that is not an option, a Q line without a type, and shape changes when assigned', () => {
    expect(editProblem('adaptive', bank, bank, true)).toBeNull()
    expect(editProblem('adaptive', bank, bank.replace('ANSWER: B', 'ANSWER: E'), false)).toMatch(/Question 1 needs a correct answer/)
    expect(editProblem('adaptive', bank, bank.replace('Q: 2 | num', 'Q: 2'), false)).toMatch(/Question 3 needs a level/)
    // A true/false question listing A) True / B) False is fine (the player ignores those lines).
    expect(editProblem('adaptive', bank, bank.replace('ANSWER: False', 'ANSWER: True'), false)).toBeNull()
    const reworded = bank.replace('What is 1/2 + 1/4?', 'Add 1/2 and 1/4.').replace('ANSWER: B', 'ANSWER: D')
    expect(editProblem('adaptive', bank, reworded, true)).toBeNull()
    const dropped = bank.replace(/Q: 2 \| num[\s\S]*$/, '')
    expect(editProblem('adaptive', bank, dropped, false)).toBeNull()
    expect(editProblem('adaptive', bank, dropped, true)).toMatch(/assigned to students/)
    expect(editProblem('adaptive', bank, bank.replace('Q: 1 | tf', 'Q: 1 | num'), true)).toMatch(/assigned to students/)
  })
})
