// Server helpers for assigned practice (service role; callers check who's asking).

import { NextResponse, type NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { accountNames } from '@/lib/classes/server'
import type { FocusEvent } from './focus'
import { savedRunsFor, sendUnfinishedAtDue } from './auto-submit'
import type { RunCount } from './assignments'
import { assignmentOpen, bestAttempt, couldBeStudent, normalizeAiHelp, practiceDaysLate, practiceStatus, strictestAiHelp, type AiHelp, type Attempt } from './assignments'

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
  focus_mode: boolean
  created_at: string
}

export const ASSIGNMENT_COLUMNS = 'id, teacher_id, class_id, study_guide_id, title, grading, max_attempts, due_at, code, source, ai_help, focus_mode, created_at'

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


export interface StudentProgress {
  rosterId: string; name: string; firstName: string; lastName: string; linked: boolean; linkedVia: string | null
  account: { name: string; matches: boolean } | null; studentNumber: string | null; email: string | null
  status: string; daysLate: number; attempts: number
  best: { pct: number; correct: number; total: number; detail: unknown } | null
  lastAt: string | null
  /** Started but not finished (saved run), while nothing is turned in. */
  inProgress: RunCount | null
  /** Status incomplete: what they had answered when it was sent at the due date. */
  incomplete: RunCount | null
}

const autoCount = (d: unknown, total: number): RunCount | null => {
  const auto = (d as { auto?: { answered?: number; unit?: string } } | null)?.auto
  return auto && typeof auto.answered === 'number' ? { answered: auto.answered, total, unit: auto.unit === 'activities' ? 'activities' : 'questions' } : null
}

/** Per-student progress on assignments (teacher views). Sends unfinished runs whose due date has passed first. */
export async function assignmentProgress(supabase: SupabaseClient, assignments: AssignmentRow[]) {
  const ids = assignments.map((a) => a.id)
  if (!ids.length) return new Map<string, StudentProgress[]>()
  await sendUnfinishedAtDue(supabase, ids)
  const [{ data: who }, { data: tries }] = await Promise.all([
    supabase.from('practice_assignment_students').select('assignment_id, roster_id, class_roster(first_name, last_name, student_user_id, linked_via, student_number, email, account_confirmed_at)').in('assignment_id', ids),
    supabase.from('practice_attempts').select('assignment_id, roster_id, pct, correct, total, counted, auto, finished_at, detail').in('assignment_id', ids),
  ])
  // Started and not turned in: their saved run (adaptive totals are concepts, so show questions answered only).
  const rosterOf = (w: { class_roster: unknown }) => (Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { student_user_id: string | null } | null
  const waiting = (who ?? []).filter((w) => rosterOf(w)?.student_user_id && !(tries ?? []).some((t) => t.assignment_id === w.assignment_id && t.roster_id === w.roster_id && t.counted))
  const runs = await savedRunsFor(supabase, [...new Set(assignments.filter((a) => waiting.some((w) => w.assignment_id === a.id)).map((a) => a.study_guide_id))], [...new Set(waiting.map((w) => rosterOf(w)!.student_user_id!))])
  const accounts = await accountNames(supabase, (who ?? []).map((w) => ((Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { student_user_id: string | null } | null)?.student_user_id))
  const out = new Map<string, StudentProgress[]>()
  for (const a of assignments) {
    const rows = (who ?? []).filter((w) => w.assignment_id === a.id)
    out.set(a.id, rows.map((w) => {
      const r = (Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { first_name: string; last_name: string; student_user_id: string | null; linked_via: string | null; student_number: string | null; email: string | null; account_confirmed_at: string | null } | null
      const mine = (tries ?? []).filter((t) => t.assignment_id === a.id && t.roster_id === w.roster_id)
      const list: Array<Attempt & { detail: unknown }> = mine.map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, auto: !!t.auto, finishedAt: t.finished_at as string, detail: t.detail }))
      const best = bestAttempt(list)
      const status = practiceStatus(list, a.due_at)
      const saved = r?.student_user_id && !list.some((t) => t.counted) ? runs.get(`${a.study_guide_id}|${r.student_user_id}`) : undefined
      const sent = status === 'incomplete' ? list.find((t) => t.auto && t.counted) : undefined
      return {
        rosterId: w.roster_id as string,
        firstName: r?.first_name ?? '',
        lastName: r?.last_name ?? '',
        name: `${r?.first_name ?? ''} ${r?.last_name ?? ''}`.trim(),
        linked: !!r?.student_user_id,
        linkedVia: r?.linked_via ?? null,
        account: (() => {
          const acc = r?.student_user_id ? accounts.get(r.student_user_id) : undefined
          return acc ? { name: `${acc.firstName} ${acc.lastName}`.trim(), matches: !!r!.account_confirmed_at || couldBeStudent(acc, { firstName: r!.first_name, lastName: r!.last_name }) } : null
        })(),
        studentNumber: r?.student_number ?? null,
        email: r?.email ?? null,
        status,
        daysLate: practiceDaysLate(list, a.due_at),
        attempts: list.filter((t) => t.counted && !t.auto).length,
        best: best ? { pct: best.pct, correct: best.correct, total: best.total, detail: masteryDetail(best.detail) } : null,
        lastAt: list.map((t) => t.finishedAt).sort().pop() ?? null,
        inProgress: saved ? { answered: saved.score.answered, total: a.grading === 'mastery' ? 0 : saved.score.total, unit: saved.score.unit } : null,
        incomplete: sent ? autoCount(sent.detail, a.grading === 'mastery' ? 0 : sent.total) : null,
      } satisfies StudentProgress
    }).sort((x, y) => x.lastName.localeCompare(y.lastName) || x.firstName.localeCompare(y.firstName)))
  }
  return out
}

