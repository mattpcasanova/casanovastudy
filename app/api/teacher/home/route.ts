import { NextRequest, NextResponse } from 'next/server'
import { requireTeacher } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase-server'
import { schoolYearFor } from '@/lib/classes/years'
import { sortClasses } from '@/lib/classes/sort'
import { stillMarking } from '@/lib/grading/mark-points'
import { attentionItems, HOME_RULES } from '@/lib/teacher/home'
import { loadPracticeList } from '@/lib/practice/list-server'

// The teacher home (/teach): recent graded sets, this year's classes, and
// scans waiting in the scanner inbox. Owner only.
export async function GET(request: NextRequest) {
  const { user, error } = await requireTeacher(request)
  if (error) return error
  const supabase = createAdminClient()
  const year = schoolYearFor()
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const [{ data: graded }, { data: classes }, { count: waiting }, { data: profile }] = await Promise.all([
    supabase.from('grading_results')
      .select('batch_id, exam_title, class_name, class_period, class_id, percentage, created_at, released, grade_breakdown')
      .eq('user_id', user.id).not('batch_id', 'is', null)
      .order('created_at', { ascending: false }).limit(600),
    supabase.from('classes').select('id, name, period, school_year, created_at').eq('teacher_id', user.id).eq('school_year', year).eq('is_archived', false).order('name'),
    supabase.from('scan_inbox_items').select('id', { count: 'exact', head: true }).eq('user_id', user.id).is('used_at', null).gte('received_at', since),
    supabase.from('user_profiles').select('first_name').eq('id', user.id).single(),
  ])

  const sets = new Map<string, { batchId: string; title: string | null; className: string | null; period: string | null; classId: string | null; papers: number; total: number; date: string; released: boolean; toMark: number; toCheck: number }>()
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000
  let papersThisWeek = 0
  const setsThisWeek = new Set<string>()
  for (const r of graded ?? []) {
    const s = sets.get(r.batch_id) ?? { batchId: r.batch_id, title: r.exam_title, className: r.class_name, period: r.class_period, classId: r.class_id, papers: 0, total: 0, date: r.created_at, released: true, toMark: 0, toCheck: 0 }
    s.papers += 1
    if (Date.parse(r.created_at) >= weekAgo) { papersThisWeek += 1; setsThisWeek.add(r.batch_id) }
    // Answers the grader flagged and the teacher hasn't confirmed.
    if (Array.isArray(r.grade_breakdown)) s.toCheck += r.grade_breakdown.filter((q: { check?: unknown; checked?: unknown }) => q?.check && !q?.checked).length
    // A paper the teacher is still marking herself has no score yet.
    if (stillMarking(r.grade_breakdown)) s.toMark += 1
    else s.total += Number(r.percentage)
    s.released = s.released && r.released
    sets.set(r.batch_id, s)
  }

  const classIds = (classes ?? []).map((c) => c.id)
  const { data: rosterRows } = classIds.length
    ? await supabase.from('class_roster').select('class_id').in('class_id', classIds).is('left_at', null)
    : { data: [] as Array<{ class_id: string }> }
  const counts = new Map<string, number>()
  for (const r of rosterRows ?? []) counts.set(r.class_id, (counts.get(r.class_id) ?? 0) + 1)

  // Practice students can still do for a grade (see stillOpen), soonest due first; `total` is everything she ever assigned.
  const { items: practice, total: practiceTotal } = await loadPracticeList(supabase, user.id, { openOnly: true })

  const allSets = [...sets.values()].map(({ total, ...s }) => ({ ...s, average: s.papers - s.toMark ? total / (s.papers - s.toMark) : 0 }))

  return NextResponse.json({
    firstName: profile?.first_name ?? null,
    year,
    recent: allSets.slice(0, HOME_RULES.listRows),
    // Everything, not just the first few: the page hides what the teacher ticked off, then shows the top of what is left.
    attention: attentionItems({ scansWaiting: waiting ?? 0, sets: allSets, practice }, { ...HOME_RULES, max: 40 }),
    // Soonest due first, so what is due soon always makes the cut; the rest is under All practice.
    practice: practice.slice(0, HOME_RULES.listRows),
    practiceOpen: practice.length,
    practiceTotal,
    week: { papers: papersThisWeek, sets: setsThisWeek.size },
    classes: sortClasses(classes ?? []).map((c) => ({ id: c.id, name: c.name, period: c.period, students: counts.get(c.id) ?? 0 })),
    scansWaiting: waiting ?? 0,
  }, { headers: { 'Cache-Control': 'no-store' } })
}
