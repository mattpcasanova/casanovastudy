import type { SupabaseClient } from '@supabase/supabase-js'
import { computeFinalScore, isAttemptComplete, type ConceptRollup } from '@/lib/mastery/engine'
import type { AttemptRow, MasteryContext } from '@/lib/mastery/rounds'

// Gradebook projection: a mastery attempt appears in the existing
// assignment_submissions + grading_results model so the class gradebook and
// teacher assignment pages need zero changes.

/**
 * Upsert the submission row when an attempt starts, so the teacher's gradebook
 * shows "working on it" immediately.
 */
export async function ensureSubmissionRow(
  supabase: SupabaseClient,
  attempt: Pick<AttemptRow, 'assignment_id' | 'student_id' | 'class_id'>
): Promise<void> {
  await supabase
    .from('assignment_submissions')
    .upsert(
      {
        assignment_id: attempt.assignment_id,
        student_id: attempt.student_id,
        class_id: attempt.class_id,
        file_urls: [],
        status: 'submitted',
      },
      { onConflict: 'assignment_id,student_id' }
    )
}

/**
 * Complete an attempt: mark it completed, write a grading_results row
 * (mastered/total concepts), and flip the submission to 'graded'.
 * No-ops if the attempt is already completed or concepts are still in progress.
 */
export async function finalizeAttempt(
  supabase: SupabaseClient,
  attempt: AttemptRow,
  context: MasteryContext,
  rollups: ConceptRollup[]
): Promise<{ mastered: number; total: number; percentage: number } | null> {
  if (attempt.status === 'completed') return computeFinalScore(rollups)
  if (!isAttemptComplete(rollups)) return null

  const score = computeFinalScore(rollups)
  const completedAt = new Date().toISOString()

  const conceptNames = new Map(context.concepts.map(c => [c.id, c.name]))
  const breakdown = rollups.map(r => ({
    questionNumber: conceptNames.get(r.concept_id) ?? 'Concept',
    marksAwarded: r.status === 'mastered' ? 1 : 0,
    marksPossible: 1,
    explanation:
      r.status === 'mastered'
        ? `Mastered after ${r.answered_count} question${r.answered_count === 1 ? '' : 's'} (${r.correct_count} correct).`
        : `Not yet mastered — answered ${r.answered_count} questions (${r.correct_count} correct) before reaching the limit.`,
  }))

  const contentLines = [
    `# Mastery Quiz Results: ${context.assignment.title}`,
    '',
    `**Concepts mastered: ${score.mastered} of ${score.total} (${score.percentage}%)**`,
    '',
    ...rollups.map(r => {
      const name = conceptNames.get(r.concept_id) ?? 'Concept'
      const status = r.status === 'mastered' ? '✅ Mastered' : '⚠️ Needs more practice'
      return `- **${name}**: ${status} — ${r.correct_count}/${r.answered_count} correct`
    }),
  ]

  // Grade letter mirrors the percentage bands used elsewhere in the app
  const pct = score.percentage
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'

  const [profileRes, classRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('first_name, last_name, email')
      .eq('id', attempt.student_id)
      .maybeSingle(),
    supabase
      .from('classes')
      .select('name, period')
      .eq('id', attempt.class_id)
      .maybeSingle(),
  ])
  const profile = profileRes.data
  const cls = classRes.data
  const studentName = profile
    ? [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.email
    : 'Unknown student'

  const { data: gradingResult, error: gradingError } = await supabase
    .from('grading_results')
    .insert({
      user_id: context.assignment.teacher_id,
      student_user_id: attempt.student_id,
      student_name: studentName,
      student_first_name: profile?.first_name ?? null,
      student_last_name: profile?.last_name ?? null,
      student_exam_filename: 'mastery-quiz',
      total_marks: score.mastered,
      total_possible_marks: score.total,
      percentage: score.percentage,
      grade,
      content: contentLines.join('\n'),
      grade_breakdown: breakdown,
      class_name: cls?.name ?? null,
      class_period: cls?.period ?? null,
      exam_title: context.assignment.title,
    })
    .select('id')
    .single()
  if (gradingError || !gradingResult) {
    throw new Error(`Failed to record mastery result: ${gradingError?.message}`)
  }

  const isLate = !!(
    context.assignment.due_at && new Date(completedAt) > new Date(context.assignment.due_at)
  )

  // Submission row exists from attempt start; upsert defensively anyway
  const { data: submission } = await supabase
    .from('assignment_submissions')
    .upsert(
      {
        assignment_id: attempt.assignment_id,
        student_id: attempt.student_id,
        class_id: attempt.class_id,
        file_urls: [],
        status: 'graded',
        grading_result_id: gradingResult.id,
        is_late: isLate,
      },
      { onConflict: 'assignment_id,student_id' }
    )
    .select('id')
    .single()

  await Promise.all([
    supabase
      .from('mastery_attempts')
      .update({ status: 'completed', completed_at: completedAt })
      .eq('id', attempt.id),
    submission
      ? supabase
          .from('grading_results')
          .update({ assignment_submission_id: submission.id })
          .eq('id', gradingResult.id)
      : Promise.resolve(),
  ])

  return score
}
