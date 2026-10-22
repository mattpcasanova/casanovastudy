import { describe, expect, it } from 'vitest'
import { assignmentOpen, describeAiUse, attemptsLeft, bestAttempt, normalizeAiHelp, strictestAiHelp, dayCount, daysLate, gradingFor, makeCode, pickerName, practiceDaysLate, practiceStatus, sameStudentId } from './assignments'

const at = (pct: number, finishedAt: string, counted = true) => ({ pct, correct: pct, total: 100, counted, finishedAt })

describe('assigned practice', () => {
  it('grades adaptive by mastery, the rest by percent', () => {
    expect(gradingFor('adaptive')).toBe('mastery')
    expect(gradingFor('quiz')).toBe('percent')
  })
  it('makes readable codes', () => {
    const c = makeCode()
    expect(c).toMatch(/^[a-z2-9]{8}$/)
    expect(c).not.toMatch(/[01ilo]/)
  })
  it('best counted attempt and attempts left', () => {
    const list = [at(60, '2026-10-20T10:00:00Z'), at(90, '2026-10-21T10:00:00Z', false), at(75, '2026-10-21T11:00:00Z')]
    expect(bestAttempt(list)?.pct).toBe(75)
    expect(attemptsLeft(2, list)).toBe(0)
    expect(attemptsLeft(null, list)).toBeNull()
  })
  it('statuses around the due date', () => {
    const due = '2026-10-22T03:59:00Z'
    expect(practiceStatus([at(80, '2026-10-21T20:00:00Z')], due)).toBe('done')
    expect(practiceStatus([at(80, '2026-10-23T20:00:00Z')], due)).toBe('late')
    expect(practiceStatus([], due, Date.parse('2026-10-23T00:00:00Z'))).toBe('missing')
    expect(practiceStatus([], due, Date.parse('2026-10-21T00:00:00Z'))).toBe('not_started')
    expect(practiceStatus([], null)).toBe('not_started')
  })
  it('matches student IDs loosely', () => {
    expect(sameStudentId(' 0616-137-944 ', '616137944')).toBe(true)
    expect(sameStudentId('616137945', '616137944')).toBe(false)
    expect(sameStudentId('AB12', 'ab-12')).toBe(true)
    expect(sameStudentId('123', null)).toBe(false)
  })
  it('picker names show first name and last initial', () => {
    expect(pickerName('Lianna Christine', 'Wysocki')).toBe('Lianna W.')
    expect(pickerName('Mya', '')).toBe('Mya')
  })
})

describe('days late', () => {
  const due = '2026-10-20T23:59:00Z'
  it('rounds up and is 0 when on time', () => {
    expect(daysLate(due, '2026-10-20T20:00:00Z')).toBe(0)
    expect(daysLate(due, '2026-10-21T02:00:00Z')).toBe(1)
    expect(daysLate(due, '2026-10-23T23:00:00Z')).toBe(3)
    expect(daysLate(null, '2026-10-23T23:00:00Z')).toBe(0)
  })
  it('counts from the first counted run for late work, and to now for missing work', () => {
    const run = (finishedAt: string, counted = true) => ({ pct: 80, correct: 8, total: 10, counted, finishedAt })
    expect(practiceDaysLate([run('2026-10-22T10:00:00Z'), run('2026-10-25T10:00:00Z')], due)).toBe(2)
    expect(practiceDaysLate([], due, Date.parse('2026-10-24T12:00:00Z'))).toBe(4)
    expect(practiceDaysLate([run('2026-10-20T10:00:00Z')], due)).toBe(0)
    expect(practiceDaysLate([], null)).toBe(0)
  })
  it('labels', () => {
    expect(dayCount(1)).toBe('1 day')
    expect(dayCount(3)).toBe('3 days')
  })
  it('AI help: strictest setting wins, unknown values mean tutor', () => {
    expect(strictestAiHelp([])).toBe(null)
    expect(strictestAiHelp(['full', 'tutor'])).toBe('tutor')
    expect(strictestAiHelp(['full', 'off', 'tutor'])).toBe('off')
    expect(strictestAiHelp(['full'])).toBe('full')
    expect(normalizeAiHelp('off')).toBe('off')
    expect(normalizeAiHelp(undefined)).toBe('tutor')
    expect(normalizeAiHelp('nope')).toBe('tutor')
  })
  it('AI rules apply while attempts are left and up to 7 days past due', () => {
    const due = '2026-10-22T03:59:00Z'
    expect(assignmentOpen(null, [], null)).toBe(true)
    expect(assignmentOpen(1, [at(80, '2026-10-21T20:00:00Z')], null)).toBe(false)
    expect(assignmentOpen(2, [at(80, '2026-10-21T20:00:00Z')], null)).toBe(true)
    expect(assignmentOpen(1, [at(80, '2026-10-21T20:00:00Z', false)], null)).toBe(true)
    expect(assignmentOpen(null, [], due, Date.parse('2026-10-28T00:00:00Z'))).toBe(true)
    expect(assignmentOpen(null, [], due, Date.parse('2026-10-30T00:00:00Z'))).toBe(false)
  })
  it('describes Explain messages for the teacher', () => {
    expect(describeAiUse('What is 2+2? Also question 3: ...')).toEqual({ kind: 'typed', message: 'What is 2+2? Also question 3: ...' })
    expect(describeAiUse('Explain this question from my quiz:\nWhat is the mean?\nA) 1\nCorrect answer: A')).toEqual({ kind: 'why', message: 'What is the mean?' })
    expect(describeAiUse("Show me the first step for this question. I haven't answered it yet.\n\nSolve 2x = 4\nA) 1")).toEqual({ kind: 'first_step', message: 'Solve 2x = 4' })
    expect(describeAiUse('Here is a photo of my work on this question. Where did I go wrong?\n\nSolve 2x = 4', true)).toEqual({ kind: 'check_work', message: 'Solve 2x = 4' })
    expect(describeAiUse('Explain this part of my study guide: "mitochondria"\n\nThe guide around it:\n"""\nx\n"""')).toEqual({ kind: 'highlight', message: 'mitochondria' })
    expect(describeAiUse('Explain this graph from my study guide: what it shows, how to read it.\n\nWhat it shows: y=x').kind).toBe('figure')
    expect(describeAiUse('x'.repeat(3000)).message.length).toBe(2000)
  })
})
