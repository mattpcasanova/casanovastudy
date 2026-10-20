// Teacher agreement with the AI's marks, for the pitch and for tuning the
// grader (service role; run locally). Counts reports graded since migration 065
// that a teacher checked (edited, or Edit then Done). See lib/grading/agreement.ts.
//
//   npx tsx --env-file=.env.local scripts/agreement.ts                 # everyone
//   npx tsx --env-file=.env.local scripts/agreement.ts --teacher someone@school.org
//   npx tsx --env-file=.env.local scripts/agreement.ts --since 2026-11-01 --changes 20
//
// --changes N lists the N biggest per-question changes (question, AI mark,
// teacher mark), which shows where the grader needs work. No student names.

import { createClient } from '@supabase/supabase-js'
import { agreement, share, type Agreement, type MarkRow } from '../lib/grading/agreement'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } })
const args = process.argv.slice(2)
const flag = (n: string) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : undefined }

type Row = { id: string; user_id: string; batch_id: string | null; group_id: string | null; exam_title: string | null; created_at: string; ai_breakdown: MarkRow[]; grade_breakdown: MarkRow[] | null }

function line(label: string, a: Agreement) {
  if (!a.questions) return console.log(`${label}: no checked reports yet`)
  console.log(`${label}: ${a.papers} reports, ${a.questions} question marks | kept ${share(a.questionsKept, a.questions)}% | within 1 mark ${share(a.questionsWithin1, a.questions)}% | totals unchanged ${share(a.papersUnchanged, a.papers)}% | avg score change ${a.meanTotalShift.toFixed(1)} pts | net ${a.netShift >= 0 ? '+' : ''}${a.netShift.toFixed(1)}%`)
}

async function main() {
  let teacherId: string | undefined
  const teacher = flag('teacher')
  if (teacher) {
    const { data } = await supabase.from('user_profiles').select('id').ilike('email', teacher).maybeSingle()
    if (!data) throw new Error(`No account with email ${teacher}`)
    teacherId = data.id
  }
  const rows: Row[] = []
  for (let from = 0; ; from += 1000) {
    let q = supabase.from('grading_results').select('id, user_id, batch_id, group_id, exam_title, created_at, ai_breakdown, grade_breakdown')
      .not('reviewed_at', 'is', null).not('ai_breakdown', 'is', null).order('created_at').range(from, from + 999)
    if (teacherId) q = q.eq('user_id', teacherId)
    if (flag('since')) q = q.gte('created_at', flag('since')!)
    const { data, error } = await q
    if (error) throw error
    rows.push(...((data ?? []) as Row[]))
    if (!data || data.length < 1000) break
  }
  const papers = (rs: Row[]) => rs.map((r) => ({ ai: r.ai_breakdown ?? [], final: r.grade_breakdown ?? [], groupId: r.group_id }))

  line('\nAll checked reports', agreement(papers(rows)))

  const teachers = [...new Set(rows.map((r) => r.user_id))]
  if (teachers.length > 1 || !teacherId) {
    const { data: profiles } = await supabase.from('user_profiles').select('id, email').in('id', teachers.length ? teachers : ['00000000-0000-0000-0000-000000000000'])
    console.log('\nBy teacher')
    for (const id of teachers) line(`  ${profiles?.find((p) => p.id === id)?.email ?? id}`, agreement(papers(rows.filter((r) => r.user_id === id))))
  }

  const sets = new Map<string, Row[]>()
  for (const r of rows) { const k = r.batch_id ?? `single:${r.id}`; sets.set(k, [...(sets.get(k) ?? []), r]) }
  console.log('\nBy class set')
  for (const rs of [...sets.values()].sort((a, b) => b.length - a.length).slice(0, 25)) line(`  ${rs[0].exam_title ?? 'Untitled'} (${rs[0].created_at.slice(0, 10)})`, agreement(papers(rs)))

  const n = Number(flag('changes') ?? 10)
  const changes: Array<{ title: string; q: string; ai: number; teacher: number | null; possible: number }> = []
  for (const r of rows) {
    const finals = new Map((r.grade_breakdown ?? []).map((q) => [q.questionNumber.trim().toLowerCase(), q]))
    for (const q of r.ai_breakdown ?? []) {
      const f = finals.get(q.questionNumber.trim().toLowerCase())
      if (f && Math.abs(Number(f.marksAwarded) - Number(q.marksAwarded)) < 1e-9) continue
      changes.push({ title: r.exam_title ?? 'Untitled', q: q.questionNumber, ai: Number(q.marksAwarded), teacher: f ? Number(f.marksAwarded) : null, possible: Number(q.marksPossible) })
    }
  }
  if (changes.length && n > 0) {
    console.log(`\nBiggest changes (${Math.min(n, changes.length)} of ${changes.length})`)
    for (const c of changes.sort((a, b) => Math.abs((b.teacher ?? 0) - b.ai) - Math.abs((a.teacher ?? 0) - a.ai)).slice(0, n)) {
      console.log(`  ${c.title} · Q${c.q}: AI ${c.ai}/${c.possible} → teacher ${c.teacher ?? 'removed'}`)
    }
  }
}

main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
