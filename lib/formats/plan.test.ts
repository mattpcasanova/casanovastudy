import { describe, it, expect } from 'vitest'
import { parsePlan, unitStudyRequest } from './plan'

const SAMPLE = `# SAT Study Plan
*Six weeks to a stronger SAT score.*

## Overview
The SAT has two sections: **Reading and Writing** and **Math**.
Plan on about 5 hours a week.

## Phase 1: Foundations
UNIT: Linear Equations and Functions
GOAL: Solve and graph linear equations quickly.
COVERS: slope; systems of equations, word problems
FORMAT: Practice
TIME: 45 min

UNIT: Reading for Main Idea
GOAL: Find the central claim of a passage.
COVERS: main idea; purpose
FORMAT: quiz
TIME: 30 min

## Phase 2: Harder Math
**UNIT:** Advanced Math
GOAL: Handle quadratics and exponentials.
COVERS: quadratics; exponential growth
FORMAT: flash cards
TIME: 1 hour

## Test-Day Tips
- Sleep well.
- Bring a calculator.
`

describe('parsePlan', () => {
  const plan = parsePlan(SAMPLE)

  it('reads title, description and overview', () => {
    expect(plan.title).toBe('SAT Study Plan')
    expect(plan.description).toBe('Six weeks to a stronger SAT score.')
    expect(plan.overview?.title).toBe('Overview')
    expect(plan.overview?.body).toContain('**Math**')
  })

  it('groups units into phases with stable keys', () => {
    expect(plan.phases.map((p) => p.title)).toEqual(['Phase 1: Foundations', 'Phase 2: Harder Math'])
    const units = plan.phases.flatMap((p) => p.units)
    expect(units.map((u) => u.key)).toEqual(['u1', 'u2', 'u3'])
    expect(units[0]).toMatchObject({
      number: 1,
      title: 'Linear Equations and Functions',
      covers: ['slope', 'systems of equations', 'word problems'],
      format: 'practice',
      time: '45 min',
    })
    expect(units[2].format).toBe('flashcards')
  })

  it('keeps non-unit sections as extras', () => {
    expect(plan.extras.map((e) => e.title)).toEqual(['Test-Day Tips'])
    expect(plan.extras[0].body).toContain('Bring a calculator')
  })

  it('builds a focused study request for a unit', () => {
    const u = plan.phases[0].units[0]
    expect(unitStudyRequest(plan.title!, u)).toBe(
      'SAT Study Plan — Unit 1: Linear Equations and Functions. Goal: Solve and graph linear equations quickly. Cover: slope; systems of equations; word problems.'
    )
  })
})
