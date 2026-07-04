export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'
export type QuestionSource = 'manual' | 'ai_suggested' | 'ai_extracted' | 'ai_runtime'
export type QuestionStatus = 'suggested' | 'approved' | 'declined' | 'archived'

export const QUESTION_TYPES: QuestionType[] = ['multiple_choice', 'true_false', 'short_answer']

export interface ConceptRecord {
  id: string
  teacher_id: string
  class_id: string | null
  name: string
  description: string | null
  unit: string | null
  created_at: string
  updated_at: string
}

export interface ConceptWithCounts extends ConceptRecord {
  approved_count: number
  suggested_count: number
}

// correct_answer shape by type:
//   multiple_choice: { index: number }
//   true_false:      { value: boolean }
//   short_answer:    { sample_answer: string, rubric_notes?: string }
export type CorrectAnswer =
  | { index: number }
  | { value: boolean }
  | { sample_answer: string; rubric_notes?: string }

export interface QuestionRecord {
  id: string
  teacher_id: string
  concept_id: string
  type: QuestionType
  question_text: string
  options: string[] | null
  correct_answer: CorrectAnswer
  explanation: string | null
  difficulty: 1 | 2 | 3
  source: QuestionSource
  status: QuestionStatus
  source_material_url: string | null
  times_served: number
  times_correct: number
  created_at: string
  updated_at: string
}

export interface QuestionInput {
  concept_id: string
  type: QuestionType
  question_text: string
  options?: string[] | null
  correct_answer: CorrectAnswer
  explanation?: string | null
  difficulty?: number
}

/**
 * Validate a question payload's internal consistency (options/correct_answer
 * shape must match the question type). Returns an error message or null.
 */
export function validateQuestionInput(input: QuestionInput): string | null {
  if (!input.question_text?.trim()) return 'Question text is required'
  if (!QUESTION_TYPES.includes(input.type)) return 'Invalid question type'

  const answer = input.correct_answer as Record<string, unknown> | undefined
  if (!answer || typeof answer !== 'object') return 'Correct answer is required'

  switch (input.type) {
    case 'multiple_choice': {
      if (!Array.isArray(input.options) || input.options.length < 2 || input.options.length > 6) {
        return 'Multiple choice requires 2-6 options'
      }
      if (input.options.some(o => typeof o !== 'string' || !o.trim())) {
        return 'All options must be non-empty text'
      }
      const index = answer.index
      if (typeof index !== 'number' || !Number.isInteger(index) || index < 0 || index >= input.options.length) {
        return 'Correct answer must reference a valid option'
      }
      return null
    }
    case 'true_false': {
      if (typeof answer.value !== 'boolean') return 'True/false answer must be true or false'
      return null
    }
    case 'short_answer': {
      if (typeof answer.sample_answer !== 'string' || !answer.sample_answer.trim()) {
        return 'Short answer requires a sample answer'
      }
      return null
    }
  }
}

/** Strip fields a student must never see from a question row. */
export function toStudentQuestion(q: Pick<QuestionRecord, 'id' | 'type' | 'question_text' | 'options'>) {
  return {
    id: q.id,
    type: q.type,
    question_text: q.question_text,
    options: q.options,
  }
}
