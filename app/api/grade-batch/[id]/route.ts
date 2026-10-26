import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { insightsSignature } from '@/lib/grading/insights'
import { parseName } from '@/lib/grading/names'
import { gradeFor, normalizeScale } from '@/lib/grading/scale'
import { loadRoster, ownedClass } from '@/lib/classes/server'
import { matchRoster } from '@/lib/grading/names'
import { paperDaysLate } from '@/lib/grading/late'
import { acceptAnswerPlan, applyAcceptance, normalizeAnswerList, type AcceptAnswer } from '@/lib/grading/accept-answer'
import { adjustedTotals, normalizeAdjustments, withAdjustment } from '@/lib/grading/adjustments'
import type { GradedQuestion } from '@/lib/grading/parse'

// A batch's results (the class results page): every paper with its per-question
// breakdown, plus the saved class report and whether it still matches the marks. Owner only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const { data, error: dbError } = await createAdminClient()
    .from('grading_results')
    .select('id, student_name, total_marks, total_possible_marks, percentage, grade, grade_scale, exam_title, class_name, class_period, class_id, roster_id, student_user_id, released, created_at, grade_breakdown, group_id, group_members, adjustments, page_urls, student_exam_filename')
    .eq('batch_id', id)
    .eq('user_id', user.id)
    .order('student_name', { ascending: true })
  if (dbError) return NextResponse.json({ error: 'Could not load results' }, { status: 500 })
  // has_pages: the paper can be regraded (migration 074); by_hand: a score the teacher entered.
  const results = (data ?? []).map(({ page_urls, student_exam_filename, ...r }) => ({ ...r, has_pages: Array.isArray(page_urls) && page_urls.length > 0, by_hand: student_exam_filename === 'Entered by hand' }))
  const { data: saved } = await createAdminClient().from('grading_batch_insights').select('signature, data, created_at').eq('batch_id', id).eq('user_id', user.id).maybeSingle()
  const signature = insightsSignature(results.map((r) => ({ id: r.id, name: r.student_name ?? '', breakdown: Array.isArray(r.grade_breakdown) ? r.grade_breakdown : [] })))
  const insights = saved ? { insights: saved.data, current: saved.signature === signature, createdAt: saved.created_at } : null

  // In a class: roster students with no paper (and what the teacher marked
  // them as), plus student numbers for the CSV.
  const classId = results.find((r) => r.class_id)?.class_id as string | undefined
  let roster: Array<{ rosterId: string; name: string; firstName: string; lastName: string; studentNumber: string | null; email: string | null; status: string | null; hasPaper: boolean; left: boolean; daysLate?: number }> = []
  if (classId) {
    const [rows, { data: statuses }] = await Promise.all([
      loadRoster(createAdminClient(), classId),
      createAdminClient().from('batch_student_status').select('roster_id, status').eq('batch_id', id).eq('user_id', user.id),
    ])
    const statusOf = new Map((statuses ?? []).map((st) => [st.roster_id, st.status]))
    const withPaper = new Set(results.map((r) => r.roster_id).filter(Boolean))
    // Late papers: days after the set was first graded (0 = same day).
    const firstGraded = results.map((r) => r.created_at as string).sort()[0]
    const paperAt = new Map(results.filter((r) => r.roster_id).map((r) => [r.roster_id as string, r.created_at as string]))
    roster = rows.map((r) => {
      const status = statusOf.get(r.id) ?? null
      const late = status === 'late' && paperAt.has(r.id) ? { daysLate: paperDaysLate(firstGraded, paperAt.get(r.id)) } : {}
      return { rosterId: r.id, name: `${r.firstName} ${r.lastName}`.trim(), firstName: r.firstName, lastName: r.lastName, studentNumber: r.studentNumber, email: r.email, status, hasPaper: withPaper.has(r.id), left: r.left, ...late }
    })
  }
  const { data: cls } = classId ? await createAdminClient().from('classes').select('id, google_course_id').eq('id', classId).maybeSingle() : { data: null }
  const classInfo = cls ? { id: cls.id, googleCourseId: cls.google_course_id } : null
  // What adding more papers later reuses: the answer key, notes and Classroom assignment.
  const { data: setupRow } = await createAdminClient().from('grading_batches').select('mark_scheme, notes, classroom_course_id, classroom_work_id').eq('batch_id', id).eq('user_id', user.id).maybeSingle()
  const setup = setupRow ? {
    markScheme: setupRow.mark_scheme ?? null,
    notes: setupRow.notes ?? null,
    classroom: setupRow.classroom_course_id && setupRow.classroom_work_id ? { courseId: setupRow.classroom_course_id, workId: setupRow.classroom_work_id } : null,
  } : null
  return NextResponse.json({ results, insights, roster, classInfo, setup }, { headers: { 'Cache-Control': 'no-store' } })
}

