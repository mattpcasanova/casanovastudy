import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import {
  buildRound,
  getRollups,
  getUnansweredQuestions,
  loadMasteryContext,
  resolveClassContext,
  type AttemptRow,
} from '@/lib/mastery/rounds'
import { ensureSubmissionRow } from '@/lib/mastery/finalize'
import { computeFinalScore } from '@/lib/mastery/engine'

export const maxDuration = 120 // round construction may generate AI questions

// Shared response shape for GET (resume) and POST (start): everything the
// player needs, with correct answers stripped server-side.
async function attemptStatePayload(
  supabase: ReturnType<typeof createAdminClient>,
  context: NonNullable<Awaited<ReturnType<typeof loadMasteryContext>>>,
  attempt: AttemptRow | null
) {
  const rollups = attempt ? await getRollups(supabase, attempt.id) : []
  const questions = attempt && attempt.status === 'in_progress'
    ? await getUnansweredQuestions(supabase, attempt.id)
    : []

  return {
    assignment: {
      id: context.assignment.id,
      title: context.assignment.title,
      description: context.assignment.description,
      due_at: context.assignment.due_at,
    },
    config: {
      mastery_threshold: context.config.mastery_threshold,
      min_questions: context.config.min_questions,
      window_size: context.config.window_size,
      questions_per_round: context.config.questions_per_round,
      max_questions_per_concept: context.config.max_questions_per_concept,
    },
    concepts: context.concepts,
    attempt: attempt
      ? {
          id: attempt.id,
          status: attempt.status,
          current_round: attempt.current_round,
          started_at: attempt.started_at,
          completed_at: attempt.completed_at,
        }
      : null,
    rollups,
    questions,
    final_score: attempt?.status === 'completed' ? computeFinalScore(rollups) : null,
  }
}

// GET - Resume state: attempt (if any) + rollups + unanswered questions.
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
    if (!context.assignment.is_published) {
      return NextResponse.json({ error: 'Assignment is not yet published' }, { status: 403 })
    }

    const classId = await resolveClassContext(supabase, assignmentId, user.id)
    if (!classId) {
      return NextResponse.json({ error: 'Not authorized for this assignment' }, { status: 403 })
    }

    const { data: attempt } = await supabase
      .from('mastery_attempts')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()

    return NextResponse.json(await attemptStatePayload(supabase, context, attempt as AttemptRow | null))
  } catch (error) {
    console.error('Mastery attempt GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST - Start an attempt: create attempt + rollups + round 1 + submission
// projection. Idempotent: an existing attempt is returned as-is.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id: assignmentId } = await params
    const body = await request.json().catch(() => ({}))
    const supabase = createAdminClient()

    const context = await loadMasteryContext(supabase, assignmentId)
    if (!context) return NextResponse.json({ error: 'Mastery quiz not found' }, { status: 404 })
    if (!context.assignment.is_published) {
      return NextResponse.json({ error: 'Assignment is not yet published' }, { status: 403 })
    }

    const classId = await resolveClassContext(supabase, assignmentId, user.id, body.class_id)
    if (!classId) {
      return NextResponse.json({ error: 'Not authorized for this assignment' }, { status: 403 })
    }

    // Existing attempt → resume (unique constraint makes this race-safe)
    const { data: existing } = await supabase
      .from('mastery_attempts')
      .select('*')
      .eq('assignment_id', assignmentId)
      .eq('student_id', user.id)
      .maybeSingle()
    if (existing) {
      return NextResponse.json(await attemptStatePayload(supabase, context, existing as AttemptRow))
    }

    const { data: attempt, error: attemptError } = await supabase
      .from('mastery_attempts')
      .insert({
        assignment_id: assignmentId,
        student_id: user.id,
        class_id: classId,
      })
      .select('*')
      .single()
    if (attemptError || !attempt) {
      // Unique violation = concurrent start; fetch and return it
      if (attemptError?.code === '23505') {
        const { data: raced } = await supabase
          .from('mastery_attempts')
          .select('*')
          .eq('assignment_id', assignmentId)
          .eq('student_id', user.id)
          .single()
        return NextResponse.json(await attemptStatePayload(supabase, context, raced as AttemptRow))
      }
      console.error('Failed to create attempt:', attemptError)
      return NextResponse.json({ error: 'Failed to start the quiz' }, { status: 500 })
    }

    const rollupRows = context.concepts.map(c => ({
      attempt_id: attempt.id,
      concept_id: c.id,
    }))
    const { error: rollupError } = await supabase
      .from('mastery_attempt_concepts')
      .insert(rollupRows)
    if (rollupError) {
      await supabase.from('mastery_attempts').delete().eq('id', attempt.id)
      console.error('Failed to create rollups:', rollupError)
      return NextResponse.json({ error: 'Failed to start the quiz' }, { status: 500 })
    }

    const rollups = await getRollups(supabase, attempt.id)
    await buildRound(supabase, attempt as AttemptRow, context, rollups, 1)
    await ensureSubmissionRow(supabase, attempt as AttemptRow)

    return NextResponse.json(await attemptStatePayload(supabase, context, attempt as AttemptRow), { status: 201 })
  } catch (error) {
    console.error('Mastery attempt POST error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
