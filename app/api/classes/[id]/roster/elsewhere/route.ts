import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ownedClass } from '@/lib/classes/server'
import { schoolYearFor } from '@/lib/classes/years'
import { matchRoster } from '@/lib/grading/names'

// Names that aren't on this class's list but are on another of the teacher's
// classes this year (a student who takes two of their classes), so they can be
// added with their full name, ID and email. Owner only.
// POST { names: string[] } -> { found: { [name]: { rosterId, firstName, lastName, studentNumber, email, className, period } } }
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  let names: string[] = []
  try {
    const body = await request.json()
    names = Array.isArray(body.names) ? body.names.filter((n: unknown): n is string => typeof n === 'string' && !!n.trim()).slice(0, 100).map((n: string) => n.slice(0, 120)) : []
  } catch { /* below */ }
  if (!names.length) return NextResponse.json({ found: {} })
  const supabase = createAdminClient()
  if (!(await ownedClass(supabase, user.id, id))) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const { data: classes } = await supabase.from('classes').select('id, name, period').eq('teacher_id', user.id).eq('school_year', schoolYearFor()).eq('is_archived', false).neq('id', id)
  if (!classes?.length) return NextResponse.json({ found: {} })
  const { data: rows } = await supabase.from('class_roster').select('id, class_id, first_name, last_name, student_number, email').in('class_id', classes.map((c) => c.id)).is('left_at', null)
  const roster = (rows ?? []).map((r) => ({ id: r.id as string, firstName: r.first_name as string, lastName: r.last_name as string }))
  const classOf = new Map(classes.map((c) => [c.id, c]))
  const rowOf = new Map((rows ?? []).map((r) => [r.id as string, r]))

  const found: Record<string, unknown> = {}
  for (const name of names) {
    const m = matchRoster(name, roster)
    if (m.confidence !== 'sure' || !m.rosterId) continue
    const r = rowOf.get(m.rosterId)!
    const c = classOf.get(r.class_id)!
    found[name] = { rosterId: r.id, firstName: r.first_name, lastName: r.last_name, studentNumber: r.student_number, email: r.email, className: c.name, period: c.period }
  }
  return NextResponse.json({ found })
}
