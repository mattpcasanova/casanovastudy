import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { getConsentState } from '@/lib/consent'
import { createAdminClient } from '@/lib/supabase-server'
import { pickerName, sameStudentId } from '@/lib/practice/assignments'
import { ASSIGNMENT_COLUMNS, myAssignedRow, type AssignmentRow } from '@/lib/practice/server'
import { isVerifiedTeacher, UNVERIFIED_TEACHER_MESSAGE } from '@/lib/teachers/verification'

// A student opening a share link (/practice/<code>). Signed in only.
// GET: who they are on this assignment -> { state: 'ready' | 'pick' | 'not_assigned' | 'teacher', ... }
//   Linked already, or their sign-in email is on the roster -> ready.
//   Otherwise the assigned names nobody has claimed, to pick from.
// POST { rosterId, studentId? }: claim a name (student ID required when the roster has one).

const wrongTries = new Map<string, { n: number; at: number }>()

async function load(code: string) {
  if (!/^[a-z2-9]{8}$/.test(code)) return null
  const { data } = await createAdminClient().from('practice_assignments').select(ASSIGNMENT_COLUMNS).eq('code', code).maybeSingle()
  return (data as AssignmentRow | null) ?? null
}

async function summary(a: AssignmentRow) {
  const supabase = createAdminClient()
  const [{ data: cls }, { data: teacher }] = await Promise.all([
    supabase.from('classes').select('name, period').eq('id', a.class_id).maybeSingle(),
    supabase.from('user_profiles').select('first_name, last_name').eq('id', a.teacher_id).maybeSingle(),
  ])
  return {
    id: a.id,
    title: a.title,
    guideId: a.study_guide_id,
    dueAt: a.due_at,
    className: cls ? [cls.name, cls.period && `P${cls.period}`].filter(Boolean).join(' ') : null,
    teacher: teacher ? [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') : null,
  }
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const { code } = await params
  const a = await load(code)
  if (!a) return NextResponse.json({ error: 'This link doesn\'t work. Ask your teacher for a new one.' }, { status: 404 })
  const info = await summary(a)
  if (a.teacher_id === user.id) return NextResponse.json({ state: 'teacher', assignment: info })
  // Students only connect to verified teachers.
  if (!(await isVerifiedTeacher(createAdminClient(), a.teacher_id))) return NextResponse.json({ state: 'unverified', assignment: info, message: UNVERIFIED_TEACHER_MESSAGE })
  // Birth date / parent approval first (same rules as the rest of the site).
  if ((await getConsentState(user.id)).step !== 'ok') return NextResponse.json({ state: 'consent', assignment: info })
  const supabase = createAdminClient()
  if (await myAssignedRow(supabase, a.id, user.id)) return NextResponse.json({ state: 'ready', assignment: info })

  const { data: rows } = await supabase
    .from('practice_assignment_students')
    .select('roster_id, class_roster!inner(id, first_name, last_name, email, student_number, student_user_id)')
    .eq('assignment_id', a.id)
  const assigned = (rows ?? []).map((r) => (Array.isArray(r.class_roster) ? r.class_roster[0] : r.class_roster) as { id: string; first_name: string; last_name: string; email: string | null; student_number: string | null; student_user_id: string | null })
  // Their sign-in email is on the roster: link straight away.
  const email = user.email?.toLowerCase()
  const byEmail = email ? assigned.find((r) => !r.student_user_id && r.email?.toLowerCase() === email) : undefined
  if (byEmail) {
    await supabase.from('class_roster').update({ student_user_id: user.id, linked_via: 'email' }).eq('id', byEmail.id).is('student_user_id', null)
    return NextResponse.json({ state: 'ready', assignment: info })
  }
  // Already someone else in this class: this practice wasn't for them.
  const { data: mine } = await supabase.from('class_roster').select('id').eq('class_id', a.class_id).eq('student_user_id', user.id).limit(1)
  if (mine?.length) return NextResponse.json({ state: 'not_assigned', assignment: info })
  const open = assigned.filter((r) => !r.student_user_id)
  if (!open.length) return NextResponse.json({ state: 'not_assigned', assignment: info })
  return NextResponse.json({
    state: 'pick',
    assignment: info,
    names: open
      .sort((x, y) => x.first_name.localeCompare(y.first_name))
      .map((r) => ({ rosterId: r.id, label: pickerName(r.first_name, r.last_name), needsId: !!r.student_number })),
  })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const { code } = await params
  const a = await load(code)
  if (!a) return NextResponse.json({ error: 'This link doesn\'t work' }, { status: 404 })
  if (!(await isVerifiedTeacher(createAdminClient(), a.teacher_id))) return NextResponse.json({ error: UNVERIFIED_TEACHER_MESSAGE }, { status: 403 })
  const tries = wrongTries.get(user.id)
  if (tries && tries.n >= 5 && Date.now() - tries.at < 60 * 60 * 1000) return NextResponse.json({ error: 'Too many tries. Ask your teacher to check your name on the class list.' }, { status: 429 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const rosterId = String(body.rosterId ?? '')
  const supabase = createAdminClient()
  const { data: link } = await supabase.from('practice_assignment_students').select('roster_id').eq('assignment_id', a.id).eq('roster_id', rosterId).maybeSingle()
  if (!link) return NextResponse.json({ error: 'Pick your name' }, { status: 400 })
  const { data: row } = await supabase.from('class_roster').select('id, student_number, student_user_id').eq('id', rosterId).maybeSingle()
  if (!row || row.student_user_id) return NextResponse.json({ error: 'That name is already taken. Ask your teacher.' }, { status: 409 })
  const { data: mine } = await supabase.from('class_roster').select('id').eq('class_id', a.class_id).eq('student_user_id', user.id).limit(1)
  if (mine?.length) return NextResponse.json({ error: 'You\'re already on this class list under another name. Ask your teacher.' }, { status: 409 })
  if (row.student_number && !sameStudentId(String(body.studentId ?? ''), row.student_number)) {
    wrongTries.set(user.id, { n: (tries && Date.now() - tries.at < 60 * 60 * 1000 ? tries.n : 0) + 1, at: Date.now() })
    return NextResponse.json({ error: 'That student ID doesn\'t match. Check it and try again.' }, { status: 400 })
  }
  const { error } = await supabase.from('class_roster').update({ student_user_id: user.id, linked_via: row.student_number ? 'student_id' : 'picked' }).eq('id', row.id).is('student_user_id', null)
  if (error) return NextResponse.json({ error: 'Could not save. Try again.' }, { status: 500 })
  return NextResponse.json({ state: 'ready', assignment: await summary(a) })
}
