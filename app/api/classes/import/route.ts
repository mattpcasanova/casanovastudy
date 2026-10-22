import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { addRosterNames } from '@/lib/classes/server'
import { parseClassImport } from '@/lib/classes/import'
import { matchClassForCourse } from '@/lib/google/classroom'
import { schoolYearFor } from '@/lib/classes/years'

// One-time import of every class from a gradebook export (CSV/TSV text, parsed
// with parseClassImport). A class the teacher already has (same name and
// period, or this year's class in that period whose name fits, e.g. a class
// made from Google Classroom) gets the names merged in: students already there
// get their student IDs filled in. Otherwise the class is created.
// Body: { text, fallbackName? } -> { classes: [{ id, name, period, added, skipped, filled, created }] }
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const text = typeof body.text === 'string' ? body.text.slice(0, 500_000) : ''
  const fallbackName = typeof body.fallbackName === 'string' && body.fallbackName.trim() ? body.fallbackName.trim().slice(0, 100) : 'My class'
  const { classes } = parseClassImport(text, fallbackName)
  if (!classes.length) return NextResponse.json({ error: 'No student names found in that file' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: existing } = await supabase.from('classes').select('id, name, period, course, school_year').eq('teacher_id', user.id).eq('is_archived', false)
  const thisYear = (existing ?? []).filter((c) => !c.school_year || c.school_year === schoolYearFor())
  const key = (name: string, period: string | null) => `${name.trim().toLowerCase()}|${(period ?? '').trim().toLowerCase()}`
  const byKey = new Map<string, { id: string; name: string; period: string | null }>((existing ?? []).map((c) => [key(c.name, c.period), c]))

  const out = []
  for (const cls of classes) {
    let target: { id: string; name: string; period: string | null } | undefined = byKey.get(key(cls.name, cls.period))
    if (!target && cls.period) {
      const id = matchClassForCourse({ name: cls.name, section: `Period ${cls.period}` }, thisYear)
      target = id ? thisYear.find((c) => c.id === id) : undefined
    }
    let created = false
    if (!target) {
      const { data: code, error: codeError } = await supabase.rpc('generate_class_code')
      if (codeError || !code) return NextResponse.json({ error: 'Could not create a class code' }, { status: 500 })
      const { data: inserted, error: insertError } = await supabase
        .from('classes')
        .insert({ teacher_id: user.id, name: cls.name, period: cls.period, enrollment_code: code })
        .select('id, name, period')
        .single()
      if (insertError || !inserted) return NextResponse.json({ error: `Could not create ${cls.name}` }, { status: 500 })
      target = inserted
      created = true
      byKey.set(key(cls.name, cls.period), inserted)
    }
    const result = await addRosterNames(supabase, target.id, cls.students, { fuzzy: true })
    out.push({ id: target.id, name: target.name, period: target.period, added: result.added, skipped: result.skipped, filled: result.filled, created })
  }
  return NextResponse.json({ classes: out })
}
