// Server helpers for light classes (rosters). Service-role only: callers must
// have verified the teacher owns the class (ownedClass) first.

import { classTeacherVerified } from '@/lib/teachers/verification'
import type { SupabaseClient } from '@supabase/supabase-js'
import { rosterRowForStudent } from './roster'
import { normalizeName } from '@/lib/grading/names'
import type { AreaBatch } from './areas'
import type { ClassInsightsAI } from '@/lib/grading/insights'

export interface RosterRow {
  id: string
  firstName: string
  lastName: string
  studentUserId: string | null
  studentNumber: string | null
  email: string | null
  /** Left the class mid-year: hidden by default, graded work kept. */
  left: boolean
  linked: boolean
}

export async function ownedClass(supabase: SupabaseClient, teacherId: string, classId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(classId)) return null
  const { data } = await supabase
    .from('classes')
    .select('id, teacher_id, name, period, subject, enrollment_code, is_archived, school_year, course, created_at')
    .eq('id', classId)
    .maybeSingle()
  return data && data.teacher_id === teacherId ? data : null
}

export async function loadRoster(supabase: SupabaseClient, classId: string): Promise<RosterRow[]> {
  const { data } = await supabase
    .from('class_roster')
    .select('id, first_name, last_name, student_user_id, student_number, email, left_at')
    .eq('class_id', classId)
    .order('last_name', { ascending: true })
    .order('first_name', { ascending: true })
  return (data ?? []).map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    studentUserId: r.student_user_id,
    studentNumber: r.student_number,
    email: r.email,
    left: !!r.left_at,
    linked: !!r.student_user_id,
  }))
}

/**
 * Students who joined with the class code but aren't on the roster yet: link
 * each to their roster name when it's a confident match, else add them.
 */
export async function syncRosterWithEnrollments(supabase: SupabaseClient, classId: string): Promise<void> {
  await linkRosterByEmail(supabase, classId)
  const [{ data: enrollments }, roster] = await Promise.all([
    supabase.from('class_enrollments').select('student_id').eq('class_id', classId).eq('status', 'active'),
    loadRoster(supabase, classId),
  ])
  const linked = new Set(roster.map((r) => r.studentUserId).filter(Boolean))
  const missing = (enrollments ?? []).map((e) => e.student_id).filter((id) => !linked.has(id))
  if (!missing.length) return

  const { data: profiles } = await supabase.from('user_profiles').select('id, first_name, last_name, email').in('id', missing)
  for (const p of profiles ?? []) {
    const name = { firstName: p.first_name ?? '', lastName: p.last_name ?? '' }
    if (!name.firstName && !name.lastName) name.firstName = String(p.email ?? 'Student').split('@')[0]
    const rowId = rosterRowForStudent(name, roster)
    if (rowId) {
      await supabase.from('class_roster').update({ student_user_id: p.id }).eq('id', rowId).is('student_user_id', null)
      // Papers already graded for this name now belong to the student (still only visible once released).
      await supabase.from('grading_results').update({ student_user_id: p.id }).eq('roster_id', rowId).is('student_user_id', null)
      const row = roster.find((r) => r.id === rowId)
      if (row) { row.linked = true; row.studentUserId = p.id }
    } else {
      // Same name already on the roster but linked to someone else: keep both apart.
      const { error } = await supabase.from('class_roster').insert({ class_id: classId, first_name: name.firstName, last_name: name.lastName, student_user_id: p.id })
      if (error) await supabase.from('class_roster').insert({ class_id: classId, first_name: name.firstName, last_name: `${name.lastName} (${String(p.email ?? '').split('@')[0]})`.trim(), student_user_id: p.id })
    }
  }
}

/**
 * Add names to a class roster, skipping ones already on it (by name, or by
 * student number when both have one). Returns how many were added.
 */
