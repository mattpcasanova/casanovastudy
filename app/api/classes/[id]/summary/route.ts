import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { ownedClass } from '@/lib/classes/server'
import { classWeakSpots } from '@/lib/classes/weak-spots'
import { buildProfile, type AnswerRow } from '@/lib/learner/profile'
import { classAreas, type AreaBatch } from '@/lib/classes/areas'
import type { ClassInsightsAI } from '@/lib/grading/insights'

// The class page's lower half: graded class sets for this class, and the
// class's top weak spots from linked students' answers (study_results is
// owner-only RLS, so this reads it with the service role after the owner check).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id } = await params
  const supabase = createAdminClient()
  if (!(await ownedClass(supabase, user.id, id))) return NextResponse.json({ error: 'Class not found' }, { status: 404 })

  const [{ data: graded }, { data: roster }] = await Promise.all([
    supabase.from('grading_results').select('batch_id, exam_title, created_at, percentage, released, roster_id, student_name, grade_breakdown').eq('class_id', id).eq('user_id', user.id).not('batch_id', 'is', null).order('created_at', { ascending: false }).limit(2000),
    supabase.from('class_roster').select('student_user_id').eq('class_id', id).not('student_user_id', 'is', null),
  ])

  const batches = new Map<string, { id: string; title: string | null; createdAt: string; papers: number; total: number; released: boolean }>()
  for (const r of graded ?? []) {
    const b = batches.get(r.batch_id) ?? { id: r.batch_id, title: r.exam_title, createdAt: r.created_at, papers: 0, total: 0, released: true }
    b.papers += 1
    b.total += Number(r.percentage)
    b.released = b.released && r.released
    batches.set(r.batch_id, b)
  }

  const studentIds = (roster ?? []).map((r) => r.student_user_id as string)
  let weakSpots: ReturnType<typeof classWeakSpots> = []
  if (studentIds.length) {
    const { data: rows } = await supabase
      .from('study_results')
      .select('user_id, subject, topic, correct, answered_at')
      .in('user_id', studentIds)
      .order('answered_at', { ascending: false })
      .limit(20000)
    const byStudent = new Map<string, AnswerRow[]>()
    for (const r of rows ?? []) {
      const list = byStudent.get(r.user_id) ?? []
      list.push(r)
      byStudent.set(r.user_id, list)
    }
    weakSpots = classWeakSpots([...byStudent.values()].map((list) => buildProfile(list)))
  }

  // Areas across every graded set that has a class report (its topics).
  const batchIds = [...batches.keys()]
  const { data: reports } = batchIds.length
    ? await supabase.from('grading_batch_insights').select('batch_id, data').in('batch_id', batchIds).eq('user_id', user.id)
    : { data: [] as Array<{ batch_id: string; data: unknown }> }
  const topicsOf = new Map((reports ?? []).map((r) => [r.batch_id, (r.data as ClassInsightsAI)?.topics ?? []]))
  const areaBatches: AreaBatch[] = [...batches.values()].filter((b) => topicsOf.has(b.id)).map((b) => ({
    batchId: b.id,
    title: b.title,
    createdAt: b.createdAt,
    topics: topicsOf.get(b.id)!,
    papers: (graded ?? []).filter((r) => r.batch_id === b.id).map((r) => ({ rosterId: r.roster_id, name: r.student_name ?? '', breakdown: Array.isArray(r.grade_breakdown) ? r.grade_breakdown : [] })),
  }))
  const areas = classAreas(areaBatches)

  return NextResponse.json({
    areas,
    setsWithoutReport: batches.size - areaBatches.length,
    batches: [...batches.values()].map(({ total, ...b }) => ({ ...b, average: b.papers ? total / b.papers : 0 })),
    weakSpots,
    linkedStudents: studentIds.length,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
