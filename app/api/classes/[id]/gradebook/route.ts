import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { loadRoster, ownedClass } from '@/lib/classes/server'
import { buildGradebook } from '@/lib/classes/gradebook'

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

  const gradebook = buildGradebook(
    (papers ?? []).map((p) => ({
      id: p.id, batchId: p.batch_id, title: p.exam_title, createdAt: p.created_at, rosterId: p.roster_id, studentName: p.student_name ?? '',
      marks: Number(p.total_marks), possible: Number(p.total_possible_marks), percentage: Number(p.percentage), grade: p.grade ?? '',
    })),
    roster,
    (statuses ?? []).map((s) => ({ batchId: s.batch_id, rosterId: s.roster_id, status: s.status })),
  )
  return NextResponse.json(gradebook, { headers: { 'Cache-Control': 'no-store' } })
}
