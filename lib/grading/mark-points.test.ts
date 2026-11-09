import { describe, expect, it } from 'vitest'
import type { GradedQuestion } from './parse'
import {
  blankBreakdown, codesFromPoints, forStudent, markedAs, normalizeTemplate, parseTemplate, pointsFromCodes, pointsOf,
  placeStamp, pointsTotal, cleanNotes, applyAnnotation, readCode, setAllPoints, stampText, stampsOf, stillMarking, templateFromBreakdown, togglePoint, unmarkedCount, cleanPlace, cleanPoints,
} from './mark-points'

const q = (patch: Partial<GradedQuestion> = {}): GradedQuestion => ({ questionNumber: '1', marksAwarded: 0, marksPossible: 3, explanation: '', ...patch })

describe('mark codes', () => {
  it('reads Cambridge codes', () => {
    expect(readCode('M1')).toEqual({ letters: 'M', value: 1, suffix: '' })
    expect(readCode('A1ft')).toEqual({ letters: 'A', value: 1, suffix: 'ft' })
    expect(readCode('DM1')).toEqual({ letters: 'DM', value: 1, suffix: '' })
    expect(readCode('B2')?.value).toBe(2)
    expect(readCode('x = 3')).toBeNull()
    expect(readCode('AO1')).toEqual({ letters: 'AO', value: 1, suffix: '' })
  })

  it('turns a codes line into points and back', () => {
    const points = pointsFromCodes('M1 A1 M1 A0')
    expect(points.map((p) => p.earned)).toEqual([true, true, true, false])
    expect(points[3]).toMatchObject({ code: 'A1', marks: 1 })
    expect(codesFromPoints(points)).toBe('M1 A1 M1 A0')
    expect(pointsTotal(points, 4)).toBe(3)
  })

  it('keeps a two-mark code as one point', () => {
    const [b2] = pointsFromCodes('B2')
    expect(b2).toMatchObject({ code: 'B2', marks: 2, earned: true })
    expect(codesFromPoints([{ ...b2, earned: false }])).toBe('B0')
  })
})

describe('marking a question', () => {
  const sheet = q({ unmarked: true, points: [{ code: 'M1', marks: 1 }, { code: 'A1', marks: 1 }, { code: 'B1', marks: 1 }] })

  it('a click earns the point, a second click takes it back', () => {
    const once = togglePoint(sheet, 0)
    expect(once.marksAwarded).toBe(1)
    expect(once.unmarked).toBeUndefined()
    expect(once.markCodes).toBe('M1 A0 B0')
    expect(togglePoint(once, 0).marksAwarded).toBe(0)
  })

  it('full marks and zero', () => {
    expect(setAllPoints(sheet, true)).toMatchObject({ marksAwarded: 3, markCodes: 'M1 A1 B1' })
    const zero = setAllPoints(sheet, false)
    expect(zero.marksAwarded).toBe(0)
    expect(zero.unmarked).toBeUndefined()
  })

  it('never gives more than the question carries ("any two from")', () => {
    const anyTwo = q({ marksPossible: 2, points: [{ code: '', marks: 1 }, { code: '', marks: 1 }, { code: '', marks: 1 }] })
    expect(setAllPoints(anyTwo, true).marksAwarded).toBe(2)
    expect(togglePoint(togglePoint(togglePoint(anyTwo, 0), 1), 2).marksAwarded).toBe(2)
  })

  it('a typed mark counts as marked and stays in range', () => {
    expect(markedAs(q({ unmarked: true }), 9)).toEqual(q({ marksAwarded: 3 }))
    expect(setAllPoints(q({ unmarked: true }), true).marksAwarded).toBe(3)
  })

  it("shows the grader's codes as points only when they add up", () => {
    expect(pointsOf(q({ marksAwarded: 2, markCodes: 'M1 A1 B0' }))).toHaveLength(3)
    expect(pointsOf(q({ marksAwarded: 1, markCodes: 'M1 A1 B0' }))).toEqual([])
    expect(pointsOf(q({ markCodes: undefined }))).toEqual([])
  })
})

