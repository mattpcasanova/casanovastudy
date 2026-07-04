import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase-server'
import { requireTeacher } from '@/lib/api-auth'
import { validateQuestionInput, type QuestionRecord } from '@/lib/types/question-bank'

// Fields captured in review-event snapshots (content, not counters)
function snapshot(q: QuestionRecord) {
  return {
    type: q.type,
    question_text: q.question_text,
    options: q.options,
    correct_answer: q.correct_answer,
    explanation: q.explanation,
    difficulty: q.difficulty,
    status: q.status,
  }
}

// PATCH - Edit a question and/or change its review status.
// Status transitions on a 'suggested' question (approve/decline), and any
// content edit, are recorded in question_review_events as tuning signal.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const { id } = await params
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('question_bank_questions')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (!existing || existing.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    const contentFields = ['question_text', 'options', 'correct_answer', 'explanation', 'difficulty'] as const
    for (const field of contentFields) {
      if (field in body) updates[field] = body[field]
    }

    let statusChange: 'approve' | 'decline' | null = null
    if ('status' in body && body.status !== existing.status) {
      if (!['approved', 'declined', 'archived'].includes(body.status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updates.status = body.status
      if (existing.status === 'suggested') {
        statusChange = body.status === 'approved' ? 'approve' : body.status === 'declined' ? 'decline' : null
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 })
    }

    // Validate the merged result so a partial edit can't corrupt the question
    const merged = { ...existing, ...updates }
    const validationError = validateQuestionInput({
      concept_id: merged.concept_id,
      type: merged.type,
      question_text: merged.question_text,
      options: merged.options,
      correct_answer: merged.correct_answer,
      difficulty: merged.difficulty,
    })
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    const { data: updated, error: updateError } = await supabase
      .from('question_bank_questions')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update question' }, { status: 500 })
    }

    // Record the review signal: explicit approve/decline of a suggestion, or
    // a content edit (which counts as 'edit' — the richest signal of all).
    const contentEdited = contentFields.some(f => f in body)
    const action = statusChange ?? (contentEdited ? 'edit' : null)
    if (action) {
      await supabase.from('question_review_events').insert({
        question_id: id,
        teacher_id: user.id,
        action,
        before_snapshot: snapshot(existing),
        after_snapshot: snapshot(updated),
      })
    }

    return NextResponse.json({ question: updated })
  } catch (error) {
    console.error('Question PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE - Permanently remove a question. Served questions should be archived
// instead (history rows reference them via FK RESTRICT).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, error } = await requireTeacher(request)
    if (error) return error

    const { id } = await params
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('question_bank_questions')
      .select('id, teacher_id')
      .eq('id', id)
      .maybeSingle()
    if (!existing || existing.teacher_id !== user.id) {
      return NextResponse.json({ error: 'Question not found' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('question_bank_questions')
      .delete()
      .eq('id', id)

    if (deleteError) {
      if (deleteError.code === '23503') {
        return NextResponse.json(
          { error: 'This question has been used in a quiz and cannot be deleted — archive it instead' },
          { status: 409 }
        )
      }
      return NextResponse.json({ error: 'Failed to delete question' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Question DELETE error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
