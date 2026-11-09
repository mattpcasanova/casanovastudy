// Assigned-practice reminders by hand (service role; run locally).
//
//   npx tsx --env-file=.env.local scripts/practice-reminders.ts preview                 # what tonight's run would send, and why not
//   npx tsx --env-file=.env.local scripts/practice-reminders.ts send-to me@x.com <id>   # send one assignment's emails to YOUR inbox (records nothing)
//
// The daily job is /api/cron/practice-reminders (lib/features.ts PRACTICE_REMINDERS_ENABLED).
// Rules: lib/practice/reminders.ts.

import { describeOutcomes, runPracticeReminders } from '@/lib/practice/reminders-server'

const [cmd, arg, id] = process.argv.slice(2)

async function main() {
  if (cmd === 'preview') {
    const outcomes = await runPracticeReminders({ dryRun: true })
    console.log(`${outcomes.length} assignments due within the window.`)
    for (const line of describeOutcomes(outcomes)) console.log(`  ${line}`)
    for (const o of outcomes) for (const s of o.students) if (s.kind && !s.reason) console.log(`    -> ${o.title}: ${s.name} (${s.kind})`)
    return
  }
  if (cmd === 'send-to' && arg && id) {
    // Every email of that assignment goes to `arg`; nothing is recorded as sent (the real run still goes out).
    const outcomes = await runPracticeReminders({ onlyAssignmentIds: [id], redirectTo: arg, siteUrl: process.env.NEXT_PUBLIC_APP_URL, dryRun: false, now: new Date() })
    console.log(describeOutcomes(outcomes).join('\n'))
    return
  }
  console.log('Usage: scripts/practice-reminders.ts preview | send-to <email> <assignmentId>')
}

main().catch((e) => { console.error(e); process.exit(1) })
