// A quiz written to two or more standards should come back with one section per
// standard, named with its code, so results read by standard (one real call, about $0.10).
//   npx tsx --env-file=.env.local scripts/eval-standards.ts ["topic"] ["CODE, CODE"] [quiz|practice|adaptive]
import { ClaudeService } from '../lib/claude-api'
import { parseQuizRaw } from '../lib/formats/quiz'
import { parsePracticeRaw } from '../lib/formats/practice'
import { parseAdaptive } from '../lib/adaptive/format'
import { standardCodes, topicStandard } from '../lib/standards'

const topic = process.argv[2] || 'Linear equations'
const standards = process.argv[3] || 'MA.8.AR.2.1, MA.8.AR.3.2'
const format = (process.argv[4] || 'quiz') as 'quiz' | 'practice' | 'adaptive'

async function main() {
  const gen = new ClaudeService().generateStudyGuideStream({ content: '', subject: 'mathematics', gradeLevel: '6th-8th', format, studyRequest: topic, standards, length: 'short', visuals: false } as never)
  let text = ''
  const started = Date.now()
  for (;;) { const n = await gen.next(); if (n.done) break; text += n.value }
  const topics = format === 'quiz' ? parseQuizRaw(text).map((q) => q.section) : format === 'practice' ? parsePracticeRaw(text).map((a) => (a as { topic?: string }).topic ?? '') : (() => { const g = parseAdaptive(text); return g.questions.map((q) => g.concepts.find((c) => c.id === q.conceptId)?.name ?? '') })()
  const count = new Map<string, number>()
  for (const t of topics) count.set(t, (count.get(t) ?? 0) + 1)
  console.log(`${Math.round((Date.now() - started) / 1000)} s, ${topics.length} items`)
  for (const [t, n] of count) console.log(`  ${n} x ${t || '(no section)'}  ->  ${topicStandard(t) ?? 'NO CODE'}`)
  const wanted = standardCodes(standards)
  const got = new Set([...count.keys()].map((t) => topicStandard(t)))
  console.log(wanted.every((c) => got.has(c)) && [...got].every((c) => c && wanted.includes(c)) ? 'OK: every item sits under one of the standards given' : 'PROBLEM: sections do not match the standards given')
}
void main()
