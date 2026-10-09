// Live check of adaptive practice generation + one refill: parse counts, cost, time.
// npx tsx --env-file=.env.local scripts/eval-adaptive.ts ["topic"] [gradeLevel]
// (~$0.10-0.25 per run.)
import { ClaudeService, guideCost } from '@/lib/claude-api'
import { parseAdaptive } from '@/lib/adaptive/format'

const topic = process.argv[2] || 'AP Chemistry: stoichiometry and limiting reactants'
const gradeLevel = process.argv[3] || '11th'

async function main() {
  const claude = new ClaudeService()
  const t0 = Date.now()
  const gen = claude.generateStudyGuideStream({
    content: '', subject: 'general', gradeLevel, format: 'adaptive' as any, studyRequest: topic,
    sourcePolicy: 'expand', visuals: true, length: 'medium',
  } as any)
  let text = ''
  let usage: any
  while (true) {
    const n = await gen.next()
    if (n.done) { usage = n.value?.usage; break }
    text += n.value
  }
  const secs = ((Date.now() - t0) / 1000).toFixed(1)
  const g = parseAdaptive(text)
  const byType: Record<string, number> = {}
  g.questions.forEach((q) => { byType[q.type] = (byType[q.type] ?? 0) + 1 })
  const rawBlocks = (text.match(/^\s*Q:/gm) ?? []).length
  console.log(`\n== Generation (${secs}s, $${guideCost(usage.input_tokens, usage.output_tokens).toFixed(3)}, ${usage.output_tokens} output tokens)`)
  console.log(`Title: ${g.title}`)
  console.log(`Concepts: ${g.concepts.map((c) => `${c.id} ${c.name} (${g.questions.filter((q) => q.conceptId === c.id).length}q, lesson ${c.lesson ? 'yes' : 'NO'})`).join(' | ')}`)
  console.log(`Questions parsed: ${g.questions.length} of ${rawBlocks} Q blocks`, byType)
  const mcNoFeedback = g.questions.filter((q) => q.type === 'mc' && Object.keys(q.feedback).length < q.options.length - 1).length
  console.log(`MC missing some IF feedback: ${mcNoFeedback}`)
  console.log(`Figures: ${g.questions.filter((q) => q.figure).length}`)

  const c = g.concepts[0]
  const missed = g.questions.filter((q) => q.conceptId === c.id && q.type === 'mc').slice(0, 1)
  const t1 = Date.now()
  const refill = await claude.generateAdaptiveRefill({
    guideTitle: g.title, gradeLevel, concept: c,
    existing: g.questions.filter((q) => q.conceptId === c.id).map((q) => q.prompt),
    missed: missed.map((q) => ({ question: q.prompt, given: q.options[(q.correct + 1) % q.options.length], correct: q.options[q.correct] })),
    level: 2, count: 4,
  })
  const r = parseAdaptive(`CONCEPT: ${c.name}\n\n${refill.text}`).questions
  console.log(`\n== Refill (${((Date.now() - t1) / 1000).toFixed(1)}s, $${refill.usage.cost.toFixed(4)}): ${r.length} usable`, r.map((q) => `${q.level}/${q.type}`).join(', '))
  console.log('\n--- first refill question ---\n' + (r[0] ? r[0].prompt : refill.text.slice(0, 600)))
}

main().catch((e) => { console.error(e); process.exit(1) })
