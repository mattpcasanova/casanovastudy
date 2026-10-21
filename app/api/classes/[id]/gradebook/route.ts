import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { loadRoster, ownedClass } from '@/lib/classes/server'
import { buildGradebook, type GradebookPractice } from '@/lib/classes/gradebook'
import { ASSIGNMENT_COLUMNS, assignmentProgress, type AssignmentRow } from '@/lib/practice/server'

// A class's gradebook grid: every graded set for the class × every student,
// with absent/missing/exempt/late where there's no paper. Owner only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  const supabase = createAdminClient()
  if (!(await ownedClass(supabase, user.id, id))) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const [{ data: papers }, roster] = await Promise.all([
    supabase.from('grading_results')
      .select('id, batch_id, exam_title, created_at, roster_id, student_name, total_marks, total_possible_marks, percentage, grade')
      .eq('class_id', id).eq('user_id', user.id).not('batch_id', 'is', null).limit(5000),
    loadRoster(supabase, id),
  ])
  const batchIds = [...new Set((papers ?? []).map((p) => p.batch_id as string))]
  const { data: statuses } = batchIds.length
    ? await supabase.from('batch_student_status').select('batch_id, roster_id, status').in('batch_id', batchIds).eq('user_id', user.id)
    : { data: [] as Array<{ batch_id: string; roster_id: string; status: string }> }

  // Assigned practice for this class: a column each, best counted attempt.
  const { data: assignments } = await supabase.from('practice_assignments').select(ASSIGNMENT_COLUMNS).eq('class_id', id).eq('teacher_id', user.id)
  const progress = await assignmentProgress(supabase, (assignments ?? []) as AssignmentRow[])
  const practice: GradebookPractice[] = ((assignments ?? []) as AssignmentRow[]).flatMap((a) =>
    (progress.get(a.id) ?? []).map((st) => ({ assignmentId: a.id, title: a.title, date: a.due_at ?? a.created_at, rosterId: st.rosterId, status: st.status, daysLate: st.daysLate, best: st.best ? { correct: st.best.correct, total: st.best.total, pct: st.best.pct } : null })),
  )

  const gradebook = buildGradebook(
    (papers ?? []).map((p) => ({
      id: p.id, batchId: p.batch_id, title: p.exam_title, createdAt: p.created_at, rosterId: p.roster_id, studentName: p.student_name ?? '',
      marks: Number(p.total_marks), possible: Number(p.total_possible_marks), percentage: Number(p.percentage), grade: p.grade ?? '',
    })),
    roster,
    (statuses ?? []).map((s) => ({ batchId: s.batch_id, rosterId: s.roster_id, status: s.status })),
    practice,
  )
  return NextResponse.json(gradebook, { headers: { 'Cache-Control': 'no-store' } })
}
