import { describe, it, expect } from 'vitest'
import { figureProgress } from './figure-progress'

describe('figureProgress', () => {
  it('counts finished figures and ignores code fences', () => {
    const md = 'a\n```graph\nplot: x\n```\n```python\nprint(1)\n```\n```graph\nplot: 2x\n```\n'
    expect(figureProgress(md)).toMatchObject({ done: 2, drawing: false })
  })
  it('cuts a half-written figure from the preview', () => {
    const r = figureProgress('Intro\n```graph\nkind: plane\nplot: x^')
    expect(r.drawing).toBe(true)
    expect(r.done).toBe(0)
    expect(r.text).toContain('Intro')
    expect(r.text).not.toContain('plot:')
    expect(r.text).toContain('Drawing a visual')
  })
})
