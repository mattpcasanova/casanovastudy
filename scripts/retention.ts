// The data retention job by hand (service role; run locally).
//
//   npx tsx --env-file=.env.local scripts/retention.ts preview   # what today's run would delete or warn about
//   npx tsx --env-file=.env.local scripts/retention.ts run       # do it now (the daily cron does the same)
//
// Periods: lib/retention/rules.ts. Job: lib/retention/run.ts.

import { runRetention } from '@/lib/retention/run'

const cmd = process.argv[2]

async function main() {
  if (cmd !== 'preview' && cmd !== 'run') {
    console.log('Usage: scripts/retention.ts preview | run')
    process.exit(1)
  }
  const dry = cmd === 'preview'
  const r = await runRetention({ dryRun: dry })
  const verb = dry ? 'would delete' : 'deleted'
  console.log(`${verb} ${r.guideImages} guide upload photos`)
  console.log(`${verb} pages from ${r.gradingPages.reports} old reports (${r.gradingPages.files} files)`)
  console.log(`${verb} ${r.aiUses} assigned-work AI messages, ${r.focusEvents} focus events, ${r.usageEvents} usage events`)
  console.log(`accounts checked: ${r.accounts.checked}; ${dry ? 'would warn' : 'warned'}: ${r.accounts.warned.length}; ${verb}: ${r.accounts.deleted.length}; came back: ${r.accounts.unwarned}`)
  for (const e of r.accounts.warned) console.log(`  warn   ${e}`)
  for (const e of r.accounts.deleted) console.log(`  delete ${e}`)
  for (const e of r.errors) console.log(`  ERROR ${e}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
