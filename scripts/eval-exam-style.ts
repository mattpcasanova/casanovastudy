// Does a quiz read like the real test? Generates the same request with the exam
// profile off and on (EXAM_PROFILES, lib/exams/profiles.ts), then a judge
// rates each item: how much it reads like a real item on that test (1-5),
// difficulty (1-5), format violations (things the test never does) and
// whether the keyed answer is right.
//   npx tsx --env-file=.env.local scripts/eval-exam-style.ts <outDir> [hard|standard] [--on-only] [--repeat 2]   (~$0.50 per quiz)
//   npx tsx --env-file=.env.local scripts/eval-exam-style.ts <outDir> --judge <quiz.md> [more.md]   (judge existing quizzes only)

import { writeFileSync, mkdirSync, readFileSync } from 'node:fs'
import { basename } from 'node:path'
import Anthropic from '@anthropic-ai/sdk'
import { ClaudeService, GRADING_MODEL, guideCost } from '../lib/claude-api'
import { answerText, parseQuizContent, type Question } from '../lib/formats/quiz'

const out = process.argv[2]
const difficulty = (process.argv[3] && !process.argv[3].startsWith('--') ? process.argv[3] : 'hard') as 'hard' | 'standard' | 'easier'
const onOnly = process.argv.includes('--on-only')
const repeat = Number(process.argv[process.argv.indexOf('--repeat') + 1]) || 1
mkdirSync(out, { recursive: true })

const REQUEST = {
  subject: 'mathematics',
  goal: 'exam',
  gradeLevel: 'general',
  studyRequest: 'Help me study for the problem-solving and data analysis portion for the SAT (going from a 630 to an 800).',
  exam: 'the digital SAT Math section (Problem-Solving and Data Analysis domain)',
}

const judge = new Anthropic()

interface Row { n: number; style: number; diff: number; violations: string; keyOk: boolean; note: string }

async function rate(qs: Question[]): Promise<Row[]> {
  const list = qs.map((q, i) => {
    const opts = q.type === 'mc' ? `\nOptions: ${q.options.map((o, k) => `${String.fromCharCode(65 + k)}) ${o}`).join(' | ')}` : q.type === 'tf' ? '\nOptions: True | False' : q.type === 'num' ? '\n(Student types a number)' : '\n(Student writes a free-response answer)'
    return `Q${i + 1} [${q.type}]. ${q.question}${q.figure ? `\n[figure: ${q.figure.split('\n')[0]}]` : ''}${opts}\nKeyed answer: ${answerText(q)}`
  }).join('\n\n')
  const res = await judge.messages.create({
    model: GRADING_MODEL,
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `You know ${REQUEST.exam} well: its item types (four-option multiple choice and student-produced numeric responses only), its short formal stems, its contexts, and what its hardest second-module items look like.

For each item below, judge:
1. STYLE 1-5: how much it reads like a real item from that test. 5 = could be lifted from an official practice test. 3 = right content, but the voice, length or setup is a textbook's. 1 = nothing like the test.
2. DIFF 1-5: 1 = the easiest items on the test, 3 = typical, 5 = among the hardest.
3. VIOLATIONS: things that test never does, comma-separated from this list, or "none": TF (true/false), I-II-III (statement lists), EXPLAIN (asks for an explanation in words), NOT-4 (not exactly four options), TRIVIA (content the test does not cover), ARITHMETIC (hard only because of messy numbers), LONG (stem far longer than the test's).
4. KEY: solve it; KEY_OK or KEY_WRONG.
5. A reason of at most 8 words.
Reply with one line per item, exactly: Q<n> | <style> | <diff> | <violations> | KEY_OK or KEY_WRONG | <reason>

${list}`,
    }],
  })
  const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n')
  return [...text.matchAll(/^Q(\d+)\s*\|\s*([1-5])\s*\|\s*([1-5])\s*\|\s*([^|]*?)\s*\|\s*(KEY_OK|KEY_WRONG)\s*\|?\s*(.*)$/gm)]
    .map((m) => ({ n: Number(m[1]), style: Number(m[2]), diff: Number(m[3]), violations: m[4].trim(), keyOk: m[5] === 'KEY_OK', note: m[6].trim() }))
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

