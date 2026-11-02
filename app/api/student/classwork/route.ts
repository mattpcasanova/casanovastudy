import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { loadClasswork } from '@/lib/student/classwork'
import { linkMeByEmail } from '@/lib/classes/server'

// The signed-in student's classes, assigned practice and released reports (My Classes page + homepage strip).
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const supabase = createAdminClient()
  // Link them to any class list with their email first, so My Classes shows up on their first visit.
  const linkedNow = await linkMeByEmail(supabase, user.id, user.email).catch((e) => { console.error('Link by email failed:', e); return [] as string[] })
  const data = await loadClasswork(supabase, user.id)
  return NextResponse.json({ ...data, linkedNow }, { headers: { 'Cache-Control': 'no-store' } })
}
