// Review reminders by hand (service role; run locally).
//
//   npx tsx --env-file=.env.local scripts/reminders.ts preview            # who would get one today, and why not
//   npx tsx --env-file=.env.local scripts/reminders.ts send-to me@x.com   # send that user a reminder now, rules or not
//
// The daily job (/api/cron/review-reminders) only sends while REMINDERS_ENABLED
// is on (lib/features.ts). Rules: lib/reminders/rules.ts.

import { createClient } from '@supabase/supabase-js'
import { runReminders } from '@/lib/reminders/run'

const [cmd, arg] = process.argv.slice(2)

async function main() {
  if (cmd === 'preview') {
    const outcomes = await runReminders({ dryRun: true })
    const would = outcomes.filter((o) => !o.reason || o.reason === 'forced')
    const reasons = new Map<string, number>()
    for (const o of outcomes) if (o.reason) reasons.set(o.reason, (reasons.get(o.reason) ?? 0) + 1)
    console.log(`${outcomes.length} users with recent activity; ${would.length} would get a reminder today.`)
    for (const [r, n] of reasons) console.log(`  skipped (${r}): ${n}`)
    for (const o of would) console.log(`  -> ${o.email}: ${o.dueTotal} due, weak spot: ${o.weak ?? 'none'}`)
    return
  }
  if (cmd === 'send-to' && arg) {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
    const { data } = await admin.from('user_profiles').select('id').eq('email', arg.toLowerCase()).maybeSingle()
    if (!data) throw new Error(`No user with email ${arg}`)
    const [o] = await runReminders({ onlyUserIds: [data.id], force: true, siteUrl: process.env.NEXT_PUBLIC_APP_URL })
    console.log(o)
    return
  }
  console.log('Usage: scripts/reminders.ts preview | send-to <email>')
}

main().catch((e) => { console.error(e); process.exit(1) })
