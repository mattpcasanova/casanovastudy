// Account deletion and data export (the /account page; also used when a
// parent declines consent). Most tables cascade from auth.users; guides and a
// teacher's gradings are "ON DELETE SET NULL" (shared guides survive their
// owner by default), so a deletion request removes those explicitly, and
// study_guide_assignments.assigned_by would block the delete, so it goes first.

import { createAdminClient } from '@/lib/supabase-server'

export async function deleteAccount(userId: string): Promise<void> {
  const supabase = createAdminClient()
  const steps: Array<[string, PromiseLike<{ error: { message: string } | null }>]> = [
    ['assignments', supabase.from('study_guide_assignments').delete().eq('assigned_by', userId)],
    ['study guides', supabase.from('study_guides').delete().eq('user_id', userId)],
    ['gradings', supabase.from('grading_results').delete().eq('user_id', userId)],
  ]
  for (const [what, step] of steps) {
    const { error } = await step
    if (error) throw new Error(`Could not delete ${what}: ${error.message}`)
  }
  const { error } = await supabase.auth.admin.deleteUser(userId)
  if (error) throw new Error(`Could not delete the account: ${error.message}`)
}

/** Everything we hold about this user, as one JSON document. */
export async function exportAccount(userId: string): Promise<Record<string, unknown>> {
  const supabase = createAdminClient()
  const own = (table: string, column = 'user_id', select = '*') => supabase.from(table).select(select).eq(column, userId)
  const [profile, guides, results, progress, plan, consent, gradings, gradedAsStudent] = await Promise.all([
    own('user_profiles', 'id'),
    own('study_guides', 'user_id', 'id, title, subject, grade_level, format, topic_focus, difficulty_level, created_at, content, custom_content'),
    own('study_results'),
    own('study_progress'),
    own('user_plans'),
    own('parental_consents', 'user_id', 'status, parent_email, requested_at, decided_at'),
    own('grading_results', 'user_id', 'id, student_name, exam_title, class_name, total_marks, total_possible_marks, percentage, grade, grade_breakdown, created_at'),
    own('grading_results', 'student_user_id', 'id, exam_title, total_marks, total_possible_marks, percentage, grade, grade_breakdown, created_at'),
  ])
  return {
    exported_at: new Date().toISOString(),
    profile: profile.data?.[0] ?? null,
    study_guides: guides.data ?? [],
    answers: results.data ?? [],
    progress: progress.data ?? [],
    plan: plan.data?.[0] ?? null,
    parental_consent: consent.data?.[0] ?? null,
    gradings_you_made: gradings.data ?? [],
    your_graded_work: gradedAsStudent.data ?? [],
  }
}
