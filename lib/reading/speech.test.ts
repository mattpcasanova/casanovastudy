import { describe, it, expect } from 'vitest'
import { questionForSpeech, textForSpeech } from './speech'

describe('textForSpeech', () => {
  it('drops markdown, fences and blanks', () => {
    expect(textForSpeech('**Photosynthesis** makes `glucose`.\n```graph\nkind: plane\n```')).toBe('Photosynthesis makes glucose.')
    expect(textForSpeech('The {{mitochondria|mitochondrion}} makes energy')).toBe('The blank makes energy')
    expect(textForSpeech('[Read more](https://x.y) about it')).toBe('Read more about it')
  })

  it('says math in words', () => {
    expect(textForSpeech('Solve $$\\frac{x}{2} = 3$$')).toBe('Solve x over 2 = 3')
    expect(textForSpeech('Area is $$\\pi r^2$$')).toBe('Area is pi r squared')
    expect(textForSpeech('$$\\bar{x}$$ and $$\\sqrt{16}$$')).toBe('x bar and the square root of 16')
    expect(textForSpeech('x² + y³')).toBe('x squared + y cubed')
  })
})

describe('questionForSpeech', () => {
  it('reads the options with their letters', () => {
    expect(questionForSpeech('Which is a noble gas?', ['Neon', 'Sodium'])).toBe('Which is a noble gas? A: Neon. B: Sodium')
  })
})
