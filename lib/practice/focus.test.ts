import { describe, it, expect } from 'vitest'
import { durationText, focusChip, sanitizeFocusEvents, summarizeFocus } from './focus'

const NOW = Date.parse('2026-10-26T15:00:00Z')

describe('sanitizeFocusEvents', () => {
  it('keeps known kinds with sane times and clamps seconds', () => {
    const out = sanitizeFocusEvents([
      { kind: 'left', at: '2026-10-26T14:50:00Z', seconds: 42.4 },
      { kind: 'left', at: '2026-10-26T14:51:00Z', seconds: -5 },
      { kind: 'copy', at: '2026-10-26T14:52:00Z', seconds: 99 },
      { kind: 'hack', at: '2026-10-26T14:52:00Z' },
      { kind: 'paste', at: '2026-10-24T14:52:00Z' }, // too old
      { kind: 'paste', at: '2026-10-26T16:00:00Z' }, // future
      'nope',
    ], NOW)
    expect(out).toEqual([
      { kind: 'left', at: '2026-10-26T14:50:00.000Z', seconds: 42 },
      { kind: 'left', at: '2026-10-26T14:51:00.000Z', seconds: 0 },
      { kind: 'copy', at: '2026-10-26T14:52:00.000Z', seconds: null },
    ])
  })
  it('caps a post at 50 events', () => {
    const many = Array.from({ length: 80 }, () => ({ kind: 'copy', at: '2026-10-26T14:50:00Z' }))
    expect(sanitizeFocusEvents(many, NOW)).toHaveLength(50)
  })
})

describe('summary and chip', () => {
  it('adds up time away and attempts', () => {
    const s = summarizeFocus([
      { kind: 'start', at: 'x' }, { kind: 'left', at: 'x', seconds: 30 }, { kind: 'left', at: 'x', seconds: 50 },
      { kind: 'paste', at: 'x' }, { kind: 'fullscreen_exit', at: 'x' },
    ])
    expect(s).toMatchObject({ started: true, leaves: 2, awaySeconds: 80, longestAway: 50, pastes: 1, fullscreenExits: 1 })
    expect(focusChip(s)).toBe('Left the page 2× (1m 20s) · 1 copy/paste')
  })
  it('stays quiet when nothing happened', () => {
    expect(focusChip(summarizeFocus([{ kind: 'start', at: 'x' }]))).toBeNull()
  })
  it('formats durations', () => {
    expect(durationText(45)).toBe('45s')
    expect(durationText(120)).toBe('2m')
    expect(durationText(3900)).toBe('1h 5m')
  })
})
