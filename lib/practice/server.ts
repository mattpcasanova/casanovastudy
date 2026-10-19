// Server helpers for assigned practice (service role; callers check who's asking).

import type { SupabaseClient } from '@supabase/supabase-js'
import { bestAttempt, practiceStatus, type Attempt } from './assignments'

export interface AssignmentRow {
  id: string
  teacher_id: string
  class_id: string
  study_guide_id: string
  title: string
  grading: 'percent' | 'mastery'
  max_attempts: number | null
  due_at: string | null
  code: string
  source: { batchId?: string; groupKey?: string } | null
  created_at: string
}

export const ASSIGNMENT_COLUMNS = 'id, teacher_id, class_id, study_guide_id, title, grading, max_attempts, due_at, code, source, created_at'

export const shareUrl = (origin: string, code: string) => `${origin.replace(/\/$/, '')}/practice/${code}`

/** Per-student progress on assignments (teacher views). */
export async function assignmentProgress(supabase: SupabaseClient, assignments: AssignmentRow[]) {
  const ids = assignments.map((a) => a.id)
  if (!ids.length) return new Map<string, Array<{ rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null; status: string; attempts: number; best: { pct: number; correct: number; total: number; detail: unknown } | null; lastAt: string | null }>>()
  const [{ data: who }, { data: tries }] = await Promise.all([
    supabase.from('practice_assignment_students').select('assignment_id, roster_id, class_roster(first_name, last_name, student_user_id, linked_via)').in('assignment_id', ids),
    supabase.from('practice_attempts').select('assignment_id, roster_id, pct, correct, total, counted, finished_at, detail').in('assignment_id', ids),
  ])
  const out = new Map<string, Array<{ rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null; status: string; attempts: number; best: { pct: number; correct: number; total: number; detail: unknown } | null; lastAt: string | null }>>()
  for (const a of assignments) {
    const rows = (who ?? []).filter((w) => w.assignment_id === a.id)
    out.set(a.id, rows.map((w) => {
      const r = (Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { first_name: string; last_name: string; student_user_id: string | null; linked_via: string | null } | null
      const mine = (tries ?? []).filter((t) => t.assignment_id === a.id && t.roster_id === w.roster_id)
      const list: Array<Attempt & { detail: unknown }> = mine.map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, finishedAt: t.finished_at as string, detail: t.detail }))
      const best = bestAttempt(list)
      return {
        rosterId: w.roster_id as string,
        firstName: r?.first_name ?? '',
        lastName: r?.last_name ?? '',
        name: `${r?.first_name ?? ''} ${r?.last_name ?? ''}`.trim(),
        linked: !!r?.student_user_id,
        linkedVia: r?.linked_via ?? null,
        status: practiceStatus(list, a.due_at),
        attempts: list.filter((t) => t.counted).length,
        best: best ? { pct: best.pct, correct: best.correct, total: best.total, detail: best.detail } : null,
        lastAt: list.map((t) => t.finishedAt).sort().pop() ?? null,
      }
    }).sort((x, y) => x.lastName.localeCompare(y.lastName) || x.firstName.localeCompare(y.firstName)))
  }
  return out
}

/** The roster row through which this user is assigned this practice, if any. */
export async function myAssignedRow(supabase: SupabaseClient, assignmentId: string, userId: string) {
  const { data } = await supabase
    .from('practice_assignment_students')
    .select('roster_id, class_roster!inner(id, student_user_id)')
    .eq('assignment_id', assignmentId)
    .eq('class_roster.student_user_id', userId)
    .limit(1)
    .maybeSingle()
  return data ? (data.roster_id as string) : null
}
