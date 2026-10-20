// School overview on the server (service role). See lib/school/overview.ts and
// migration 064. Only counts per teacher leave this file.

import type { SupabaseClient } from '@supabase/supabase-js'
import { schoolYearFor } from '@/lib/classes/years'
import { emailOnDomain, schoolOverview, type SchoolOverview } from './overview'

export interface AdminSchool { domain: string; schoolName: string | null }

type Page<T> = PromiseLike<{ data: T[] | null; error: { message: string } | null }>

/** PostgREST returns at most 1000 rows per request; page through the rest. */
async function fetchAll<T>(page: (from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const { data, error } = await page(from, from + 999)
    if (error) throw new Error(error.message)
    out.push(...(data ?? []))
    if (!data || data.length < 1000) return out
  }
}

/** Same, over ids in chunks so `.in(...)` URLs stay short. */
async function fetchByIds<T>(ids: string[], page: (chunk: string[], from: number, to: number) => Page<T>): Promise<T[]> {
  const out: T[] = []
  for (let i = 0; i < ids.length; i += 100) {
    const chunk = ids.slice(i, i + 100)
    out.push(...(await fetchAll((from, to) => page(chunk, from, to))))
  }
  return out
}

export async function adminSchools(supabase: SupabaseClient, userId: string): Promise<AdminSchool[]> {
  const { data } = await supabase.from('school_admins').select('domain, verified_school_domains(school_name)').eq('user_id', userId)
  return (data ?? []).map((r) => {
    const d = Array.isArray(r.verified_school_domains) ? r.verified_school_domains[0] : r.verified_school_domains
    return { domain: r.domain as string, schoolName: (d as { school_name: string | null } | null)?.school_name ?? null }
  })
}

/** July 1 (Eastern) of the current school year. */
export function schoolYearStart(now = new Date()): string {
  return `${schoolYearFor(now).slice(0, 4)}-07-01T04:00:00Z`
}

export async function loadSchoolOverview(supabase: SupabaseClient, domain: string, now = new Date()): Promise<SchoolOverview & { year: string; since: string }> {
  const year = schoolYearFor(now)
  const since = schoolYearStart(now)

  // The school's teachers: approved, with a confirmed school email on this domain.
  const verified = await fetchAll<{ user_id: string; school_email: string | null }>((f, t) =>
    supabase.from('teacher_verifications').select('user_id, school_email').eq('status', 'approved').ilike('school_email', `%${domain}`).range(f, t))
  const ids = verified.filter((v) => emailOnDomain(v.school_email, domain)).map((v) => v.user_id)
  const emailOf = new Map(verified.map((v) => [v.user_id, v.school_email]))
  if (!ids.length) return { ...schoolOverview({ teachers: [], gradings: [], guides: [], practice: [], classes: [], now: now.getTime() }), year, since }

  const [profiles, gradings, guides, assignments, classes] = await Promise.all([
    fetchByIds<{ id: string; first_name: string | null; last_name: string | null }>(ids, (c, f, t) => supabase.from('user_profiles').select('id, first_name, last_name').in('id', c).range(f, t)),
    fetchByIds<{ user_id: string; batch_id: string | null; created_at: string }>(ids, (c, f, t) => supabase.from('grading_results').select('user_id, batch_id, created_at').in('user_id', c).gte('created_at', since).order('created_at').range(f, t)),
    fetchByIds<{ user_id: string; created_at: string }>(ids, (c, f, t) => supabase.from('study_guides').select('user_id, created_at').in('user_id', c).gte('created_at', since).order('created_at').range(f, t)),
    fetchByIds<{ id: string; teacher_id: string; created_at: string }>(ids, (c, f, t) => supabase.from('practice_assignments').select('id, teacher_id, created_at').in('teacher_id', c).gte('created_at', since).order('created_at').range(f, t)),
    fetchByIds<{ id: string; teacher_id: string }>(ids, (c, f, t) => supabase.from('classes').select('id, teacher_id').in('teacher_id', c).eq('school_year', year).order('id').range(f, t)),
  ])

  const assignmentIds = assignments.map((a) => a.id)
  const classIds = classes.map((c) => c.id)
  const [assigned, attempts, roster] = await Promise.all([
    fetchByIds<{ assignment_id: string }>(assignmentIds, (c, f, t) => supabase.from('practice_assignment_students').select('assignment_id').in('assignment_id', c).order('assignment_id').range(f, t)),
    fetchByIds<{ assignment_id: string; roster_id: string }>(assignmentIds, (c, f, t) => supabase.from('practice_attempts').select('assignment_id, roster_id').in('assignment_id', c).order('id').range(f, t)),
    fetchByIds<{ class_id: string }>(classIds, (c, f, t) => supabase.from('class_roster').select('class_id').in('class_id', c).is('left_at', null).order('id').range(f, t)),
  ])
  const count = <K extends string>(rows: Array<Record<K, string>>, key: K) => rows.reduce((m, r) => m.set(r[key], (m.get(r[key]) ?? 0) + 1), new Map<string, number>())
  const studentsPer = count(assigned, 'assignment_id')
  const finishedPer = new Map<string, Set<string>>()
  for (const a of attempts) finishedPer.set(a.assignment_id, (finishedPer.get(a.assignment_id) ?? new Set()).add(a.roster_id))
  const rosterPer = count(roster, 'class_id')

  const overview = schoolOverview({
    now: now.getTime(),
    teachers: ids.map((id) => {
      const p = profiles.find((x) => x.id === id)
      return { id, name: [p?.first_name, p?.last_name].filter(Boolean).join(' ') || 'Unnamed teacher', email: emailOf.get(id) ?? null }
    }),
    gradings: gradings.map((g) => ({ userId: g.user_id, batchId: g.batch_id, createdAt: g.created_at })),
    guides: guides.map((g) => ({ userId: g.user_id, createdAt: g.created_at })),
    practice: assignments.map((a) => ({ teacherId: a.teacher_id, id: a.id, createdAt: a.created_at, students: studentsPer.get(a.id) ?? 0, finished: finishedPer.get(a.id)?.size ?? 0 })),
    classes: classes.map((c) => ({ teacherId: c.teacher_id, id: c.id, students: rosterPer.get(c.id) ?? 0 })),
  })
  return { ...overview, year, since }
}
