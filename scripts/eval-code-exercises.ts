// Live eval for "write the code" exercises (the Include code editor switch).
// Generates guides on programming topics, parses every exercise, and runs each
// model solution against its own tests with the same harnesses the browser uses
// (Python via local python3, JavaScript in Node). Also checks that the starter
// code does NOT already pass. Costs about $0.10-0.30 per guide.
//
//   npx tsx --env-file=.env.local scripts/eval-code-exercises.ts ["topic"] [format,format]

import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { ClaudeService, guideCost } from '../lib/claude-api'
import { parsePractice } from '../lib/formats/practice'
import { parseExercise, outputMatches, type CodeExercise } from '../lib/code-exercise/format'
import { JS_HARNESS, PY_HARNESS } from '../lib/code-runner/sources'

type Result = { stdout: string; error: { message: string } | null; tests: Array<{ test: string; pass: boolean; got?: string; expected?: string; error?: { message: string } }> }

const jsRun = new Function(`${JS_HARNESS}; return __csRun`)() as (code: string, tests: string[]) => Result

function pyRun(code: string, tests: string[]): Result {
  const script = `${PY_HARNESS}\nimport sys\nprint(__cs_run(sys.stdin.read()))`
  const out = execFileSync('python3', ['-I', '-c', script], { input: JSON.stringify({ code, tests }), timeout: 10_000 }).toString()
  return JSON.parse(out.trim().split('\n').pop()!)
}

const run = (e: CodeExercise, code: string) => (e.lang === 'python' ? pyRun : jsRun)(code, e.tests)
const passes = (e: CodeExercise, r: Result) => !r.error && r.tests.every((t) => t.pass) && (!e.output || outputMatches(r.stdout, e.output))

function exercisesIn(content: string, format: string): CodeExercise[] {
  if (format === 'practice') return parsePractice(content).flatMap((a) => (a.kind === 'write' ? [a.exercise] : []))
  const out: CodeExercise[] = []
  const re = /^(`{3,}|~{3,})\s*(?:code-)?exercise\b([^\n]*)\n([\s\S]*?)^\1\s*$/gm
  let m: RegExpExecArray | null
  while ((m = re.exec(content))) {
    const e = parseExercise(m[3], { lang: m[2].trim() })
    if (e) out.push(e)
    else console.log('  ! unparseable exercise block:\n', m[3].slice(0, 200))
  }
  return out
}

async function main() {
  const topic = process.argv[2] ?? 'Python functions, loops and lists for a high school intro to programming class'
  const formats = (process.argv[3] ?? 'practice,outline').split(',')
  const outDir = path.join(tmpdir(), `eval-code-${Date.now()}`)
  mkdirSync(outDir, { recursive: true })
  const svc = new ClaudeService()
  for (const format of formats) {
    const started = Date.now()
    const { content, usage } = await svc.generateStudyGuide({
      content: '', format, subject: 'computer-science', gradeLevel: '9th-10th', studyRequest: topic, codeEditor: true,
    } as Parameters<ClaudeService['generateStudyGuide']>[0])
    writeFileSync(path.join(outDir, `${format}.md`), content)
    const exercises = exercisesIn(content, format)
    let solved = 0, starterPasses = 0, noSolution = 0
    for (const e of exercises) {
      if (!e.solution) { noSolution++; continue }
      const r = run(e, e.solution)
      if (passes(e, r)) solved++
      else console.log(`  ✗ solution fails: ${e.prompt}\n    ${r.error?.message ?? r.tests.filter((t) => !t.pass).map((t) => `${t.test} (got ${t.got ?? t.error?.message}, expected ${t.expected})`).join('; ')}`)
      if (passes(e, run(e, e.starter))) { starterPasses++; console.log(`  ! starter already passes: ${e.prompt}`) }
    }
    console.log(`${format}: ${exercises.length} exercises (${exercises.map((e) => e.lang).join(', ')}), solutions passing ${solved}/${exercises.length - noSolution}, no solution ${noSolution}, starter passes ${starterPasses}, ${Math.round((Date.now() - started) / 1000)} s, $${guideCost(usage.input_tokens, usage.output_tokens).toFixed(3)}`)
  }
  console.log(`Guides saved in ${outDir}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
