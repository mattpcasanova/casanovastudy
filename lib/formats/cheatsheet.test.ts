import { describe, it, expect } from 'vitest'
import { parseCheatSheet, boxTone } from './cheatsheet'

const SAMPLE = `# Derivatives Cheat Sheet
*Every rule on one page.*

## Core Rules
- Power rule: d/dx xⁿ = nxⁿ⁻¹
### Chain rule
- f(g(x))' = f'(g(x))·g'(x)

## Python Snippet
\`\`\`python
# comment, not a heading
## also not a heading
\`\`\`

## Common Mistakes
- Forgetting the chain rule

## Empty Box
`

describe('parseCheatSheet', () => {
  const s = parseCheatSheet(SAMPLE)
  it('reads the title, description and boxes (level-2 only, fence-aware)', () => {
    expect(s.title).toBe('Derivatives Cheat Sheet')
    expect(s.description).toBe('Every rule on one page.')
    expect(s.boxes.map((b) => b.title)).toEqual(['Core Rules', 'Python Snippet', 'Common Mistakes'])
    expect(s.boxes[0].body).toContain('### Chain rule')
    expect(s.boxes[1].body).toContain('## also not a heading')
  })
  it('tags box tones from titles', () => {
    expect(s.boxes[2].tone).toBe('warning')
    expect(boxTone('Key Formulas')).toBe('formula')
    expect(boxTone('Mnemonics')).toBe('memory')
    expect(boxTone('Vocabulary')).toBe('default')
  })
})