describe('templates', () => {
  it('reads the model reply', () => {
    const t = parseTemplate('```json\n{"questions":[{"q":"Question 1(a)","marks":3,"points":[{"code":"M1","note":"differentiates"},{"code":"A1","note":"6x + 2"},{"code":"B1"}],"answer":"6x + 2"},{"q":"2","marks":8,"levels":4},{"q":"3","marks":0}]}\n```')
    expect(t).toHaveLength(2)
    expect(t[0]).toMatchObject({ question: '1(a)', marks: 3, guide: '6x + 2' })
    expect(t[0].points).toHaveLength(3)
    expect(t[1]).toEqual({ question: '2', marks: 8, levels: 4 })
    expect(parseTemplate('sorry')).toEqual([])
  })

  it('drops points that cannot reach the marks, and duplicate labels', () => {
    const t = normalizeTemplate([{ question: '1', marks: 4, points: [{ code: 'M1' }] }, { question: '1', marks: 2 }])
    expect(t).toEqual([{ question: '1', marks: 4 }])
  })

  it('makes a blank sheet and gets the template back from a marked paper', () => {
    const template = normalizeTemplate([{ question: '1', marks: 2, points: [{ code: 'M1', note: 'method' }, { code: 'A1' }], guide: 'x = 3' }, { question: '2', marks: 5 }])
    const blank = blankBreakdown(template)
    expect(unmarkedCount(blank)).toBe(2)
    expect(stillMarking(blank)).toBe(true)
    const marked = [togglePoint(blank[0], 0), markedAs(blank[1], 4)]
    expect(stillMarking(marked)).toBe(false)
    expect(templateFromBreakdown(marked)).toEqual(template)
    expect(forStudent(marked)[0].guide).toBeUndefined()
    expect(forStudent(marked)[0].points?.[0].note).toBe('method')
  })
})

describe('marks on the paper', () => {
  const sheet = [
    togglePoint(q({ questionNumber: '1(a)', marksPossible: 2, unmarked: true, points: [{ code: 'M1', marks: 1 }, { code: 'A1', marks: 1 }] }), 0),
    markedAs(q({ questionNumber: '2', marksPossible: 3, unmarked: true }), 2),
    q({ questionNumber: '3', unmarked: true, points: [{ code: 'B1', marks: 1, at: { page: 1, x: 0.5, y: 0.5 } }] }),
  ]

  it('places a point and a score, and reads them as an examiner writes them', () => {
    let b = placeStamp(sheet, { question: 0, point: 1 }, { page: 1, x: 0.8, y: 0.2 })
    b = placeStamp(b, { question: 0, point: 0 }, { page: 1, x: 0.7, y: 0.2 })
    b = placeStamp(b, { question: 1, point: null }, { page: 2, x: 0.9, y: 0.4 })
    expect(stampsOf(b).map((s) => `${s.text}@${s.page} ${s.tone}`)).toEqual(['M1@1 earned', 'A0@1 lost', '2/3@2 score'])
    expect(b[0].marksAwarded).toBe(1)
    expect(stampText(b, { question: 0, point: 1 })).toBe('A0')
    // The stamp follows the mark when it changes, and stays where it was put.
    const flipped = b.map((x, i) => (i === 0 ? togglePoint(x, 1) : x))
    expect(stampsOf(flipped)[1]).toMatchObject({ text: 'A1', tone: 'earned', x: 0.8 })
    expect(stampsOf(placeStamp(b, { question: 0, point: 1 }, undefined))).toHaveLength(2)
  })

  it('shows nothing for a question not marked yet, and keeps places off the template', () => {
    expect(stampsOf(sheet)).toEqual([])
    expect(templateFromBreakdown(sheet)[2].points).toEqual([{ code: 'B1', marks: 1 }])
  })

  it('only accepts places on the page', () => {
    expect(cleanPlace({ page: 2, x: 0.123456, y: 1 })).toEqual({ page: 2, x: 0.1235, y: 1 })
    expect(cleanPlace({ page: 0, x: 0.5, y: 0.5 })).toBeUndefined()
    expect(cleanPlace({ page: 1, x: 1.2, y: 0.5 })).toBeUndefined()
    expect(cleanPoints([{ code: 'M1', earned: true, at: { page: 1, x: 0.5, y: 0.5 } }])[0].at).toEqual({ page: 1, x: 0.5, y: 0.5 })
  })
})

