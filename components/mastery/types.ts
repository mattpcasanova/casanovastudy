import type { QuestionType } from '@/lib/types/question-bank'

// Client-side mirrors of the mastery API payloads.

export interface MasteryConceptInfo {
  id: string
  name: string
}

export interface MasteryRollup {
  concept_id: string
  answered_count: number
  correct_count: number
  recent_results: boolean[]
  status: 'in_progress' | 'mastered' | 'max_reached'
}

export interface MasteryQuestion {
  response_id: string
  concept_id: string
  round_number: number
  type: QuestionType
  question_text: string
  options: string[] | null
}

export interface MasteryConfigView {
  mastery_threshold: number
  min_questions: number
  window_size: number
  questions_per_round: number
  max_questions_per_concept: number
}

export interface MasteryFinalScore {
  mastered: number
  total: number
  percentage: number
}

export interface MasteryAttemptState {
  assignment: {
    id: string
    title: string
    description: string | null
    due_at: string | null
  }
  config: MasteryConfigView
  concepts: MasteryConceptInfo[]
  attempt: {
    id: string
    status: 'in_progress' | 'completed'
    current_round: number
    started_at: string
    completed_at: string | null
  } | null
  rollups: MasteryRollup[]
  questions: MasteryQuestion[]
  final_score: MasteryFinalScore | null
}

export type StudentAnswer = { index: number } | { value: boolean } | { text: string }

export interface AnswerResult {
  is_correct: boolean
  score: number | null
  feedback: string | null
  explanation: string | null
  correct_answer: Record<string, unknown>
  concept: MasteryRollup
  attempt_complete: boolean
  final_score: MasteryFinalScore | null
}
