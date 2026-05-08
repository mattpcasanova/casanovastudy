export type AnswerLetter = 'A' | 'B' | 'C' | 'D'
export type BigIdea = 1 | 2 | 3 | 4 | 5 | 6

export const BIG_IDEAS: BigIdea[] = [1, 2, 3, 4, 5, 6]

export const BIG_IDEA_LABELS: Record<BigIdea, string> = {
  1: 'Big Idea 1 — Atoms, Elements, & Compounds',
  2: 'Big Idea 2 — Bonding & IMFs',
  3: 'Big Idea 3 — Chemical Reactions',
  4: 'Big Idea 4 — Kinetics',
  5: 'Big Idea 5 — Thermodynamics',
  6: 'Big Idea 6 — Equilibrium, Acids/Bases & Electrochem',
}

export interface AnswerKeyEntry {
  answer: AnswerLetter
  bigIdea: BigIdea
}

export type AnswerKey = Record<string, AnswerKeyEntry>

export type ResponseMap = Record<string, AnswerLetter>

export interface BigIdeaBreakdownEntry {
  correct: number
  total: number
}

export type BigIdeaBreakdown = Record<string, BigIdeaBreakdownEntry>

export interface QuestionContentItem {
  n: number
  prompt: string
  figure?: string
  choices: unknown[]
  stem?: string
  choicesAreTable?: boolean
}

export interface StemContent {
  title: string
  body: string
}

export interface QuestionsContent {
  questions: QuestionContentItem[]
  stems?: Record<string, StemContent>
}

export interface PracticeTestRecord {
  id: string
  teacher_id: string
  title: string
  description: string | null
  answer_key: AnswerKey
  questions_content: QuestionsContent | null
  share_token: string
  results_share_token: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface PracticeTestSubmissionRecord {
  id: string
  practice_test_id: string
  student_name: string
  responses: ResponseMap
  score_total: number
  score_max: number
  big_idea_breakdown: BigIdeaBreakdown
  submitted_at: string
}

export interface PracticeTestPublicMeta {
  id: string
  title: string
  description: string | null
  questions_content: QuestionsContent | null
  is_active: boolean
  question_count: number
}

export interface PracticeTestResultsPayload {
  test: {
    id: string
    title: string
    description: string | null
    question_count: number
  }
  aggregate: {
    submissions: number
    avg_score_pct: number | null
    big_idea: BigIdeaBreakdown
  }
  submissions: Array<{
    id: string
    student_name: string
    score_total: number
    score_max: number
    big_idea_breakdown: BigIdeaBreakdown
    submitted_at: string
  }>
}
