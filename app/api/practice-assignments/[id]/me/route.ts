import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { attemptsLeft, bestAttempt, practiceStatus } from '@/lib/practice/assignments'
import { ASSIGNMENT_COLUMNS, aiRuleForGuide, myAssignedRow, type AssignmentRow } from '@/lib/practice/server'
import { sendUnfinishedAtDue } from '@/lib/practice/auto-submit'

// A student's view of one assignment: due date, attempts, best score, and the
// AI help rule for this guide (the strictest of their open assignments on it).
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const supabase = createAdminClient()
  const { data } = await supabase.from('practice_assignments').select(ASSIGNMENT_COLUMNS).eq('id', id).maybeSingle()
  const a = data as AssignmentRow | null
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const rosterId = await myAssignedRow(supabase, a.id, user.id)
  if (!rosterId) return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 })
  await sendUnfinishedAtDue(supabase, [a.id])
  const [{ data: tries }, rule, { data: teacher }] = await Promise.all([
    supabase.from('practice_attempts').select('pct, correct, total, counted, auto, finished_at, detail').eq('assignment_id', a.id).eq('roster_id', rosterId).order('finished_at'),
    aiRuleForGuide(supabase, user.id, a.study_guide_id),
    supabase.from('user_profiles').select('first_name, last_name').eq('id', a.teacher_id).maybeSingle(),
  ])
  const list = (tries ?? []).map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, auto: !!t.auto, finishedAt: t.finished_at as string }))
  return NextResponse.json({
    title: a.title,
    guideId: a.study_guide_id,
    grading: a.grading,
    dueAt: a.due_at,
    maxAttempts: a.max_attempts,
    attempts: list.filter((t) => t.counted && !t.auto).length,
    attemptsLeft: attemptsLeft(a.max_attempts, list),
    best: bestAttempt(list),
    status: practiceStatus(list, a.due_at),
    // Sent for them at the due date with what they had answered (finishing it still counts, as late).
    sentAtDue: (() => {
      const t = (tries ?? []).find((x) => x.auto && x.counted)
      const auto = (t?.detail as { auto?: { answered?: number } } | null)?.auto
      return t && auto ? { answered: Number(auto.answered) || 0, total: Number(t.total), pct: Number(t.pct) } : null
    })(),
    aiHelp: rule?.aiHelp ?? 'full',
    focusMode: !!a.focus_mode,
    teacherName: teacher ? [teacher.first_name, teacher.last_name].filter(Boolean).join(' ') || null : null,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
