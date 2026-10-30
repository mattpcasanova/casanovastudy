import { NextRequest, NextResponse } from 'next/server'
import { runRetention } from '@/lib/retention/run'

// Daily (vercel.json cron): enforces the retention periods the privacy policy
// states (lib/retention/rules.ts): guide upload photos after a day, exam page
// scans after a school year, assigned-work logs after a year, and accounts
// unused for two years (warned a month ahead). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; anything else is refused.
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const report = await runRetention()
  if (report.errors.length) console.error('Retention job errors', report.errors)
  return NextResponse.json(report)
}
