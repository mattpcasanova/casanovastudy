// "Write the code" exercises: the student edits starter code in the browser,
// runs it, and hidden tests decide whether it's right (lib/code-runner).
//
// One line-based block format, used both as a ```exercise fence in any guide
// markdown and after a WRITE_CODE: marker in the practice format:
//
//   lang: python                      (python | javascript; default python)
//   prompt: Write is_even(n) that returns True when n is even.
//   starter:
//   def is_even(n):
//       # your code here
//       pass
//   test: is_even(4) == True          (one per line; any boolean expression)
//   test: is_even(7) == False
//   output:                           (optional: expected printed output)
//   15
//   solution:
//   def is_even(n):
//       return n % 2 == 0
//   hint: What does n % 2 give you?
//   explanation: n % 2 is 0 exactly when n is even.
//
// starter / solution / output take every following line (indentation kept)
// until the next key at the start of a line. Pure and unit-tested.

export type RunnableLang = 'python' | 'javascript'

export interface CodeExercise {
  lang: RunnableLang
  prompt: string
  starter: string
  /** Boolean expressions run after the student's code; all must be true. */
  tests: string[]
  /** Expected printed output (compared line by line, trailing spaces ignored). */
  output?: string
  solution?: string
  hint?: string
  explanation?: string
}

const KEY = /^(lang|language|prompt|task|starter|starter code|code|test|tests|output|expected output|solution|answer|hint|explanation)\s*:\s?(.*)$/i
const BLOCK_KEYS = new Set(['starter', 'starter code', 'code', 'output', 'expected output', 'solution', 'answer', 'tests'])

/** Language name from a fence / field → a runnable language, or null. */
export function runnableLang(v: string | null | undefined): RunnableLang | null {
  const s = (v ?? '').trim().toLowerCase()
  if (!s || s === 'python' || s === 'py' || s === 'python3') return 'python'
  if (s === 'javascript' || s === 'js' || s === 'node' || s === 'nodejs') return 'javascript'
  return null
}

const trimBlock = (lines: string[]) => {
  const out = [...lines]
  while (out.length && !out[0].trim()) out.shift()
  while (out.length && !out[out.length - 1].trim()) out.pop()
  // A nested ``` fence the model sometimes wraps code in.
  if (out.length >= 2 && /^\s*(`{3,}|~{3,})/.test(out[0]) && /^\s*(`{3,}|~{3,})\s*$/.test(out[out.length - 1])) return trimBlock(out.slice(1, -1))
  const indent = Math.min(...out.filter((l) => l.trim()).map((l) => l.match(/^\s*/)![0].length), Infinity)
  return out.map((l) => (Number.isFinite(indent) ? l.slice(indent) : l)).join('\n').replace(/\s+$/, '')
}

const stripTicks = (s: string) => s.trim().replace(/^`+|`+$/g, '').trim()

/** Parse the body of an exercise block. Returns null when it can't be played. */
export function parseExercise(text: string, fallback: { prompt?: string; lang?: string } = {}): CodeExercise | null {
  const lines = text.replace(/\r\n?/g, '\n').split('\n')
  const fields: Record<string, string> = {}
  const tests: string[] = []
  let block: { key: string; lines: string[] } | null = null
  const blocks: Record<string, string> = {}
  const close = () => {
    if (!block) return
    if (block.key === 'tests') {
      for (const l of block.lines) {
        const t = stripTicks(l.replace(/^\s*[-*•]\s+/, ''))
        if (t) tests.push(t)
      }
    } else {
      const body = trimBlock(block.lines)
      if (body) blocks[block.key] = body
    }
    block = null
  }

  for (const line of lines) {
    // Keys only count at the start of a line, so indented code can't end a block.
    const m = /^\S/.test(line) ? line.match(KEY) : null
    if (m) {
      close()
      const key = m[1].toLowerCase()
      const rest = m[2]
      const canonical = key === 'language' ? 'lang' : key === 'task' ? 'prompt' : key === 'starter code' || key === 'code' ? 'starter' : key === 'expected output' ? 'output' : key === 'answer' ? 'solution' : key
      if (canonical === 'test') {
        const t = stripTicks(rest)
        if (t) tests.push(t)
      } else if (BLOCK_KEYS.has(canonical)) {
        block = { key: canonical, lines: rest.trim() ? [rest] : [] }
      } else {
        fields[canonical] = rest.trim()
      }
      continue
    }
    if (block) block.lines.push(line)
    else if (line.trim() && fields.prompt !== undefined && !Object.keys(blocks).length && !tests.length) {
      // A prompt that wraps onto the next line.
      fields.prompt = `${fields.prompt} ${line.trim()}`.trim()
    }
  }
  close()

  const lang = runnableLang(fields.lang ?? fallback.lang)
  if (!lang) return null
  const prompt = (fields.prompt || fallback.prompt || '').trim()
  const output = blocks.output
  if (!prompt || (!tests.length && !output)) return null
  return {
    lang,
    prompt,
    starter: blocks.starter ?? '',
    tests,
    ...(output ? { output } : {}),
    ...(blocks.solution ? { solution: blocks.solution } : {}),
    ...(fields.hint ? { hint: fields.hint } : {}),
    ...(fields.explanation ? { explanation: fields.explanation } : {}),
  }
}

/** Printed output matches the expected output (trailing spaces/blank lines ignored). */
export function outputMatches(got: string, expected: string): boolean {
  const norm = (s: string) => s.replace(/\r\n?/g, '\n').split('\n').map((l) => l.replace(/\s+$/, '')).join('\n').replace(/\n+$/, '').replace(/^\n+/, '')
  return norm(got) === norm(expected)
}

/** Back to the block format (custom-guide JSON → markdown, tests). */
export function exerciseToText(e: CodeExercise): string {
  const out = [`lang: ${e.lang}`, `prompt: ${e.prompt}`]
  if (e.starter) out.push('starter:', e.starter)
  for (const t of e.tests) out.push(`test: ${t}`)
  if (e.output) out.push('output:', e.output)
  if (e.solution) out.push('solution:', e.solution)
  if (e.hint) out.push(`hint: ${e.hint}`)
  if (e.explanation) out.push(`explanation: ${e.explanation}`)
  return out.join('\n')
}
