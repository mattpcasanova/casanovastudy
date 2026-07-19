import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { loadMasteryContext } from '@/lib/mastery/rounds'

const MAX_REASONABLE_TIME_SEC = 600

function timeSec(served: string | null, answered: string | null): number | null {
  if (!served || !answered) return null
  const s = new Date(served).getTime()
  const a = new Date(answered).getTime()
  if (Number.isNaN(s) || Number.isNaN(a)) return null
  const sec = (a - s) / 1000
  if (sec < 0 || sec > MAX_REASONABLE_TIME_SEC) return null
  return Math.round(sec)
}

type Snapshot = {
  type: 'multiple_choice' | 'true_false' | 'short_answer'
  question_text: string
  options: string[] | null
  correct_answer: Record<string, unknown>
}

function labelFor(
  snap: Snapshot,
  value: { index?: number; value?: boolean; text?: string } | null,
): string {
  if (!value) return '—'
  if (snap.type === 'multiple_choice' && typeof value.index === 'number')
    return snap.options?.[value.index] ?? `Option ${value.index + 1}`
  if (snap.type === 'true_false' && typeof value.value === 'boolean') return value.value ? 'True' : 'False'
  if (snap.type === 'short_answer') return value.text ?? '—'
  return '—'
}

function correctLabel(snap: Snapshot): string {
  if (snap.type === 'multiple_choice' && typeof snap.correct_answer.index === 'number')
    return snap.options?.[snap.correct_answer.index as number] ?? `Option ${(snap.correct_answer.index as number) + 1}`
  if (snap.type === 'true_false') return snap.correct_answer.value ? 'True' : 'False'
  if (snap.type === 'short_answer') return String(snap.correct_answer.sample_answer ?? '')
  return ''
}

// GET - One student's mastery attempt in detail: total time on questions and
// every answered question (their answer, correctness, per-question time, feedback).
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id: assignmentId } = await params
    const attemptId = request.nextUrl.searchParams.get('attempt_id')
    if (!attemptId) return NextResponse.json({ error: 'attempt_id required' }, { status: 400 })

    const supabase = createAdminClient()
    const context = await loadMasteryContext(supabase, assignmentId)
    if (!context) return NextResponse.json({ error: 'Mastery quiz not found' }, { status: 404 })
    if (context.assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: attempt } = await supabase
      .from('mastery_attempts')
      .select('id, student_id, status, started_at, completed_at')
      .eq('id', attemptId)
      .eq('assignment_id', assignmentId)
      .maybeSingle()
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', attempt.student_id)
      .maybeSingle()

    const { data: rows } = await supabase
      .from('mastery_responses')
      .select('concept_id, question_snapshot, answer, is_correct, score, ai_feedback, served_at, answered_at')
      .eq('attempt_id', attemptId)
      .not('answered_at', 'is', null)
      .order('served_at', { ascending: true })

    const conceptName = new Map(context.concepts.map((c) => [c.id, c.name]))

    let totalTimeSec = 0
    const responses = (rows ?? []).map((r) => {
      const snap = r.question_snapshot as Snapshot
      const t = timeSec(r.served_at, r.answered_at)
      if (t !== null) totalTimeSec += t
      return {
        concept_name: conceptName.get(r.concept_id) ?? 'Concept',
        type: snap.type,
        question_text: snap.question_text,
        their_answer: labelFor(snap, r.answer as { index?: number; value?: boolean; text?: string } | null),
        correct_answer: correctLabel(snap),
        is_correct: r.is_correct === true,
        score: typeof r.score === 'number' ? r.score : null,
        ai_feedback: r.ai_feedback ?? null,
        time_sec: t,
      }
    })

    const answered = responses.length
    const correct = responses.filter((r) => r.is_correct).length

    return NextResponse.json({
      name: profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
        : 'Student',
      status: attempt.status,
      started_at: attempt.started_at,
      completed_at: attempt.completed_at,
      total_time_sec: totalTimeSec,
      answered,
      correct,
      responses,
    })
  } catch (error) {
    console.error('Mastery student detail error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
