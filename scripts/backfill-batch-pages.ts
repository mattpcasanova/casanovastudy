// Attach pages to a class set graded before migration 074 (page_urls), so
// its reports can be regraded. Reads the uploaded pages the same way the
// batch grader does (Haiku per page, splitPoints, a careful cover read), then
// matches each paper's cover name to the set's reports and saves the pages.
//   npx tsx --env-file=.env.local scripts/backfill-batch-pages.ts <batchId> <cloudinaryPrefix> [--apply]
// cloudinaryPrefix: the start of the pages' public ids in grading-pages/, e.g. "Phone_1-" (one send) or "IMG_".
// Dry run by default: prints the mapping. ~$0.004 a page.
import { createClient } from '@supabase/supabase-js'
import { ClaudeService, type PageHeaderRead } from '@/lib/claude-api'
import { groupPages, naturalCompare, splitNameAndPeriod, splitPoints } from '@/lib/grading/batch'
import { fullName, matchRoster, parseName } from '@/lib/grading/names'

async function main() {
  const [, , batchId, prefix] = process.argv
  const apply = process.argv.includes('--apply')
  if (!batchId || !prefix) throw new Error('usage: backfill-batch-pages.ts <batchId> <cloudinaryPrefix> [--apply]')
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: rows } = await sb.from('grading_results').select('id, student_name, page_urls, created_at').eq('batch_id', batchId)
  if (!rows?.length) throw new Error('No reports in that set')
  const { CLOUDINARY_API_KEY: k, CLOUDINARY_API_SECRET: s, CLOUDINARY_CLOUD_NAME: c } = process.env
  let next: string | undefined
  const found: Array<{ public_id: string; secure_url: string; created_at: string }> = []
  do {
    const res = await fetch(`https://api.cloudinary.com/v1_1/${c}/resources/raw/upload?prefix=grading-pages/${encodeURIComponent(prefix)}&max_results=500${next ? `&next_cursor=${next}` : ''}`, { headers: { Authorization: 'Basic ' + Buffer.from(`${k}:${s}`).toString('base64') } })
    const data = await res.json() as { resources: typeof found; next_cursor?: string }
    found.push(...data.resources); next = data.next_cursor
  } while (next)
  // The upload nearest the set's grading time (the same stack may have been uploaded more than once).
  const graded = rows.map((r) => r.created_at).sort()[0]
  const sameDay = found.filter((f) => Math.abs(new Date(f.created_at).getTime() - new Date(graded).getTime()) < 6 * 3600_000)
  const pages = sameDay.sort((a, b) => naturalCompare(a.public_id, b.public_id)).map((f) => ({ url: f.secure_url, name: f.public_id.replace(/^grading-pages\//, '') }))
  console.log(`${pages.length} pages with prefix "${prefix}" near ${graded}; ${rows.length} reports`)
  if (!pages.length) return

  const claude = new ClaudeService()
  const roster = rows.map((r) => ({ id: r.id, ...parseName(r.student_name ?? '') }))
  const rosterNames = roster.map(fullName)
  const headers: PageHeaderRead[] = new Array(pages.length)
  let i = 0
  const worker = async () => {
    while (i < pages.length) {
      const n = i++
      const buf = Buffer.from(await (await fetch(pages[n].url)).arrayBuffer())
      try {
        const read = await claude.readPageHeader({ mediaType: 'image/jpeg', data: buf.toString('base64') }, rosterNames)
        const split = read.name ? splitNameAndPeriod(read.name) : null
        headers[n] = { ...read, name: split?.name ?? null }
      } catch { headers[n] = { name: null, firstPage: false, title: null, course: null, period: null } }
    }
  }
  await Promise.all(Array.from({ length: 12 }, worker))
  const groups = groupPages(splitPoints(headers, roster), headers)
  console.log(`${groups.length} papers found`)
  const plan: Array<{ id: string; name: string; pages: typeof pages }> = []
  for (const g of groups) {
    const buf = Buffer.from(await (await fetch(pages[g.pages[0]].url)).arrayBuffer())
    const cover = await claude.readCoverName({ mediaType: 'image/jpeg', data: buf.toString('base64') }, rosterNames)
    const name = (cover.sure && cover.student) || cover.written || g.name
    const m = matchRoster(name, roster)
    const row = m.confidence === 'sure' ? rows.find((r) => r.id === m.rosterId) : undefined
    console.log(`  pages ${g.pages[0] + 1}-${g.pages[g.pages.length - 1] + 1} (${g.pages.length}): "${name}" -> ${row ? row.student_name : 'NO MATCH'}`)
    if (row) plan.push({ id: row.id, name: row.student_name ?? '', pages: g.pages.map((p) => pages[p]) })
  }
  const seen = new Set(plan.map((p) => p.id))
  const missing = rows.filter((r) => !seen.has(r.id)).map((r) => r.student_name)
  if (missing.length) console.log('reports with no pages matched:', missing.join(', '))
  if (!apply) { console.log('dry run; add --apply to save'); return }
  for (const p of plan) {
    const { error } = await sb.from('grading_results').update({ page_urls: p.pages }).eq('id', p.id)
    if (error) throw new Error(`${p.name}: ${error.message} (has migration 074 been run?)`)
  }
  console.log(`saved pages on ${plan.length} reports`)
}
main().catch((e) => { console.error(e); process.exit(1) })