// Teacher edits across a batch: rename students, apply one grade scale (e.g.
// this paper's Cambridge boundaries) to every paper, attach the batch to a
// class (matching each paper to a roster name), release it to students, or
// put an extra credit / deduction on exactly the chosen papers
// ({ adjustment, paperIds }; { removeAdjustment: id } takes it off all). Owner only.
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
    .select('id, student_name, total_marks, total_possible_marks, class_id, grade_breakdown, grade_scale, adjustments')
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

  if (body.adjustment !== undefined || typeof body.removeAdjustment === 'string') {
    const [adjustment] = body.adjustment !== undefined ? normalizeAdjustments([body.adjustment]) : []
    if (body.adjustment !== undefined && !adjustment) return NextResponse.json({ error: 'Give the amount and a reason' }, { status: 400 })
    const target = adjustment ?? { id: String(body.removeAdjustment) }
    const chosen = new Set(adjustment && Array.isArray(body.paperIds) ? body.paperIds.map(String) : [])
    const papers = rows.map((r) => ({ ...r, adjustments: normalizeAdjustments(r.adjustments) }))
    const plan = adjustment
      ? withAdjustment(papers, adjustment, chosen)
      : papers.map((p) => ({ id: p.id, adjustments: p.adjustments.filter((a) => a.id !== target.id), changed: p.adjustments.some((a) => a.id === target.id) }))
    let changed = 0
    for (const step of plan) {
      if (!step.changed) continue
      const r = papers.find((p) => p.id === step.id)!
      const breakdown = (Array.isArray(r.grade_breakdown) ? r.grade_breakdown : []) as GradedQuestion[]
      const raw = breakdown.reduce((s, q) => s + Number(q.marksAwarded || 0), 0)
      const possible = breakdown.length ? breakdown.reduce((s, q) => s + Number(q.marksPossible || 0), 0) : Number(r.total_possible_marks)
      // No breakdown (rare): the stored total already includes the old adjustments.
      const graded = breakdown.length ? raw : Number(r.total_marks) - adjustedTotals(0, possible, r.adjustments).change
      const t = adjustedTotals(graded, possible, step.adjustments, normalizeScale(r.grade_scale))
      await supabase.from('grading_results')
        .update({ adjustments: step.adjustments, total_marks: t.marks, total_possible_marks: possible, percentage: t.percentage, grade: t.grade, updated_at: now })
        .eq('id', step.id).eq('user_id', user.id)
      changed++
    }
    return NextResponse.json({ ok: true, changed })
  }

  // Re-mark one question across the set: also accept other answers, or full
  // marks for everyone. { acceptAnswer: { question, answers, everyone, reason }, preview? }
  if (body.acceptAnswer && typeof body.acceptAnswer === 'object') {
    const a = body.acceptAnswer as Record<string, unknown>
    const accept: AcceptAnswer = {
      question: typeof a.question === 'string' ? a.question.trim().slice(0, 50) : '',
      answers: typeof a.answers === 'string' ? normalizeAnswerList(a.answers) : Array.isArray(a.answers) ? normalizeAnswerList(a.answers.map(String).join(' ')) : [],
      everyone: a.everyone === true,
      reason: typeof a.reason === 'string' ? a.reason.trim().slice(0, 200) || undefined : undefined,
    }
    if (!accept.question || (!accept.everyone && !accept.answers.length)) return NextResponse.json({ error: 'Pick the question and the answers to accept' }, { status: 400 })
    const papers = rows.map((r) => ({ id: r.id, name: r.student_name ?? '', breakdown: (Array.isArray(r.grade_breakdown) ? r.grade_breakdown : []) as GradedQuestion[] }))
    const plan = acceptAnswerPlan(papers, accept)
    if (body.preview === true) return NextResponse.json({ plan })
    let changed = 0
    for (const step of plan) {
      if (!step.changed) continue
      const r = rows.find((p) => p.id === step.id)!
      const breakdown = applyAcceptance(papers.find((p) => p.id === step.id)!.breakdown, accept)
      const raw = breakdown.reduce((s, q) => s + Number(q.marksAwarded || 0), 0)
      const possible = breakdown.reduce((s, q) => s + Number(q.marksPossible || 0), 0) || Number(r.total_possible_marks)
      const t = adjustedTotals(raw, possible, normalizeAdjustments(r.adjustments), normalizeScale(r.grade_scale))
      await supabase.from('grading_results')
        .update({ grade_breakdown: breakdown, total_marks: t.marks, total_possible_marks: possible, percentage: t.percentage, grade: t.grade, updated_at: now })
        .eq('id', step.id).eq('user_id', user.id)
      changed++
    }
    return NextResponse.json({ ok: true, changed, plan })
  }

  // A new answer key for the set (then the teacher regrades the papers against it).
  if (body.markScheme && typeof body.markScheme === 'object') {
    const scheme = body.markScheme as { texts?: unknown; images?: unknown }
    const texts = (Array.isArray(scheme.texts) ? scheme.texts : [])
      .filter((t): t is { name: string; content: string } => !!t && typeof t.name === 'string' && typeof t.content === 'string' && !!t.content.trim())
      .slice(0, 20).map((t) => ({ name: t.name.slice(0, 200), content: t.content.slice(0, 200_000) }))
    const images = (Array.isArray(scheme.images) ? scheme.images : [])
      .filter((i): i is { url: string; name?: string } => !!i && typeof i.url === 'string')
      .slice(0, 40).map((i) => ({ url: i.url.slice(0, 500), name: String(i.name ?? '').slice(0, 200) }))
    if (!texts.length && !images.length) return NextResponse.json({ error: 'The answer key is empty' }, { status: 400 })
    const { data: existing } = await supabase.from('grading_batches').select('user_id').eq('batch_id', id).maybeSingle()
    if (existing && existing.user_id !== user.id) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    const { error: upErr } = await supabase.from('grading_batches').upsert({ batch_id: id, user_id: user.id, mark_scheme: { texts, images }, updated_at: now }, { onConflict: 'batch_id' })
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })
    return NextResponse.json({ ok: true })
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
