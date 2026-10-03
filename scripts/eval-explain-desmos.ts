// Times "Solve it in Desmos" answers from the Explain panel: time to first
// text, total time, thinking vs text tokens, and whether the ```desmos block
// closed. Live API calls (~$0.02 each).
//   npx tsx --env-file=.env.local scripts/eval-explain-desmos.ts [runs] [effort]
import Anthropic from '@anthropic-ai/sdk'
import { readFileSync } from 'node:fs'
import { EXPLAIN_RULES as rules } from '../lib/claude-api'

const intro = readFileSync('components/explain/asks.ts', 'utf8').match(/DESMOS_INTRO = '([^']+)'/)?.[1] ?? 'Solve it in Desmos:'

const QUESTIONS = [
  `${intro}\nThe function f is defined by f(x) = x^2 - 6x + 5. For what value of x does f reach its minimum?\nA) 1\nB) 3\nC) 5\nD) -4\nCorrect answer: B) 3`,
  `${intro}\ny = 2x + 7 and 3x - y = 4. What is the x-coordinate of the solution (x, y) to the system?\nA) 3\nB) 7\nC) 11\nD) 25\nCorrect answer: C) 11`,
  `${intro}\nThe table shows (1, 3), (2, 7), (3, 11), (4, 15). Which linear function models the data?\nA) y = 4x - 1\nB) y = 3x\nC) y = 4x + 3\nD) y = 2x + 1\nCorrect answer: A) y = 4x - 1`,
]

const runs = Number(process.argv[2] ?? 1)
const effort = process.argv[3] ?? 'low'
const client = new Anthropic()
const system = `You are a patient tutor inside a study app. A student at the 11th level is studying the guide "SAT Math: Algebra and Functions" (mathematics) and asked for help with part of it.\n${rules}`

async function main() {
for (let r = 0; r < runs; r++) {
  for (const [i, q] of QUESTIONS.entries()) {
    const t0 = Date.now()
    let first = 0, text = ''
    const stream = client.beta.messages.stream({
      model: 'claude-opus-5-5', max_tokens: 4000, thinking: { type: 'adaptive' }, output_config: { effort },
      system, messages: [{ role: 'user', content: q }],
    } as any)
    for await (const c of stream as any) {
      if (c.type === 'content_block_delta' && c.delta.type === 'text_delta') { if (!first) first = Date.now(); text += c.delta.text }
    }
    const m = await stream.finalMessage()
    const block = text.split('```desmos')[1]
    const closed = !!block && block.includes('```')
    console.log(`q${i + 1}: first text ${((first - t0) / 1000).toFixed(1)}s, total ${((Date.now() - t0) / 1000).toFixed(1)}s, out ${m.usage.output_tokens} tok, text ${text.length} chars, stop ${m.stop_reason}, desmos block ${block ? (closed ? 'ok' : 'UNCLOSED') : 'MISSING'}`)
  }
}
}

main()
