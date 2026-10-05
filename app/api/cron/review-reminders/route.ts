import { NextRequest, NextResponse } from 'next/server'
import { REMINDERS_ENABLED } from '@/lib/features'
import { runReminders } from '@/lib/reminders/run'

// Daily review reminders (vercel.json cron). Vercel sends
// `Authorization: Bearer $CRON_SECRET`; anything else is refused.
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!REMINDERS_ENABLED) return NextResponse.json({ skipped: 'reminders are switched off' })

  const outcomes = await runReminders({ siteUrl: process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin })
  const sent = outcomes.filter((o) => o.sent).length
  const errors = outcomes.filter((o) => o.reason === 'error')
  console.log('Review reminders', { considered: outcomes.length, sent, errors: errors.length })
  return NextResponse.json({ considered: outcomes.length, sent, errors: errors.map((e) => ({ userId: e.userId, error: e.error })) })
}