async function run(profiles: 'on' | 'off', k: number) {
  process.env.EXAM_PROFILES = profiles
  const svc = new ClaudeService()
  const started = Date.now()
  const { content, usage } = await svc.generateStudyGuide({ content: '', format: 'quiz', length: 'medium', difficultyLevel: difficulty, ...REQUEST } as never)
  const secs = Math.round((Date.now() - started) / 1000)
  const tag = `${profiles}-${difficulty}${repeat > 1 ? `-${k + 1}` : ''}`
  writeFileSync(`${out}/${tag}.md`, content)
  const qs = parseQuizContent(content)
  const rows = await rate(qs)
  writeFileSync(`${out}/${tag}.judge.json`, JSON.stringify(rows, null, 2))
  const types = qs.reduce<Record<string, number>>((acc, q) => ({ ...acc, [q.type]: (acc[q.type] ?? 0) + 1 }), {})
  const violating = rows.filter((r) => r.violations && r.violations.toLowerCase() !== 'none')
  return {
    tag, n: qs.length, types, secs, cost: guideCost(usage.input_tokens, usage.output_tokens),
    style: mean(rows.map((r) => r.style)), diff: mean(rows.map((r) => r.diff)),
    styleHigh: rows.filter((r) => r.style >= 4).length, violations: violating.length, wrongKeys: rows.filter((r) => !r.keyOk).length,
    notes: [...violating.map((r) => `Q${r.n}: ${r.violations} (${r.note})`), ...rows.filter((r) => !r.keyOk).map((r) => `Q${r.n}: KEY? ${r.note}`)],
  }
}

async function judgeFiles(files: string[]) {
  for (const f of files) {
    const qs = parseQuizContent(readFileSync(f, 'utf8'))
    const rows = await rate(qs)
    writeFileSync(`${out}/${basename(f).replace(/\.md$/, '')}.judge.json`, JSON.stringify(rows, null, 2))
    const violating = rows.filter((r) => r.violations && r.violations.toLowerCase() !== 'none')
    console.log(`${basename(f)}: n=${qs.length} style=${mean(rows.map((r) => r.style)).toFixed(2)} (>=4: ${rows.filter((r) => r.style >= 4).length}) diff=${mean(rows.map((r) => r.diff)).toFixed(2)} violations=${violating.length} wrongKeys=${rows.filter((r) => !r.keyOk).length}`)
    for (const r of violating) console.log(`    Q${r.n}: ${r.violations} (${r.note})`)
    for (const r of rows.filter((x) => x.style <= 2)) console.log(`    Q${r.n}: style ${r.style} (${r.note})`)
  }
}

async function main() {
  const j = process.argv.indexOf('--judge')
  if (j > 0) return judgeFiles(process.argv.slice(j + 1))
  const jobs: Array<['on' | 'off', number]> = []
  for (let k = 0; k < repeat; k++) { if (!onOnly) jobs.push(['off', k]); jobs.push(['on', k]) }
  // Sequential: EXAM_PROFILES is read when each prompt is built.
  const results = []
  for (const [p, k] of jobs) results.push(await run(p, k))
  console.log('\nrun            n  types                       style  >=4  diff  viol  wrongKeys  secs  cost')
  for (const r of results) {
    console.log(`${r.tag.padEnd(14)} ${String(r.n).padStart(2)}  ${JSON.stringify(r.types).padEnd(27)} ${r.style.toFixed(2)}   ${String(r.styleHigh).padStart(2)}   ${r.diff.toFixed(2)}  ${String(r.violations).padStart(3)}   ${String(r.wrongKeys).padStart(5)}      ${String(r.secs).padStart(3)}  $${r.cost.toFixed(2)}`)
    for (const n of r.notes) console.log(`    ${n}`)
  }
}
void main()
