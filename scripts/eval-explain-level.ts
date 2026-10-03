// Compares Explain answers before/after the per-level voice: word count,
// average sentence length and Flesch-Kincaid grade, per audience.
// Live API calls (~$0.01 each).
//   npx tsx --env-file=.env.local scripts/eval-explain-level.ts [runs]
import Anthropic from '@anthropic-ai/sdk'
import { EXPLAIN_RULES, explainAudience } from '../lib/claude-api'

const OLD_RULES = EXPLAIN_RULES.replace(/- Be brief: stay inside the LENGTH[^\n]*/, '- Be brief: about 60-180 words unless they ask for more. Start with the explanation itself, no preamble ("Great question").')

const SIXTH = [
  'Explain this question from my quiz:\nA recipe uses 3 cups of flour for every 2 cups of sugar. How many cups of sugar are needed with 12 cups of flour?\nA) 6\nB) 8\nC) 11\nD) 18\nCorrect answer: B\nI picked: C\nThe guide\'s explanation: 12 is 4 times 3, so multiply 2 by 4 to get 8 cups of sugar. Choosing 11 comes from adding 9 to both amounts, but ratios scale by multiplying, not adding.',
  'Explain this question from my quiz:\nWhat is $$\\frac{3}{4} \\div \\frac{1}{2}$$?\nA) $$\\frac{3}{8}$$\nB) $$\\frac{2}{3}$$\nC) $$1\\frac{1}{2}$$\nD) $$\\frac{1}{2}$$\nCorrect answer: C\nI picked: A\nThe guide\'s explanation: Dividing by a fraction is the same as multiplying by its reciprocal: 3/4 × 2/1 = 6/4 = 1 1/2.',
  'Explain this question from my quiz:\nSolve for x: 4x + 5 = 29\nA) x = 6\nB) x = 8.5\nC) x = 24\nD) x = 7\nCorrect answer: A\nThe guide\'s explanation: Subtract 5 from both sides to get 4x = 24, then divide by 4 to get x = 6.',
]
const ELEVENTH = ['Explain this question from my quiz:\nIf f(x) = 2x² − 3x + 1, what is f(−2)?\nA) 3\nB) 15\nC) −1\nD) 11\nCorrect answer: B\nI picked: C']

const CASES = [
  { name: '6th grade (level set)', title: '6th Grade Math Practice Quiz', level: '6th-8th', topic: 'Help my 6th grader practice math', qs: SIXTH },
  { name: '6th grade (level blank)', title: '6th Grade Math Practice Quiz', level: 'general', topic: 'Help my 6th grader study math', qs: SIXTH },
  { name: '11th grade', title: 'Algebra 2: Functions Quiz', level: '11th', topic: 'Functions', qs: ELEVENTH },
]

function stats(text: string) {
  const plain = text.replace(/\$\$[^$]*\$\$/g, 'x').replace(/[#*_`>]/g, '')
  const words = plain.match(/[A-Za-z0-9'’.,-]+/g)?.filter((w) => /[A-Za-z0-9]/.test(w)) ?? []
  const sentences = Math.max(1, plain.split(/[.!?]+\s|\n+/).filter((s) => s.trim().split(/\s+/).length > 2).length)
  const syl = (w: string) => Math.max(1, (w.toLowerCase().replace(/[^a-z]/g, '').replace(/e$/, '').match(/[aeiouy]+/g) ?? []).length)
  const syllables = words.reduce((n, w) => n + syl(w), 0)
  const fk = 0.39 * (words.length / sentences) + 11.8 * (syllables / Math.max(1, words.length)) - 15.59
  return { words: words.length, perSentence: words.length / sentences, fk }
}

const client = new Anthropic()
async function ask(system: string, q: string) {
  const m = await client.beta.messages.create({ model: 'claude-opus-5-5', max_tokens: 4000, thinking: { type: 'adaptive' }, output_config: { effort: 'low' }, system, messages: [{ role: 'user', content: q }] } as any)
  return (m.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('')
}

async function main() {
  const runs = Number(process.argv[2] ?? 1)
  let sample = ''
  for (const c of CASES) {
    const oldLevel = c.level !== 'general' ? c.level : 'high school or early college'
    const oldSys = `You are a patient tutor inside a study app. A student at the ${oldLevel} level is studying the guide "${c.title}" (mathematics) and asked for help with part of it.\n${OLD_RULES}`
    const newSys = `You are a patient tutor inside a study app. A student is studying the guide "${c.title}" (mathematics) and asked for help with part of it.\n${explainAudience(c.level, `${c.title}\n${c.topic}`)}\n${EXPLAIN_RULES}`
    for (const [label, sys] of [['old', oldSys], ['new', newSys]] as const) {
      const all = await Promise.all(Array.from({ length: runs }).flatMap(() => c.qs.map((q) => ask(sys, q))))
      const s = all.map(stats)
      const avg = (k: 'words' | 'perSentence' | 'fk') => (s.reduce((n, x) => n + x[k], 0) / s.length).toFixed(1)
      console.log(`${c.name.padEnd(24)} ${label}: ${avg('words')} words, ${avg('perSentence')} words/sentence, reading grade ${avg('fk')}`)
      if (c.name === '6th grade (level blank)') sample += `\n----- ${label} -----\n${all[0]}\n`
    }
  }
  console.log(sample)
}
main()
