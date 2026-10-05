// Live eval for the paper grader: which model + effort marks best for the money.
// Grades the same handwritten papers (already uploaded to Cloudinary by a batch)
// against ONE shared answer key with each configuration, re-grades some papers
// to measure run-to-run consistency, and records time and cost. Without a
// teacher's own marks it can't say which config is "right", so it also writes
// disagreements.md: every question where configs disagree, for the teacher to rule on.
//   npx tsx --env-file=.env.local scripts/eval-grading.ts <outDir> <student,student,...> [repeatCount]
// Students are Cloudinary file-name prefixes in grading-pages/ (e.g. Sean_Miller).
// ~$0.15-0.25 per 9-page paper per config.

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs'
import { ClaudeService, type GradingModelOptions } from '../lib/claude-api'
import { gradePaper, type PaperFile } from '../lib/grading/grade-paper'
import { normalizeQuestionKey } from '../lib/grading/parse'

const out = process.argv[2]
const students = (process.argv[3] ?? '').split(',').filter(Boolean)
const repeats = Number(process.argv[4] ?? 2) // how many papers each config grades twice
if (!out || !students.length) throw new Error('usage: eval-grading.ts <outDir> <student,...> [repeatCount]')
mkdirSync(out, { recursive: true })

const CONFIGS: Array<{ key: string; grading: GradingModelOptions }> = [
  { key: 'sonnet-5 (current)', grading: { model: 'claude-sonnet-5' } },
  { key: 'sonnet-5.5', grading: { model: 'claude-sonnet-5-5' } },
  { key: 'sonnet-5.5 medium', grading: { model: 'claude-sonnet-5-5', effort: 'medium' } },
]
// $ per million tokens (both Sonnets): input, output, cache read, cache write.
const PRICE = { input: 2, output: 10, cacheRead: 0.2, cacheWrite: 2.5 }

