import { NextRequest, NextResponse } from 'next/server'
import { getRequestUser } from '@/lib/request-user'
import { createAdminClient } from '@/lib/supabase-server'
import { attemptsLeft, bestAttempt } from '@/lib/practice/assignments'
import { myAssignedRow } from '@/lib/practice/server'
import { sanitizeAnswers } from '@/lib/practice/report'

// A student finished a run of their assigned practice.
// POST { correct, total, detail?: { mastered?, notMastered?, answers? } } -> { counted, best, attemptsLeft }
// Percent: correct/total of first answers. Mastery (adaptive): correct =
// concepts mastered, total = concepts.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getRequestUser(request)
  if (!user) return NextResponse.json({ error: 'Sign in first' }, { status: 401 })
  const { id } = await params
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  let body: Record<string, unknown>
  try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid request' }, { status: 400 }) }
  const correct = Number(body.correct), total = Number(body.total)
  if (!Number.isFinite(correct) || !Number.isFinite(total) || total <= 0 || total > 1000 || correct < 0 || correct > total) return NextResponse.json({ error: 'Invalid score' }, { status: 400 })

  const supabase = createAdminClient()
  const { data: a } = await supabase.from('practice_assignments').select('id, max_attempts').eq('id', id).maybeSingle()
  if (!a) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  const rosterId = await myAssignedRow(supabase, id, user.id)
  if (!rosterId) return NextResponse.json({ error: 'Not assigned to you' }, { status: 403 })

  const { data: prior } = await supabase.from('practice_attempts').select('pct, correct, total, counted, auto, finished_at').eq('assignment_id', id).eq('roster_id', rosterId)
  const list = (prior ?? []).map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, auto: !!t.auto, finishedAt: t.finished_at as string }))
  const left = attemptsLeft(a.max_attempts, list)
  const counted = left == null || left > 0
  const pct = Math.round((correct / total) * 1000) / 10
  // Adaptive: which concepts were mastered (names, for the teacher). All
  // formats: the first answer per question, for the class report.
  const d = (body.detail ?? null) as { mastered?: unknown; notMastered?: unknown; answers?: unknown } | null
  const names = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 20).map((x) => x.slice(0, 120)) : [])
  const answers = d && typeof d === 'object' ? sanitizeAnswers(d.answers) : null
  const detail = d && typeof d === 'object'
    ? { ...(Array.isArray(d.mastered) || Array.isArray(d.notMastered) ? { mastered: names(d.mastered), notMastered: names(d.notMastered) } : {}), ...(answers ? { answers } : {}) }
    : null
  const finishedAt = new Date().toISOString()
  const { error } = await supabase.from('practice_attempts').insert({ assignment_id: id, roster_id: rosterId, student_user_id: user.id, correct, total, pct, detail, counted, finished_at: finishedAt })
  if (error) { console.error('Attempt insert failed:', error); return NextResponse.json({ error: 'Could not save your score' }, { status: 500 }) }
  const all = [...list, { pct, correct, total, counted, finishedAt }]
  return NextResponse.json({ counted, best: bestAttempt(all), attemptsLeft: attemptsLeft(a.max_attempts, all) })
}
