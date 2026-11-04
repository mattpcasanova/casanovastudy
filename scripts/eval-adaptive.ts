// Live check of adaptive practice generation + one refill: parse counts, the
// trap tags the engine follows mistakes with, cost, time.
// npx tsx --env-file=.env.local scripts/eval-adaptive.ts ["topic"] [gradeLevel] [--out file.md] [--no-refill]
// (~$0.10-0.25 per run on the guide model.) To compare another model on the
// same prompt: EVAL_GUIDE_MODEL=claude-fable-5-1 npx tsx ... (priced at its own rates).
import { writeFileSync } from 'node:fs'
import { ClaudeService, guideCost } from '@/lib/claude-api'
import { parseAdaptive, type AdaptiveGuide } from '@/lib/adaptive/format'
import { gradedRules, nextStep, probesOf, type AdaptiveAnswer } from '@/lib/adaptive/engine'

const args = process.argv.slice(2)
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args.splice(i, 2)[1] : undefined }
const out = flag('--out')
const refillIndex = args.indexOf('--no-refill')
const noRefill = refillIndex >= 0
if (noRefill) args.splice(refillIndex, 1)
const topic = args[0] || 'AP Chemistry: stoichiometry and limiting reactants'
const gradeLevel = args[1] || '11th'

/** How well the bank's trap tags support following a mistake with the same trap. */
function trapReport(g: AdaptiveGuide) {
  const mc = g.questions.filter((q) => q.type === 'mc')
  const wrong = mc.reduce((n, q) => n + q.options.length - 1, 0)
  const tagged = mc.reduce((n, q) => n + Object.keys(q.traps ?? {}).length, 0)
  const perConcept = g.concepts.map((c) => {
    const qs = g.questions.filter((q) => q.conceptId === c.id && q.type !== 'explain')
    const sets = c.traps.map((t) => qs.filter((q) => probesOf(q).includes(t.id)).length)
    const unknown = qs.flatMap((q) => probesOf(q)).filter((id) => !c.traps.some((t) => t.id === id)).length
    return { name: c.name, traps: c.traps.length, sets, unknown, levels: qs.map((q) => q.level).join('') }
  })
  // A student who misses every other question, always through a tagged trap when there is one:
  // how often is the next question on that concept one that rechecks the trap?
  let misses = 0, followed = 0
  const log: AdaptiveAnswer[] = []
  const rules = gradedRules({ perConcept: 4 })
  for (let i = 0; i < 80; i++) {
    const step = nextStep(g, log, { reviews: false, rules })
    if (step.kind !== 'question') break
    const q = step.question
    if (step.trap) followed++
    const trapped = q.type === 'mc' ? Object.keys(q.traps ?? {})[0] : undefined
    const wrongNow = i % 2 === 0 && q.type !== 'explain'
    if (wrongNow && (trapped !== undefined || q.probes?.length)) misses++
    log.push({ q: q.id, correct: !wrongNow, given: wrongNow ? (trapped ?? (q.type === 'mc' ? String((q.correct + 1) % q.options.length) : '1')) : String(q.correct) })
  }
  return { wrong, tagged, perConcept, misses, followed }
}

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
  if (out) writeFileSync(out, text)
  const g = parseAdaptive(text)
  const byType: Record<string, number> = {}
  g.questions.forEach((q) => { byType[q.type] = (byType[q.type] ?? 0) + 1 })
  const rawBlocks = (text.match(/^\s*Q:/gm) ?? []).length
  console.log(`\n== Generation on ${process.env.EVAL_GUIDE_MODEL || 'the guide model'} (${secs}s, $${guideCost(usage.input_tokens, usage.output_tokens).toFixed(3)}, ${usage.output_tokens} output tokens)`)
  console.log(`Title: ${g.title}`)
  console.log(`Concepts: ${g.concepts.map((c) => `${c.id} ${c.name} (${g.questions.filter((q) => q.conceptId === c.id).length}q, lesson ${c.lesson ? 'yes' : 'NO'})`).join(' | ')}`)
  console.log(`Questions parsed: ${g.questions.length} of ${rawBlocks} Q blocks`, byType)
  const mcNoFeedback = g.questions.filter((q) => q.type === 'mc' && Object.keys(q.feedback).length < q.options.length - 1).length
  console.log(`MC missing some IF feedback: ${mcNoFeedback}`)
  console.log(`Figures: ${g.questions.filter((q) => q.figure).length}`)

  const t = trapReport(g)
  console.log(`\n== Traps: ${t.tagged} of ${t.wrong} wrong options tagged (${Math.round((t.tagged / Math.max(1, t.wrong)) * 100)}%)`)
  for (const c of t.perConcept) console.log(`  ${c.name}: ${c.traps} traps, questions setting each [${c.sets.join(', ')}], unknown tags ${c.unknown}, levels ${c.levels}`)
  const thin = t.perConcept.reduce((n, c) => n + c.sets.filter((s) => s < 2).length, 0)
  console.log(`Traps set by fewer than 2 questions (can't be rechecked): ${thin}`)
  console.log(`Simulated student who keeps falling for traps: ${t.followed} of ${t.misses} tagged misses were followed by a question setting the same trap`)

  if (noRefill) return
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
  console.log(`\n== Refill (${((Date.now() - t1) / 1000).toFixed(1)}s, $${refill.usage.cost.toFixed(4)}): ${r.length} usable`, r.map((q) => `${q.level}/${q.type}${probesOf(q).length ? ` [${probesOf(q).join(',')}]` : ''}`).join(', '))
  console.log('\n--- first refill question ---\n' + (r[0] ? r[0].prompt : refill.text.slice(0, 600)))
}

main().catch((e) => { console.error(e); process.exit(1) })
