// Recent errors from our own error log (app_errors, migration 066), grouped.
//   npx tsx --env-file=.env.local scripts/errors.ts            # last 24 hours
//   npx tsx --env-file=.env.local scripts/errors.ts --hours 168 --stack
import { createClient } from '@supabase/supabase-js'
import { digestGroups, type StoredError } from '../lib/monitoring/errors'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const args = process.argv.slice(2)
const hours = Number(args[args.indexOf('--hours') + 1]) || 24

async function main() {
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
  const { data, error } = await supabase.from('app_errors').select('fingerprint, source, message, stack, path, user_id, created_at').gte('created_at', since).order('created_at').limit(10000)
  if (error) throw error
  const groups = digestGroups((data ?? []) as StoredError[])
  console.log(`${data?.length ?? 0} errors, ${groups.length} kinds, last ${hours} hours\n`)
  for (const g of groups) {
    console.log(`[${g.source}] ${g.message}`)
    console.log(`  ${g.count}x, ${g.users} users, ${g.first.slice(0, 16)} → ${g.last.slice(0, 16)}  ${g.paths.join(' ')}`)
    if (args.includes('--stack') && g.stack) console.log(g.stack.split('\n').slice(0, 6).map((l) => `    ${l.trim()}`).join('\n'))
  }
}
main().catch((e) => { console.error(e instanceof Error ? e.message : e); process.exit(1) })
