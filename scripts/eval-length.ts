// Live eval for the Short / Medium / Long picker: generates each format at each
// length on one topic and prints word or item counts plus cost.
//   npx tsx --env-file=.env.local scripts/eval-length.ts <outDir>   (~$1.50)

import { writeFileSync, mkdirSync } from 'node:fs'
import { ClaudeService, guideCost } from '../lib/claude-api'
import { parseQuizContent } from '../lib/formats/quiz'
import { parsePractice } from '../lib/formats/practice'
const out = process.argv[2]
mkdirSync(out, { recursive: true })
const base = { content: '', subject: 'science', goal: 'class', gradeLevel: '10th', studyRequest: 'Photosynthesis and cellular respiration' }
const formats = ['outline', 'summary', 'quiz', 'flashcards', 'practice']
const lengths = ['short', 'medium', 'long']
const words = (md: string) => md.replace(/```[\s\S]*?```/g, ' ').split(/\s+/).filter(Boolean).length
function measure(format: string, md: string): string {
  if (format === 'quiz') return `${parseQuizContent(md).length} questions`
  if (format === 'flashcards') return `${(md.match(/^\s*(\*\*)?Q:/gm) ?? []).length} cards`
  if (format === 'practice') return `${parsePractice(md).length} activities`
  return `${words(md)} words`
}
const svc = new ClaudeService()
const jobs = formats.flatMap((f) => lengths.map((l) => ({ f, l })))
let total = 0
Promise.all(jobs.map(async ({ f, l }) => {
  const { content, usage } = await svc.generateStudyGuide({ ...base, format: f, length: l } as any)
  writeFileSync(`${out}/${f}-${l}.md`, content)
  const cost = guideCost(usage.input_tokens, usage.output_tokens)
  total += cost
  return { f, l, m: measure(f, content), cost }
})).then((rows) => {
  for (const f of formats) console.log(f.padEnd(11), lengths.map((l) => { const r = rows.find((x) => x.f === f && x.l === l)!; return `${l}: ${r.m} ($${r.cost.toFixed(2)})` }).join(' | '))
  console.log(`total $${total.toFixed(2)}`)
}).catch((e) => console.log('ERR', String(e).slice(0, 300)))
