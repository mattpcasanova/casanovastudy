// Rescores the AP Chem Unit 3 adaptive practice for the two questions that were
// keyed wrong until 2026-11-10 (see scripts/fix-apchem-gas-keys.ts). Dry run
// unless --apply. Scores only ever go up:
//   a44  had no correct option at all (the answer, 0.600 atm, was not offered):
//        everyone who answered it gets it right.
//   a46  was keyed to A (0.410 atm) when B (0.615 atm) is right: B now counts as
//        right, and A keeps its credit (the student answered what the key said).
// For each student the corrected answers are replayed through the same scoring
// the app uses; their saved run is corrected, and any counted attempt whose
// topics-mastered score improves is raised. Nothing is lowered or deleted.
//   npx tsx --env-file=.env.local scripts/rescore-apchem-gas.ts [--apply]
import { createClient } from '@supabase/supabase-js'
import { parseAdaptive } from '@/lib/adaptive/format'
import { conceptProgress, gradedRules, sessionSummary, withOutOfQuestions, type AdaptiveAnswer, type AdaptiveSettings } from '@/lib/adaptive/engine'

const GUIDE = 'd5cee923-2202-4b7f-81fd-52b65c245cda'
const apply = process.argv.includes('--apply')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

/** The fair result for one saved answer (null = leave it as it was). */
function corrected(a: AdaptiveAnswer): boolean | null {
  if (a.q === 'a44') return true
  if (a.q === 'a46' && (a.given === '1' || a.given === '0')) return true
  return null
}

async function main() {
  const { data: guideRow } = await sb.from('study_guides').select('content, title').eq('id', GUIDE).single()
  if (!guideRow) throw new Error('Guide not found')
  const guide = parseAdaptive(guideRow.content as string)
  const { data: assignments } = await sb.from('practice_assignments').select('id, title, grading, mastery_pct, questions_per_concept, explain_questions').eq('study_guide_id', GUIDE)
  const settingsOf = new Map<string, AdaptiveSettings>((assignments ?? []).map((a) => [a.id as string, { masteryPct: a.mastery_pct, perConcept: a.questions_per_concept, explain: a.explain_questions } as AdaptiveSettings]))
  const ids = (assignments ?? []).map((a) => a.id as string)
  const { data: links } = await sb.from('practice_assignment_students').select('assignment_id, roster_id').in('assignment_id', ids)
  const rosterIds = [...new Set((links ?? []).map((l) => l.roster_id as string))]
  const { data: roster } = await sb.from('class_roster').select('id, first_name, last_name, student_user_id').in('id', rosterIds)
  const { data: runs } = await sb.from('study_progress').select('user_id, data').eq('study_guide_id', GUIDE).eq('kind', 'adaptive')
  const { data: attempts } = await sb.from('practice_attempts').select('id, assignment_id, roster_id, student_user_id, correct, total, pct, detail, counted, finished_at').in('assignment_id', ids)

  const score = (answers: AdaptiveAnswer[], settings?: AdaptiveSettings) => {
    const rules = gradedRules(settings)
    // A topic with no unanswered question left is judged on what was answered, as the app does when it finishes a graded run.
    const answered = new Set(answers.map((a) => a.q))
    const empty = guide.concepts.filter((c) => guide.questions.filter((q) => q.conceptId === c.id && q.type !== 'explain').every((q) => answered.has(q.id))).map((c) => c.id)
    const progress = withOutOfQuestions(conceptProgress(guide, answers, rules), empty, rules)
    return { mastered: progress.filter((p) => p.status === 'mastered').map((p) => p.name), notMastered: progress.filter((p) => p.status !== 'mastered').map((p) => p.name), total: sessionSummary(guide, answers, rules).total }
  }

  let changedRuns = 0, raised = 0, touched = 0
  for (const r of roster ?? []) {
    if (!r.student_user_id) continue
    const run = (runs ?? []).find((x) => x.user_id === r.student_user_id)
    const answers = ((run?.data as { answers?: AdaptiveAnswer[] } | null)?.answers ?? []) as AdaptiveAnswer[]
    const hit = answers.filter((a) => a.q === 'a44' || a.q === 'a46')
    if (!hit.length) continue
    touched++
    const fixed = answers.map((a) => { const c = corrected(a); return c === null || a.correct === c ? a : { ...a, correct: c } })
    const flips = fixed.filter((a, i) => a.correct !== answers[i].correct)
    const name = `${r.first_name ?? ''} ${r.last_name ?? ''}`.trim()
    const mine = (attempts ?? []).filter((t) => t.roster_id === r.id)
    const assignmentId = mine[0]?.assignment_id ?? (links ?? []).find((l) => l.roster_id === r.id)?.assignment_id
    const settings = settingsOf.get(assignmentId as string)
    const before = score(answers, settings), after = score(fixed, settings)
    console.log(`\n${name}: answered ${hit.map((a) => `${a.q} (picked ${'ABCD'[Number(a.given)] ?? a.given}, was marked ${a.correct ? 'right' : 'wrong'})`).join(', ')}`)
    console.log(`  topics mastered from their saved answers: ${before.mastered.length} of ${before.total} -> ${after.mastered.length} of ${after.total}${after.mastered.length > before.mastered.length ? `  (+ ${after.mastered.filter((m) => !before.mastered.includes(m)).join(', ')})` : ''}`)
    if (flips.length) {
      changedRuns++
      if (apply && run) {
        const { error } = await sb.from('study_progress').update({ data: { ...(run.data as object), answers: fixed } }).eq('user_id', r.student_user_id).eq('study_guide_id', GUIDE).eq('kind', 'adaptive')
        if (error) throw new Error(error.message)
      }
    }
    for (const t of mine.filter((x) => x.counted)) {
      const now = Number(t.correct)
      // Only ever raise, and only when the correction itself adds a topic. (The saved answers are the student's
      // latest state, so an earlier attempt can sit below them for reasons that have nothing to do with these two questions.)
      if (after.mastered.length <= before.mastered.length || after.mastered.length <= now || after.total !== Number(t.total)) { console.log(`  attempt of ${String(t.finished_at).slice(0, 10)}: ${now} of ${t.total} stays`); continue }
      raised++
      const pct = Math.round((after.mastered.length / after.total) * 1000) / 10
      console.log(`  attempt of ${String(t.finished_at).slice(0, 10)}: ${now} of ${t.total} (${Number(t.pct)}%) -> ${after.mastered.length} of ${after.total} (${pct}%)`)
      if (apply) {
        const detail = { ...((t.detail as object) ?? {}), mastered: after.mastered, notMastered: after.notMastered, rescored: { at: new Date().toISOString(), reason: 'Two gas-law questions were keyed wrong', was: { correct: now, pct: Number(t.pct) } } }
        const { error } = await sb.from('practice_attempts').update({ correct: after.mastered.length, pct, detail }).eq('id', t.id)
        if (error) throw new Error(error.message)
      }
    }
    if (!mine.some((x) => x.counted)) console.log('  nothing turned in yet: their saved answers are corrected, so the score will be right when they finish')
  }
  console.log(`\n${touched} students answered one of the two questions; ${changedRuns} saved runs ${apply ? 'corrected' : 'would be corrected'}; ${raised} turned-in score${raised === 1 ? '' : 's'} ${apply ? 'raised' : 'would go up'}.${apply ? '' : ' Dry run: nothing was changed.'}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
