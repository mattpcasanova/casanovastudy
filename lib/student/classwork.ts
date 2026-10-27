// Server side of "My Classes" for students (service role; callers pass the
// signed-in user's id from the session). Classes come from roster names linked
// to them and classes they joined with a code; reports only once released.

import type { SupabaseClient } from '@supabase/supabase-js'
import { bestAttempt, practiceDaysLate, practiceStatus } from '@/lib/practice/assignments'
import { firstGradedBySet, lateDaysByPaper } from '@/lib/grading/late'
import { missingTests } from './classwork-rules'
import { schoolYearFor } from '@/lib/classes/years'
import { classroomWorkUrl } from '@/lib/google/links'

export interface StudentClass { id: string; name: string; period: string | null; teacherName: string | null }
export interface StudentPractice {
  id: string; title: string; grading: string; dueAt: string | null; guideId: string; createdAt: string
  classId: string; status: string; daysLate: number; best: { pct: number; correct: number; total: number } | null
}
export interface StudentSharedGuide { id: string; guideId: string; title: string; format: string; note: string | null; classId: string; createdAt: string }
export interface StudentReportRow {
  id: string; title: string; classId: string | null; className: string | null; teacherName: string | null
  marks: number; possible: number; pct: number; grade: string | null; createdAt: string; daysLate: number | null
}

const fullName = (p?: { first_name?: string | null; last_name?: string | null } | null) =>
  p ? [p.first_name, p.last_name].filter(Boolean).join(' ') || null : null

/** Practice assigned to the student through any roster name linked to them. */
export async function assignedPracticeFor(supabase: SupabaseClient, userId: string, rosterIds?: string[]): Promise<StudentPractice[]> {
  if (!rosterIds) {
    const { data: rows } = await supabase.from('class_roster').select('id').eq('student_user_id', userId)
    rosterIds = (rows ?? []).map((r) => r.id as string)
  }
  if (!rosterIds.length) return []
  const { data: links } = await supabase
    .from('practice_assignment_students')
    .select('roster_id, practice_assignments!inner(id, class_id, title, grading, due_at, max_attempts, study_guide_id, created_at)')
    .in('roster_id', rosterIds)
  type Row = { id: string; class_id: string; title: string; grading: string; due_at: string | null; max_attempts: number | null; study_guide_id: string; created_at: string }
  const list = (links ?? []).map((l) => (Array.isArray(l.practice_assignments) ? l.practice_assignments[0] : l.practice_assignments) as Row)
  const ids = list.map((a) => a.id)
  const { data: tries } = ids.length ? await supabase.from('practice_attempts').select('assignment_id, pct, correct, total, counted, finished_at').in('assignment_id', ids).eq('student_user_id', userId) : { data: [] }
  return list.map((a) => {
    const mine = (tries ?? []).filter((t) => t.assignment_id === a.id).map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, finishedAt: t.finished_at as string }))
    return { id: a.id, title: a.title, grading: a.grading, dueAt: a.due_at, guideId: a.study_guide_id, createdAt: a.created_at, classId: a.class_id, status: practiceStatus(mine, a.due_at), daysLate: practiceDaysLate(mine, a.due_at), best: bestAttempt(mine) }
  }).sort((x, y) => (x.status === 'done' ? 1 : 0) - (y.status === 'done' ? 1 : 0) || (x.dueAt ?? '9').localeCompare(y.dueAt ?? '9'))
}

