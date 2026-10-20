import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { adminSchools } from '@/lib/school/server'

// GET: the schools the signed-in user can see at /school (empty for most people).
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ schools: [] })
  return NextResponse.json({ schools: await adminSchools(createAdminClient(), user.id) })
}
