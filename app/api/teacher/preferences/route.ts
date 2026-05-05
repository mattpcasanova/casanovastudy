import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser, createAdminClient } from '@/lib/supabase-server'

const PREF_KEYS = ['pref_auto_grade', 'pref_students_can_see_grade', 'pref_students_can_see_report'] as const
type PrefKey = typeof PREF_KEYS[number]

export async function GET(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('pref_auto_grade, pref_students_can_see_grade, pref_students_can_see_report')
    .eq('id', user.id)
    .single()

  if (error || !data) return NextResponse.json({ error: 'Failed to fetch preferences' }, { status: 500 })

  return NextResponse.json({ preferences: data })
}

export async function PATCH(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const updates: Partial<Record<PrefKey, boolean>> = {}

  for (const key of PREF_KEYS) {
    if (key in body && typeof body[key] === 'boolean') {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid preferences provided' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const { error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 })

  return NextResponse.json({ success: true })
}
