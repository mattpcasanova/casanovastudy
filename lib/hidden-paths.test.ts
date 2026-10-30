import { describe, expect, it } from 'vitest'
import { hiddenWhileClassesOff } from './hidden-paths'

describe('hiddenWhileClassesOff', () => {
  it('hides the classes-feature pages', () => {
    for (const p of ['/calendar', '/my-students', '/my-students/abc', '/my-teachers', '/p/token', '/p/results/token',
      '/classes/abc', '/classes/abc/assignments/def', '/teacher/question-bank', '/teacher/question-bank/c1',
      '/teacher/quizzes', '/teacher/practice-tests/1', '/teacher/assignments/1', '/teacher/some-profile-id']) {
      expect(hiddenWhileClassesOff(p), p).toBe(true)
    }
  })
  it('leaves the live pages alone', () => {
    for (const p of ['/', '/classes/join', '/classes', '/teacher', '/teacher/classes', '/teacher/classes/abc/students/r1',
      '/teacher/courses/k', '/teacher/practice/1', '/teacher/progress', '/teacher/progress/key', '/teacher/verify',
      '/my-guides', '/my-class', '/progress', '/marinescience/exam3-ecosystems']) {
      expect(hiddenWhileClassesOff(p), p).toBe(false)
    }
  })
})
