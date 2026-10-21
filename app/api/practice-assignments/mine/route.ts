import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { assignedPracticeFor } from '@/lib/student/classwork'

// Practice assigned to the signed-in student (through any roster name linked to them).
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  return NextResponse.json({ assignments: await assignedPracticeFor(createAdminClient(), user.id) }, { headers: { 'Cache-Control': 'no-store' } })
}
