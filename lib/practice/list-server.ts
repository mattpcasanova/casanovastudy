import type { SupabaseClient } from '@supabase/supabase-js'
import { fetchAll, fetchByIds } from '@/lib/school/server'
import { splitPractice, stillOpen, type PracticeListItem } from './list'

interface AssignmentLite { id: string; title: string | null; class_id: string; due_at: string | null; created_at: string }

/**
 * Every practice assignment of a teacher with turned-in counts and the average
 * of best scores. `openOnly` (the home page) loads counts for all of them but
 * scores for none, and returns just the open ones; `total` is always everything.
 */
export async function loadPracticeList(supabase: SupabaseClient, teacherId: string, opts: { openOnly?: boolean } = {}): Promise<{ items: PracticeListItem[]; total: number }> {
  const rows = await fetchAll<AssignmentLite>((from, to) => supabase.from('practice_assignments')
    .select('id, title, class_id, due_at, created_at').eq('teacher_id', teacherId)
    .order('created_at', { ascending: false }).order('id').range(from, to))
  if (!rows.length) return { items: [], total: 0 }

  // The home page only needs assignments that could still be open: skip the long tail before counting.
  const horizon = Date.now() - 100 * 86400_000
  const wanted = opts.openOnly ? rows.filter((a) => (a.due_at ? Date.parse(a.due_at) : Date.parse(a.created_at)) >= horizon) : rows
  const ids = wanted.map((a) => a.id)
  const classIds = [...new Set(wanted.map((a) => a.class_id))]

  const [assignedTo, attempts, classRows] = await Promise.all([
    fetchByIds<{ assignment_id: string; roster_id: string }>(ids, (chunk, from, to) => supabase.from('practice_assignment_students')
      .select('assignment_id, roster_id').in('assignment_id', chunk).order('assignment_id').order('roster_id').range(from, to)),
    fetchByIds<{ assignment_id: string; roster_id: string; pct: number; counted: boolean; auto: boolean | null }>(ids, (chunk, from, to) => supabase.from('practice_attempts')
      .select('assignment_id, roster_id, pct, counted, auto').in('assignment_id', chunk).order('id').range(from, to)),
    fetchByIds<{ id: string; name: string; period: string | null; school_year: string | null }>(classIds, (chunk, from, to) => supabase.from('classes')
      .select('id, name, period, school_year').in('id', chunk).order('id').range(from, to)),
  ])

  const assignedCount = new Map<string, number>()
  for (const r of assignedTo) assignedCount.set(r.assignment_id, (assignedCount.get(r.assignment_id) ?? 0) + 1)
  const doneBy = new Map<string, Set<string>>()
  const bestBy = new Map<string, Map<string, number>>()
  for (const r of attempts) {
    if (!r.auto) (doneBy.get(r.assignment_id) ?? doneBy.set(r.assignment_id, new Set()).get(r.assignment_id)!).add(r.roster_id)
    if (!r.counted) continue
    const best = bestBy.get(r.assignment_id) ?? bestBy.set(r.assignment_id, new Map()).get(r.assignment_id)!
    const pct = Number(r.pct)
    if (!best.has(r.roster_id) || pct > best.get(r.roster_id)!) best.set(r.roster_id, pct)
  }
  const classes = new Map(classRows.map((c) => [c.id, c]))

  const items: PracticeListItem[] = wanted.map((a) => {
    const best = [...(bestBy.get(a.id)?.values() ?? [])]
    const cls = classes.get(a.class_id)
    return {
      id: a.id, title: a.title?.trim() || 'Practice', classId: a.class_id,
      className: cls?.name ?? null, period: cls?.period ?? null, schoolYear: cls?.school_year ?? null,
      assigned: assignedCount.get(a.id) ?? 0, done: doneBy.get(a.id)?.size ?? 0,
      average: best.length ? best.reduce((s, n) => s + n, 0) / best.length : null,
      dueAt: a.due_at, createdAt: a.created_at,
    }
  })
  if (!opts.openOnly) return { items, total: rows.length }
  return { items: splitPractice(items.filter((p) => stillOpen(p))).open, total: rows.length }
}
