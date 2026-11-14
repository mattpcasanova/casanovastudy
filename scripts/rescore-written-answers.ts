// Checks the written answers of an assigned quiz again with the current checker and raises the
// scores that come out higher. Dry run by default.
//   npx tsx --env-file=.env.local scripts/rescore-written-answers.ts "<assignment title>" [--apply] [--out file.md]
// Rule: scores only go up. Each written answer keeps the better of what it earned then and what it
// earns now (answers saved before 2026-11-14 were cut at 300 characters, so a long answer can read
// worse now than it did then). Multiple choice and other items are not touched. Attempts on a new
// version of the questions have no saved answers and are skipped. The teacher's saved class report
// for the assignment goes stale and offers "Update with the new answers".
import { createClient } from '@supabase/supabase-js'
import { writeFileSync } from 'fs'
import { parseQuizContent } from '@/lib/formats/quiz'
import { shortAnswerPoints } from '@/lib/formats/short-answer'
import { ClaudeService } from '@/lib/claude-api'

const title = process.argv[2]
if (!title || title.startsWith('--')) { console.error('Give the assignment title.'); process.exit(1) }
const APPLY = process.argv.includes('--apply')
const outAt = process.argv.indexOf('--out')
const outFile = outAt > 0 ? process.argv[outAt + 1] : undefined
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const claude = new ClaudeService()

type Answer = { id: string; correct: boolean; given?: string; score?: number }
const pointsOf = (a: Answer) => (a.correct ? 1 : typeof a.score === 'number' ? a.score : 0)
const round2 = (n: number) => Math.round(n * 100) / 100

async function main() {
  const { data: assignments, error } = await sb.from('practice_assignments').select('id, title, study_guide_id, class_id, classroom_synced_at').ilike('title', title)
  if (error) throw new Error(error.message)
  if (!assignments?.length) throw new Error(`No assignment titled "${title}"`)
  const lines: string[] = []
  let attemptsSeen = 0, attemptsRaised = 0, answersChecked = 0, answersRaised = 0
  for (const a of assignments) {
    const [{ data: guide }, { data: cls }, { data: attempts }] = await Promise.all([
      sb.from('study_guides').select('format, subject, content').eq('id', a.study_guide_id).maybeSingle(),
      sb.from('classes').select('name, period').eq('id', a.class_id).maybeSingle(),
      sb.from('practice_attempts').select('id, roster_id, correct, total, pct, counted, detail').eq('assignment_id', a.id).order('finished_at'),
    ])
    if (!guide || guide.format !== 'quiz') { console.log(`${a.id}: not a quiz, skipped`); continue }
    const written = new Map(parseQuizContent(guide.content ?? '').filter((q) => q.type === 'sa').map((q) => [`q:${q.id}`, q]))
    const rosterIds = [...new Set((attempts ?? []).map((t) => t.roster_id))]
    const { data: roster } = rosterIds.length ? await sb.from('class_roster').select('id, first_name, last_name').in('id', rosterIds) : { data: [] }
    const nameOf = new Map((roster ?? []).map((r) => [r.id, `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()]))
    lines.push(`## ${cls?.name ?? 'Class'}${cls?.period ? ` P${cls.period}` : ''}: ${attempts?.length ?? 0} attempts${a.classroom_synced_at ? ' (grades were sent to Google Classroom: send them again after applying)' : ''}`)

    for (const t of attempts ?? []) {
      const detail = (t.detail ?? {}) as { answers?: Answer[]; version?: number }
      if (!Array.isArray(detail.answers) || detail.version) continue
      attemptsSeen++
      let gained = 0
      const notes: string[] = []
      const answers = await Promise.all(detail.answers.map(async (ans) => {
        const q = written.get(ans.id)
        if (!q || q.type !== 'sa' || !ans.given?.trim() || ans.correct) return ans
        answersChecked++
        let now = 0
        try {
          const r = await claude.gradeShortAnswer({ question: [q.passage, q.question].filter(Boolean).join('\n'), sampleAnswer: q.sampleAnswer, studentAnswer: ans.given, subject: guide.subject })
          now = shortAnswerPoints(r.score)
        } catch (e) { notes.push(`  ${ans.id}: could not be checked (${(e as Error).message.slice(0, 60)})`); return ans }
        const before = pointsOf(ans)
        if (now <= before) return ans
        answersRaised++
        gained += now - before
        notes.push(`  ${ans.id}: ${before} → ${now} · "${ans.given.replace(/\s+/g, ' ').slice(0, 110)}"`)
        const { score: _old, ...rest } = ans
        void _old
        return now === 1 ? { ...rest, correct: true } : { ...rest, correct: false, score: round2(now) }
      }))
      if (gained <= 0) continue
      attemptsRaised++
      const correct = round2(Math.min(Number(t.total), Number(t.correct) + gained))
      const pct = round2((correct / Number(t.total)) * 100)
      lines.push(`- ${nameOf.get(t.roster_id) ?? t.roster_id.slice(0, 8)}${t.counted ? '' : ' (attempt not counted)'}: ${t.correct}/${t.total} (${Math.round(Number(t.pct))}%) → ${correct}/${t.total} (${Math.round(pct)}%)`, ...notes)
      if (APPLY) {
        const { error: upErr } = await sb.from('practice_attempts').update({ correct, pct, detail: { ...detail, answers, rescored: new Date().toISOString().slice(0, 10) } }).eq('id', t.id)
        if (upErr) throw new Error(`Update failed for ${t.id}: ${upErr.message}`)
      }
    }
  }
  const head = `${APPLY ? 'APPLIED' : 'DRY RUN (nothing saved)'}: ${attemptsSeen} attempts with saved answers, ${answersChecked} written answers checked again, ${answersRaised} raised, ${attemptsRaised} attempts with a higher score.`
  if (outFile) writeFileSync(outFile, [head, '', ...lines].join('\n'))
  console.log(head)
  if (!outFile) console.log(lines.join('\n'))
}
main().catch((e) => { console.error(e.message); process.exit(1) })
