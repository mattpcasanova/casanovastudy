import { describe, expect, it } from 'vitest'
import { sameShape, versionForAttempt } from './versions'

const Q = (stem: string) => `MC_QUESTION: ${stem}?\nA) 1\nB) 2\nC) 3\nD) 4\nCorrect Answer: B\n\nTF_QUESTION: ${stem} is true.\nCorrect Answer: True`

describe('versions', () => {
  it('needs the same item types in the same order', () => {
    expect(sameShape('quiz', Q('one'), Q('two'))).toBe(true)
    expect(sameShape('quiz', Q('one'), `${Q('two')}\n\nSA_QUESTION: extra?\nSample Answer: x`)).toBe(false)
    expect(sameShape('quiz', Q('one'), 'nothing here')).toBe(false)
  })
  it('maps attempts to versions', () => {
    expect([1, 2, 3, 11, 12].map(versionForAttempt)).toEqual([0, 1, 2, 10, 1])
  })
})
