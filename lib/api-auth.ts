import { NextRequest, NextResponse } from 'next/server'
import type { User } from '@supabase/supabase-js'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'

type TeacherAuthResult =
  | { user: User; error: null }
  | { user: null; error: NextResponse }

/**
 * Authenticate the request and require a teacher profile.
 * Returns the user, or a ready-to-return NextResponse error.
 */
export async function requireTeacher(request: NextRequest): Promise<TeacherAuthResult> {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'You must be logged in' }, { status: 401 }) }
  }

  const supabase = createAdminClient()
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('user_type')
    .eq('id', user.id)
    .single()

  if (profile?.user_type !== 'teacher') {
    return { user: null, error: NextResponse.json({ error: 'Teacher account required' }, { status: 403 }) }
  }

  return { user, error: null }
}
