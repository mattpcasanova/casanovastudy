// Batch grading, step 1 eval: how well the page header read + splitPoints find
// where each student's paper starts in a real stack of page photos.
//
//   npx tsx --env-file=.env.local scripts/eval-page-split.ts <pages.json> --truth 0,9,18 [--class <classId>] [--cached headers.json] [--out headers.json]
//
// pages.json: [{ "url": "<Cloudinary page url>" }, ...] in stack order.
// --truth: indexes of the real first pages (from looking at the photos).
// --cached: reuse a headers file from an earlier run (no API calls).
// Prints each page's read, then the split against the truth. ~$0.002 per page.
import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync } from 'fs'
import { ClaudeService } from '@/lib/claude-api'
import { groupPages, splitNameAndPeriod, splitPoints, typicalPageCount, pageCountLooksOff, type PageHeader } from '@/lib/grading/batch'
import { fullName, matchRoster, type RosterName } from '@/lib/grading/names'

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}

async function main() {
  const pagesFile = process.argv[2]
  if (!pagesFile || !arg('--truth')) throw new Error('usage: eval-page-split.ts <pages.json> --truth 0,9,18 [--class id] [--cached headers.json] [--out headers.json]')
  const pages: Array<{ url: string }> = JSON.parse(readFileSync(pagesFile, 'utf8'))
  const truth = new Set(arg('--truth')!.split(',').map(Number))
  let roster: RosterName[] = []
  const classId = arg('--class')
  if (classId) {
    const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await sb.from('class_roster').select('id,first_name,last_name').eq('class_id', classId)
    roster = (data ?? []).map((r) => ({ id: r.id, firstName: r.first_name, lastName: r.last_name }))
  }

  let headers: PageHeader[]
  const cached = arg('--cached')
  if (cached) {
    headers = JSON.parse(readFileSync(cached, 'utf8')).headers
  } else {
    const claude = new ClaudeService()
    headers = new Array(pages.length)
    let next = 0
    const t0 = Date.now()
    const worker = async () => {
      while (next < pages.length) {
        const i = next++
        const res = await fetch(pages[i].url)
        const buf = Buffer.from(await res.arrayBuffer())
        try {
          const read = await claude.readPageHeader({ mediaType: 'image/jpeg', data: buf.toString('base64') }, roster.map(fullName))
          const split = read.name ? splitNameAndPeriod(read.name) : null
          headers[i] = { ...read, name: split?.name ?? null, period: read.period ?? split?.period ?? null }
        } catch (e) {
          console.error(`page ${i} failed:`, e)
          headers[i] = { name: null, firstPage: false }
        }
      }
    }
    await Promise.all(Array.from({ length: 8 }, worker))
    console.log(`read ${pages.length} pages in ${Math.round((Date.now() - t0) / 1000)} s`)
    const out = arg('--out')
    if (out) writeFileSync(out, JSON.stringify({ headers, roster }, null, 1))
  }

  // Per page: what the read said, against the truth.
  let candidateHits = 0, candidateExtras = 0
  headers.forEach((h, i) => {
    const candidate = h.firstPage || !!h.name
    const real = truth.has(i)
    if (candidate && real) candidateHits++
    if (candidate && !real) candidateExtras++
    const mark = real ? (candidate ? 'ok ' : 'MISSED') : candidate ? 'EXTRA' : ''
    if (candidate || real) console.log(String(i).padStart(3), mark.padEnd(6), h.firstPage ? 'first' : '     ', (h.name ?? '-').padEnd(32), h.title ?? '')
  })
  console.log(`\nread: ${candidateHits} of ${truth.size} real first pages are candidates, ${candidateExtras} false candidates`)

  const starts = splitPoints(headers, roster)
  const groups = groupPages(starts, headers)
  const typical = typicalPageCount(groups.map((g) => g.pages.length))
  let hits = 0, extras = 0
  starts.forEach((s, i) => { if (s && truth.has(i)) hits++; else if (s) extras++ })
  console.log(`split: ${groups.length} papers (truth ${truth.size}); ${hits} starts right, ${truth.size - hits} missed, ${extras} wrong; typical ${typical} pages`)
  const seen = new Set<string>()
  for (const g of groups) {
    const m = matchRoster(g.name, roster)
    if (m.confidence === 'sure' && m.rosterId) seen.add(m.rosterId)
    console.log(`  ${String(g.pages[0]).padStart(3)}  ${String(g.pages.length).padStart(2)} pages${pageCountLooksOff(g.pages.length, typical) ? ' !!' : '   '}  ${g.name}${roster.length ? `  (${m.confidence})` : ''}`)
  }
  if (roster.length) console.log(`roster ${roster.length}, matched ${seen.size}, no paper ${roster.length - seen.size}`)
}
main().catch((e) => { console.error(e); process.exit(1) })
