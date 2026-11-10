// Where the AI spend went, from the usage each call already saves (read only).
//   npx tsx --env-file=.env.local scripts/cost-profile.ts [days=30]
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const days = Number(process.argv[2]) || 30
const since = new Date(Date.now() - days * 86400000).toISOString()
const sb: SupabaseClient = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

type Row = Record<string, unknown>
type Usage = Record<string, unknown> | null

async function all(table: string, select: string, withUsage = true): Promise<Row[]> {
  const out: Row[] = []
  for (let from = 0; ; from += 1000) {
    let q = sb.from(table).select(select).gte('created_at', since)
    if (withUsage) q = q.not('token_usage', 'is', null)
    const { data, error } = await q.range(from, from + 999)
    if (error) throw new Error(`${table}: ${error.message}`)
    out.push(...((data ?? []) as unknown as Row[]))
    if (!data || data.length < 1000) return out
  }
}

const n = (v: unknown) => (typeof v === 'number' ? v : Number(v) || 0)
interface Bucket { calls: number; input: number; cacheRead: number; cacheWrite: number; output: number; cost: number }
const empty = (): Bucket => ({ calls: 0, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, cost: 0 })

function add(b: Bucket, u: Usage) {
  if (!u) return
  b.calls++
  b.input += n(u.input_tokens)
  b.cacheRead += n(u.cache_read_input_tokens)
  b.cacheWrite += n(u.cache_creation_input_tokens)
  b.output += n(u.output_tokens)
  b.cost += n(u.cost ?? u.total_cost ?? u.estimated_cost)
}

function show(title: string, map: Map<string, Bucket>) {
  console.log(`\n== ${title}`)
  const rows = [...map.entries()].sort((a, b) => b[1].cost - a[1].cost || b[1].output - a[1].output)
  for (const [k, b] of rows) {
    const inAll = b.input + b.cacheRead + b.cacheWrite
    const pct = (x: number) => (inAll ? Math.round((x / inAll) * 100) : 0)
    console.log(`${k.padEnd(30)} ${String(b.calls).padStart(5)} calls  $${b.cost.toFixed(2).padStart(7)}  ($${(b.cost / Math.max(1, b.calls)).toFixed(3)} each)  in ${(inAll / 1000).toFixed(0)}k (cache read ${pct(b.cacheRead)}%, written ${pct(b.cacheWrite)}%)  out ${(b.output / 1000).toFixed(0)}k`)
  }
}

async function main() {
  const guides = await all('study_guides', 'format, difficulty_level, token_usage')
  console.log(`since ${since.slice(0, 10)}; guide usage keys: ${Object.keys((guides[0]?.token_usage as object) ?? {}).join(', ')}`)
  const byFormat = new Map<string, Bucket>()
  for (const g of guides) {
    const key = `${String(g.format)}${g.difficulty_level === 'hard' ? ' (hard)' : ''}`
    if (!byFormat.has(key)) byFormat.set(key, empty())
    add(byFormat.get(key)!, g.token_usage as Usage)
  }
  show(`Guides generated (${guides.length})`, byFormat)

  const graded = await all('grading_results', 'token_usage, batch_id')
  console.log(`grading usage keys: ${Object.keys((graded[0]?.token_usage as object) ?? {}).join(', ')}`)
  const g = new Map<string, Bucket>([['class set papers', empty()], ['single papers', empty()]])
  for (const r of graded) add(g.get(r.batch_id ? 'class set papers' : 'single papers')!, r.token_usage as Usage)
  show(`Gradings saved (${graded.length})`, g)
  const pages = graded.reduce((sum, r) => sum + n((r.token_usage as Usage)?.pages), 0)
  console.log(`pages in those papers: ${pages} (each page is also read once to sort the stack)`)

  const events = await all('usage_events', 'kind', false)
  const kinds = new Map<string, number>()
  for (const e of events) kinds.set(String(e.kind), (kinds.get(String(e.kind)) ?? 0) + 1)
  console.log(`\n== usage_events by kind: ${[...kinds.entries()].sort((a, b) => b[1] - a[1]).map(([k, c]) => `${k} ${c}`).join(', ')}`)

  for (const table of ['guide_versions', 'grading_batch_insights', 'practice_reports', 'reteach_plans']) {
    const { count } = await sb.from(table).select('*', { count: 'exact', head: true }).gte('created_at', since)
    console.log(`${table}: ${count ?? '?'} rows`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) })
