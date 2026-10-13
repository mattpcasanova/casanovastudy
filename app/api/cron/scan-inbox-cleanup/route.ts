import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'

// Daily (vercel.json cron): scans in teachers' scanner inboxes are student
// work, so they're deleted 30 days after they arrive. Vercel sends
// `Authorization: Bearer $CRON_SECRET`; anything else is refused.
export const maxDuration = 300

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const supabase = createAdminClient()
  const cutoff = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { data: old } = await supabase.from('scan_inbox_items').select('id, files').lt('received_at', cutoff).limit(500)
  let files = 0
  for (const item of old ?? []) {
    const paths = (item.files as Array<{ path: string }>).map((f) => f.path)
    if (paths.length) await supabase.storage.from('scan-inbox').remove(paths)
    await supabase.from('scan_inbox_items').delete().eq('id', item.id)
    files += paths.length
  }
  return NextResponse.json({ deleted: old?.length ?? 0, files })
}
