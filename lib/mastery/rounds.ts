import type { SupabaseClient } from '@supabase/supabase-js'
import {
  allocateRoundSlots,
  selectConceptQuestions,
  type CandidateQuestion,
  type ConceptRollup,
  type MasteryConfig,
} from '@/lib/mastery/engine'
import type { QuestionType } from '@/lib/types/question-bank'

// Server-side helpers for the mastery loop. All functions take the admin
// client — routes are responsible for auth + enrollment checks before calling.

export interface MasteryContext {
  assignment: {
    id: string
    teacher_id: string
    type: string
    title: string
    description: string | null
    due_at: string | null
    is_published: boolean
  }
  config: MasteryConfig
  concepts: Array<{ id: string; name: string }>
}

export interface AttemptRow {
  id: string
  assignment_id: string
  student_id: string
  class_id: string
  status: 'in_progress' | 'completed'
  current_round: number
  started_at: string
  completed_at: string | null
}

/** The question payload a student is allowed to see. Never includes answers. */
export interface ServedQuestion {
  response_id: string
  concept_id: string
  round_number: number
  type: QuestionType
  question_text: string
  options: string[] | null
}

/**
 * Load assignment + mastery config + concept list. Returns null when the
 * assignment doesn't exist or isn't a mastery quiz.
 */
export async function loadMasteryContext(
  supabase: SupabaseClient,
  assignmentId: string
): Promise<MasteryContext | null> {
  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, teacher_id, type, title, description, due_at, is_published')
    .eq('id', assignmentId)
    .maybeSingle()
  if (!assignment || assignment.type !== 'mastery_quiz') return null

  const [{ data: config }, { data: conceptLinks }] = await Promise.all([
    supabase
      .from('assignment_mastery_config')
      .select('*')
      .eq('assignment_id', assignmentId)
      .maybeSingle(),
    supabase
      .from('assignment_mastery_concepts')
      .select('concept_id, concepts(id, name)')
      .eq('assignment_id', assignmentId),
  ])
  if (!config || !conceptLinks || conceptLinks.length === 0) return null

  const concepts = conceptLinks
    .map(link => {
      const c = link.concepts as unknown as { id: string; name: string } | null
      return c ? { id: c.id, name: c.name } : null
    })
    .filter((c): c is { id: string; name: string } => !!c)

  return {
    assignment,
    config: {
      mastery_threshold: Number(config.mastery_threshold),
      window_size: config.window_size,
      min_questions: config.min_questions,
      max_questions_per_concept: config.max_questions_per_concept,
      questions_per_round: config.questions_per_round,
      allowed_types: config.allowed_types,
      allow_ai_fallback: config.allow_ai_fallback,
    },
    concepts,
  }
}

/** Resolve the class the student is enrolled in for this assignment (mirrors the submit route). */
export async function resolveClassContext(
  supabase: SupabaseClient,
  assignmentId: string,
  studentId: string,
  preferredClassId?: string | null
): Promise<string | null> {
  const { data: links } = await supabase
    .from('assignment_class_links')
    .select('class_id')
    .eq('assignment_id', assignmentId)
  const linkedIds = (links ?? []).map(l => l.class_id)
  if (linkedIds.length === 0) return null

  const { data: enrollments } = await supabase
    .from('class_enrollments')
    .select('class_id')
    .eq('student_id', studentId)
    .eq('status', 'active')
    .in('class_id', linkedIds)
  const enrolledIds = new Set((enrollments ?? []).map(e => e.class_id))
  if (enrolledIds.size === 0) return null

  if (preferredClassId && enrolledIds.has(preferredClassId)) return preferredClassId
  return enrolledIds.values().next().value ?? null
}

export async function getRollups(
  supabase: SupabaseClient,
  attemptId: string
): Promise<ConceptRollup[]> {
  const { data } = await supabase
    .from('mastery_attempt_concepts')
    .select('concept_id, answered_count, correct_count, recent_results, status')
    .eq('attempt_id', attemptId)
  return (data ?? []) as ConceptRollup[]
}