/** Everything for the student's My Classes page and homepage strip. */
export async function loadClasswork(supabase: SupabaseClient, userId: string) {
  const [{ data: rosterRows }, { data: enrollments }, { data: reportRows }] = await Promise.all([
    supabase.from('class_roster').select('id, class_id, left_at').eq('student_user_id', userId),
    supabase.from('class_enrollments').select('class_id').eq('student_id', userId).eq('status', 'active'),
    supabase.from('grading_results')
      .select('id, user_id, batch_id, roster_id, class_id, exam_title, class_name, total_marks, total_possible_marks, percentage, grade, created_at')
      .eq('student_user_id', userId).eq('released', true).order('created_at', { ascending: false }).limit(200),
  ])
  const roster = rosterRows ?? []
  const classIds = [...new Set([...roster.filter((r) => !r.left_at).map((r) => r.class_id as string), ...(enrollments ?? []).map((e) => e.class_id as string)])]
  const reports = reportRows ?? []

  const [{ data: classRows }, practice] = await Promise.all([
    classIds.length ? supabase.from('classes').select('id, name, period, teacher_id, is_archived, school_year').in('id', classIds) : Promise.resolve({ data: [] as Array<{ id: string; name: string; period: string | null; teacher_id: string; is_archived: boolean | null; school_year: string | null }> }),
    assignedPracticeFor(supabase, userId, roster.map((r) => r.id as string)),
  ])
  // This school year's classes only; reports from earlier years stay listed.
  const year = schoolYearFor()
  const classes = (classRows ?? []).filter((c) => !c.is_archived && (!c.school_year || c.school_year === year))
  const teacherIds = [...new Set([...classes.map((c) => c.teacher_id as string), ...reports.map((r) => r.user_id as string)])]
  const { data: teachers } = teacherIds.length ? await supabase.from('user_profiles').select('id, first_name, last_name').in('id', teacherIds) : { data: [] }
  const teacherName = new Map((teachers ?? []).map((t) => [t.id as string, fullName(t)]))

  // Late papers: the set's status for this student says late; days from the set's first paper.
  const batchIds = [...new Set(reports.map((r) => r.batch_id).filter(Boolean) as string[])]
  const rosterIds = [...new Set(reports.map((r) => r.roster_id).filter(Boolean) as string[])]
  const [{ data: statuses }, { data: setPapers }] = batchIds.length && rosterIds.length
    ? await Promise.all([
        supabase.from('batch_student_status').select('batch_id, roster_id, status').in('batch_id', batchIds).in('roster_id', rosterIds).eq('status', 'late'),
        supabase.from('grading_results').select('batch_id, created_at').in('batch_id', batchIds).limit(5000),
      ])
    : [{ data: [] }, { data: [] }]
  const late = lateDaysByPaper(reports as Array<{ id: string; batch_id: string | null; roster_id: string | null; created_at: string }>, statuses ?? [], firstGradedBySet(setPapers ?? []))

  // Graded tests in their classes with no paper from them (teacher sees "No paper").
  const myRoster = roster.filter((r) => !r.left_at)
  const rosterClassIds = [...new Set(myRoster.map((r) => r.class_id as string))].filter((id) => classes.some((c) => c.id === id))
  const [{ data: classPapers }, { data: myStatuses }] = rosterClassIds.length
    ? await Promise.all([
        supabase.from('grading_results').select('batch_id, class_id, exam_title, created_at, roster_id').in('class_id', rosterClassIds).not('batch_id', 'is', null).limit(10000),
        supabase.from('batch_student_status').select('batch_id, status').in('roster_id', myRoster.map((r) => r.id as string)),
      ])
    : [{ data: [] }, { data: [] }]
  const found = missingTests(
    (classPapers ?? []).map((p) => ({ batchId: p.batch_id as string, classId: p.class_id as string, title: p.exam_title, createdAt: p.created_at, rosterId: p.roster_id })),
    new Set(myRoster.map((r) => r.id as string)),
    (myStatuses ?? []).map((s) => ({ batchId: s.batch_id as string, status: s.status as string })),
  )
  // Sets graded from a Classroom assignment link back to it, so they can turn it in there.
  const { data: setups } = found.length
    ? await supabase.from('grading_batches').select('batch_id, classroom_course_id, classroom_work_id').in('batch_id', found.map((t) => t.batchId))
    : { data: [] }
  const linkOf = new Map((setups ?? []).map((g) => [g.batch_id as string, classroomWorkUrl(g.classroom_course_id, g.classroom_work_id)]))
  const tests = found.map((t) => ({ ...t, classroomUrl: linkOf.get(t.batchId) ?? null }))

  // Guides the teacher shared with the class (no grading), newest first.
  const { data: sharedRows } = classes.length
    ? await supabase.from('class_shared_guides').select('id, class_id, study_guide_id, note, created_at, study_guides(title, format)').in('class_id', classes.map((c) => c.id)).order('created_at', { ascending: false }).limit(100)
    : { data: [] }
  const shared: StudentSharedGuide[] = (sharedRows ?? []).map((r) => {
    const g = (Array.isArray(r.study_guides) ? r.study_guides[0] : r.study_guides) as { title: string; format: string } | null
    return { id: r.id as string, guideId: r.study_guide_id as string, title: g?.title ?? 'Study guide', format: g?.format ?? '', note: r.note as string | null, classId: r.class_id as string, createdAt: r.created_at as string }
  })

  const openIds = new Set(classes.map((c) => c.id))
  return {
    shared,
    classes: classes.map((c): StudentClass => ({ id: c.id, name: c.name, period: c.period, teacherName: teacherName.get(c.teacher_id) ?? null })),
    // Work from a class they've since left stays listed (it's still theirs).
    assignments: practice,
    missingTests: tests,
    reports: reports.map((r): StudentReportRow => ({
      id: r.id, title: r.exam_title || 'Graded work', classId: r.class_id && openIds.has(r.class_id) ? r.class_id : null,
      className: r.class_name, teacherName: teacherName.get(r.user_id) ?? null,
      marks: Number(r.total_marks), possible: Number(r.total_possible_marks), pct: Number(r.percentage), grade: r.grade,
      createdAt: r.created_at, daysLate: late.get(r.id) ?? null,
    })),
  }
}
