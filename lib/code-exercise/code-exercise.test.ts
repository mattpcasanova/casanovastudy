import { describe, it, expect } from 'vitest'
import { parseExercise, outputMatches, exerciseToText, runnableLang } from './format'
import { codeEditorRelevant, exerciseLanguage, wantsCodeExercises } from './policy'
import { parsePractice, normalizePracticeActivities } from '@/lib/formats/practice'
import { JS_HARNESS } from '@/lib/code-runner/sources'

const BLOCK = `lang: python
prompt: Write \`is_even(n)\` that returns True when n is even.
starter:
def is_even(n):
    # your code here
    pass
test: is_even(4) == True
test: is_even(7) == False
solution:
def is_even(n):
    return n % 2 == 0
hint: What does n % 2 give you?
explanation: n % 2 is 0 for even numbers.`

describe('parseExercise', () => {
  it('reads every field and keeps indentation', () => {
    const e = parseExercise(BLOCK)!
    expect(e.lang).toBe('python')
    expect(e.prompt).toBe('Write `is_even(n)` that returns True when n is even.')
    expect(e.starter).toBe('def is_even(n):\n    # your code here\n    pass')
    expect(e.tests).toEqual(['is_even(4) == True', 'is_even(7) == False'])
    expect(e.solution).toBe('def is_even(n):\n    return n % 2 == 0')
    expect(e.hint).toBe('What does n % 2 give you?')
    expect(e.explanation).toBe('n % 2 is 0 for even numbers.')
  })

  it('round-trips through exerciseToText', () => {
    expect(parseExercise(exerciseToText(parseExercise(BLOCK)!))).toEqual(parseExercise(BLOCK))
  })

  it('accepts a tests: list, an output block and a nested fence', () => {
    const e = parseExercise(`lang: js
prompt: Print 1 to 3.
starter:
\`\`\`javascript
for (let i = 1; i <= 3; i++) {
}
\`\`\`
output:
1
2
3`)!
    expect(e.lang).toBe('javascript')
    expect(e.starter).toBe('for (let i = 1; i <= 3; i++) {\n}')
    expect(e.output).toBe('1\n2\n3')
    expect(e.tests).toEqual([])
  })

  it('rejects unrunnable languages and exercises with nothing to check', () => {
    expect(parseExercise(BLOCK.replace('lang: python', 'lang: java'))).toBeNull()
    expect(parseExercise('prompt: Do something\nstarter:\nx = 1')).toBeNull()
    expect(runnableLang('Python3')).toBe('python')
    expect(runnableLang('ts')).toBeNull()
  })

  it('compares output ignoring trailing spaces and blank lines', () => {
    expect(outputMatches('1 \n2\n\n', '1\n2')).toBe(true)
    expect(outputMatches('1\n3', '1\n2')).toBe(false)
  })
})

describe('WRITE_CODE in the practice format', () => {
  const guide = `# Python Practice
## Functions
WRITE_CODE: Write is_even(n).
\`\`\`exercise
${BLOCK}
\`\`\`

MC_QUESTION: What is 2 + 2?
A) 3
B) 4
Correct Answer: B

## Loops
WRITE_CODE: Write total(nums) that adds the numbers.
\`\`\`python
def total(nums):
    pass
\`\`\`
Test: total([1, 2, 3]) == 6
Test: total([]) == 0
Hint: Start a running sum at 0.
`
  const acts = parsePractice(guide)

  it('parses the exercise fence and the plain-fence fallback', () => {
    expect(acts.map((a) => a.kind)).toEqual(['write', 'choice', 'write'])
    const [a, , c] = acts
    if (a.kind !== 'write' || c.kind !== 'write') throw new Error()
    expect(a.prompt).toBe('Write is_even(n).')
    expect(a.exercise.tests).toHaveLength(2)
    expect(a.code).toBeUndefined()
    expect(c.exercise.starter).toBe('def total(nums):\n    pass')
    expect(c.exercise.tests).toEqual(['total([1, 2, 3]) == 6', 'total([]) == 0'])
    expect(c.hint).toBe('Start a running sum at 0.')
  })

  it('normalizes custom-guide JSON activities', () => {
    const [w] = normalizePracticeActivities([
      { kind: 'write', lang: 'javascript', prompt: 'Write add(a, b)', starter: 'function add(a, b) {\n}', tests: ['add(1, 2) === 3', ' '], solution: 'function add(a, b) { return a + b }' },
      { kind: 'write', prompt: 'nothing to check' },
    ], { strict: true })
    if (w.kind !== 'write') throw new Error()
    expect(w.exercise).toMatchObject({ lang: 'javascript', tests: ['add(1, 2) === 3'] })
    expect(normalizePracticeActivities([{ kind: 'write', prompt: 'nothing to check' }], { strict: true })).toHaveLength(0)
  })
})

