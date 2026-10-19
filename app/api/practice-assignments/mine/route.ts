import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { bestAttempt, practiceStatus } from '@/lib/practice/assignments'

// Practice assigned to the signed-in student (through any roster name linked to them).
export async function GET(request: NextRequest) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const supabase = createAdminClient()
  const { data: rows } = await supabase.from('class_roster').select('id').eq('student_user_id', user.id)
  const rosterIds = (rows ?? []).map((r) => r.id as string)
  if (!rosterIds.length) return NextResponse.json({ assignments: [] })
  const { data: links } = await supabase
    .from('practice_assignment_students')
    .select('roster_id, practice_assignments!inner(id, title, grading, due_at, max_attempts, study_guide_id, created_at)')
    .in('roster_id', rosterIds)
  const list = (links ?? []).map((l) => ({ rosterId: l.roster_id as string, a: (Array.isArray(l.practice_assignments) ? l.practice_assignments[0] : l.practice_assignments) as { id: string; title: string; grading: string; due_at: string | null; max_attempts: number | null; study_guide_id: string; created_at: string } }))
  const ids = list.map((x) => x.a.id)
  const { data: tries } = ids.length ? await supabase.from('practice_attempts').select('assignment_id, pct, correct, total, counted, finished_at').in('assignment_id', ids).eq('student_user_id', user.id) : { data: [] }
  return NextResponse.json({
    assignments: list.map(({ a }) => {
      const mine = (tries ?? []).filter((t) => t.assignment_id === a.id).map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, finishedAt: t.finished_at as string }))
      return { id: a.id, title: a.title, grading: a.grading, dueAt: a.due_at, guideId: a.study_guide_id, createdAt: a.created_at, status: practiceStatus(mine, a.due_at), best: bestAttempt(mine) }
    }).sort((x, y) => (x.status === 'done' ? 1 : 0) - (y.status === 'done' ? 1 : 0) || (x.dueAt ?? '9').localeCompare(y.dueAt ?? '9')),
  }, { headers: { 'Cache-Control': 'no-store' } })
}
