import { NextRequest, NextResponse } from 'next/server'
import { PRACTICE_REMINDERS_ENABLED } from '@/lib/features'
import { describeOutcomes, runPracticeReminders } from '@/lib/practice/reminders-server'

// Daily (vercel.json cron, late afternoon Eastern): assigned practice due within
// 36 hours gets one reminder per unfinished student and one summary per teacher.
// Vercel sends `Authorization: Bearer $CRON_SECRET`; anything else is refused.
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!PRACTICE_REMINDERS_ENABLED) return NextResponse.json({ skipped: 'practice reminders are switched off' })

  const outcomes = await runPracticeReminders({ siteUrl: process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin })
  const students = outcomes.flatMap((o) => o.students)
  const summary = {
    assignments: outcomes.length,
    studentsSent: students.filter((s) => s.sent).length,
    teachersSent: outcomes.filter((o) => o.teacher.sent).length,
    errors: [...students.filter((s) => s.reason === 'error').map((s) => s.error), ...outcomes.filter((o) => o.teacher.reason === 'error').map((o) => o.teacher.error)],
  }
  console.log('Practice reminders', summary, describeOutcomes(outcomes))
  return NextResponse.json(summary)
}