/**
 * Guides this teacher assigned, per roster row (rosterId -> guide ids). Teacher
 * views of a student's own studying only cover these: a guide the teacher gave
 * them is a direct relation; anything else they study is theirs (Matt, 2026-10-26).
 */
export async function assignedGuidesByRoster(supabase: SupabaseClient, teacherId: string, rosterIds?: string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>()
  if (rosterIds && !rosterIds.length) return out
  const { data: assignments } = await supabase.from('practice_assignments').select('id, study_guide_id').eq('teacher_id', teacherId)
  const guideOf = new Map((assignments ?? []).map((a) => [a.id as string, a.study_guide_id as string]))
  if (!guideOf.size) return out
  const ids = [...guideOf.keys()]
  for (let i = 0; i < ids.length; i += 100) {
    let q = supabase.from('practice_assignment_students').select('assignment_id, roster_id').in('assignment_id', ids.slice(i, i + 100))
    if (rosterIds) q = q.in('roster_id', rosterIds)
    const { data } = await q.limit(20000)
    for (const row of data ?? []) {
      const set = out.get(row.roster_id as string) ?? new Set<string>()
      set.add(guideOf.get(row.assignment_id as string)!)
      out.set(row.roster_id as string, set)
    }
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
 * The student's assignment on any of these guides (a guide, or the original a
 * saved copy came from), so opening it from My Guides or a copy still counts.
 * Prefers one that's still open (attempts left, not long past due), newest first.
 */
export async function myAssignmentOnGuides(supabase: SupabaseClient, userId: string, guideIds: string[]): Promise<{ assignmentId: string; guideId: string } | null> {
  if (!guideIds.length) return null
  const { data: rows } = await supabase
    .from('practice_assignment_students')
    .select('assignment_id, roster_id, class_roster!inner(student_user_id), practice_assignments!inner(study_guide_id, max_attempts, due_at, created_at)')
    .eq('class_roster.student_user_id', userId)
    .in('practice_assignments.study_guide_id', guideIds)
  if (!rows?.length) return null
  type A = { study_guide_id: string; max_attempts: number | null; due_at: string | null; created_at: string }
  const one = (r: (typeof rows)[number]) => (Array.isArray(r.practice_assignments) ? r.practice_assignments[0] : r.practice_assignments) as A
  const { data: tries } = await supabase
    .from('practice_attempts').select('assignment_id, roster_id, pct, correct, total, counted, auto, finished_at')
    .in('assignment_id', [...new Set(rows.map((r) => r.assignment_id as string))])
    .eq('student_user_id', userId)
  const ranked = rows.map((r) => {
    const a = one(r)
    const list: Attempt[] = (tries ?? []).filter((t) => t.assignment_id === r.assignment_id && t.roster_id === r.roster_id)
      .map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, auto: !!t.auto, finishedAt: t.finished_at as string }))
    return { assignmentId: r.assignment_id as string, guideId: a.study_guide_id, open: assignmentOpen(a.max_attempts, list, a.due_at), createdAt: a.created_at }
  }).sort((x, y) => Number(y.open) - Number(x.open) || y.createdAt.localeCompare(x.createdAt))
  return { assignmentId: ranked[0].assignmentId, guideId: ranked[0].guideId }
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
    .from('practice_attempts').select('assignment_id, roster_id, pct, correct, total, counted, auto, finished_at')
    .in('assignment_id', [...new Set(rows.map((r) => r.assignment_id as string))])
    .eq('student_user_id', userId)
  const open = rows.filter((r) => {
    const a = (Array.isArray(r.practice_assignments) ? r.practice_assignments[0] : r.practice_assignments) as { max_attempts: number | null; due_at: string | null }
    const list: Attempt[] = (tries ?? []).filter((t) => t.assignment_id === r.assignment_id && t.roster_id === r.roster_id)
      .map((t) => ({ pct: Number(t.pct), correct: Number(t.correct), total: Number(t.total), counted: !!t.counted, auto: !!t.auto, finishedAt: t.finished_at as string }))
    return assignmentOpen(a.max_attempts, list, a.due_at)
  })
  const aiHelp = strictestAiHelp(open.map((r) => normalizeAiHelp(((Array.isArray(r.practice_assignments) ? r.practice_assignments[0] : r.practice_assignments) as { ai_help: string }).ai_help)))
  if (!aiHelp) return null
  return { aiHelp, uses: open.map((r) => ({ assignmentId: r.assignment_id as string, rosterId: r.roster_id as string })) }
}

