// Unfinished assigned work at the due date (2026-10-27, migration 077). Runs
// save as students go (study_progress), so once the due date passes, whatever
// a student answered is sent for them (unanswered = 0) as an `auto` attempt:
// it scores, shows the teacher "Incomplete", and doesn't use up an attempt, so
// finishing later still counts (late). Runs lazily whenever assigned work is
// read (teacher pages, gradebook, the student's own views) and from a daily cron.
// Service role; callers check who's asking.

import type { SupabaseClient } from '@supabase/supabase-js'
import { scoreSavedRun, type SavedRunScore } from './saved-run'

const KIND: Record<string, string> = { practice: 'practice', quiz: 'quiz', adaptive: 'adaptive' }

/**
 * Each student's saved, unfinished run on these guides, scored: key
 * `${guideId}|${userId}`. Only runs with something answered.
 */
export async function savedRunsFor(supabase: SupabaseClient, guideIds: string[], userIds: string[]): Promise<Map<string, { score: SavedRunScore; updatedAt: string }>> {
  const out = new Map<string, { score: SavedRunScore; updatedAt: string }>()
  if (!guideIds.length || !userIds.length) return out
  const [{ data: guides }, { data: rows }] = await Promise.all([
    supabase.from('study_guides').select('id, format, content').in('id', guideIds),
    supabase.from('study_progress').select('user_id, study_guide_id, kind, data, updated_at').in('study_guide_id', guideIds).in('user_id', userIds).in('kind', ['practice', 'quiz', 'adaptive']),
  ])
  const byId = new Map((guides ?? []).map((g) => [g.id as string, g as { id: string; format: string; content: string | null }]))
  for (const r of rows ?? []) {
    const g = byId.get(r.study_guide_id as string)
    if (!g || KIND[g.format] !== r.kind) continue
    const score = scoreSavedRun(g.format, g.content ?? '', r.data)
    if (score) out.set(`${g.id}|${r.user_id}`, { score, updatedAt: r.updated_at as string })
  }
  return out
}

/**
 * Sends unfinished runs on these assignments (or any, for the cron) whose due
 * date has passed and that haven't been swept yet. Each assignment is claimed
 * first (auto_submitted_at) so two requests never send the same run twice.
 */
export async function sendUnfinishedAtDue(supabase: SupabaseClient, assignmentIds?: string[]): Promise<number> {
  if (assignmentIds && !assignmentIds.length) return 0
  const now = new Date().toISOString()
  let q = supabase.from('practice_assignments').select('id').is('auto_submitted_at', null).not('due_at', 'is', null).lt('due_at', now).limit(200)
  if (assignmentIds) q = q.in('id', assignmentIds)
  const { data: due } = await q
  if (!due?.length) return 0
  const { data: claimed } = await supabase
    .from('practice_assignments').update({ auto_submitted_at: now })
    .in('id', due.map((d) => d.id as string)).is('auto_submitted_at', null)
    .select('id, study_guide_id, due_at')
  if (!claimed?.length) return 0

  const ids = claimed.map((a) => a.id as string)
  const [{ data: who }, { data: tries }] = await Promise.all([
    supabase.from('practice_assignment_students').select('assignment_id, roster_id, class_roster(student_user_id)').in('assignment_id', ids),
    supabase.from('practice_attempts').select('assignment_id, roster_id').in('assignment_id', ids),
  ])
  const hasAttempt = new Set((tries ?? []).map((t) => `${t.assignment_id}|${t.roster_id}`))
  const todo = (who ?? []).flatMap((w) => {
    const userId = ((Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { student_user_id: string | null } | null)?.student_user_id
    return userId && !hasAttempt.has(`${w.assignment_id}|${w.roster_id}`) ? [{ assignmentId: w.assignment_id as string, rosterId: w.roster_id as string, userId }] : []
  })
  if (!todo.length) return 0
  const runs = await savedRunsFor(supabase, [...new Set(claimed.map((a) => a.study_guide_id as string))], [...new Set(todo.map((t) => t.userId))])
  const assignment = new Map(claimed.map((a) => [a.id as string, a as { id: string; study_guide_id: string; due_at: string }]))
  const inserts = todo.flatMap((t) => {
    const a = assignment.get(t.assignmentId)!
    const run = runs.get(`${a.study_guide_id}|${t.userId}`)
    if (!run) return []
    const { score } = run
    // Saved before the due date: sent on time. Saved after (the sweep ran late): when they last worked on it.
    const finishedAt = Date.parse(run.updatedAt) <= Date.parse(a.due_at) ? a.due_at : run.updatedAt
    return [{
      assignment_id: a.id, roster_id: t.rosterId, student_user_id: t.userId,
      correct: score.correct, total: score.total, pct: Math.round((score.correct / score.total) * 1000) / 10,
      counted: true, auto: true, finished_at: finishedAt,
      detail: {
        auto: { answered: score.answered, unit: score.unit },
        ...(score.answers.length ? { answers: score.answers } : {}),
        ...(score.mastered ? { mastered: score.mastered, notMastered: score.notMastered } : {}),
      },
    }]
  })
  if (!inserts.length) return 0
  const { error } = await supabase.from('practice_attempts').insert(inserts)
  if (error) { console.error('Sending unfinished runs failed:', error.message); return 0 }
  return inserts.length
}
