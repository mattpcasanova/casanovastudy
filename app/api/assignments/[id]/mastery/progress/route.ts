import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { loadMasteryContext, type AttemptRow } from '@/lib/mastery/rounds'
import { finalizeAttempt } from '@/lib/mastery/finalize'
import { getRollups } from '@/lib/mastery/rounds'

// GET - Teacher's per-student × per-concept progress matrix.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id: assignmentId } = await params
    const supabase = createAdminClient()

    const context = await loadMasteryContext(supabase, assignmentId)
    if (!context) return NextResponse.json({ error: 'Mastery quiz not found' }, { status: 404 })
    if (context.assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: attempts } = await supabase
      .from('mastery_attempts')
      .select('id, student_id, status, current_round, started_at, completed_at')
      .eq('assignment_id', assignmentId)

    const attemptIds = (attempts ?? []).map(a => a.id)
    const { data: rollups } = attemptIds.length
      ? await supabase
          .from('mastery_attempt_concepts')
          .select('attempt_id, concept_id, answered_count, correct_count, recent_results, status')
          .in('attempt_id', attemptIds)
      : { data: [] }

    const studentIds = (attempts ?? []).map(a => a.student_id)
    const { data: profiles } = studentIds.length
      ? await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, email')
          .in('id', studentIds)
      : { data: [] }

    return NextResponse.json({
      concepts: context.concepts.map(c => ({ id: c.id, name: c.name })),
      students: (attempts ?? []).map(a => {
        const profile = (profiles ?? []).find(p => p.id === a.student_id)
        return {
          attempt_id: a.id,
          student_id: a.student_id,
          name: profile
            ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
            : 'Unknown student',
          status: a.status,
          current_round: a.current_round,
          started_at: a.started_at,
          completed_at: a.completed_at,
          concepts: (rollups ?? [])
            .filter(r => r.attempt_id === a.id)
            .map(r => ({
              concept_id: r.concept_id,
              answered_count: r.answered_count,
              correct_count: r.correct_count,
              recent_results: r.recent_results,
              status: r.status,
            })),
        }
      }),
      due_at: context.assignment.due_at,
    })
  } catch (error) {
    console.error('Mastery progress error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Teacher force-finalizes an in-progress attempt (e.g. after the due
// date): grades as-is, unfinished concepts count as not mastered.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id: assignmentId } = await params
    const body = await request.json().catch(() => ({}))
    const attemptId = typeof body.attempt_id === 'string' ? body.attempt_id : null
    if (!attemptId) return NextResponse.json({ error: 'attempt_id required' }, { status: 400 })

    const supabase = createAdminClient()

    const context = await loadMasteryContext(supabase, assignmentId)
    if (!context) return NextResponse.json({ error: 'Mastery quiz not found' }, { status: 404 })
    if (context.assignment.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }

    const { data: attempt } = await supabase
      .from('mastery_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('assignment_id', assignmentId)
      .maybeSingle()
    if (!attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status === 'completed') {
      return NextResponse.json({ error: 'Attempt is already finalized' }, { status: 409 })
    }

    const rollups = await getRollups(supabase, attemptId)
    const score = await finalizeAttempt(supabase, attempt as AttemptRow, context, rollups, { force: true })

    return NextResponse.json({ final_score: score })
  } catch (error) {
    console.error('Mastery finalize error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
