import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { getRequestUser } from '@/lib/request-user'
import { requireTeacher } from '@/lib/api-auth'
import type { GradedQuestion } from '@/lib/grading/parse'
import { normalizeScale } from '@/lib/grading/scale'
import { normalizeMarkingStyle } from '@/lib/grading/marking-style'
import { settingsFromRow } from '@/lib/grading/report-settings'
import { paperDaysLate } from '@/lib/grading/late'
import { adjustedTotals, normalizeAdjustments } from '@/lib/grading/adjustments'

const str = (v: unknown, max: number): string | undefined =>
  typeof v === 'string' ? v.trim().slice(0, max) : undefined

function cleanQuestion(raw: unknown): GradedQuestion | string {
  if (!raw || typeof raw !== 'object') return 'Invalid question'
  const q = raw as Record<string, unknown>
  const questionNumber = String(q.questionNumber ?? '').trim().slice(0, 50)
  const marksAwarded = Number(q.marksAwarded)
  const marksPossible = Number(q.marksPossible)
  if (!questionNumber) return 'Every question needs a number'
  if (!Number.isFinite(marksPossible) || marksPossible < 0) return `Invalid marks possible for question ${questionNumber}`
  if (!Number.isFinite(marksAwarded) || marksAwarded < 0) return `Invalid marks awarded for question ${questionNumber}`
  if (marksAwarded > marksPossible) return `Marks awarded cannot exceed marks possible for question ${questionNumber}`
  const out: GradedQuestion = { questionNumber, marksAwarded, marksPossible, explanation: String(q.explanation ?? '').slice(0, 4000) }
  const markCodes = str(q.markCodes, 120)
  const level = str(q.level, 20)
  if (markCodes) out.markCodes = markCodes
  if (level) out.level = level
  if (q.ao && typeof q.ao === 'object') {
    const ao: Record<string, number> = {}
    for (const [k, v] of Object.entries(q.ao as Record<string, unknown>).slice(0, 8)) {
      const n = Number(v)
      if (/^AO\d+$/i.test(k) && Number.isFinite(n) && n >= 0) ao[k.toUpperCase()] = n
    }
    if (Object.keys(ao).length) out.ao = ao
  }
  return out
}

// Teacher edits on a report: marks/feedback, name, exam details, overall
// comment, grade scale, extra credit / deductions. Any subset may be sent;
// totals and the grade are recomputed from the breakdown plus adjustments.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { user, error } = await requireTeacher(request)
  if (error) return error

  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ success: false, error: 'Invalid request' }, { status: 400 }) }

  const supabase = createAdminClient()
  const { data: row } = await supabase
    .from('grading_results')
    .select('user_id, grade_breakdown, grade_scale, student_first_name, student_last_name, group_id, adjustments')
    .eq('id', id)
    .single()
  if (!row) return NextResponse.json({ success: false, error: 'Grading result not found' }, { status: 404 })
  if (row.user_id !== user.id) return NextResponse.json({ success: false, error: 'You do not have permission to edit this grading result' }, { status: 403 })

  const update: Record<string, unknown> = { updated_at: new Date().toISOString() }

  let breakdown = (row.grade_breakdown ?? []) as GradedQuestion[]
  if (body.gradeBreakdown !== undefined) {
    if (!Array.isArray(body.gradeBreakdown) || body.gradeBreakdown.length > 300) {
      return NextResponse.json({ success: false, error: 'Invalid grade breakdown data' }, { status: 400 })
    }
    const cleaned: GradedQuestion[] = []
    for (const q of body.gradeBreakdown) {
      const c = cleanQuestion(q)
      if (typeof c === 'string') return NextResponse.json({ success: false, error: c }, { status: 400 })
      cleaned.push(c)
    }
    breakdown = cleaned
    update.grade_breakdown = cleaned
    update.reviewed_at = update.updated_at // editing marks = the teacher checked them
  }
  // "Done" on the report: checked, even with nothing changed.
  if (body.reviewed === true) update.reviewed_at = update.updated_at

  let scale = normalizeScale(row.grade_scale)
  if (body.gradeScale !== undefined) {
    scale = normalizeScale(body.gradeScale)
    update.grade_scale = scale
  }
  if (body.markingStyle !== undefined) update.marking_style = normalizeMarkingStyle(body.markingStyle)
  if (typeof body.released === 'boolean') update.released = body.released
  // Extra credit and deductions are this student's own (never copied to a group).
  let adjustments = normalizeAdjustments(row.adjustments)
  if (body.adjustments !== undefined) {
    adjustments = normalizeAdjustments(body.adjustments)
    update.adjustments = adjustments
  }

  // Name: first/last are the source of truth; student_name follows them.
  const first = str(body.studentFirstName, 60)
  const last = str(body.studentLastName, 60)
  if (first !== undefined || last !== undefined) {
    const f = first ?? row.student_first_name ?? ''
    const l = last ?? row.student_last_name ?? ''
    update.student_first_name = f || null
    update.student_last_name = l || null
    update.student_name = `${f} ${l}`.trim() || 'Student'
  }
  const fields: Array<[string, string, number]> = [
    ['examTitle', 'exam_title', 200],
    ['className', 'class_name', 120],
    ['classPeriod', 'class_period', 20],
    ['teacherComment', 'teacher_comment', 4000],
  ]
  for (const [key, column, max] of fields) {
    const v = str(body[key], max)
    if (v !== undefined) update[column] = v || null
  }

  const rawMarks = breakdown.reduce((s, q) => s + q.marksAwarded, 0)
  const totalPossible = breakdown.reduce((s, q) => s + q.marksPossible, 0)
  const totals = adjustedTotals(rawMarks, totalPossible, adjustments, scale)
  Object.assign(update, {
    total_marks: totals.marks,
    total_possible_marks: totalPossible,
    percentage: totals.percentage,
    grade: totals.grade,
  })

  const { error: updateError } = await supabase.from('grading_results').update(update).eq('id', id).eq('user_id', user.id)
  if (updateError) {
    console.error('Update grading result failed:', updateError)
    return NextResponse.json({ success: false, error: 'Failed to update grading result' }, { status: 500 })
  }

  // Group work: marks, feedback, comment and exam details go to every member (names stay their own).
  if (body.applyToGroup === true && row.group_id) {
    const shared: Record<string, unknown> = {}
    for (const k of ['grade_breakdown', 'grade_scale', 'marking_style', 'teacher_comment', 'exam_title', 'class_name', 'class_period', 'updated_at', 'reviewed_at']) {
      if (k in update) shared[k] = update[k]
    }
    // Totals per member: each keeps their own extra credit / deductions.
    const { data: members } = await supabase.from('grading_results').select('id, adjustments').eq('group_id', row.group_id).eq('user_id', user.id).neq('id', id)
    for (const m of members ?? []) {
      const t = adjustedTotals(rawMarks, totalPossible, normalizeAdjustments(m.adjustments), scale)
      await supabase.from('grading_results')
        .update({ ...shared, total_marks: t.marks, total_possible_marks: totalPossible, percentage: t.percentage, grade: t.grade })
        .eq('id', m.id).eq('user_id', user.id)
    }
  }

  return NextResponse.json({
    success: true,
    data: { totalMarks: totals.marks, rawMarks, totalPossibleMarks: totalPossible, percentage: totals.percentage, grade: totals.grade },
  })
}

