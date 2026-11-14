// Measures the paper grader against the marks teachers settled on. Saves nothing to the database.
//   EVAL_GRADER_RULE=off    npx tsx --env-file=.env.local scripts/eval-grader-credit.ts <outDir> [--papers 10] [--repeats 2]
//   EVAL_GRADER_RULE=credit npx tsx --env-file=.env.local scripts/eval-grader-credit.ts <outDir> [--papers 10] [--repeats 2]
//   npx tsx scripts/eval-grader-credit.ts <outDir> --compare
// Papers: reports a teacher checked (reviewed_at) that still have their pages and their set's answer key,
// most of them ones where the teacher changed a mark, spread over sets. Each is graded again `repeats` times
// with the rule named in EVAL_GRADER_RULE; per question the new mark is compared with the teacher's final mark
// (grade_breakdown) and with the other run. About $0.15-0.30 a grading. <outDir> holds feedback on real
// students' work: keep it out of the repo.
import { createClient } from '@supabase/supabase-js'
import { writeFileSync, readFileSync, mkdirSync, existsSync } from 'fs'
import { gradePaper, type PaperFile } from '../lib/grading/grade-paper'
import { normalizeQuestionKey } from '../lib/grading/parse'
import { fetchUploadedImageBuffers } from '../lib/uploads/server-images'
import { pickUploadRefs, type UploadRef } from '../lib/uploads/refs'

const arg = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i > 0 ? process.argv[i + 1] : undefined }
const out = process.argv[2]
if (!out || out.startsWith('--')) { console.error('Give an output folder.'); process.exit(1) }
const rule = process.env.EVAL_GRADER_RULE ?? 'off'
const PAPERS = Number(arg('papers') ?? 10), REPEATS = Number(arg('repeats') ?? 2)

type Q = { questionNumber: string; marksAwarded: number; marksPossible: number; explanation?: string }
type Saved = { id: string; title: string; teacher: Record<string, number>; ai: Record<string, number>; possible: Record<string, number>; runs: Array<Record<string, number>>; notes: Array<Record<string, string>>; cost: number }
const key = (label: string) => normalizeQuestionKey(String(label).replace(/\s*\(\d+(?:\.\d+)?(?:\s*marks?)?\)\s*$/i, ''))
const marksOf = (list: Q[]) => Object.fromEntries(list.map((q) => [key(q.questionNumber), Number(q.marksAwarded)]))

function compare() {
  const load = (name: string) => JSON.parse(readFileSync(`${out}/${name}.json`, 'utf-8')) as Saved[]
  const lines: string[] = []
  for (const name of ['off', 'credit']) {
    if (!existsSync(`${out}/${name}.json`)) continue
    const papers = load(name)
    let n = 0, same = 0, above = 0, below = 0, net = 0, possible = 0, stable = 0, pairs = 0, cost = 0, gradings = 0
    const spreads: number[] = []
    for (const p of papers) {
      cost += p.cost; gradings += p.runs.length
      for (const run of p.runs) {
        for (const [k, t] of Object.entries(p.teacher)) {
          if (run[k] === undefined) continue
          n++; possible += p.possible[k] ?? 0; net += run[k] - t
          if (run[k] === t) same++; else if (run[k] > t) above++; else below++
        }
      }
      if (p.runs.length > 1) {
        for (const k of Object.keys(p.teacher)) { if (p.runs.every((r) => r[k] !== undefined)) { pairs++; if (p.runs.every((r) => r[k] === p.runs[0][k])) stable++ } }
        const totals = p.runs.map((r) => Object.keys(p.teacher).reduce((sum, k) => sum + (r[k] ?? 0), 0))
        spreads.push(Math.max(...totals) - Math.min(...totals))
      }
    }
    lines.push(`${name}: ${papers.length} papers, ${gradings} gradings, ${n} question marks | same as the teacher ${(100 * same / n).toFixed(1)}% | above ${above}, below ${below} | net ${(100 * net / possible).toFixed(1)}% of marks | same mark in every run ${pairs ? (100 * stable / pairs).toFixed(1) : '-'}% | total swing between runs: mean ${spreads.length ? (spreads.reduce((a, b) => a + b, 0) / spreads.length).toFixed(2) : '-'}, max ${spreads.length ? Math.max(...spreads) : '-'} | $${(cost / gradings).toFixed(3)} a grading`)
  }
  if (existsSync(`${out}/off.json`) && existsSync(`${out}/credit.json`)) {
    const off = load('off'), credit = new Map(load('credit').map((p) => [p.id, p]))
    lines.push('', 'Questions where the two rules differ (teacher | off runs | credit runs):')
    for (const p of off) {
      const c = credit.get(p.id)
      if (!c) continue
      for (const [k, t] of Object.entries(p.teacher)) {
        const a = p.runs.map((r) => r[k]), b = c.runs.map((r) => r[k])
        if (a.join() === b.join()) continue
        lines.push(`- ${p.title.slice(0, 40)} · ${k} (/${p.possible[k]}): teacher ${t} | off ${a.join(', ')} | credit ${b.join(', ')}\n    credit said: ${(c.notes[0]?.[k] ?? '').slice(0, 260)}`)
      }
    }
  }
  writeFileSync(`${out}/compare.md`, lines.join('\n'))
  console.log(lines.slice(0, 3).join('\n'))
}

