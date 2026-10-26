import { createClient } from '@supabase/supabase-js'
import { ClaudeService } from '@/lib/claude-api'
import { splitNameAndPeriod, splitPoints, groupPages } from '@/lib/grading/batch'
import { matchRoster, fullName } from '@/lib/grading/names'
import { readFileSync, writeFileSync } from 'fs'
async function main() {
const [, , pagesFile, classId, outFile] = process.argv
const pages: Array<{ id: string; url: string }> = JSON.parse(readFileSync(pagesFile, 'utf8'))
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const { data: roster } = await sb.from('class_roster').select('id,first_name,last_name').eq('class_id', classId)
const rosterNames = (roster ?? []).map((r) => ({ id: r.id, firstName: r.first_name, lastName: r.last_name }))
const claude = new ClaudeService()
const headers: any[] = new Array(pages.length)
let next = 0, t0 = Date.now()
const worker = async () => {
  while (next < pages.length) {
    const i = next++
    const res = await fetch(pages[i].url)
    const buf = Buffer.from(await res.arrayBuffer())
    try {
      const read = await claude.readPageHeader({ mediaType: 'image/jpeg', data: buf.toString('base64') }, rosterNames.map(fullName))
      const split = read.name ? splitNameAndPeriod(read.name) : null
      headers[i] = { ...read, name: split?.name ?? null, period: read.period ?? split?.period ?? null }
    } catch (e) { headers[i] = { name: null, firstPage: false, error: String(e) } }
  }
}
await Promise.all(Array.from({ length: 8 }, worker))
console.log('read in', Math.round((Date.now() - t0) / 1000), 's')
writeFileSync(outFile, JSON.stringify({ headers, roster: rosterNames }, null, 1))
headers.forEach((h, i) => console.log(String(i).padStart(3), pages[i].id.replace('grading-pages/', '').slice(0, 8), h.firstPage ? 'FIRST' : '     ', h.name ?? '-', '|', h.title ?? '', '|', h.period ?? '', h.error ? 'ERR ' + h.error.slice(0, 60) : ''))
const starts = splitPoints(headers, rosterNames)
const groups = groupPages(starts, headers)
console.log('groups', groups.length)
const seen = new Set<string>()
for (const g of groups) { const m = matchRoster(g.name, rosterNames); if (m.confidence === 'sure' && m.rosterId) seen.add(m.rosterId); console.log(g.pages.length, 'pages', g.name, m.confidence) }
console.log('roster', rosterNames.length, 'no paper', rosterNames.filter((r) => !seen.has(r.id)).length)

}
main().catch((e) => { console.error(e); process.exit(1) })
