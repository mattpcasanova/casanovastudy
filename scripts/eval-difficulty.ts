// Live eval for the Easier / Standard / Hard picker: generates quizzes at each
// difficulty, then has a separate model rate every question 1-5 against the real
// exam and re-solve it to check the answer key.
//   npx tsx --env-file=.env.local scripts/eval-difficulty.ts <outDir> [easier,standard,hard]   (~$1)

import { writeFileSync, mkdirSync } from 'node:fs'
import Anthropic from '@anthropic-ai/sdk'
import { ClaudeService, guideCost } from '../lib/claude-api'
import { parseQuizContent, type Question } from '../lib/formats/quiz'

const out = process.argv[2]
const levels = (process.argv[3] ?? 'standard,hard').split(',')
mkdirSync(out, { recursive: true })

const topics = [
  { key: 'sat-math', subject: 'math', goal: 'exam', gradeLevel: '11th', studyRequest: 'SAT Math: Advanced Math (quadratics, nonlinear functions, exponential growth and decay)', exam: 'the digital SAT Math section' },
  { key: 'ap-chem', subject: 'chemistry', goal: 'exam', gradeLevel: '11th', studyRequest: 'AP Chemistry Unit 4: chemical reactions and stoichiometry', exam: 'the AP Chemistry exam' },
]

const svc = new ClaudeService()
const judge = new Anthropic()

async function rate(exam: string, qs: Question[]): Promise<{ avg: number; hard: number; wrongKeys: number; notes: string[] }> {
  const list = qs.map((q, i) => {
    const opts = q.type === 'mc' ? `\nOptions: ${q.options.join(' | ')}` : ''
    const key = q.type === 'sa' ? q.sampleAnswer : String(q.correctAnswer)
    return `Q${i + 1}. ${q.question}${opts}\nKeyed answer: ${key}`
  }).join('\n\n')
  const res = await judge.messages.create({
    model: 'claude-sonnet-5',
    max_tokens: 16000,
    messages: [{
      role: 'user',
      content: `Rate each question against ${exam}. Difficulty 1 = easiest questions on that exam, 3 = typical, 5 = among its hardest. Also solve each question and say whether the keyed answer is correct.
Reply with one line per question, exactly: Q<n> | <1-5> | KEY_OK or KEY_WRONG | <5-word reason>

${list}`,
    }],
  })
  const text = res.content.filter((b) => b.type === 'text').map((b) => (b as { text: string }).text).join('\n')
  const rows = [...text.matchAll(/^Q(\d+)\s*\|\s*([1-5])\s*\|\s*(KEY_OK|KEY_WRONG)\s*\|?\s*(.*)$/gm)]
  const scores = rows.map((r) => Number(r[2]))
  return {
    avg: scores.reduce((a, b) => a + b, 0) / (scores.length || 1),
    hard: scores.filter((x) => x >= 4).length,
    wrongKeys: rows.filter((r) => r[3] === 'KEY_WRONG').length,
    notes: rows.filter((r) => r[3] === 'KEY_WRONG').map((r) => `Q${r[1]}: ${r[4]}`),
  }
}

const jobs = topics.flatMap((t) => levels.map((d) => ({ t, d })))
Promise.all(jobs.map(async ({ t, d }) => {
  const started = Date.now()
  const { content, usage } = await svc.generateStudyGuide({ content: '', format: 'quiz', length: 'medium', difficultyLevel: d, ...t } as never)
  writeFileSync(`${out}/${t.key}-${d}.md`, content)
  const qs = parseQuizContent(content)
  const r = await rate(t.exam, qs)
  return { key: t.key, d, n: qs.length, ...r, cost: guideCost(usage.input_tokens, usage.output_tokens), secs: Math.round((Date.now() - started) / 1000) }
})).then((rows) => {
  for (const r of rows) {
    console.log(`${r.key.padEnd(9)} ${r.d.padEnd(8)} ${r.n} questions | avg difficulty ${r.avg.toFixed(1)} | rated 4-5: ${r.hard} | wrong keys: ${r.wrongKeys} | $${r.cost.toFixed(2)} | ${r.secs}s`)
    for (const n of r.notes) console.log(`    ${n}`)
  }
}).catch((e) => console.log('ERR', String(e).slice(0, 300)))
