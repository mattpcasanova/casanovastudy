// Blind comparison of Explain answers across models: Opus 5.5 (current),
// Sonnet 5.5 and Haiku 4.5. An Opus judge scores each answer 1-5 on
// correctness, fit for the student's level, and clarity/brevity, without
// knowing which model wrote it. Live API calls (~$1 per run).
//   npx tsx --env-file=.env.local scripts/eval-explain-models.ts
import Anthropic from '@anthropic-ai/sdk'
import { EXPLAIN_RULES, explainAudience } from '../lib/claude-api'

type Case = { title: string; subject: string; level: string; topic: string; ask: string }
const CASES: Case[] = [
  { title: '6th Grade Math Practice Quiz', subject: 'mathematics', level: '6th-8th', topic: 'ratios', ask: "Explain this question from my quiz:\nA recipe uses 3 cups of flour for every 2 cups of sugar. How many cups of sugar are needed with 12 cups of flour?\nA) 6\nB) 8\nC) 11\nD) 18\nCorrect answer: B\nI picked: C" },
  { title: '6th Grade Math Practice Quiz', subject: 'mathematics', level: '6th-8th', topic: 'fractions', ask: 'Explain this question from my quiz:\nWhat is $$\\frac{3}{4} \\div \\frac{1}{2}$$?\nA) 3/8\nB) 2/3\nC) 1 1/2\nD) 1/2\nCorrect answer: C\nI picked: A' },
  { title: 'SAT Math Hard Practice Quiz', subject: 'mathematics', level: '11th', topic: 'SAT Math', ask: "Explain this question from my quiz:\nLine f passes through (-1, 6) and (3, -2). Line g is perpendicular to line f and intersects line f at line f's x-intercept. What is the y-intercept of line g?\nA) -4\nB) 1\nC) -1\nD) 4\nCorrect answer: C\nI picked: A" },
  { title: 'SAT Math Hard Practice Quiz', subject: 'mathematics', level: '11th', topic: 'SAT Math', ask: 'Show me step by step how to solve this with the Desmos graphing calculator, so I can do it myself on the test:\nThe function f is defined by f(x) = x^2 - 6x + 5. For what value of x does f reach its minimum?\nA) 1\nB) 3\nC) 5\nD) -4\nCorrect answer: B) 3' },
  { title: 'VSEPR and Bond Hybridization: Hard Practice', subject: 'science', level: '10th', topic: 'AP Chemistry Unit 2.7', ask: 'Explain this question from my quiz:\nWhat is the molecular shape of SF4?\nA) Tetrahedral\nB) Square planar\nC) Seesaw\nD) Trigonal pyramidal\nCorrect answer: C\nI picked: A' },
  { title: 'AP Chemistry Unit 4: Stoichiometry', subject: 'science', level: '11th', topic: 'limiting reactant', ask: 'Explain this part of my guide:\n"The limiting reactant is the one that runs out first, so it decides how much product forms, even if you started with more grams of it."' },
  { title: 'The Civil War: Causes and Turning Points', subject: 'history', level: '9th', topic: 'Civil War', ask: 'Explain this part of my guide:\n"The Kansas-Nebraska Act (1854) let settlers vote on slavery, which repealed the Missouri Compromise line and led to violence known as Bleeding Kansas."' },
  { title: 'Intro Biology: Cell Respiration', subject: 'science', level: 'college', topic: 'cellular respiration', ask: 'Why does the electron transport chain need oxygen? My guide says it is the "final electron acceptor" but I do not get what that means.' },
]

const MODELS = [
  { id: 'claude-opus-5-5', inP: 4, outP: 20, params: { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } } },
  { id: 'claude-sonnet-5-5', inP: 2, outP: 10, params: { thinking: { type: 'adaptive' }, output_config: { effort: 'low' } } },
  { id: 'claude-haiku-4-5', inP: 1, outP: 5, params: {} },
]

const client = new Anthropic()
const system = (c: Case) => `You are a patient tutor inside a study app. A student is studying the guide "${c.title}" (${c.subject}) and asked for help with part of it.\n${explainAudience(c.level, `${c.title}\n${c.topic}`)}\n${EXPLAIN_RULES}`
const text = (m: any) => (m.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('')

async function answer(model: (typeof MODELS)[number], c: Case) {
  const t0 = Date.now()
  const m: any = await client.beta.messages.create({ model: model.id, max_tokens: 4000, system: system(c), messages: [{ role: 'user', content: c.ask }], ...model.params } as any)
  return { text: text(m), cost: (m.usage.input_tokens * model.inP + m.usage.output_tokens * model.outP) / 1e6, secs: (Date.now() - t0) / 1000 }
}

async function judge(c: Case, answers: string[]) {
  const labels = ['A', 'B', 'C']
  const prompt = `You are reviewing tutor answers in a study app. Student level: ${explainAudience(c.level, c.title).split('\n')[0]}\nThe student asked:\n<ask>\n${c.ask}\n</ask>\n\n${answers.map((a, i) => `<answer id="${labels[i]}">\n${a}\n</answer>`).join('\n\n')}\n\nScore each answer 1-5 on: correct (every fact and calculation right; any error caps this at 2), level (fits this student's level and the app's length rules: brief, no preamble), clarity (easy to follow, gets to the point). Then give overall 1-5. Reply with JSON only: {"A":{"correct":n,"level":n,"clarity":n,"overall":n,"errors":"..."},"B":{...},"C":{...}}`
  const m: any = await client.messages.create({ model: 'claude-opus-5-5', max_tokens: 8000, thinking: { type: 'adaptive' }, output_config: { effort: 'medium' }, messages: [{ role: 'user', content: prompt }] } as any)
  const t = text(m)
  return JSON.parse(t.slice(t.indexOf('{'), t.lastIndexOf('}') + 1))
}

async function main() {
  const totals = MODELS.map(() => ({ correct: 0, level: 0, clarity: 0, overall: 0, cost: 0, secs: 0, errors: [] as string[] }))
  await Promise.all(CASES.map(async (c, ci) => {
    const res = await Promise.all(MODELS.map((m) => answer(m, c)))
    // Blind: shuffle which model is A/B/C per case.
    const order = [0, 1, 2].sort(() => Math.random() - 0.5)
    const scores = await judge(c, order.map((i) => res[i].text))
    order.forEach((mi, pos) => {
      const s = scores['ABC'[pos]]
      const t = totals[mi]
      t.correct += s.correct; t.level += s.level; t.clarity += s.clarity; t.overall += s.overall
      t.cost += res[mi].cost; t.secs += res[mi].secs
      if (s.errors && !/^(none|n\/a|)$/i.test(String(s.errors).trim())) t.errors.push(`case ${ci + 1}: ${s.errors}`)
    })
  }))
  const n = CASES.length
  MODELS.forEach((m, i) => {
    const t = totals[i]
    console.log(`${m.id.padEnd(18)} overall ${(t.overall / n).toFixed(2)}  correct ${(t.correct / n).toFixed(2)}  level ${(t.level / n).toFixed(2)}  clarity ${(t.clarity / n).toFixed(2)}  $/answer ${(t.cost / n).toFixed(4)}  secs ${(t.secs / n).toFixed(1)}`)
    t.errors.forEach((e) => console.log(`    ${e}`))
  })
}
main()
