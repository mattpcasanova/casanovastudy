import { describe, it, expect } from 'vitest'
import { parsePractice, isBlankCorrect, seededShuffle, parseFillSentence, fillToSentence, normalizePracticeActivities, isPlayable, isTrueFalse } from './practice'

const SAMPLE = `# Cells Practice
*Interactive review of cell structure.*

## Organelles
MATCH: Match each organelle to its job
- Nucleus = Stores DNA
- Mitochondria = Makes ATP
- Ribosome = Builds proteins
Explanation: Structure matches function.

FILL: Cellular respiration happens in the {{mitochondria|mitochondrion}}.
Explanation: It is the powerhouse.

## Cell Division
ORDER: Put the phases of mitosis in order
1. Prophase
2. Metaphase
3. Anaphase
4. Telophase

SORT: Sort each cell type
- Prokaryotic: bacteria, archaea
- Eukaryotic: plant cells, animal cells, fungi

MC_QUESTION: Which organelle makes proteins?
A) Nucleus
B) Ribosome
C) Vacuole
Correct Answer: B
Explanation: Ribosomes translate mRNA.

TF_QUESTION: Bacteria have a nucleus.
Answer: False
`

describe('parsePractice', () => {
  const acts = parsePractice(SAMPLE)

  it('parses every activity type with its topic', () => {
    expect(acts.map((a) => a.kind)).toEqual(['match', 'fill', 'order', 'sort', 'choice', 'choice'])
    expect(acts[0].topic).toBe('Organelles')
    expect(acts[2].topic).toBe('Cell Division')
  })

  it('reads match pairs, fill blanks with alternates, order and buckets', () => {
    const [match, fill, order, sort] = acts
    if (match.kind !== 'match' || fill.kind !== 'fill' || order.kind !== 'order' || sort.kind !== 'sort') throw new Error()
    expect(match.pairs[1]).toEqual({ term: 'Mitochondria', definition: 'Makes ATP' })
    expect(match.explanation).toBe('Structure matches function.')
    expect(fill.parts).toEqual(['Cellular respiration happens in the ', { answers: ['mitochondria', 'mitochondrion'] }, '.'])
    expect(order.items).toEqual(['Prophase', 'Metaphase', 'Anaphase', 'Telophase'])
    expect(sort.buckets[1]).toEqual({ name: 'Eukaryotic', items: ['plant cells', 'animal cells', 'fungi'] })
  })

  it('reads multiple choice and true/false answers', () => {
    const [, , , , mc, tf] = acts
    if (mc.kind !== 'choice' || tf.kind !== 'choice') throw new Error()
    expect(mc.correct).toBe(1)
    expect(mc.explanation).toBe('Ribosomes translate mRNA.')
    expect(tf.options).toEqual(['True', 'False'])
    expect(tf.correct).toBe(1)
  })
})

describe('isBlankCorrect', () => {
  it('ignores case, articles, punctuation and small typos', () => {
    expect(isBlankCorrect('The Mitochondria.', ['mitochondria'])).toBe(true)
    expect(isBlankCorrect('mitocondria', ['mitochondria'])).toBe(true)
    expect(isBlankCorrect('ribosome', ['mitochondria'])).toBe(false)
    expect(isBlankCorrect('ATP', ['atp'])).toBe(true)
    expect(isBlankCorrect('ADP', ['ATP'])).toBe(false) // short answers must be exact
  })
})

describe('seededShuffle', () => {
  it('is deterministic and never returns the original order', () => {
    const items = ['a', 'b', 'c', 'd']
    expect(seededShuffle(items, 'x')).toEqual(seededShuffle(items, 'x'))
    expect(seededShuffle(items, 'x')).not.toEqual(items)
    expect([...seededShuffle(items, 'y')].sort()).toEqual(items)
  })
})


describe('fill sentences', () => {
  it('round-trips [answer|alt] and accepts {{…}}', () => {
    const parts = parseFillSentence('The [mitochondria|mitochondrion] makes {{ATP}}.')
    expect(parts).toEqual(['The ', { answers: ['mitochondria', 'mitochondrion'] }, ' makes ', { answers: ['ATP'] }, '.'])
    expect(fillToSentence(parts)).toBe('The [mitochondria|mitochondrion] makes [ATP].')
  })
})

describe('normalizePracticeActivities', () => {
  const raw = [
    { kind: 'match', id: 'm1', prompt: 'Match', pairs: [{ term: 'A', definition: '1' }, { term: 'B', definition: '2' }, { term: '', definition: '' }] },
    { type: 'fill', sentence: 'Plants use [photosynthesis].' },
    { type: 'fill', prompt: 'Cells divide by {{mitosis}}.' },
    { type: 'order', items: ['one', 'two', 'three'] },
    { type: 'sort', buckets: [{ name: 'X', items: ['a', 'b'] }, { name: 'Y', items: ['c'] }] },
    { type: 'multiple-choice', question: 'Pick', options: ['p', 'q', 'r'], correctAnswer: 'q' },
    { type: 'multiple-choice', question: 'Letter', options: ['p', 'q'], correctAnswer: 'B' },
    { type: 'true-false', question: 'Sky is green', correctAnswer: 'False' },
    { type: 'bogus', foo: 1 },
    'nope',
    { type: 'match', pairs: [] },
  ]

  it('maps aliases, ids and answers; drops unknown items', () => {
    const acts = normalizePracticeActivities(raw)
    expect(acts.map((a) => a.kind)).toEqual(['match', 'fill', 'fill', 'order', 'sort', 'choice', 'choice', 'choice', 'match'])
    expect(acts[0].id).toBe('m1')
    expect(new Set(acts.map((a) => a.id)).size).toBe(acts.length)
    const fill2 = acts[2]
    if (fill2.kind !== 'fill') throw new Error()
    expect(fill2.prompt).toBe('')
    expect(fill2.parts[1]).toEqual({ answers: ['mitosis'] })
    const [mc, letter, tf] = acts.slice(5)
    if (mc.kind !== 'choice' || letter.kind !== 'choice' || tf.kind !== 'choice') throw new Error()
    expect(mc.correct).toBe(1)
    expect(letter.correct).toBe(1)
    expect(isTrueFalse(tf) && tf.correct).toBe(1)
  })

  it('strict mode keeps only playable activities and tidies blank rows', () => {
    const acts = normalizePracticeActivities(raw, { strict: true })
    expect(acts).toHaveLength(8)
    expect(acts.every(isPlayable)).toBe(true)
    const match = acts[0]
    if (match.kind !== 'match') throw new Error()
    expect(match.pairs).toHaveLength(2)
  })

  it('returns [] for non-arrays', () => {
    expect(normalizePracticeActivities(null)).toEqual([])
    expect(normalizePracticeActivities({ activities: [] })).toEqual([])
  })
})
