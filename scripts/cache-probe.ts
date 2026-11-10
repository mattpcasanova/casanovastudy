// Does the shared part of the guide rules get read from cache? Generates three
// short guides in a row with different settings and prints each one's cache
// meters. The second and third must READ the shared prefix; exits non-zero if
// they don't. Costs about $0.15 (three short guides). Run after any change to
// how the guide prompt is put together.
//   npx tsx --env-file=.env.local scripts/cache-probe.ts
import { ClaudeService } from '../lib/claude-api'

const CASES = [
  { format: 'quiz', subject: 'history', studyRequest: 'Causes of World War I', difficultyLevel: 'standard' },
  { format: 'outline', subject: 'science', studyRequest: 'AP Chemistry: acid-base titrations', difficultyLevel: 'standard' },
  { format: 'flashcards', subject: 'english', studyRequest: 'Parts of speech', difficultyLevel: 'hard' },
] as const

async function main() {
  const svc = new ClaudeService()
  const quiet = console.log
  let failed = false
  for (const [i, c] of CASES.entries()) {
    console.log = () => {} // the generator logs its own progress
    const gen = svc.generateStudyGuideStream({ content: '', subject: c.subject, gradeLevel: '10th', format: c.format, studyRequest: c.studyRequest, length: 'short', difficultyLevel: c.difficultyLevel, sourcePolicy: 'expand' } as never)
    let step = await gen.next()
    while (!step.done) step = await gen.next()
    console.log = quiet
    const u = step.value.usage as { input_tokens: number; output_tokens: number; cache_read_input_tokens: number; cache_creation_input_tokens: number }
    const ok = i === 0 ? u.cache_read_input_tokens + u.cache_creation_input_tokens > 0 : u.cache_read_input_tokens > 0
    if (!ok) failed = true
    console.log(`${String(i + 1)}. ${c.format.padEnd(10)} uncached in ${String(u.input_tokens).padStart(5)}  cache written ${String(u.cache_creation_input_tokens).padStart(5)}  cache read ${String(u.cache_read_input_tokens).padStart(5)}  out ${String(u.output_tokens).padStart(5)}  ${ok ? 'ok' : 'NOT CACHED'}`)
  }
  if (failed) { console.error('The shared prefix was not read from cache: something in it changes between guides, or it is under the minimum cacheable size.'); process.exit(1) }
}
main().catch((e) => { console.error(e); process.exit(1) })