export interface AiUse { at: string; kind: string; message: string }

/** Each assigned student's focus-mode log (teacher view), oldest first: rosterId -> events. */
export async function focusEventsFor(supabase: SupabaseClient, assignmentId: string): Promise<Map<string, FocusEvent[]>> {
  const { data } = await supabase
    .from('assignment_focus_events').select('roster_id, kind, at, seconds')
    .eq('assignment_id', assignmentId).order('at').limit(5000)
  const out = new Map<string, FocusEvent[]>()
  for (const r of data ?? []) {
    const list = out.get(r.roster_id as string) ?? []
    list.push({ kind: r.kind as FocusEvent['kind'], at: r.at as string, seconds: r.seconds as number | null })
    out.set(r.roster_id as string, list)
  }
  return out
}

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

/**
 * A teacher unlinked a name from the wrong student's account ("Not them"):
 * that account's practice runs and AI messages under the name aren't the
 * real student's. Move them to the account's own name on the same guide in
 * another of this teacher's classes (they opened another period's link),
 * else delete them, so the real student isn't scored on someone else's work.
 */
export async function moveWrongPractice(supabase: SupabaseClient, teacherId: string, rosterId: string, userId: string): Promise<void> {
  const [{ data: tries }, { data: uses }] = await Promise.all([
    supabase.from('practice_attempts').select('assignment_id').eq('roster_id', rosterId).eq('student_user_id', userId),
    supabase.from('assignment_ai_uses').select('assignment_id').eq('roster_id', rosterId).eq('student_user_id', userId),
  ])
  const assignmentIds = [...new Set([...(tries ?? []), ...(uses ?? [])].map((t) => t.assignment_id as string))]
  if (!assignmentIds.length) return
  const { data: from } = await supabase.from('practice_assignments').select('id, study_guide_id').in('id', assignmentIds)
  const { data: theirs } = await supabase
    .from('practice_assignment_students')
    .select('assignment_id, roster_id, class_roster!inner(student_user_id), practice_assignments!inner(teacher_id, study_guide_id)')
    .eq('class_roster.student_user_id', userId)
    .eq('practice_assignments.teacher_id', teacherId)
    .neq('roster_id', rosterId)
  for (const a of from ?? []) {
    const target = (theirs ?? []).find((t) => ((Array.isArray(t.practice_assignments) ? t.practice_assignments[0] : t.practice_assignments) as { study_guide_id: string }).study_guide_id === a.study_guide_id)
    for (const table of ['practice_attempts', 'assignment_ai_uses', 'assignment_focus_events']) {
      const rows = target
        ? supabase.from(table).update({ assignment_id: target.assignment_id, roster_id: target.roster_id })
        : supabase.from(table).delete()
      await rows.eq('assignment_id', a.id).eq('roster_id', rosterId).eq('student_user_id', userId)
    }
  }
}
