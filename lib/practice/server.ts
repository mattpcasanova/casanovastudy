// Server helpers for assigned practice (service role; callers check who's asking).

import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { assignmentOpen, bestAttempt, normalizeAiHelp, practiceDaysLate, practiceStatus, strictestAiHelp, type AiHelp, type Attempt } from './assignments'

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
  source: { batchId?: string; practiceId?: string; groupKey?: string } | null
  ai_help: AiHelp
  created_at: string
}

export const ASSIGNMENT_COLUMNS = 'id, teacher_id, class_id, study_guide_id, title, grading, max_attempts, due_at, code, source, ai_help, created_at'

/** The signed-in teacher's own assignment, or the error response to return. */
export async function ownedAssignment(request: NextRequest, id: string): Promise<{ error: NextResponse } | { supabase: SupabaseClient; assignment: AssignmentRow; userId: string }> {
  const { user, error } = await requireTeacher(request)
  if (error) return { error }
  if (!/^[0-9a-f-]{36}$/i.test(id)) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  const supabase = createAdminClient()
  const { data } = await supabase.from('practice_assignments').select(ASSIGNMENT_COLUMNS).eq('id', id).eq('teacher_id', user.id).maybeSingle()
  if (!data) return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) }
  return { supabase, assignment: data as AssignmentRow, userId: user.id }
}

export const shareUrl = (origin: string, code: string) => `${origin.replace(/\/$/, '')}/practice/${code}`

// Answers in an attempt's detail are for the class report (report-server.ts), not every progress view.
const masteryDetail = (d: unknown) => {
  if (!d || typeof d !== 'object') return null
  const { mastered, notMastered } = d as { mastered?: string[]; notMastered?: string[] }
  return mastered || notMastered ? { mastered, notMastered } : null
}

/** Per-student progress on assignments (teacher views). */
export async function assignmentProgress(supabase: SupabaseClient, assignments: AssignmentRow[]) {
  const ids = assignments.map((a) => a.id)
  if (!ids.length) return new Map<string, Array<{ rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null; studentNumber: string | null; email: string | null; status: string; daysLate: number; attempts: number; best: { pct: number; correct: number; total: number; detail: unknown } | null; lastAt: string | null }>>()
  const [{ data: who }, { data: tries }] = await Promise.all([
    supabase.from('practice_assignment_students').select('assignment_id, roster_id, class_roster(first_name, last_name, student_user_id, linked_via, student_number, email)').in('assignment_id', ids),
    supabase.from('practice_attempts').select('assignment_id, roster_id, pct, correct, total, counted, finished_at, detail').in('assignment_id', ids),
  ])
  const out = new Map<string, Array<{ rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null; studentNumber: string | null; email: string | null; status: string; daysLate: number; attempts: number; best: { pct: number; correct: number; total: number; detail: unknown } | null; lastAt: string | null }>>()
  for (const a of assignments) {
    const rows = (who ?? []).filter((w) => w.assignment_id === a.id)
    out.set(a.id, rows.map((w) => {
      const r = (Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { first_name: string; last_name: string; student_user_id: string | null; linked_via: string | null; student_number: string | null; email: string | null } | null
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
        studentNumber: r?.student_number ?? null,
        email: r?.email ?? null,
        status: practiceStatus(list, a.due_at),
        daysLate: practiceDaysLate(list, a.due_at),
        attempts: list.filter((t) => t.counted).length,
        best: best ? { pct: best.pct, correct: best.correct, total: best.total, detail: masteryDetail(best.detail) } : null,
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

/**
 * The AI rule for this student on this guide: the strictest setting among
 * their open assignments on it (assignmentOpen), wherever they opened the
 * guide from, so a second tab without ?assignment= gets the same rule.
 * Null when nothing assigned to them is open. `uses` lists where to log.
 */
export async function aiRuleForGuide(supabase: SupabaseClient, userId: string, guideId: string): Promise<{ aiHelp: AiHelp; uses: Array<{ assignmentId: string; rosterId: string }> } | null> {
  const { data: rows } = await supabase
    .from('practice_assignment_students')
    .select('assignment_id, roster_id, class_roster!inner(student_user_id), practice_assignments!inner(study_guide_id, max_attempts, due_at, ai_help)')
    .eq('class_roster.student_user_id', userId)
    .eq('practice_assignments.study_guide_id', guideId)
  if (!rows?.length) return null
  const { data: tries } = await supabase
    .from('practice_attempts').select('assignment_id, roster_id, pct, correct, total, counted, finished_at')
    .in('assignment_id', [...new Set(rows.map((r) => r.assignment_id as string))])
    .eq('student_user_id', userId)
  const open = rows.filter((r) => {
    const a = (Array.isArray(r.practice_assignments) ? r.practice_assignments[0] : r.practice_assignments) as { max_attempts: number | null; due_at: string | null }
    const list: Attempt[] = (tries ?? []).filter((t) => t.assignment_id === r.assignment_id && t.roster_id === r.roster_id)
      .map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, finishedAt: t.finished_at as string }))
    return assignmentOpen(a.max_attempts, list, a.due_at)
  })
  const aiHelp = strictestAiHelp(open.map((r) => normalizeAiHelp(((Array.isArray(r.practice_assignments) ? r.practice_assignments[0] : r.practice_assignments) as { ai_help: string }).ai_help)))
  if (!aiHelp) return null
  return { aiHelp, uses: open.map((r) => ({ assignmentId: r.assignment_id as string, rosterId: r.roster_id as string })) }
}

export interface AiUse { at: string; kind: string; message: string }

/** Each assigned student's AI messages (teacher view), newest first: rosterId -> uses. */
export async function aiUsesFor(supabase: SupabaseClient, assignmentId: string): Promise<Map<string, AiUse[]>> {
  const { data } = await supabase
    .from('assignment_ai_uses').select('roster_id, kind, message, created_at')
    .eq('assignment_id', assignmentId).order('created_at', { ascending: false }).limit(2000)
  const out = new Map<string, AiUse[]>()
  for (const r of data ?? []) {
    const list = out.get(r.roster_id as string) ?? []
    list.push({ at: r.created_at as string, kind: r.kind as string, message: r.message as string })
    out.set(r.roster_id as string, list)
  }
  return out
}
