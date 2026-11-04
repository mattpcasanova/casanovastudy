// Checks the some-questions regrade against a full grading on real papers,
// without saving anything:
//   npx tsx --env-file=.env.local scripts/eval-regrade.ts <teacher email> [papers=3] [questions=2]
// For each of the teacher's latest multi-page papers (saved pages + the set's
// answer key): grade the whole paper, then regrade a few of its questions
// (from only their pages when the report has them recorded, else the whole
// paper), and compare marks, pages sent and tokens. About $0.10 a paper.
// PAPER=<report id prefix> runs just that report.

import { createClient } from '@supabase/supabase-js'
import { ClaudeService } from '../lib/claude-api'
import { gradePaper, type PaperFile } from '../lib/grading/grade-paper'
import { parseGradingOutput, normalizeQuestionKey } from '../lib/grading/parse'
import { needsMorePages, pagesToSend } from '../lib/grading/regrade'
import { fetchUploadedImageBuffers } from '../lib/uploads/server-images'
import { pickUploadRefs, type UploadRef } from '../lib/uploads/refs'

const [email, papersArg, questionsArg] = process.argv.slice(2)
if (!email) { console.error('Usage: eval-regrade.ts <teacher email> [papers] [questions]'); process.exit(1) }
const PAPERS = Number(papersArg) || 3
const QUESTIONS = Number(questionsArg) || 2

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

async function main() {
  const { data: profile } = await supabase.from('user_profiles').select('id').eq('email', email).maybeSingle()
  if (!profile) throw new Error(`No account for ${email}`)
  const { data: rows } = await supabase.from('grading_results')
    .select('id, batch_id, page_urls, grade_breakdown, total_marks, total_possible_marks, created_at')
    .eq('user_id', profile.id).not('batch_id', 'is', null).not('page_urls', 'is', null)
    .order('created_at', { ascending: false }).limit(200)
  const seenBatch = new Set<string>()
  // PAPER=<id prefix> runs just that report (to repeat a paper).
  const only = process.env.PAPER
  const picked = only ? (rows ?? []).filter((r) => r.id.startsWith(only)) : (rows ?? []).filter((r) => {
    const n = Array.isArray(r.page_urls) ? r.page_urls.length : 0
    if (n < 3 || n > 10 || seenBatch.has(r.batch_id)) return false
    seenBatch.add(r.batch_id)
    return true
  }).slice(0, PAPERS)
  if (!picked.length) throw new Error('No multi-page papers with saved pages')

  const toFiles = (list: Array<{ buffer: Buffer; name: string; mediaType: string }>): PaperFile[] => list.map((img) => ({ buffer: img.buffer, name: img.name, type: img.mediaType }))
  for (const row of picked) {
    const { data: batch } = await supabase.from('grading_batches').select('mark_scheme, notes').eq('batch_id', row.batch_id).eq('user_id', profile.id).maybeSingle()
    const scheme = (batch?.mark_scheme ?? null) as { texts?: Array<{ name: string; content: string }>; images?: UploadRef[] } | null
    if (!scheme) { console.log(`${row.id}: no saved answer key, skipped`); continue }
    const [schemeImages, pageImages] = await Promise.all([
      fetchUploadedImageBuffers(scheme.images ?? [], 40, profile.id),
      fetchUploadedImageBuffers(pickUploadRefs(row.page_urls, 40), 40, profile.id),
    ])
    const markScheme: PaperFile[] = [
      ...(scheme.texts ?? []).map((t): PaperFile => ({ buffer: Buffer.from(t.content, 'utf-8'), name: t.name, type: 'text/plain' })),
      ...toFiles(schemeImages),
    ]
    const pages = toFiles(pageImages)

    const t0 = Date.now()
    const full = await gradePaper({ markScheme, student: pages, additionalComments: batch?.notes || undefined })
    const fullSeconds = Math.round((Date.now() - t0) / 1000)
    const withPage = full.breakdown.filter((q) => q.pages?.length).length
    console.log(`\nPaper ${row.id.slice(0, 8)} · ${pages.length} pages · ${full.breakdown.length} questions`)
    console.log(`  full grading: ${full.totalMarks}/${full.totalPossible} (saved report: ${row.total_marks}/${row.total_possible_marks}) · ${fullSeconds}s · in ${full.usage?.input_tokens} out ${full.usage?.output_tokens} cache read ${full.usage?.cache_read_input_tokens}`)
    console.log(`  page recorded on ${withPage} of ${full.breakdown.length} questions: ${full.breakdown.map((q) => `${q.questionNumber}→${q.pages?.join('-') ?? '?'}`).join(', ')}`)

    // Spread the picks across the paper, preferring questions that lost marks.
    const lost = full.breakdown.filter((q) => q.marksAwarded < q.marksPossible)
    const pool = lost.length >= QUESTIONS ? lost : full.breakdown
    const targets = Array.from({ length: Math.min(QUESTIONS, pool.length) }, (_, i) => pool[Math.floor((i + 0.5) * pool.length / Math.min(QUESTIONS, pool.length))])
    const some = pagesToSend(targets, pages.length)
    const numbers = some ?? pages.map((_, i) => i + 1)
    const t1 = Date.now()
    const again = await new ClaudeService().regradeQuestions({
      markSchemeFiles: markScheme,
      pages: numbers.map((n) => pages[n - 1]),
      pageNumbers: numbers,
      pageCount: pages.length,
      questions: targets.map((q) => ({ label: q.questionNumber, marks: q.marksPossible })),
      additionalComments: batch?.notes || undefined,
    })
    const parsed = parseGradingOutput(again.content).breakdown
    console.log(`  regrade of ${targets.map((q) => q.questionNumber).join(', ')} from page${numbers.length === 1 ? '' : 's'} ${numbers.join(', ')}${some ? '' : ' (all)'}: ${Math.round((Date.now() - t1) / 1000)}s · in ${again.usage.input_tokens} out ${again.usage.output_tokens} cache read ${again.usage.cache_read_input_tokens} write ${again.usage.cache_creation_input_tokens}${needsMorePages(again.content) ? ' · ASKED FOR MORE PAGES' : ''}`)
    for (const q of targets) {
      const r = parsed.find((x) => normalizeQuestionKey(x.questionNumber.replace(/\s*\(\d+(?:\.\d+)?(?:\s*marks?)?\)\s*$/i, '')) === normalizeQuestionKey(q.questionNumber))
      console.log(`    ${q.questionNumber}: full ${q.marksAwarded}/${q.marksPossible} · regrade ${r ? `${r.marksAwarded}/${r.marksPossible}` : 'NOT RETURNED'} ${r && r.marksAwarded === q.marksAwarded ? 'same' : 'DIFFERENT'}`)
      if (r && r.marksAwarded !== q.marksAwarded) console.log(`      full: ${q.explanation.slice(0, 200)}\n      regrade: ${r.explanation.slice(0, 200)}`)
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