/** Unanswered served rows = the resumable current round, stripped for the student. */
export async function getUnansweredQuestions(
  supabase: SupabaseClient,
  attemptId: string
): Promise<ServedQuestion[]> {
  const { data } = await supabase
    .from('mastery_responses')
    .select('id, concept_id, round_number, question_snapshot')
    .eq('attempt_id', attemptId)
    .is('answer', null)
    .order('served_at', { ascending: true })

  return (data ?? []).map(row => {
    const snapshot = row.question_snapshot as {
      type: QuestionType
      question_text: string
      options: string[] | null
    }
    return {
      response_id: row.id,
      concept_id: row.concept_id,
      round_number: row.round_number,
      type: snapshot.type,
      question_text: snapshot.question_text,
      options: snapshot.options ?? null,
    }
  })
}

/**
 * Build the next round: allocate slots across in-progress concepts, pick bank
 * questions (unseen first; re-serve least-served when the bank is exhausted —
 * AI runtime generation lands here in a later phase), snapshot them into
 * mastery_responses, and bump times_served.
 * Returns the served questions (empty when no concept is in progress).
 */
export async function buildRound(
  supabase: SupabaseClient,
  attempt: Pick<AttemptRow, 'id' | 'assignment_id'>,
  config: MasteryConfig,
  rollups: ConceptRollup[],
  roundNumber: number
): Promise<ServedQuestion[]> {
  const slots = allocateRoundSlots(rollups, config.questions_per_round)
  if (slots.size === 0) return []

  const conceptIds = [...slots.keys()]

  const [{ data: bankRows }, { data: servedRows }] = await Promise.all([
    supabase
      .from('question_bank_questions')
      .select('id, concept_id, type, difficulty, times_served, question_text, options, correct_answer, explanation')
      .in('concept_id', conceptIds)
      .eq('status', 'approved')
      .in('type', config.allowed_types),
    supabase
      .from('mastery_responses')
      .select('question_id')
      .eq('attempt_id', attempt.id),
  ])

  const servedIds = new Set((servedRows ?? []).map(r => r.question_id))
  const bank = bankRows ?? []

  const rollupByConcept = new Map(rollups.map(r => [r.concept_id, r]))
  const toServe: Array<(typeof bank)[number]> = []

  for (const [conceptId, count] of slots) {
    const rollup = rollupByConcept.get(conceptId)
    if (!rollup) continue

    const conceptBank = bank.filter(q => q.concept_id === conceptId)
    // Shuffle for variety; the engine's stable sort then orders by fit
    const shuffled = [...conceptBank].sort(() => Math.random() - 0.5)

    const unseen = shuffled.filter(q => !servedIds.has(q.id))
    const pool = unseen.length > 0 ? unseen : shuffled // bank exhausted → re-serve
    const picked = selectConceptQuestions(pool as CandidateQuestion[], count, rollup)
    for (const p of picked) {
      toServe.push(conceptBank.find(q => q.id === p.id)!)
    }
  }

  if (toServe.length === 0) return []

  const responseRows = toServe.map(q => ({
    attempt_id: attempt.id,
    question_id: q.id,
    concept_id: q.concept_id,
    round_number: roundNumber,
    question_snapshot: {
      type: q.type,
      question_text: q.question_text,
      options: q.options,
      correct_answer: q.correct_answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
    },
  }))

  const { data: inserted, error } = await supabase
    .from('mastery_responses')
    .insert(responseRows)
    .select('id, concept_id, round_number, question_snapshot')
  if (error || !inserted) {
    throw new Error(`Failed to serve round: ${error?.message}`)
  }

  // Bump serve counters (best-effort; not worth failing the round over)
  await Promise.all(
    toServe.map(q =>
      supabase
        .from('question_bank_questions')
        .update({ times_served: q.times_served + 1 })
        .eq('id', q.id)
    )
  )

  return inserted.map(row => {
    const snapshot = row.question_snapshot as {
      type: QuestionType
      question_text: string
      options: string[] | null
    }
    return {
      response_id: row.id,
      concept_id: row.concept_id,
      round_number: row.round_number,
      type: snapshot.type,
      question_text: snapshot.question_text,
      options: snapshot.options ?? null,
    }
  })
}