describe('notes on the paper', () => {
  const sheet = [markedAs(q({ questionNumber: '1', marksPossible: 2, unmarked: true }), 1)]
  it('adds, moves and removes a free note', () => {
    let b = placeStamp(sheet, { question: 0, point: null, add: { text: 'ft', tone: 'note', title: '' } }, { page: 1, x: 0.2, y: 0.3 })
    b = placeStamp(b, { question: 0, point: null, add: { text: '✓', tone: 'earned', title: '' } }, { page: 1, x: 0.4, y: 0.3 })
    expect(stampsOf(b).map((s) => s.text)).toEqual(['ft', '✓'])
    expect(stampText(b, { question: 0, point: null, note: 0 })).toBe('ft')
    b = placeStamp(b, { question: 0, point: null, note: 0 }, { page: 2, x: 0.5, y: 0.5 })
    expect(b[0].notes?.[0]).toMatchObject({ page: 2, text: 'ft' })
    b = placeStamp(b, { question: 0, point: null, note: 0 }, undefined)
    expect(b[0].notes?.map((n) => n.text)).toEqual(['✓'])
    expect(placeStamp(b, { question: 0, point: null, note: 0 }, undefined)[0].notes).toBeUndefined()
    expect(b[0].marksAwarded).toBe(1)
  })
  it('cleans notes from the browser', () => {
    expect(cleanNotes([{ text: ' cao ', tone: 'note', page: 1, x: 0.5, y: 0.5 }, { text: 'x', tone: 'bad', page: 1, x: 0.1, y: 0.1 }, { text: '', page: 1, x: 0, y: 0 }, { text: 'off', page: 0, x: 0, y: 0 }]))
      .toEqual([{ text: 'cao', tone: 'note', page: 1, x: 0.5, y: 0.5 }, { text: 'x', tone: 'note', page: 1, x: 0.1, y: 0.1 }])
  })
})

describe('palette picks', () => {
  const sheet = [q({ questionNumber: '1', marksPossible: 3, unmarked: true, points: [{ code: 'M1', marks: 1 }, { code: 'M1', marks: 1 }, { code: 'A1', marks: 1 }] })]
  const pick = (text: string, tone: 'earned' | 'lost' | 'note' = 'earned') => ({ text, tone, title: '' })

  it('M1 gives the next method mark, A0 takes the accuracy mark, and each is placed as that mark', () => {
    let r = applyAnnotation(sheet, 0, pick('M1'))
    expect(r.target).toEqual({ question: 0, point: 0 })
    expect(r.breakdown[0].marksAwarded).toBe(1)
    r = applyAnnotation(r.breakdown, 0, pick('M1'))
    expect(r.target).toEqual({ question: 0, point: 1 })
    expect(r.breakdown[0].marksAwarded).toBe(2)
    r = applyAnnotation(r.breakdown, 0, pick('A0', 'lost'))
    expect(r.target).toEqual({ question: 0, point: 2 })
    expect(r.breakdown[0]).toMatchObject({ marksAwarded: 2, markCodes: 'M1 M1 A0' })
    expect(r.breakdown[0].unmarked).toBeUndefined()
  })

  it('a code the sheet has no mark for, and words, are notes', () => {
    expect(applyAnnotation(sheet, 0, pick('B1')).target.add?.text).toBe('B1')
    expect(applyAnnotation(sheet, 0, pick('ft', 'note')).target.add?.text).toBe('ft')
    expect(applyAnnotation(sheet, 0, pick('see me', 'note')).breakdown).toBe(sheet)
  })

  it('a tick earns the next uncoded point', () => {
    const sci = [q({ marksPossible: 2, unmarked: true, points: [{ code: '', marks: 1, note: 'cell wall' }, { code: '', marks: 1, note: 'chloroplasts' }] })]
    const r = applyAnnotation(sci, 0, pick('✓'))
    expect(r.target).toEqual({ question: 0, point: 0 })
    expect(r.breakdown[0].marksAwarded).toBe(1)
    expect(applyAnnotation(sheet, 0, pick('✓')).target.add?.text).toBe('✓')
  })
})
