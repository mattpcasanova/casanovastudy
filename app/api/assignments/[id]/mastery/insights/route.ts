import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { loadMasteryContext } from '@/lib/mastery/rounds'
import {
  aggregateInsights,
  type ResponseInput,
  type AttemptConceptInput,
} from '@/lib/mastery/analytics'

// GET - Teacher analytics for a mastery quiz: per-concept and per-question
// rollups (% correct, avg time, distractor distribution, short-answer samples).
// Built from answered mastery_responses; scoped to this one assignment.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      .select('id')
      .eq('assignment_id', assignmentId)
    const attemptIds = (attempts ?? []).map((a) => a.id)

    if (attemptIds.length === 0) {
      return NextResponse.json({
        concepts: context.concepts.map((c) => ({
          concept_id: c.id,
          name: c.name,
          answered: 0,
          correct: 0,
          pct: null,
          avgTimeSec: null,
          masteredStudents: 0,
          totalStudents: 0,
        })),
        questions: [],
      })
    }

    const { data: responses } = await supabase
      .from('mastery_responses')
      .select('question_id, concept_id, is_correct, score, answer, question_snapshot, served_at, answered_at')
      .in('attempt_id', attemptIds)
      .not('answered_at', 'is', null)

    const { data: attemptConcepts } = await supabase
      .from('mastery_attempt_concepts')
      .select('concept_id, status')
      .in('attempt_id', attemptIds)

    const result = aggregateInsights(
      (responses ?? []) as ResponseInput[],
      (attemptConcepts ?? []) as AttemptConceptInput[],
      context.concepts.map((c) => ({ id: c.id, name: c.name })),
    )

    return NextResponse.json(result)
  } catch (error) {
    console.error('Mastery insights error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
