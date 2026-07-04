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
  concepts: Array<{ id: string; name: string; description: string | null; unit: string | null }>
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
      .select('concept_id, concepts(id, name, description, unit)')
      .eq('assignment_id', assignmentId),
  ])
  if (!config || !conceptLinks || conceptLinks.length === 0) return null

  type ConceptMeta = { id: string; name: string; description: string | null; unit: string | null }
  const concepts = conceptLinks
    .map(link => link.concepts as unknown as ConceptMeta | null)
    .filter((c): c is ConceptMeta => !!c)

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

// Runaway-cost guard: at most this many AI-generated questions per concept per attempt
const RUNTIME_GENERATION_CAP = 10

type BankQuestion = {
  id: string
  concept_id: string
  type: QuestionType
  difficulty: number
  times_served: number
  question_text: string
  options: string[] | null
  correct_answer: Record<string, unknown>
  explanation: string | null
}

/**
 * When a student has seen every approved question for a concept, generate
 * fresh ones on the fly (source='ai_runtime', status='suggested' → they land
 * in the teacher's review queue; approving promotes them into the bank).
 * Returns [] on failure or when the per-attempt cap is hit — caller re-serves.
 */
async function generateRuntimeQuestions(
  supabase: SupabaseClient,
  attempt: Pick<AttemptRow, 'id' | 'class_id'>,
  teacherId: string,
  concept: MasteryContext['concepts'][number],
  config: MasteryConfig,
  count: number,
  avoidTexts: string[]
): Promise<BankQuestion[]> {
  // Enforce the cap: count ai_runtime questions already served in this attempt
  const { data: servedRuntime } = await supabase
    .from('mastery_responses')
    .select('question_id, question_bank_questions!inner(source)')
    .eq('attempt_id', attempt.id)
    .eq('concept_id', concept.id)
  const runtimeServed = (servedRuntime ?? []).filter(r => {
    const q = r.question_bank_questions as unknown as { source: string } | null
    return q?.source === 'ai_runtime'
  }).length
  if (runtimeServed >= RUNTIME_GENERATION_CAP) return []

  const toGenerate = Math.min(Math.max(count, 3), 5, RUNTIME_GENERATION_CAP - runtimeServed)

  try {
    const { generateMasteryQuestions } = await import('@/lib/mastery/ai')
    const { data: cls } = await supabase
      .from('classes')
      .select('subject')
      .eq('id', attempt.class_id)
      .maybeSingle()

    const generated = await generateMasteryQuestions({
      concept,
      subject: cls?.subject ?? null,
      count: toGenerate,
      allowedTypes: config.allowed_types as QuestionType[],
      avoidTexts,
    })

    const { data: inserted, error } = await supabase
      .from('question_bank_questions')
      .insert(
        generated.map(g => ({
          teacher_id: teacherId,
          concept_id: concept.id,
          type: g.type,
          question_text: g.question_text,
          options: g.type === 'multiple_choice' ? g.options : null,
          correct_answer: g.correct_answer,
          explanation: g.explanation ?? null,
          difficulty: g.difficulty,
          source: 'ai_runtime',
          status: 'suggested',
        }))
      )
      .select('id, concept_id, type, difficulty, times_served, question_text, options, correct_answer, explanation')
    if (error || !inserted) return []
    return inserted as BankQuestion[]
  } catch (err) {
    console.error(`Runtime generation failed for concept ${concept.id}:`, err)
    return []
  }
}

/**
 * Build the next round: allocate slots across in-progress concepts, pick bank
 * questions (unseen first; when the bank is exhausted, generate fresh AI
 * questions if allowed, else re-serve least-served), snapshot them into
 * mastery_responses, and bump times_served.
 * Returns the served questions (empty when no concept is in progress).
 */
export async function buildRound(
  supabase: SupabaseClient,
  attempt: Pick<AttemptRow, 'id' | 'assignment_id' | 'class_id'>,
  context: MasteryContext,
  rollups: ConceptRollup[],
  roundNumber: number
): Promise<ServedQuestion[]> {
  const config = context.config
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
  const bank = (bankRows ?? []) as BankQuestion[]
  const conceptMeta = new Map(context.concepts.map(c => [c.id, c]))

  const rollupByConcept = new Map(rollups.map(r => [r.concept_id, r]))
  const toServe: BankQuestion[] = []

  for (const [conceptId, count] of slots) {
    const rollup = rollupByConcept.get(conceptId)
    if (!rollup) continue

    const conceptBank = bank.filter(q => q.concept_id === conceptId)
    // Shuffle for variety; the engine's stable sort then orders by fit
    const shuffled = [...conceptBank].sort(() => Math.random() - 0.5)

    const unseen = shuffled.filter(q => !servedIds.has(q.id))
    let pool: BankQuestion[] = unseen

    if (unseen.length < count) {
      // Bank exhausted for this concept — try AI generation, else re-serve
      const meta = conceptMeta.get(conceptId)
      const fresh = config.allow_ai_fallback && meta
        ? await generateRuntimeQuestions(
            supabase,
            attempt,
            context.assignment.teacher_id,
            meta,
            config,
            count - unseen.length,
            conceptBank.map(q => q.question_text)
          )
        : []
      pool = [...unseen, ...fresh]
      if (pool.length === 0) pool = shuffled // last resort: re-serve
    }

    const picked = selectConceptQuestions(pool as CandidateQuestion[], count, rollup)
    const poolById = new Map(pool.map(q => [q.id, q]))
    for (const p of picked) {
      toServe.push(poolById.get(p.id)!)
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
