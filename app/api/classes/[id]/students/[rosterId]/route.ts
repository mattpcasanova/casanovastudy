import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { areaBatchesFor, loadRoster, ownedClass } from '@/lib/classes/server'
import { classAreas } from '@/lib/classes/areas'
import { buildProfile, type AnswerRow } from '@/lib/learner/profile'

// One student in a class: graded work (with "no paper" statuses), how they do
// by area next to the class, and, only if they joined the class with its
// code, their own study activity (accuracy, streak, weak topics). Owner only.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string; rosterId: string }> }) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const { id, rosterId } = await params
  const supabase = createAdminClient()
  const cls = await ownedClass(supabase, user.id, id)
  if (!cls) return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  const student = (await loadRoster(supabase, id)).find((r) => r.id === rosterId)
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })

  const [{ data: papers }, { data: classPapers }, { data: statuses }, { data: enrollment }] = await Promise.all([
    supabase.from('grading_results')
      .select('id, batch_id, exam_title, created_at, total_marks, total_possible_marks, percentage, grade, released, group_members')
      .eq('user_id', user.id).eq('roster_id', rosterId).order('created_at', { ascending: false }),
    supabase.from('grading_results').select('batch_id, exam_title, created_at, percentage').eq('user_id', user.id).eq('class_id', id).not('batch_id', 'is', null),
    supabase.from('batch_student_status').select('batch_id, status, updated_at').eq('roster_id', rosterId).eq('user_id', user.id),
    student.studentUserId
      ? supabase.from('class_enrollments').select('status').eq('class_id', id).eq('student_id', student.studentUserId).eq('status', 'active').maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  // Class averages per graded set, for "vs class" on each test.
  const sets = new Map<string, { title: string | null; date: string; total: number; n: number }>()
  for (const p of classPapers ?? []) {
    const s = sets.get(p.batch_id) ?? { title: p.exam_title, date: p.created_at, total: 0, n: 0 }
    s.total += Number(p.percentage)
    s.n += 1
    sets.set(p.batch_id, s)
  }
  const work = (papers ?? []).map((p) => ({
    kind: 'paper' as const,
    id: p.id,
    batchId: p.batch_id,
    title: p.exam_title || 'Untitled',
    date: p.created_at,
    marks: Number(p.total_marks),
    possible: Number(p.total_possible_marks),
    pct: Number(p.percentage),
    grade: p.grade,
    released: p.released,
    group: Array.isArray(p.group_members) && p.group_members.length > 1 ? (p.group_members as Array<{ name: string }>).map((m) => m.name) : null,
    classAverage: p.batch_id && sets.get(p.batch_id)?.n ? sets.get(p.batch_id)!.total / sets.get(p.batch_id)!.n : null,
  }))
  const gradedBatches = new Set(work.map((w) => w.batchId))
  const missing = (statuses ?? []).filter((s) => !gradedBatches.has(s.batch_id) && sets.has(s.batch_id)).map((s) => ({
    kind: 'status' as const,
    batchId: s.batch_id,
    title: sets.get(s.batch_id)!.title || 'Untitled',
    date: sets.get(s.batch_id)!.date,
    status: s.status,
  }))

  // Areas: this student next to the class.
  const areas = classAreas(await areaBatchesFor(supabase, user.id, [id]))
    .map((a) => {
      const me = a.students.find((s) => s.key === rosterId)
      return me ? { name: a.name, pct: me.pct, classPct: a.pct, earned: me.earned, possible: me.possible } : null
    })
    .filter((a): a is NonNullable<typeof a> => !!a)
    .sort((a, b) => a.pct - b.pct)

  // Their own study activity: only when they joined this class with its code.
  let study = null
  if (student.studentUserId && enrollment) {
    const { data: rows } = await supabase
      .from('study_results')
      .select('subject, topic, correct, answered_at, study_guide_id, item_id')
      .eq('user_id', student.studentUserId)
      .order('answered_at', { ascending: false })
      .limit(3000)
    const profile = buildProfile((rows ?? []) as AnswerRow[])
    study = {
      answered: profile.answered,
      accuracy: profile.accuracy,
      streak: profile.streak,
      last14: profile.last14,
      weak: profile.weak.slice(0, 6).map((t) => ({ topic: t.topic, pct: Math.round(t.recentAccuracy * 100), answered: t.answered })),
      strong: profile.strong.slice(0, 6).map((t) => ({ topic: t.topic, pct: Math.round(t.recentAccuracy * 100) })),
    }
  }

  return NextResponse.json({
    class: { id: cls.id, name: cls.name, period: cls.period, schoolYear: cls.school_year },
    student: { ...student, joined: !!enrollment },
    work: [...work, ...missing].sort((a, b) => b.date.localeCompare(a.date)),
    areas,
    study,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