// GET handler to fetch a grading result by ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    // Reports hold student data: only the teacher who graded it, or the linked
    // student once the teacher has released it, can read one.
    const supabase = createAdminClient()

    const { data: gradingResult, error } = await supabase
      .from('grading_results')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !gradingResult) {
      return NextResponse.json(
        { success: false, error: 'Grading result not found' },
        { status: 404 }
      )
    }

    // Ownership (shows edit controls) comes from the session, not a query param.
    const requestUserId = (await getRequestUser(request))?.id ?? null
    const canRead = !!requestUserId && (requestUserId === gradingResult.user_id || (requestUserId === gradingResult.student_user_id && gradingResult.released !== false))
    if (!canRead) {
      return NextResponse.json({ success: false, error: 'Grading result not found' }, { status: 404 })
    }

    // The report prints with its teacher's settings (branding, school name...).
    const { data: settingsRow } = await supabase
      .from('teacher_report_settings')
      .select('*')
      .eq('user_id', gradingResult.user_id)
      .maybeSingle()

    // Handed in after being marked absent/missing: days after the set was first graded.
    let daysLate: number | null = null
    if (gradingResult.batch_id && gradingResult.roster_id) {
      const { data: status } = await supabase.from('batch_student_status').select('status')
        .eq('batch_id', gradingResult.batch_id).eq('roster_id', gradingResult.roster_id).eq('user_id', gradingResult.user_id).maybeSingle()
      if (status?.status === 'late') {
        const { data: first } = await supabase.from('grading_results').select('created_at')
          .eq('batch_id', gradingResult.batch_id).eq('user_id', gradingResult.user_id).order('created_at', { ascending: true }).limit(1).maybeSingle()
        daysLate = paperDaysLate(first?.created_at, gradingResult.created_at)
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        id: gradingResult.id,
        studentName: gradingResult.student_name,
        studentFirstName: gradingResult.student_first_name,
        studentLastName: gradingResult.student_last_name,
        examTitle: gradingResult.exam_title,
        className: gradingResult.class_name,
        classPeriod: gradingResult.class_period,
        batchId: gradingResult.batch_id,
        // Regrade needs the saved pages (migration 074) and the set's answer key.
        canRegrade: requestUserId === gradingResult.user_id && Array.isArray(gradingResult.page_urls) && gradingResult.page_urls.length > 0 && !!gradingResult.batch_id,
        answerSheetFilename: gradingResult.answer_sheet_filename,
        studentExamFilename: gradingResult.student_exam_filename,
        totalMarks: Number(gradingResult.total_marks),
        totalPossibleMarks: Number(gradingResult.total_possible_marks),
        percentage: Number(gradingResult.percentage),
        grade: gradingResult.grade,
        gradeScale: normalizeScale(gradingResult.grade_scale),
        markingStyle: normalizeMarkingStyle(gradingResult.marking_style),
        content: gradingResult.content,
        gradeBreakdown: gradingResult.grade_breakdown,
        additionalComments: gradingResult.additional_comments,
        teacherComment: gradingResult.teacher_comment,
        adjustments: normalizeAdjustments(gradingResult.adjustments),
        createdAt: gradingResult.created_at,
        updatedAt: gradingResult.updated_at,
        isOwner: requestUserId === gradingResult.user_id,
        groupId: gradingResult.group_id ?? null,
        groupMembers: Array.isArray(gradingResult.group_members) ? gradingResult.group_members.map((m: { name?: string }) => String(m?.name ?? '')).filter(Boolean) : [],
        linkedStudent: !!gradingResult.student_user_id,
        released: gradingResult.released !== false,
        reportSettings: settingsFromRow(settingsRow),
        daysLate,
      }
    })

  } catch (error) {
    console.error('Get grading result error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