export async function addRosterNames(
  supabase: SupabaseClient,
  classId: string,
  names: Array<{ firstName: string; lastName: string; studentNumber?: string; email?: string | null }>,
): Promise<{ added: number; skipped: number; error?: string }> {
  const existing = await loadRoster(supabase, classId)
  const byName = new Set(existing.map((r) => normalizeName(`${r.firstName} ${r.lastName}`)))
  const byNumber = new Map(existing.filter((r) => r.studentNumber).map((r) => [r.studentNumber!, r]))
  const byEmail = new Map(existing.filter((r) => r.email).map((r) => [r.email!.toLowerCase(), r]))
  const fresh: typeof names = []
  for (const n of names) {
    const known = (n.studentNumber ? byNumber.get(n.studentNumber) : undefined) ?? (n.email ? byEmail.get(n.email.toLowerCase()) : undefined)
    if (known || byName.has(normalizeName(`${n.firstName} ${n.lastName}`))) {
      // Fill in a missing student number or email on a name already there.
      const row = known ?? existing.find((r) => normalizeName(`${r.firstName} ${r.lastName}`) === normalizeName(`${n.firstName} ${n.lastName}`))
      const fill: Record<string, string> = {}
      if (row && !row.studentNumber && n.studentNumber) fill.student_number = n.studentNumber
      if (row && !row.email && n.email) fill.email = n.email.toLowerCase()
      if (row && Object.keys(fill).length) await supabase.from('class_roster').update(fill).eq('id', row.id)
      continue
    }
    byName.add(normalizeName(`${n.firstName} ${n.lastName}`))
    fresh.push(n)
  }
  if (fresh.length) {
    const { error } = await supabase.from('class_roster').insert(fresh.map((n) => ({ class_id: classId, first_name: n.firstName, last_name: n.lastName, student_number: n.studentNumber ?? null, email: n.email?.toLowerCase() ?? null })))
    if (error) return { added: 0, skipped: names.length, error: error.message }
  }
  return { added: fresh.length, skipped: names.length - fresh.length }
}

/**
 * Roster names with a school email (from Google Classroom) are linked to the
 * student account with that email, no join code needed. Papers already graded
 * for the name follow (still only visible once released).
 */
export async function linkRosterByEmail(supabase: SupabaseClient, classId: string): Promise<number> {
  // Only a verified teacher's class list connects to student accounts.
  if (!(await classTeacherVerified(supabase, classId))) return 0
  const { data: rows } = await supabase.from('class_roster').select('id, email').eq('class_id', classId).is('student_user_id', null).not('email', 'is', null)
  if (!rows?.length) return 0
  const { data: profiles } = await supabase.from('user_profiles').select('id, email').eq('user_type', 'student').in('email', rows.map((r) => r.email as string))
  const byEmail = new Map((profiles ?? []).map((p) => [String(p.email).toLowerCase(), p.id as string]))
  let linked = 0
  for (const r of rows) {
    const userId = byEmail.get(String(r.email).toLowerCase())
    if (!userId) continue
    const { error } = await supabase.from('class_roster').update({ student_user_id: userId }).eq('id', r.id).is('student_user_id', null)
    if (error) continue // already linked to another name in this class
    await supabase.from('grading_results').update({ student_user_id: userId }).eq('roster_id', r.id).is('student_user_id', null)
    linked++
  }
  return linked
}

/** Graded sets (with their class-report topics) for some classes, ready for classAreas. */
export async function areaBatchesFor(supabase: SupabaseClient, userId: string, classIds: string[]): Promise<AreaBatch[]> {
  if (!classIds.length) return []
  const { data: graded } = await supabase
    .from('grading_results')
    .select('batch_id, exam_title, created_at, roster_id, student_name, grade_breakdown')
    .in('class_id', classIds).eq('user_id', userId).not('batch_id', 'is', null).limit(10000)
  const batchIds = [...new Set((graded ?? []).map((r) => r.batch_id as string))]
  if (!batchIds.length) return []
  const { data: reports } = await supabase.from('grading_batch_insights').select('batch_id, data').in('batch_id', batchIds).eq('user_id', userId)
  const topicsOf = new Map((reports ?? []).map((r) => [r.batch_id as string, (r.data as ClassInsightsAI)?.topics ?? []]))
  return batchIds.filter((b) => topicsOf.has(b)).map((b) => {
    const rows = (graded ?? []).filter((r) => r.batch_id === b)
    return {
      batchId: b,
      title: rows[0]?.exam_title ?? null,
      createdAt: rows.reduce((min, r) => (r.created_at < min ? r.created_at : min), rows[0]?.created_at ?? ''),
      topics: topicsOf.get(b)!,
      papers: rows.map((r) => ({ rosterId: r.roster_id, name: r.student_name ?? '', breakdown: Array.isArray(r.grade_breakdown) ? r.grade_breakdown : [] })),
    }
  })
}
