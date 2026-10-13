import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { settingsFromRow, settingsToRow } from '@/lib/grading/report-settings'

// A teacher's report defaults (branding, school name, what shows, grade scale,
// exam-board marking). Teachers only; written with the service role.

export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { data } = await createAdminClient().from('teacher_report_settings').select('*').eq('user_id', user.id).maybeSingle()
  return NextResponse.json({ settings: settingsFromRow(data) })
}

export async function PUT(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let body: unknown
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const row = { user_id: user.id, ...settingsToRow(body), updated_at: new Date().toISOString() }
  const { data, error: dbError } = await createAdminClient().from('teacher_report_settings').upsert(row).select('*').single()
  if (dbError) {
    console.error('Save report settings failed:', dbError)
    return NextResponse.json({ error: 'Could not save your settings' }, { status: 500 })
  }
  return NextResponse.json({ settings: settingsFromRow(data) })
}
