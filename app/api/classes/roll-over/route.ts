import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { nextSchoolYear } from '@/lib/classes/years'

// "Start next year": copy classes (name, period, subject, course) into a new
// school year with fresh join codes and no students, ready for the new
// rosters. Skips a class that already exists in that year.
// Body: { classIds, toYear? } -> { created: [{ id, name, period }], skipped }
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const classIds = Array.isArray(body.classIds) ? body.classIds.filter((c): c is string => typeof c === 'string').slice(0, 30) : []
  if (!classIds.length) return NextResponse.json({ error: 'Pick at least one class' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: source } = await supabase.from('classes').select('id, name, period, subject, course, school_year').eq('teacher_id', user.id).in('id', classIds)
  if (!source?.length) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  const toYear = typeof body.toYear === 'string' && /^\d{4}-\d{2}$/.test(body.toYear) ? body.toYear : nextSchoolYear(source[0].school_year)

  const { data: existing } = await supabase.from('classes').select('name, period').eq('teacher_id', user.id).eq('school_year', toYear)
  const key = (n: string, p: string | null) => `${n.trim().toLowerCase()}|${(p ?? '').trim().toLowerCase()}`
  const taken = new Set((existing ?? []).map((c) => key(c.name, c.period)))

  const created = []
  let skipped = 0
  for (const c of source) {
    if (taken.has(key(c.name, c.period))) { skipped++; continue }
    const { data: code } = await supabase.rpc('generate_class_code')
    const { data: inserted, error: insertError } = await supabase
      .from('classes')
      .insert({ teacher_id: user.id, name: c.name, period: c.period, subject: c.subject, course: c.course, school_year: toYear, enrollment_code: code })
      .select('id, name, period')
      .single()
    if (insertError || !inserted) return NextResponse.json({ error: `Could not copy ${c.name}` }, { status: 500 })
    taken.add(key(c.name, c.period))
    created.push(inserted)
  }
  return NextResponse.json({ created, skipped, toYear })
}