type Usage = { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number }
const cost = (u: Usage | null) => !u ? 0 : (u.input_tokens * PRICE.input + u.output_tokens * PRICE.output + (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite) / 1e6

async function cloudinaryPages(student: string): Promise<PaperFile[]> {
  const { CLOUDINARY_API_KEY: k, CLOUDINARY_API_SECRET: s, CLOUDINARY_CLOUD_NAME: c } = process.env
  const res = await fetch(`https://api.cloudinary.com/v1_1/${c}/resources/raw/upload?prefix=grading-pages/${student}_p&max_results=100&direction=desc`, {
    headers: { Authorization: 'Basic ' + Buffer.from(`${k}:${s}`).toString('base64') },
  })
  const data = await res.json() as { resources: Array<{ public_id: string; secure_url: string; created_at: string }> }
  // The newest upload of each page only (a stack may have been uploaded more than once).
  const byPage = new Map<number, { public_id: string; secure_url: string }>()
  for (const r of data.resources) {
    const page = Number(r.public_id.match(/_p(\d+)-[0-9a-f]{8}\.\w+$/)?.[1])
    if (page && !byPage.has(page)) byPage.set(page, r)
  }
  const pages = [...byPage.entries()].sort((a, b) => a[0] - b[0])
  if (!pages.length) throw new Error(`No pages for ${student}`)
  return Promise.all(pages.map(async ([n, r]) => ({ buffer: Buffer.from(await (await fetch(r.secure_url)).arrayBuffer()), name: `${student} page ${n}`, type: 'image/jpeg' })))
}

async function main() {
  const papers = new Map<string, PaperFile[]>()
  for (const s of students) papers.set(s, await cloudinaryPages(s))
  console.log('pages:', [...papers].map(([s, p]) => `${s}=${p.length}`).join(' '))

  // One answer key for every config, so differences come from the grader alone.
  const keyPath = `${out}/answer-key.txt`
  let key = existsSync(keyPath) ? readFileSync(keyPath, 'utf8') : ''
  if (!key) {
    const first = papers.get(students[0])!
    const drafted = await new ClaudeService().draftAnswerKey(first.map((p) => ({ mediaType: 'image/jpeg', data: p.buffer.toString('base64') })))
    key = drafted.key
    writeFileSync(keyPath, key)
    console.log(`answer key: $${cost(drafted.usage).toFixed(3)}`)
  }
  const markScheme: PaperFile[] = [{ buffer: Buffer.from(key), name: 'Answer key (drafted from the papers, checked by the teacher)', type: 'text/plain' }]

  type Run = { config: string; student: string; run: number; seconds: number; cost: number; total: number; possible: number; marks: Record<string, number>; feedback: Record<string, string>; usage: Usage | null; error?: string }
  const runs: Run[] = []
  const jobs: Array<{ config: (typeof CONFIGS)[number]; student: string; run: number }> = []
  for (const config of CONFIGS) {
    students.forEach((student) => jobs.push({ config, student, run: 1 }))
    students.slice(0, repeats).forEach((student) => jobs.push({ config, student, run: 2 }))
  }

  // Each config's first paper runs alone so its cache is written before the rest read it (like production).
  const runJob = async ({ config, student, run }: (typeof jobs)[number]) => {
    const t = Date.now()
    try {
      const graded = await gradePaper({ markScheme, student: papers.get(student)!, grading: config.grading })
      const marks: Record<string, number> = {}
      const feedback: Record<string, string> = {}
      for (const q of graded.breakdown) {
        marks[normalizeQuestionKey(q.questionNumber)] = q.marksAwarded
        feedback[normalizeQuestionKey(q.questionNumber)] = q.explanation
      }
      const r: Run = { config: config.key, student, run, seconds: (Date.now() - t) / 1000, cost: cost(graded.usage), total: graded.totalMarks, possible: graded.totalPossible, marks, feedback, usage: graded.usage }
      runs.push(r)
      console.log(`${config.key} | ${student} #${run}: ${r.total}/${r.possible} in ${r.seconds.toFixed(0)}s, $${r.cost.toFixed(3)}`)
    } catch (e) {
      runs.push({ config: config.key, student, run, seconds: (Date.now() - t) / 1000, cost: 0, total: 0, possible: 0, marks: {}, feedback: {}, usage: null, error: String(e) })
      console.log(`${config.key} | ${student} #${run}: FAILED ${e}`)
    }
    writeFileSync(`${out}/runs.json`, JSON.stringify(runs, null, 1))
  }
  await Promise.all(CONFIGS.map(async (config) => {
    const mine = jobs.filter((j) => j.config === config)
    await runJob(mine[0])
    let next = 1
    await Promise.all(Array.from({ length: 3 }, async () => { while (next < mine.length) await runJob(mine[next++]) }))
  }))

  // Summary per config.
  const lines: string[] = ['# Grading eval', '', `Students: ${students.join(', ')}. Shared answer key: answer-key.txt.`, '']
  lines.push('| Config | Avg time / paper | Avg cost / paper | Totals (run 1) | Consistency (run 2 vs 1) |', '|---|---|---|---|---|')
  for (const c of CONFIGS) {
    const mine = runs.filter((r) => r.config === c.key && !r.error)
    const first = mine.filter((r) => r.run === 1)
    const avg = (xs: number[]) => xs.reduce((s, x) => s + x, 0) / Math.max(1, xs.length)
    const totals = students.map((s) => { const r = first.find((x) => x.student === s); return r ? `${r.total}/${r.possible}` : 'x' }).join(', ')
    const pairs = students.slice(0, repeats).map((s) => [first.find((r) => r.student === s), mine.find((r) => r.student === s && r.run === 2)]).filter(([a, b]) => a && b) as Array<[Run, Run]>
    let changed = 0, compared = 0, totalDiff = 0
    for (const [a, b] of pairs) {
      totalDiff += Math.abs(a.total - b.total)
      for (const k of Object.keys(a.marks)) { if (k in b.marks) { compared++; if (a.marks[k] !== b.marks[k]) changed++ } }
    }
    lines.push(`| ${c.key} | ${avg(mine.map((r) => r.seconds)).toFixed(0)} s | $${avg(mine.map((r) => r.cost)).toFixed(3)} | ${totals} | ${changed}/${compared} questions changed, total off by ${pairs.length ? (totalDiff / pairs.length).toFixed(1) : '-'} on average |`)
  }

  // Questions where configs disagree (run 1), for the teacher to rule on.
  const dis: string[] = ['# Where the graders disagree', '', 'For each, which mark is right? (Question, then each grader\'s mark and reason.)', '']
  let count = 0
  for (const s of students) {
    const first = CONFIGS.map((c) => runs.find((r) => r.config === c.key && r.student === s && r.run === 1 && !r.error)).filter(Boolean) as Run[]
    const keys = [...new Set(first.flatMap((r) => Object.keys(r.marks)))]
    for (const k of keys) {
      const vals = first.map((r) => r.marks[k])
      if (new Set(vals.map(String)).size <= 1) continue
      count++
      dis.push(`## ${s.replace(/_/g, ' ')}, question ${k}`)
      for (const r of first) dis.push(`- **${r.config}: ${r.marks[k] ?? 'not graded'}** ${(r.feedback[k] ?? '').slice(0, 300)}`)
      dis.push('')
    }
  }
  lines.push('', `Questions where the configs disagree (run 1): ${count}. See disagreements.md.`)
  writeFileSync(`${out}/summary.md`, lines.join('\n'))
  writeFileSync(`${out}/disagreements.md`, dis.join('\n'))
  const spent = runs.reduce((s, r) => s + r.cost, 0)
  console.log('\n' + lines.join('\n') + `\n\nTotal spent on grading: $${spent.toFixed(2)}`)
}

main()
