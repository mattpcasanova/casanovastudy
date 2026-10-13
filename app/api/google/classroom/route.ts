import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { classroomConfigured } from '@/lib/google/classroom'

// Whether Classroom import is available on this site, and whether the teacher
// has a live (connected in the last hour) token.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  if (!classroomConfigured()) return NextResponse.json({ configured: false, connected: false })
  const { data } = await createAdminClient().from('google_classroom_tokens').select('expires_at').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ configured: true, connected: !!data && new Date(data.expires_at).getTime() > Date.now() + 60_000 })
}
