import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { ClaudeService } from '@/lib/claude-api'
import { applyAnswer, isAttemptComplete } from '@/lib/mastery/engine'
import { getRollups, loadMasteryContext, type AttemptRow } from '@/lib/mastery/rounds'
import { finalizeAttempt } from '@/lib/mastery/finalize'

export const maxDuration = 60 // short-answer grading calls Claude

interface AnswerBody {
  response_id?: string
  answer?: { index?: number; value?: boolean; text?: string }
}

// POST - Grade one answer. MC/TF are checked deterministically against the
// frozen snapshot; short answers are AI-graded. Updates the response row, the
// concept rollup, and bank counters; finalizes the attempt when the last
// concept resolves.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const { id: assignmentId } = await params
    const body = (await request.json()) as AnswerBody
    if (!body.response_id || !body.answer || typeof body.answer !== 'object') {
      return NextResponse.json({ error: 'response_id and answer are required' }, { status: 400 })
    }

    const supabase = createAdminClient()

    const context = await loadMasteryContext(supabase, assignmentId)
    if (!context) return NextResponse.json({ error: 'Mastery quiz not found' }, { status: 404 })

    // Response row must belong to the caller's in-progress attempt and be unanswered
    const { data: response } = await supabase
      .from('mastery_responses')
      .select('id, attempt_id, concept_id, question_id, question_snapshot, answer')
      .eq('id', body.response_id)
      .maybeSingle()
    if (!response) return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    if (response.answer !== null) {
      return NextResponse.json({ error: 'This question was already answered' }, { status: 409 })
    }

    const { data: attempt } = await supabase
      .from('mastery_attempts')
      .select('*')
      .eq('id', response.attempt_id)
      .maybeSingle()
    if (!attempt || attempt.student_id !== user.id || attempt.assignment_id !== assignmentId) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
    }
    if (attempt.status !== 'in_progress') {
      return NextResponse.json({ error: 'This quiz is already complete' }, { status: 409 })
    }

    const snapshot = response.question_snapshot as {
      type: 'multiple_choice' | 'true_false' | 'short_answer'
      question_text: string
      options: string[] | null
      correct_answer: Record<string, unknown>
      explanation: string | null
    }

    // Grade
    let isCorrect = false
    let score: number | null = null
    let aiFeedback: string | null = null

    if (snapshot.type === 'multiple_choice') {
      if (typeof body.answer.index !== 'number') {
        return NextResponse.json({ error: 'Pick an option' }, { status: 400 })
      }
      isCorrect = body.answer.index === snapshot.correct_answer.index
    } else if (snapshot.type === 'true_false') {
      if (typeof body.answer.value !== 'boolean') {
        return NextResponse.json({ error: 'Pick true or false' }, { status: 400 })
      }
      isCorrect = body.answer.value === snapshot.correct_answer.value
    } else {
      const text = typeof body.answer.text === 'string' ? body.answer.text.trim() : ''
      if (!text) return NextResponse.json({ error: 'Write an answer first' }, { status: 400 })
      if (text.length > 2000) {
        return NextResponse.json({ error: 'Answer is too long' }, { status: 400 })
      }

      const { data: cls } = await supabase
        .from('classes')
        .select('subject')
        .eq('id', attempt.class_id)
        .maybeSingle()

      const claude = new ClaudeService()
      try {
        const graded = await claude.gradeShortAnswer({
          question: snapshot.question_text,
          sampleAnswer: String(snapshot.correct_answer.sample_answer ?? ''),
          rubricNotes: (snapshot.correct_answer.rubric_notes as string | undefined) ?? null,
          studentAnswer: text,
          subject: cls?.subject ?? null,
        })
        score = graded.score
        aiFeedback = graded.feedback
        isCorrect = graded.isCorrect
      } catch (err) {
        console.error('Short answer grading failed:', err)
        return NextResponse.json(
          { error: 'Grading is temporarily unavailable — try again in a moment' },
          { status: 503 }
        )
      }
    }

    // Persist the response
    const { error: updateError } = await supabase
      .from('mastery_responses')
      .update({
        answer: body.answer,
        is_correct: isCorrect,
        score,
        ai_feedback: aiFeedback,
        answered_at: new Date().toISOString(),
      })
      .eq('id', response.id)
      .is('answer', null) // double-submit guard
    if (updateError) {
      return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 })
    }

    // Update the concept rollup through the engine
    const rollups = await getRollups(supabase, attempt.id)
    const rollup = rollups.find(r => r.concept_id === response.concept_id)
    if (!rollup) {
      return NextResponse.json({ error: 'Concept state missing' }, { status: 500 })
    }
    const next = applyAnswer(rollup, isCorrect, context.config)
    await supabase
      .from('mastery_attempt_concepts')
      .update({
        answered_count: next.answered_count,
        correct_count: next.correct_count,
        recent_results: next.recent_results,
        status: next.status,
        mastered_at: next.status === 'mastered' && rollup.status !== 'mastered'
          ? new Date().toISOString()
          : undefined,
      })
      .eq('attempt_id', attempt.id)
      .eq('concept_id', response.concept_id)

    // Bank accuracy counter (best-effort)
    if (isCorrect) {
      const { data: q } = await supabase
        .from('question_bank_questions')
        .select('times_correct')
        .eq('id', response.question_id)
        .maybeSingle()
      if (q) {
        await supabase
          .from('question_bank_questions')
          .update({ times_correct: q.times_correct + 1 })
          .eq('id', response.question_id)
      }
    }

    // Completion check — finalize as soon as the last concept resolves
    const updatedRollups = rollups.map(r => (r.concept_id === next.concept_id ? next : r))
    let finalScore = null
    if (isAttemptComplete(updatedRollups)) {
      finalScore = await finalizeAttempt(supabase, attempt as AttemptRow, context, updatedRollups)
    }

    return NextResponse.json({
      is_correct: isCorrect,
      score,
      feedback: aiFeedback,
      explanation: snapshot.explanation,
      // Safe to reveal post-answer; this question won't be re-served while others remain
      correct_answer: snapshot.correct_answer,
      concept: {
        concept_id: next.concept_id,
        answered_count: next.answered_count,
        correct_count: next.correct_count,
        recent_results: next.recent_results,
        status: next.status,
      },
      attempt_complete: finalScore !== null,
      final_score: finalScore,
    })
  } catch (error) {
    console.error('Mastery answer error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
