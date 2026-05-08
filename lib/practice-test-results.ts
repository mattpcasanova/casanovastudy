import { createAdminClient } from './supabase-server'
import { aggregateBigIdeas } from './practice-test-scoring'
import { PracticeTestResultsPayload } from './types/practice-test'

export async function buildResultsPayload(testId: string): Promise<PracticeTestResultsPayload | null> {
  const supabase = createAdminClient()

  const { data: test } = await supabase
    .from('practice_tests')
    .select('id, title, description, answer_key')
    .eq('id', testId)
    .single()
  if (!test) return null

  const { data: subs } = await supabase
    .from('practice_test_submissions')
    .select('id, student_name, score_total, score_max, big_idea_breakdown, submitted_at')
    .eq('practice_test_id', testId)
    .order('submitted_at', { ascending: false })

  const submissions = subs ?? []
  const aggregateBigIdea = aggregateBigIdeas(submissions)
  const avgPct = submissions.length > 0
    ? submissions.reduce((acc, s) => acc + (s.score_max > 0 ? (s.score_total / s.score_max) * 100 : 0), 0) / submissions.length
    : null

  const questionCount = test.answer_key && typeof test.answer_key === 'object'
    ? Object.keys(test.answer_key).length
    : 0

  return {
    test: {
      id: test.id,
      title: test.title,
      description: test.description,
      question_count: questionCount,
    },
    aggregate: {
      submissions: submissions.length,
      avg_score_pct: avgPct,
      big_idea: aggregateBigIdea,
    },
    submissions: submissions.map(s => ({
      id: s.id,
      student_name: s.student_name,
      score_total: s.score_total,
      score_max: s.score_max,
      big_idea_breakdown: s.big_idea_breakdown,
      submitted_at: s.submitted_at,
    })),
  }
}
