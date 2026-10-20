import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { digestGroups, type StoredError } from '@/lib/monitoring/errors'
import { sendEmail } from '@/lib/email/send'
import { errorDigestEmail } from '@/lib/email/templates'

// Daily (vercel.json cron): email ADMIN_EMAIL the last day's errors, grouped,
// and delete errors older than 30 days. Vercel sends `Authorization: Bearer $CRON_SECRET`.
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const hours = 24
  const since = new Date(Date.now() - hours * 3600 * 1000).toISOString()
  const { data } = await supabase.from('app_errors').select('fingerprint, source, message, stack, path, user_id, created_at').gte('created_at', since).order('created_at').limit(5000)
  const rows = (data ?? []) as StoredError[]
  const groups = digestGroups(rows)

  await supabase.from('app_errors').delete().lt('created_at', new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString())

  const to = process.env.ADMIN_EMAIL
  if (!rows.length || !to) return NextResponse.json({ errors: rows.length, groups: groups.length, emailed: false })
  const mail = errorDigestEmail({
    total: rows.length,
    hours,
    siteUrl: process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin,
    groups: groups.map((g) => ({ ...g, stackTop: g.stack?.split('\n').map((l) => l.trim()).find((l) => /^at |@/.test(l))?.slice(0, 200) ?? null })),
  })
  await sendEmail({ to, ...mail })
  return NextResponse.json({ errors: rows.length, groups: groups.length, emailed: true })
}
