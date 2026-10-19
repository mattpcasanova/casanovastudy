import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ownedClass } from '@/lib/classes/server'
import { ASSIGNABLE_FORMATS, gradingFor, makeCode } from '@/lib/practice/assignments'
import { ASSIGNMENT_COLUMNS, assignmentProgress, shareUrl, type AssignmentRow } from '@/lib/practice/server'

const origin = (request: NextRequest) => (process.env.NEXT_PUBLIC_APP_URL && !request.nextUrl.host.startsWith('localhost') ? process.env.NEXT_PUBLIC_APP_URL : request.nextUrl.origin)

// GET ?classId= | ?batchId= | ?guideId= -> the teacher's assignments with per-student progress.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const q = request.nextUrl.searchParams
  const supabase = createAdminClient()
  let query = supabase.from('practice_assignments').select(ASSIGNMENT_COLUMNS).eq('teacher_id', user.id).order('created_at', { ascending: false }).limit(100)
  const classId = q.get('classId'), batchId = q.get('batchId'), guideId = q.get('guideId')
  if (classId && /^[0-9a-f-]{36}$/i.test(classId)) query = query.eq('class_id', classId)
  if (guideId && /^[0-9a-f-]{36}$/i.test(guideId)) query = query.eq('study_guide_id', guideId)
  if (batchId && /^[0-9a-f-]{36}$/i.test(batchId)) query = query.eq('source->>batchId', batchId)
  const { data } = await query
  const rows = (data ?? []) as AssignmentRow[]
  const progress = await assignmentProgress(supabase, rows)
  return NextResponse.json({
    assignments: rows.map((a) => ({ ...a, url: shareUrl(origin(request), a.code), students: progress.get(a.id) ?? [] })),
  })
}

// POST { guideId, classId, rosterIds[], title?, dueAt?, maxAttempts?, source? } -> { assignment }
export async function POST(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const supabase = createAdminClient()
  const guideId = String(body.guideId ?? '')
  const classId = String(body.classId ?? '')
  if (!/^[0-9a-f-]{36}$/i.test(guideId)) return NextResponse.json({ error: 'Pick a practice set' }, { status: 400 })
  const cls = await ownedClass(supabase, user.id, classId)
  if (!cls) return NextResponse.json({ error: 'Pick one of your classes' }, { status: 400 })
  const { data: guide } = await supabase.from('study_guides').select('id, user_id, title, format').eq('id', guideId).maybeSingle()
  if (!guide || guide.user_id !== user.id) return NextResponse.json({ error: 'You can only assign your own practice sets' }, { status: 403 })
  if (!(ASSIGNABLE_FORMATS as readonly string[]).includes(guide.format)) return NextResponse.json({ error: 'Only quizzes, practice and adaptive practice can be assigned' }, { status: 400 })

  const wanted = Array.isArray(body.rosterIds) ? (body.rosterIds as unknown[]).filter((x): x is string => typeof x === 'string' && /^[0-9a-f-]{36}$/i.test(x)) : []
  const { data: roster } = await supabase.from('class_roster').select('id').eq('class_id', cls.id).in('id', wanted.length ? wanted : ['00000000-0000-0000-0000-000000000000'])
  if (!roster?.length) return NextResponse.json({ error: 'Pick at least one student' }, { status: 400 })

  const dueAt = typeof body.dueAt === 'string' && !Number.isNaN(Date.parse(body.dueAt)) ? new Date(body.dueAt).toISOString() : null
  const max = Number(body.maxAttempts)
  const maxAttempts = guide.format === 'adaptive' ? null : Number.isInteger(max) && max >= 1 && max <= 20 ? max : null
  const src = body.source as { batchId?: unknown; groupKey?: unknown } | undefined
  const source = src && typeof src.batchId === 'string' && /^[0-9a-f-]{36}$/i.test(src.batchId) ? { batchId: src.batchId, groupKey: typeof src.groupKey === 'string' ? src.groupKey.slice(0, 120) : undefined } : null
  const title = (typeof body.title === 'string' && body.title.trim() ? body.title.trim() : guide.title || 'Practice').slice(0, 200)

  let created: AssignmentRow | null = null
  for (let i = 0; i < 4 && !created; i++) {
    const { data, error: dbError } = await supabase.from('practice_assignments').insert({
      teacher_id: user.id, class_id: cls.id, study_guide_id: guide.id, title, grading: gradingFor(guide.format), max_attempts: maxAttempts, due_at: dueAt, code: makeCode(), source,
    }).select(ASSIGNMENT_COLUMNS).single()
    if (data) created = data as AssignmentRow
    else if (dbError?.code !== '23505') { console.error('Assignment insert failed:', dbError); return NextResponse.json({ error: 'Could not assign it' }, { status: 500 }) }
  }
  if (!created) return NextResponse.json({ error: 'Could not assign it' }, { status: 500 })
  await supabase.from('practice_assignment_students').insert(roster.map((r) => ({ assignment_id: created!.id, roster_id: r.id })))
  return NextResponse.json({ assignment: { ...created, url: shareUrl(origin(request), created.code) } })
}
