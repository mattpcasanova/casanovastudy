import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { sendUnfinishedAtDue } from '@/lib/practice/auto-submit'

// Daily (vercel.json cron): send unfinished assigned runs whose due date has
// passed. Teacher and student pages do the same as soon as they're opened;
// this catches assignments nobody looked at. Vercel sends `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  let sent = 0
  // 200 assignments per pass; a few passes clears any backlog.
  for (let i = 0; i < 5; i++) {
    sent += await sendUnfinishedAtDue(supabase)
    const { count } = await supabase.from('practice_assignments').select('id', { count: 'exact', head: true })
      .is('auto_submitted_at', null).not('due_at', 'is', null).lt('due_at', new Date().toISOString())
    if (!count) break
  }
  return NextResponse.json({ sent })
}
