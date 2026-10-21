import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { loadClasswork } from '@/lib/student/classwork'

// The signed-in student's classes, assigned practice and released reports (My Classes page + homepage strip).
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const data = await loadClasswork(createAdminClient(), user.id)
  return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } })
}