async function main() {
  if (process.argv.includes('--compare')) return compare()
  mkdirSync(out, { recursive: true })
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const { data: rows, error } = await sb.from('grading_results')
    .select('id, user_id, batch_id, exam_title, page_urls, grade_breakdown, ai_breakdown, group_id, marking_style, created_at')
    .not('reviewed_at', 'is', null).not('ai_breakdown', 'is', null).not('page_urls', 'is', null).not('batch_id', 'is', null)
    .gte('created_at', '2026-10-20').order('created_at', { ascending: false }).limit(500)
  if (error) throw new Error(error.message)
  // The same pick for every rule: papers the teacher changed first, at most two per set, then unchanged ones.
  const changed = (r: { grade_breakdown: Q[]; ai_breakdown: Q[] }) => { const t = marksOf(r.grade_breakdown); return Object.entries(marksOf(r.ai_breakdown)).filter(([k, v]) => t[k] !== undefined && t[k] !== v).length }
  const perBatch = new Map<string, number>()
  const take = (list: typeof rows, n: number) => {
    const picked: NonNullable<typeof rows> = []
    for (const r of list ?? []) {
      const pages = Array.isArray(r.page_urls) ? r.page_urls.length : 0
      if (picked.length >= n || pages < 1 || pages > 12 || (perBatch.get(r.batch_id) ?? 0) >= 2) continue
      perBatch.set(r.batch_id, (perBatch.get(r.batch_id) ?? 0) + 1)
      picked.push(r)
    }
    return picked
  }
  const sorted = [...(rows ?? [])].sort((a, b) => a.id.localeCompare(b.id))
  const withChanges = take(sorted.filter((r) => changed(r) > 0), Math.ceil(PAPERS * 0.6))
  const picked = [...withChanges, ...take(sorted.filter((r) => changed(r) === 0), PAPERS - withChanges.length)]
  console.log(`Rule "${rule}": ${picked.length} papers (${withChanges.length} the teacher changed), ${REPEATS} gradings each`)

  const saved: Saved[] = []
  const toFiles = (list: Array<{ buffer: Buffer; name: string; mediaType: string }>): PaperFile[] => list.map((img) => ({ buffer: img.buffer, name: img.name, type: img.mediaType }))
  let next = 0
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < picked.length) {
      const row = picked[next++]
      try {
        const { data: batch } = await sb.from('grading_batches').select('mark_scheme, notes').eq('batch_id', row.batch_id).eq('user_id', row.user_id).maybeSingle()
        const scheme = (batch?.mark_scheme ?? null) as { texts?: Array<{ name: string; content: string }>; images?: UploadRef[] } | null
        if (!scheme) { console.log(`${row.id.slice(0, 8)}: no saved answer key, skipped`); continue }
        const [schemeImages, pageImages] = await Promise.all([
          fetchUploadedImageBuffers(scheme.images ?? [], 40, row.user_id),
          fetchUploadedImageBuffers(pickUploadRefs(row.page_urls, 40), 40, row.user_id),
        ])
        const markScheme: PaperFile[] = [...(scheme.texts ?? []).map((t): PaperFile => ({ buffer: Buffer.from(t.content, 'utf-8'), name: t.name, type: 'text/plain' })), ...toFiles(schemeImages)]
        const entry: Saved = { id: row.id, title: row.exam_title ?? '', teacher: marksOf(row.grade_breakdown), ai: marksOf(row.ai_breakdown), possible: Object.fromEntries((row.grade_breakdown as Q[]).map((q) => [key(q.questionNumber), Number(q.marksPossible)])), runs: [], notes: [], cost: 0 }
        for (let i = 0; i < REPEATS; i++) {
          const graded = await gradePaper({ markScheme, student: toFiles(pageImages), additionalComments: batch?.notes || undefined, markingStyle: row.marking_style ?? undefined })
          entry.runs.push(marksOf(graded.breakdown as Q[]))
          entry.notes.push(Object.fromEntries((graded.breakdown as Q[]).map((q) => [key(q.questionNumber), q.explanation ?? ''])))
          const u = graded.usage
          entry.cost += u ? ((u.input_tokens ?? 0) * 2 + (u.cache_creation_input_tokens ?? 0) * 2.5 + (u.cache_read_input_tokens ?? 0) * 0.2 + (u.output_tokens ?? 0) * 10) / 1e6 : 0
          console.log(`${row.id.slice(0, 8)} run ${i + 1}: ${graded.totalMarks}/${graded.totalPossible}`)
        }
        saved.push(entry)
        writeFileSync(`${out}/${rule}.json`, JSON.stringify(saved, null, 1))
      } catch (e) { console.log(`${row.id.slice(0, 8)}: failed (${(e as Error).message.slice(0, 120)})`) }
    }
  }))
  console.log(`Saved ${saved.length} papers to ${out}/${rule}.json`)
}
main()
