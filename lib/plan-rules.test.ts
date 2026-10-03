import { describe, expect, it } from 'vitest'
import { isFreeFormat, isPlanBlock, limitMessage, premiumOnlyReason } from './plan-rules'

describe('premiumOnlyReason', () => {
  it('lets free accounts use the four original formats at standard settings', () => {
    for (const format of ['outline', 'quiz', 'flashcards', 'summary']) {
      expect(premiumOnlyReason({ format, length: 'medium', difficulty: 'standard' })).toBeNull()
    }
    expect(premiumOnlyReason({ format: 'quiz', length: 'short', difficulty: 'easier' })).toBeNull()
  })
  it('flags Premium formats, Long and Hard', () => {
    expect(premiumOnlyReason({ format: 'practice' })).toBe('Practice guides are part of Premium.')
    expect(premiumOnlyReason({ format: 'plan' })).toBe('Study plan guides are part of Premium.')
    expect(premiumOnlyReason({ format: 'quiz', length: 'long' })).toBe('Long guides are part of Premium.')
    expect(premiumOnlyReason({ format: 'quiz', difficulty: 'hard' })).toBe('Hard questions are part of Premium.')
  })
  it('knows the free formats', () => {
    expect(isFreeFormat('summary')).toBe(true)
    expect(isFreeFormat('cheatsheet')).toBe(false)
    expect(isFreeFormat(undefined)).toBe(false)
  })
})

describe('plan blocks', () => {
  it('recognizes a 403 body from a metered route', () => {
    expect(isPlanBlock({ error: 'x', code: 'limit_reached', kind: 'guide' })).toBe(true)
    expect(isPlanBlock({ error: 'Failed' })).toBe(false)
    expect(isPlanBlock(null)).toBe(false)
  })
  it('writes limit messages per tier', () => {
    expect(limitMessage('guide', 'free')).toBe("You've used your 3 free guides for this week.")
    expect(limitMessage('explain', 'free')).toBe("You've used today's 5 free explanations.")
    expect(limitMessage('guide', 'premium')).toBe("You've reached this month's limit of 60 guides.")
  })
})
