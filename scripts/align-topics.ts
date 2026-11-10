// Lines up saved class reports of the same test across periods: every later
// period takes the first period's topic names and question placement
// (applyTopicMap; no model call). New reports do this themselves; this is for
// reports written before 2026-11-09. Dry run unless --apply. Sets with a saved
// reteach plan are skipped (the plan names its focus topics).
//   npx tsx --env-file=.env.local scripts/align-topics.ts [--teacher <email or profile id>] [--apply]
import { createClient } from '@supabase/supabase-js'
import { applyTopicMap, questionStats, type ClassInsightsAI, type PaperForInsights } from '@/lib/grading/insights'
import { sharedTopicsFor } from '@/lib/grading/topic-map-server'
import { stillMarking } from '@/lib/grading/mark-points'
import { standardCodes } from '@/lib/standards'

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined }
const apply = process.argv.includes('--apply')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

async function main() {
  let teacherId: string | undefined
  if (arg('teacher')) {
    // An email, or the profile id itself.
    const { data } = await sb.from('user_profiles').select('id').eq(arg('teacher')!.includes('@') ? 'email' : 'id', arg('teacher')!).maybeSingle()
    if (!data) throw new Error('No such teacher')
    teacherId = data.id
  }
  let q = sb.from('grading_batch_insights').select('batch_id, user_id, data, created_at').order('created_at', { ascending: true }).limit(2000)
  if (teacherId) q = q.eq('user_id', teacherId)
  const { data: reports, error } = await q
  if (error) throw new Error(error.message)
  const { data: plans } = await sb.from('reteach_plans').select('batch_id')
  const hasPlan = new Set((plans ?? []).map((p) => p.batch_id as string))
  let changed = 0, same = 0, alone = 0, skipped = 0
  for (const r of reports ?? []) {
    const { data: rows } = await sb.from('grading_results').select('id, student_name, grade_breakdown, exam_title, class_id, total_possible_marks, created_at').order('created_at', { ascending: true }).eq('batch_id', r.batch_id).eq('user_id', r.user_id)
    if (!rows?.length) continue
    const { data: setup } = await sb.from('grading_batches').select('standards').eq('batch_id', r.batch_id).maybeSingle()
    if (standardCodes(setup?.standards).length >= 2) continue
    const papers: PaperForInsights[] = rows.filter((x) => !stillMarking(x.grade_breakdown)).map((x) => ({ id: x.id, name: x.student_name ?? '', breakdown: Array.isArray(x.grade_breakdown) ? x.grade_breakdown : [] }))
    const labels = questionStats(papers).map((s) => s.label)
    const classId = rows.find((x) => x.class_id)?.class_id ?? null
    const shared = await sharedTopicsFor(sb, r.user_id, { batchId: r.batch_id, classId, examTitle: rows[0].exam_title, possible: Number(rows[0].total_possible_marks) || null, labels, gradedAt: rows[0].created_at, before: r.created_at })
    if (!shared) { alone++; continue }
    const own = (r.data as ClassInsightsAI).topics ?? []
    const next = applyTopicMap(own, shared, labels)
    if (JSON.stringify(next) === JSON.stringify(own)) { same++; continue }
    if (hasPlan.has(r.batch_id)) { skipped++; console.log(`\nSKIPPED (has a reteach plan) ${rows[0].exam_title} ${r.batch_id}`); continue }
    changed++
    console.log(`\n${rows[0].exam_title}  ${r.batch_id}  (${labels.length} questions)`)
    console.log(`  was: ${own.map((t) => `${t.name} [${t.questions.length}]`).join(' | ')}`)
    console.log(`  now: ${next.map((t) => `${t.name} [${t.questions.length}]`).join(' | ')}`)
    if (apply) {
      const { error: e } = await sb.from('grading_batch_insights').update({ data: { ...(r.data as object), topics: next } }).eq('batch_id', r.batch_id).eq('user_id', r.user_id)
      if (e) console.log('  FAILED', e.message)
    }
  }
  console.log(`\n${changed} report${changed === 1 ? '' : 's'} ${apply ? 'realigned' : 'would change'}, ${same} already match, ${alone} have no earlier report of the same test, ${skipped} skipped${apply ? '' : ' (dry run)'}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
