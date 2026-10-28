import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { gradeFor, normalizeScale } from '@/lib/grading/scale'
import { loadRoster } from '@/lib/classes/server'

// A score the teacher worked out by hand, for a student with no paper in the
// set (graded on paper, a make-up, an oral): makes a report in the set with
// just the total, so the class results, gradebook export and the student's
// My Class see it like any other. Owner only.
//   POST { rosterId, marks, note? }

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: { rosterId?: unknown; marks?: unknown; note?: unknown }
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const rosterId = typeof body.rosterId === 'string' ? body.rosterId : ''
  const marks = Number(body.marks)
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 500) : ''
  if (!/^[0-9a-f-]{36}$/i.test(rosterId) || !Number.isFinite(marks) || marks < 0) return NextResponse.json({ error: 'Give the student and their marks' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: rows } = await supabase.from('grading_results')
    .select('id, roster_id, class_id, exam_title, class_name, class_period, total_possible_marks, grade_scale, marking_style')
    .eq('batch_id', id).eq('user_id', user.id)
  if (!rows?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (rows.some((r) => r.roster_id === rosterId)) return NextResponse.json({ error: 'That student already has a report in this set. Open it to change the marks.' }, { status: 409 })
  const classId = rows.find((r) => r.class_id)?.class_id as string | undefined
  if (!classId) return NextResponse.json({ error: 'This set is not attached to a class' }, { status: 400 })
  const entry = (await loadRoster(supabase, classId)).find((r) => r.id === rosterId)
  if (!entry) return NextResponse.json({ error: 'That student is not on the class list' }, { status: 404 })
  const first = rows[0]
  const possible = Number(first.total_possible_marks) || 0
  if (!possible) return NextResponse.json({ error: 'This set has no total to score against' }, { status: 400 })
  // Over the total is fine (an extra-credit question on a perfect paper); twice the total is a typo.
  if (marks > possible * 2) return NextResponse.json({ error: `${marks} is more than twice the total of ${possible}. Check the number.` }, { status: 400 })
  const percentage = Math.round((marks / possible) * 1000) / 10
  const scale = normalizeScale(first.grade_scale)
  const now = new Date().toISOString()
  const { data: saved, error: saveError } = await supabase.from('grading_results').insert({
    user_id: user.id,
    batch_id: id,
    class_id: classId,
    roster_id: rosterId,
    student_user_id: entry.studentUserId ?? null,
    student_name: `${entry.firstName} ${entry.lastName}`.trim(),
    student_first_name: entry.firstName || null,
    student_last_name: entry.lastName || null,
    student_exam_filename: 'Entered by hand',
    content: `Score entered by the teacher${note ? `: ${note}` : ''}.`,
    total_marks: marks,
    total_possible_marks: possible,
    percentage,
    grade: gradeFor(scale, marks, possible),
    grade_scale: first.grade_scale,
    marking_style: first.marking_style,
    grade_breakdown: [],
    teacher_comment: note || null,
    exam_title: first.exam_title,
    class_name: first.class_name,
    class_period: first.class_period,
    released: false,
    reviewed_at: now,
    created_at: now,
    updated_at: now,
  }).select('id').single()
  if (saveError || !saved) return NextResponse.json({ error: saveError?.message ?? 'Could not save' }, { status: 500 })
  // They handed something in after all.
  await supabase.from('batch_student_status').delete().eq('batch_id', id).eq('roster_id', rosterId).eq('user_id', user.id)
  return NextResponse.json({ ok: true, id: saved.id })
}
