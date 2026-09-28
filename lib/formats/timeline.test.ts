import { describe, it, expect } from 'vitest'
import { parseTimeline, splitEraHeading, splitEventLine } from './timeline'

const SAMPLE = `# Causes of the French Revolution
*From the Old Regime to the Bastille.*

## Era: The Old Regime (1600s–1788)
Absolute monarchy and a society of three estates.
EVENT: 1614 | Estates-General last meets
WHAT: The assembly of the three estates meets for the last time before 1789.
WHY: Kings rule without it for 175 years.

EVENT: 1756–1763 | Seven Years' War
WHAT: France loses to Britain.
WHY: Debt piles up.

## The Crisis of 1789 (1788–1789)
**EVENT:** May 5, 1789 — Estates-General convenes
**WHAT:** Louis XVI summons the three estates.
**WHY:** The voting dispute starts the Revolution.

## Key Themes
- Inequality
- Debt

### Sub point
\`\`\`
## not a heading
\`\`\`
`

describe('parseTimeline', () => {
  const tl = parseTimeline(SAMPLE)

  it('reads the title, description and eras with ranges', () => {
    expect(tl.title).toBe('Causes of the French Revolution')
    expect(tl.description).toBe('From the Old Regime to the Bastille.')
    expect(tl.eras.map((e) => [e.title, e.range])).toEqual([
      ['The Old Regime', '1600s–1788'],
      ['The Crisis of 1789', '1788–1789'],
    ])
    expect(tl.eras[0].summary).toBe('Absolute monarchy and a society of three estates.')
  })

  it('parses events with stable keys, including bold markers and dash dates', () => {
    const events = tl.eras.flatMap((e) => e.events)
    expect(events.map((e) => e.key)).toEqual(['e1', 'e2', 'e3'])
    expect(events[0]).toMatchObject({ date: '1614', title: 'Estates-General last meets', why: 'Kings rule without it for 175 years.' })
    expect(events[2]).toMatchObject({ date: 'May 5, 1789', title: 'Estates-General convenes', what: 'Louis XVI summons the three estates.' })
  })

  it('keeps headings without events as free sections, fence-aware', () => {
    expect(tl.extras).toHaveLength(1)
    expect(tl.extras[0].title).toBe('Key Themes')
    expect(tl.extras[0].body).toContain('### Sub point')
    expect(tl.extras[0].body).toContain('## not a heading')
  })
})

describe('timeline helpers', () => {
  it('splits era headings', () => {
    expect(splitEraHeading('Phase 2: Terror (1793-1794)')).toEqual({ title: 'Terror', range: '1793-1794' })
    expect(splitEraHeading('The Directory (Moderates)')).toEqual({ title: 'The Directory (Moderates)', range: null })
  })
  it('splits event lines', () => {
    expect(splitEventLine('c. 3000 BCE | Writing appears')).toEqual({ date: 'c. 3000 BCE', title: 'Writing appears' })
    expect(splitEventLine('Just a title')).toEqual({ date: '', title: 'Just a title' })
  })
})
