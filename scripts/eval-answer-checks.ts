// Replays real student answers through the two answer checks and prints what they decide. Saves nothing.
//   npx tsx --env-file=.env.local scripts/eval-answer-checks.ts <outDir> [--sa N] [--fill N] [--model claude-haiku-4-5]
// Short answers: every assigned-quiz written answer teachers' students turned in (question, model answer,
// what they wrote, how it was marked then) is checked again; the output lists the old verdict beside the new
// score so the ones that flip can be read. Fill-ins: every blank that was marked wrong goes through the new
// letter check and, when that still says no and the answer is a word, the meaning check.
// The output holds student answers (no names): keep <outDir> out of the repo.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'
import { parsePractice, isBlankCorrect, isExactBlank } from '@/lib/formats/practice'
import { parseQuizContent } from '@/lib/formats/quiz'
import { shortAnswerVerdict } from '@/lib/formats/short-answer'
import { ClaudeService } from '@/lib/claude-api'

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined }
const out = process.argv[2]
if (!out || out.startsWith('--')) { console.error('Give an output folder.'); process.exit(1) }
const saMax = Number(arg('sa') ?? 60), fillMax = Number(arg('fill') ?? 80), model = arg('model')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const claude = new ClaudeService()

async function pool<T, R>(items: T[], size: number, run: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let next = 0
  await Promise.all(Array.from({ length: size }, async () => { while (next < items.length) { const i = next++; results[i] = await run(items[i]) } }))
  return results
}

async function main() {
  mkdirSync(out, { recursive: true })
  type Row = { id: string; assignment_id: string; detail: { answers?: Array<{ id: string; correct: boolean; given?: string }>; version?: number } | null }
  const attempts: Row[] = []
  for (let from = 0; ; from += 500) {
    const { data, error } = await sb.from('practice_attempts').select('id, assignment_id, detail').order('finished_at', { ascending: false }).range(from, from + 499)
    if (error) throw new Error(error.message)
    attempts.push(...((data ?? []) as Row[]))
    if (!data || data.length < 500) break
  }
  const guideOf = new Map<string, string>()
  const aIds = [...new Set(attempts.map((a) => a.assignment_id))]
  for (let i = 0; i < aIds.length; i += 100) {
    const { data } = await sb.from('practice_assignments').select('id, study_guide_id').in('id', aIds.slice(i, i + 100))
    for (const r of data ?? []) guideOf.set(r.id, r.study_guide_id)
  }
  const guides = new Map<string, { format: string; subject: string | null; content: string | null }>()
  const gIds = [...new Set(guideOf.values())]
  for (let i = 0; i < gIds.length; i += 50) {
    const { data } = await sb.from('study_guides').select('id, format, subject, content').in('id', gIds.slice(i, i + 50))
    for (const r of data ?? []) guides.set(r.id, r)
  }

  const sas: Array<{ subject: string | null; question: string; sample: string; given: string; was: boolean }> = []
  const fills: Array<{ subject: string | null; sentence: string; answers: string[]; given: string }> = []
  let fillSeen = 0
  for (const a of attempts) {
    const g = guides.get(guideOf.get(a.assignment_id) ?? '')
    const answers = a.detail?.answers
    if (!g || !Array.isArray(answers) || a.detail?.version) continue
    if (g.format === 'practice') {
      const acts = new Map(parsePractice(g.content ?? '').map((x) => [x.id, x]))
      for (const ans of answers) {
        const act = acts.get(String(ans.id).replace(/^p:/, ''))
        if (!act || act.kind !== 'fill' || typeof ans.given !== 'string') continue
        fillSeen++
        if (ans.correct === true) continue
        const blanks = act.parts.filter((p): p is { answers: string[] } => typeof p !== 'string')
        const given = ans.given.split(' / ')
        blanks.forEach((b, k) => {
          if (!given[k]?.trim()) return
          let n = -1
          const sentence = act.parts.map((p) => (typeof p === 'string' ? p : ++n === k ? '_____' : p.answers[0])).join('')
          fills.push({ subject: g.subject, sentence, answers: b.answers, given: given[k] })
        })
      }
    } else if (g.format === 'quiz') {
      const qs = new Map(parseQuizContent(g.content ?? '').map((q) => [q.id, q]))
      for (const ans of answers) {
        const q = qs.get(String(ans.id).replace(/^q:/, ''))
        if (!q || q.type !== 'sa' || typeof ans.given !== 'string' || !ans.given.trim()) continue
        sas.push({ subject: g.subject, question: [q.passage, q.question].filter(Boolean).join('\n'), sample: q.sampleAnswer, given: ans.given, was: ans.correct })
      }
    }
  }

  // Fill-ins
  const letter = fills.filter((f) => isBlankCorrect(f.given, f.answers))
  const still = fills.filter((f) => !isBlankCorrect(f.given, f.answers))
  const askable = still.filter((f) => !isExactBlank(f.answers) && f.given.trim().length <= 80).slice(0, fillMax)
  const meaning = await pool(askable, 6, async (f) => {
    try { return (await claude.checkBlanks({ sentence: f.sentence, blanks: [{ answers: f.answers, given: f.given }], subject: f.subject, ...(model ? { model } : {}) }))[0] } catch (e) { return `error: ${(e as Error).message}` }
  })
  const fillLines = [
    `Fill-in answers seen: ${fillSeen}. Blanks marked wrong then: ${fills.length}. Now right by the letter check: ${letter.length}. Sent to the meaning check: ${askable.length}, accepted: ${meaning.filter((m) => m === true).length}.`,
    '', '## Now right by the letter check', ...letter.map((f) => `- "${f.given}" for ${JSON.stringify(f.answers)}`),
    '', '## Meaning check', ...askable.map((f, i) => `- ${meaning[i] === true ? 'RIGHT' : meaning[i] === false ? 'wrong' : meaning[i]} · "${f.given}" for ${JSON.stringify(f.answers)} · ${f.sentence.slice(0, 160)}`),
  ]
  writeFileSync(`${out}/fills.md`, fillLines.join('\n'))
  console.log(fillLines[0])

  // Short answers
  const sample = sas.slice(0, saMax)
  const graded = await pool(sample, 6, async (s) => {
    try { return await claude.gradeShortAnswer({ question: s.question, sampleAnswer: s.sample, studentAnswer: s.given, subject: s.subject, ...(model ? { model } : {}) }) } catch (e) { return { score: -1, feedback: `error: ${(e as Error).message}`, isCorrect: false } }
  })
  const ok = graded.filter((g) => g.score >= 0)
  const count = (v: string) => ok.filter((g) => shortAnswerVerdict(g.score) === v).length
  const head = `Written answers checked: ${sample.length} (of ${sas.length}). Marked right then: ${sample.filter((s) => s.was).length}. Now correct: ${count('correct')}, partly right: ${count('partly')}, not yet: ${count('not_yet')}. Mean score ${(ok.reduce((n, g) => n + g.score, 0) / (ok.length || 1)).toFixed(0)}. Right then but not now: ${sample.filter((s, i) => s.was && !graded[i].isCorrect).length}.`
  const saLines = [head, '', ...sample.map((s, i) => `### ${s.was ? 'was right' : 'was wrong'} → ${graded[i].score} (${graded[i].score < 0 ? 'error' : shortAnswerVerdict(graded[i].score)})\nQ: ${s.question.slice(0, 300)}\nStudent: ${s.given}\nFeedback: ${graded[i].feedback}\n`)]
  writeFileSync(`${out}/short-answers.md`, saLines.join('\n'))
  console.log(head)
}
main()
