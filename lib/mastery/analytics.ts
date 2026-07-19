// Teacher analytics aggregation for mastery quizzes.
//
// Pure functions (no I/O) so they're unit-testable and scope-agnostic: the same
// aggregator serves per-assignment insights today and a Question-Bank-wide
// "question health" view later — the caller just decides which responses to pass in.

export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'

// One answered mastery_responses row (only the fields analytics needs).
export interface ResponseInput {
  question_id: string
  concept_id: string
  is_correct: boolean | null
  score: number | null
  answer: { index?: number; value?: boolean; text?: string } | null
  question_snapshot: {
    type: QuestionType
    question_text: string
    options: string[] | null
    correct_answer: Record<string, unknown>
  }
  served_at: string | null
  answered_at: string | null
}

export interface AttemptConceptInput {
  concept_id: string
  status: 'in_progress' | 'mastered' | 'max_reached'
}

export interface ConceptMeta {
  id: string
  name: string
}

export interface ConceptInsight {
  concept_id: string
  name: string
  answered: number
  correct: number
  pct: number | null // null when nothing answered
  avgTimeSec: number | null
  masteredStudents: number
  totalStudents: number
}

export interface AnswerChoice {
  label: string
  count: number
  isCorrect: boolean
}

export interface QuestionInsight {
  question_id: string
  concept_id: string
  type: QuestionType
  question_text: string
  answered: number
  correct: number
  pct: number | null
  avgTimeSec: number | null
  // MC / TF only — full option distribution (includes zero-pick options).
  distribution?: AnswerChoice[]
  // short_answer only.
  sampleWrong?: string[]
  avgScore?: number | null
}

export interface InsightsResult {
  concepts: ConceptInsight[]
  questions: QuestionInsight[]
}

// Per-question time gaps above this are treated as "walked away and resumed"
// (attempts are resumable) and excluded from the average so they don't skew it.
const MAX_REASONABLE_TIME_SEC = 600

function timeSec(r: ResponseInput): number | null {
  if (!r.served_at || !r.answered_at) return null
  const s = new Date(r.served_at).getTime()
  const a = new Date(r.answered_at).getTime()
  if (Number.isNaN(s) || Number.isNaN(a)) return null
  const sec = (a - s) / 1000
  if (sec < 0 || sec > MAX_REASONABLE_TIME_SEC) return null
  return sec
}

function mean(nums: number[]): number | null {
  if (nums.length === 0) return null
  return nums.reduce((sum, n) => sum + n, 0) / nums.length
}

function pctOf(correct: number, answered: number): number | null {
  if (answered === 0) return null
  return Math.round((correct / answered) * 100)
}

export function aggregateInsights(
  responses: ResponseInput[],
  attemptConcepts: AttemptConceptInput[],
  concepts: ConceptMeta[],
): InsightsResult {
  // ── Concept rollups ────────────────────────────────────────────────────────
  const conceptInsights: ConceptInsight[] = concepts.map((c) => {
    const rows = responses.filter((r) => r.concept_id === c.id)
    const answered = rows.length
    const correct = rows.filter((r) => r.is_correct === true).length
    const times = rows.map(timeSec).filter((t): t is number => t !== null)
    const acRows = attemptConcepts.filter((a) => a.concept_id === c.id)
    const avg = mean(times)
    return {
      concept_id: c.id,
      name: c.name,
      answered,
      correct,
      pct: pctOf(correct, answered),
      avgTimeSec: avg === null ? null : Math.round(avg),
      masteredStudents: acRows.filter((a) => a.status === 'mastered').length,
      totalStudents: acRows.length,
    }
  })

  // Worst-first so "needs review" surfaces at the top; unanswered concepts (null
  // pct) sink to the bottom.
  conceptInsights.sort((x, y) => {
    if (x.pct === null && y.pct === null) return 0
    if (x.pct === null) return 1
    if (y.pct === null) return -1
    return x.pct - y.pct
  })

  // ── Per-question rollups ───────────────────────────────────────────────────
  const byQuestion = new Map<string, ResponseInput[]>()
  for (const r of responses) {
    const list = byQuestion.get(r.question_id)
    if (list) list.push(r)
    else byQuestion.set(r.question_id, [r])
  }

  const questionInsights: QuestionInsight[] = []
  for (const [questionId, rows] of byQuestion) {
    const snap = rows[0].question_snapshot
    const answered = rows.length
    const correct = rows.filter((r) => r.is_correct === true).length
    const times = rows.map(timeSec).filter((t): t is number => t !== null)
    const avg = mean(times)

    const base: QuestionInsight = {
      question_id: questionId,
      concept_id: rows[0].concept_id,
      type: snap.type,
      question_text: snap.question_text,
      answered,
      correct,
      pct: pctOf(correct, answered),
      avgTimeSec: avg === null ? null : Math.round(avg),
    }

    if (snap.type === 'multiple_choice') {
      const options = snap.options ?? []
      const correctIndex =
        typeof snap.correct_answer.index === 'number' ? (snap.correct_answer.index as number) : -1
      base.distribution = options.map((label, i) => ({
        label,
        count: rows.filter((r) => r.answer?.index === i).length,
        isCorrect: i === correctIndex,
      }))
    } else if (snap.type === 'true_false') {
      const correctVal = snap.correct_answer.value === true
      base.distribution = [true, false].map((val) => ({
        label: val ? 'True' : 'False',
        count: rows.filter((r) => r.answer?.value === val).length,
        isCorrect: val === correctVal,
      }))
    } else {
      // short_answer — representative wrong answers + average AI score
      const wrong: string[] = []
      for (const r of rows) {
        if (r.is_correct === true) continue
        const text = r.answer?.text?.trim()
        if (text && !wrong.includes(text)) wrong.push(text)
        if (wrong.length >= 3) break
      }
      base.sampleWrong = wrong
      const scores = rows.map((r) => r.score).filter((s): s is number => typeof s === 'number')
      const avgScore = mean(scores)
      base.avgScore = avgScore === null ? null : Math.round(avgScore)
    }

    questionInsights.push(base)
  }

  // Group by concept order, worst question first within each concept.
  const conceptOrder = new Map(conceptInsights.map((c, i) => [c.concept_id, i]))
  questionInsights.sort((x, y) => {
    const co = (conceptOrder.get(x.concept_id) ?? 0) - (conceptOrder.get(y.concept_id) ?? 0)
    if (co !== 0) return co
    if (x.pct === null && y.pct === null) return 0
    if (x.pct === null) return 1
    if (y.pct === null) return -1
    return x.pct - y.pct
  })

  return { concepts: conceptInsights, questions: questionInsights }
}
