import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { insightsSignature } from '@/lib/grading/insights'
import { parseName } from '@/lib/grading/names'
import { gradeFor, normalizeScale } from '@/lib/grading/scale'
import { loadRoster, ownedClass } from '@/lib/classes/server'
import { matchRoster } from '@/lib/grading/names'

// A batch's results (the class results page): every paper with its per-question
// breakdown, plus the saved class report and whether it still matches the marks. Owner only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error: dbError } = await createAdminClient()
    .from('grading_results')
    .select('id, student_name, total_marks, total_possible_marks, percentage, grade, grade_scale, exam_title, class_name, class_period, class_id, roster_id, student_user_id, released, created_at, grade_breakdown, group_id, group_members')
    .eq('batch_id', id)
    .eq('user_id', user.id)
    .order('student_name', { ascending: true })
  if (dbError) return NextResponse.json({ error: 'Could not load results' }, { status: 500 })
  const results = data ?? []
  const { data: saved } = await createAdminClient().from('grading_batch_insights').select('signature, data, created_at').eq('batch_id', id).eq('user_id', user.id).maybeSingle()
  const signature = insightsSignature(results.map((r) => ({ id: r.id, name: r.student_name ?? '', breakdown: Array.isArray(r.grade_breakdown) ? r.grade_breakdown : [] })))
  const insights = saved ? { insights: saved.data, current: saved.signature === signature, createdAt: saved.created_at } : null

  // In a class: roster students with no paper (and what the teacher marked
  // them as), plus student numbers for the CSV.
  const classId = results.find((r) => r.class_id)?.class_id as string | undefined
  let roster: Array<{ rosterId: string; name: string; firstName: string; lastName: string; studentNumber: string | null; email: string | null; status: string | null; hasPaper: boolean }> = []
  if (classId) {
    const [rows, { data: statuses }] = await Promise.all([
      loadRoster(createAdminClient(), classId),
      createAdminClient().from('batch_student_status').select('roster_id, status').eq('batch_id', id).eq('user_id', user.id),
    ])
    const statusOf = new Map((statuses ?? []).map((st) => [st.roster_id, st.status]))
    const withPaper = new Set(results.map((r) => r.roster_id).filter(Boolean))
    roster = rows.map((r) => ({ rosterId: r.id, name: `${r.firstName} ${r.lastName}`.trim(), firstName: r.firstName, lastName: r.lastName, studentNumber: r.studentNumber, email: r.email, status: statusOf.get(r.id) ?? null, hasPaper: withPaper.has(r.id) }))
  }
  const { data: cls } = classId ? await createAdminClient().from('classes').select('id, google_course_id').eq('id', classId).maybeSingle() : { data: null }
  const classInfo = cls ? { id: cls.id, googleCourseId: cls.google_course_id } : null
  return NextResponse.json({ results, insights, roster, classInfo }, { headers: { 'Cache-Control': 'no-store' } })
}

// Teacher edits across a batch: rename students, apply one grade scale (e.g.
// this paper's Cambridge boundaries) to every paper, attach the batch to a
// class (matching each paper to a roster name), or release it to students.
// Owner only.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }

  const supabase = createAdminClient()
  const { data: rows } = await supabase
    .from('grading_results')
    .select('id, student_name, total_marks, total_possible_marks, class_id')
    .eq('batch_id', id)
    .eq('user_id', user.id)
  if (!rows?.length) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const now = new Date().toISOString()

  if (Array.isArray(body.names)) {
    const ids = new Set(rows.map((r) => r.id))
    // In a class, a renamed paper is re-matched to the roster.
    const classId = rows.find((r) => r.class_id)?.class_id as string | undefined
    const roster = classId ? await loadRoster(supabase, classId) : []
    for (const entry of body.names.slice(0, 500) as Array<{ id?: unknown; name?: unknown }>) {
      const rowId = String(entry?.id ?? '')
      const name = typeof entry?.name === 'string' ? entry.name.trim().slice(0, 120) : ''
      if (!ids.has(rowId) || !name) continue
      const { firstName, lastName } = parseName(name)
      const link: Record<string, unknown> = {}
      if (roster.length) {
        const m = matchRoster(name, roster)
        const row = m.confidence === 'sure' ? roster.find((x) => x.id === m.rosterId) : undefined
        link.roster_id = row?.id ?? null
        link.student_user_id = row?.studentUserId ?? null
      }
      await supabase.from('grading_results')
        .update({ student_name: name, student_first_name: firstName || null, student_last_name: lastName || null, ...link, updated_at: now })
        .eq('id', rowId).eq('user_id', user.id)
    }
  }

  if (body.gradeScale !== undefined) {
    const scale = normalizeScale(body.gradeScale)
    if (!scale) return NextResponse.json({ error: 'Invalid grade scale' }, { status: 400 })
    for (const r of rows) {
      await supabase.from('grading_results')
        .update({ grade_scale: scale, grade: gradeFor(scale, Number(r.total_marks), Number(r.total_possible_marks)), updated_at: now })
        .eq('id', r.id).eq('user_id', user.id)
    }
  }

  if (typeof body.classId === 'string') {
    const cls = await ownedClass(supabase, user.id, body.classId)
    if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    const roster = await loadRoster(supabase, cls.id)
    let matched = 0
    for (const r of rows) {
      const m = matchRoster(r.student_name, roster)
      const row = m.confidence === 'sure' ? roster.find((x) => x.id === m.rosterId) : undefined
      if (row) matched += 1
      await supabase.from('grading_results')
        .update({
          class_id: cls.id,
          class_name: cls.name,
          class_period: cls.period,
          roster_id: row?.id ?? null,
          student_user_id: row?.studentUserId ?? null,
          updated_at: now,
        })
        .eq('id', r.id).eq('user_id', user.id)
    }
    return NextResponse.json({ ok: true, matched, total: rows.length })
  }

  // Absent / missing / exempt / late for roster students (null clears it).
  if (Array.isArray(body.statuses)) {
    const classId = rows.find((r) => r.class_id)?.class_id as string | undefined
    if (!classId) return NextResponse.json({ error: 'Attach this set to a class first' }, { status: 400 })
    const rosterIds = new Set((await loadRoster(supabase, classId)).map((r) => r.id))
    for (const entry of body.statuses.slice(0, 300) as Array<{ rosterId?: unknown; status?: unknown }>) {
      const rosterId = String(entry?.rosterId ?? '')
      if (!rosterIds.has(rosterId)) continue
      const status = entry?.status
      if (status === null) {
        await supabase.from('batch_student_status').delete().eq('batch_id', id).eq('roster_id', rosterId).eq('user_id', user.id)
      } else if (status === 'absent' || status === 'missing' || status === 'exempt' || status === 'late') {
        await supabase.from('batch_student_status').upsert({ batch_id: id, roster_id: rosterId, user_id: user.id, status, updated_at: now })
      }
    }
  }

  if (typeof body.released === 'boolean') {
    await supabase.from('grading_results').update({ released: body.released, updated_at: now }).eq('batch_id', id).eq('user_id', user.id)
  }

  return NextResponse.json({ ok: true })
}