describe('code exercise policy', () => {
  it('turns on for runnable programming topics', () => {
    expect(wantsCodeExercises({ text: 'Python loops and lists' })).toBe(true)
    expect(wantsCodeExercises({ subject: 'computer-science', text: 'Recursion basics' })).toBe(true)
    expect(wantsCodeExercises({ text: 'Coding interview: arrays and hash maps' })).toBe(true)
    expect(wantsCodeExercises({ goal: 'interview', text: 'Software engineer at Google' })).toBe(true)
  })

  it('stays off for other languages and non-coding topics', () => {
    expect(wantsCodeExercises({ text: 'AP CSA Java arrays' })).toBe(false)
    expect(wantsCodeExercises({ text: 'SQL joins' })).toBe(false)
    expect(wantsCodeExercises({ subject: 'mathematics', text: 'Quadratic functions' })).toBe(false)
    expect(wantsCodeExercises({ text: 'Lists of French verbs' })).toBe(false)
  })

  it('only offers the switch on formats that can hold exercises', () => {
    expect(codeEditorRelevant({ text: 'Python dictionaries', format: 'practice' })).toBe(true)
    expect(codeEditorRelevant({ text: 'Python dictionaries', format: 'flashcards' })).toBe(false)
  })

  it('picks JavaScript only for JavaScript topics', () => {
    expect(exerciseLanguage('JavaScript array methods')).toBe('javascript')
    expect(exerciseLanguage('Intro to recursion')).toBe('python')
  })
})

describe('JavaScript harness', () => {
  const run = new Function(`${JS_HARNESS}; return __csRun`)() as (code: string, tests: string[]) => {
    stdout: string; error: { message: string; line: number | null } | null; tests: Array<{ pass: boolean; got?: string; expected?: string; error?: unknown }>
  }

  it('runs tests and reports got / expected', () => {
    const r = run('function add(a, b) { return a - b }\nconsole.log("hi", [1, 2])', ['add(2, 2) === 4', 'add(5, 0) === 5', 'typeof add === "function"'])
    expect(r.error).toBeNull()
    expect(r.stdout).toBe('hi [1, 2]')
    expect(r.tests.map((t) => t.pass)).toEqual([false, true, true])
    expect(r.tests[0]).toMatchObject({ got: '0', expected: '4' })
  })

  it('compares arrays and objects by value', () => {
    const r = run('const pair = (a, b) => [a, { b }]', ['pair(1, 2) === [1, { b: 2 }]', 'pair(1, 2) == [1, { b: 3 }]'])
    expect(r.tests.map((t) => t.pass)).toEqual([true, false])
  })

  it('reports errors with the student line number', () => {
    const r = run('let x = 1\nnope()', [])
    expect(r.error?.message).toMatch(/ReferenceError/)
    expect(r.error?.line).toBe(2)
    const s = run('function (', [])
    expect(s.error?.message).toMatch(/SyntaxError/)
  })

  it('does not split != or strings containing ==', () => {
    const r = run('const f = (s) => s', ['f("a==b") === "a==b"', '1 !== 2'])
    expect(r.tests.map((t) => t.pass)).toEqual([true, true])
  })
})
