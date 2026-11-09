// Are the keys of newly written adaptive questions right? Writes top-up batches
// for one topic of a saved adaptive guide (nothing is saved), then has a second
// model solve every question without seeing the key and compares.
//   npx tsx --env-file=.env.local scripts/eval-refill-keys.ts <guideId> [conceptId=k1] [batches=3] [--student]
// --student writes a student's refill (4 questions, low effort) instead of a teacher's top-up.
// EVAL_CLAUDE_MODULE=<path> loads ClaudeService from another file (an older copy, to compare prompts).
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'
import { parseAdaptive } from '@/lib/adaptive/format'
import { isNumberCorrect } from '@/lib/formats/numeric'
import { questionKeyProblem } from '@/lib/formats/key-check'

const [guideId, conceptId = 'k1', batchesArg = '3'] = process.argv.slice(2).filter((a) => !a.startsWith('--'))
const student = process.argv.includes('--student')
const batches = Number(batchesArg)
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const anthropic = new Anthropic()
const LETTERS = 'ABCDEF'

async function solve(q: { prompt: string; passage?: string; options: string[]; type: string }): Promise<string> {
  const body = `${q.passage ? `${q.passage}\n\n` : ''}${q.prompt}${q.type === 'mc' ? `\n${q.options.map((o, i) => `${LETTERS[i]}) ${o}`).join('\n')}` : ''}`
  const want = q.type === 'mc' ? 'letter, NONE or MULTIPLE' : q.type === 'tf' ? 'True or False' : 'the number only'
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-5-5',
    max_tokens: 6000,
    thinking: { type: 'adaptive' },
    messages: [{ role: 'user', content: `Solve this question carefully.${q.type === 'mc' ? ' If no option is correct, or more than one is, say NONE or MULTIPLE.' : ''}\n\n${body}\n\nEnd with one line: FINAL: <${want}>` }],
  } as never)
  const text = (res as { content: Array<{ type: string; text?: string }> }).content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
  return (text.match(/FINAL:\s*(.+)\s*$/m)?.[1] ?? '?').replace(/[*`]/g, '').trim()
}

async function main() {
  const { ClaudeService } = await import(process.env.EVAL_CLAUDE_MODULE || '@/lib/claude-api')
  const { data: row } = await sb.from('study_guides').select('title, subject, grade_level, content').eq('id', guideId).single()
  if (!row) throw new Error('No such guide')
  const guide = parseAdaptive(row.content)
  const concept = guide.concepts.find((c) => c.id === conceptId)
  if (!concept) throw new Error(`No concept ${conceptId}`)
  const existing = guide.questions.filter((q) => q.conceptId === conceptId).map((q) => q.prompt.replace(/\s+/g, ' ').slice(0, 300))
  const claude = new ClaudeService()
  let total = 0, wrong = 0, caught = 0, flaggedOk = 0, cost = 0, secs = 0
  await Promise.all(Array.from({ length: batches }, async (_, b) => {
    const t0 = Date.now()
    const { text, usage } = await claude.generateAdaptiveRefill({
      guideTitle: row.title, subject: row.subject ?? undefined, gradeLevel: row.grade_level ?? undefined, concept, existing,
      missed: [], level: 2, spread: !student, count: student ? 4 : 6,
    })
    cost += usage.cost
    secs += (Date.now() - t0) / 1000
    const qs = parseAdaptive(`CONCEPT: ${concept.name}\n\n${text}`).questions.filter((q) => q.type !== 'explain')
    await Promise.all(qs.map(async (q, i) => {
      const got = await solve(q)
      const key = q.type === 'mc' ? LETTERS[q.correct] : q.type === 'tf' ? q.options[q.correct] : q.answers.join(' | ')
      const ok = q.type === 'num' ? isNumberCorrect(got, q.answers) : got.toLowerCase().startsWith(String(key).toLowerCase())
      const flag = questionKeyProblem(q)
      total++
      if (!ok) wrong++
      if (!ok && flag) caught++
      if (ok && flag) flaggedOk++
      if (!ok || flag) console.log(`\nbatch ${b + 1} q${i + 1} (${q.type}, level ${q.level}) key ${key}, solver ${got}${flag ? `, checker: ${flag}` : ''}\n  ${q.prompt.replace(/\s+/g, ' ').slice(0, 240)}\n  ${q.options.join(' | ')}\n  ${q.explanation}`)
    }))
  }))
  console.log(`\n${total} questions: the solver disagrees with ${wrong} keys (${caught} of those caught by the checker, ${flaggedOk} good keys flagged); ${(secs / batches).toFixed(0)} s and $${(cost / batches).toFixed(3)} per batch`)
}
main().catch((e) => { console.error(e); process.exit(1) })
