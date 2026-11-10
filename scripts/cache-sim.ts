// Would a shared cached prefix on guide requests get read? Walks the real
// timestamps of the last N days of generated guides: a request is a hit when
// the one before it (in the same group) came within the cache lifetime, since
// every read refreshes the entry. Read only, no model calls.
//   npx tsx --env-file=.env.local scripts/cache-sim.ts [days=30] [prefixTokens=3000]
import { createClient } from '@supabase/supabase-js'

const days = Number(process.argv[2]) || 30
const prefix = Number(process.argv[3]) || 3000
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
const LOW = new Set(['quiz', 'practice', 'flashcards', 'cheatsheet', 'timeline', 'adaptive'])

interface G { at: number; format: string; hard: boolean; short: boolean }

function walk(times: number[], ttlMs: number): number {
  const t = [...times].sort((a, b) => a - b)
  let hits = 0
  for (let i = 1; i < t.length; i++) if (t[i] - t[i - 1] <= ttlMs) hits++
  return hits
}

async function main() {
  const rows: G[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await sb.from('study_guides').select('created_at, format, difficulty_level, token_usage')
      .gte('created_at', new Date(Date.now() - days * 86400000).toISOString()).not('token_usage', 'is', null).range(from, from + 999)
    if (error) throw new Error(error.message)
    for (const r of data ?? []) rows.push({ at: Date.parse(r.created_at as string), format: String(r.format), hard: r.difficulty_level === 'hard', short: false })
    if (!data || data.length < 1000) break
  }
  const n = rows.length
  // Input price multipliers: a miss writes the prefix (1.25x for 5 minutes, 2x for an hour), a hit reads it at 0.05x.
  const report = (label: string, groups: number[][]) => {
    for (const [name, ttl, write] of [['5 minutes', 5 * 60000, 1.25], ['1 hour', 3600000, 2]] as const) {
      const hits = groups.reduce((s, g) => s + walk(g, ttl), 0)
      const mult = (hits * 0.05 + (n - hits) * write) / n
      const dollars = (x: number) => ((n * prefix * 4 * x) / 1e6).toFixed(2)
      console.log(`${label.padEnd(38)} ${name.padEnd(9)} hit rate ${String(Math.round((hits / n) * 100)).padStart(3)}%  prefix costs ${mult.toFixed(2)}x of uncached  ($${dollars(mult)} vs $${dollars(1)} uncached over ${days} days)`)
    }
  }
  console.log(`${n} guides, shared prefix taken as ${prefix} tokens`)
  report('One prefix for every guide', [rows.map((r) => r.at)])
  const low = rows.filter((r) => LOW.has(r.format) && !r.hard), med = rows.filter((r) => !LOW.has(r.format) || r.hard)
  report('Split by effort (low / medium)', [low.map((r) => r.at), med.map((r) => r.at)])
  const byFormat = new Map<string, number[]>()
  for (const r of rows) byFormat.set(`${r.format}${r.hard}`, [...(byFormat.get(`${r.format}${r.hard}`) ?? []), r.at])
  report('Today: one prefix per format + level', [...byFormat.values()])
}
main().catch((e) => { console.error(e); process.exit(1) })
