import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { computeFinalScore } from '@/lib/mastery/engine'
import {
  buildRound,
  getRollups,
  getUnansweredQuestions,
  loadMasteryContext,
  type AttemptRow,
} from '@/lib/mastery/rounds'
import { finalizeAttempt } from '@/lib/mastery/finalize'

export const maxDuration = 120 // round construction may generate AI questions

// POST - Advance to the next round. Returns either fresh questions, the
// still-unanswered current round (idempotent), or completion + final score.
export async function POST(
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

    const { data: attempt } = await supabase
      .from('mastery_attempts')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()
    if (!attempt) return NextResponse.json({ error: 'No attempt in progress' }, { status: 404 })

    const rollups = await getRollups(supabase, attempt.id)

    if (attempt.status === 'completed') {
      return NextResponse.json({
        status: 'completed',
        rollups,
        final_score: computeFinalScore(rollups),
        questions: [],
      })
    }

    // Unanswered questions remain → current round isn't done (idempotency)
    const pending = await getUnansweredQuestions(supabase, attempt.id)
    if (pending.length > 0) {
      return NextResponse.json({
        status: 'in_progress',
        round: attempt.current_round,
        rollups,
        questions: pending,
      })
    }

    // Everything answered — either the attempt is complete or we build a round
    const finalScore = await finalizeAttempt(supabase, attempt as AttemptRow, context, rollups)
    if (finalScore) {
      return NextResponse.json({
        status: 'completed',
        rollups,
        final_score: finalScore,
        questions: [],
      })
    }

    const nextRound = attempt.current_round + 1
    const questions = await buildRound(
      supabase,
      attempt as AttemptRow,
      context,
      rollups,
      nextRound
    )
    if (questions.length === 0) {
      // No in-progress concepts should mean completion; guard anyway
      return NextResponse.json({ error: 'No questions available' }, { status: 500 })
    }

    await supabase
      .from('mastery_attempts')
      .update({ current_round: nextRound })
      .eq('id', attempt.id)

    return NextResponse.json({
      status: 'in_progress',
      round: nextRound,
      rollups,
      questions,
    })
  } catch (error) {
    console.error('Mastery next-round error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
