import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { resolveClassColor } from '@/lib/class-colors'

// Cross-class aggregator backing /dashboard and /calendar for teachers.
//
// Query params: same shape as /api/student/dashboard
//   fields  comma list, any of: classes,upcoming,grades,guides
//   from    ISO date — earliest due_at to include in `upcoming`
//   to      ISO date — latest due_at to include
//
// Card meanings (teacher view):
//   upcoming → teacher's own assignments coming up, with submission ratio per
//              linked class (e.g., AP Stats P1: 16/25 submitted).
//   grades   → submissions in pending_review status (auto-graded, awaiting the
//              teacher's "Return" click). The teacher's grading to-do queue.
//   guides   → study_guide_assignments rows for the teacher's classes,
//              deduped by guide so we don't show the same guide 3x when
//              assigned to P1+P3+P5.

const DEFAULT_PAST_DAYS = 7
const DEFAULT_FUTURE_DAYS = 90
const MAX_UPCOMING = 50
const MAX_GRADES = 20
const MAX_GUIDES = 20

type Field = 'classes' | 'upcoming' | 'grades' | 'guides'
const ALL_FIELDS: Field[] = ['classes', 'upcoming', 'grades', 'guides']

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) return NextResponse.json({ error: 'You must be logged in' }, { status: 401 })

    const url = new URL(request.url)
    const fieldsParam = url.searchParams.get('fields')
    const fields = new Set<Field>(
      fieldsParam
        ? (fieldsParam.split(',').map(s => s.trim()).filter(Boolean) as Field[]).filter(f => ALL_FIELDS.includes(f))
        : ALL_FIELDS
    )

    const now = new Date()
    const fromParam = url.searchParams.get('from')
    const toParam = url.searchParams.get('to')
    const from = fromParam ? new Date(fromParam) : new Date(now.getTime() - DEFAULT_PAST_DAYS * 86400_000)
    const to = toParam ? new Date(toParam) : new Date(now.getTime() + DEFAULT_FUTURE_DAYS * 86400_000)

    const supabase = createAdminClient()

    // 1. Teacher's own classes (non-archived)
    const { data: classRows, error: classErr } = await supabase
      .from('classes')
      .select('id, name, period, subject, color, is_archived')
      .eq('teacher_id', user.id)
      .eq('is_archived', false)
    if (classErr) {
      console.error('teacher dashboard: classes error', classErr)
      return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
    }
    const visibleClasses = (classRows ?? []).map(c => ({
      ...c,
      effective_color: resolveClassColor(c.color, null),
    }))
    const visibleClassIds = visibleClasses.map(c => c.id)
    const classMap = new Map(visibleClasses.map(c => [c.id, c]))

    if (visibleClasses.length === 0) {
      return NextResponse.json({
        classes: fields.has('classes') ? [] : undefined,
        upcoming: fields.has('upcoming') ? [] : undefined,
        grades: fields.has('grades') ? [] : undefined,
        guides: fields.has('guides') ? [] : undefined,
      })
    }

    // 2. Enrollment counts per class (denominator for submission ratios)
    const { data: enrollmentRows } = await supabase
      .from('class_enrollments')
      .select('class_id')
      .eq('status', 'active')
      .in('class_id', visibleClassIds)
    const enrolledByClass = new Map<string, number>()
    for (const r of enrollmentRows ?? []) {
      enrolledByClass.set(r.class_id, (enrolledByClass.get(r.class_id) ?? 0) + 1)
    }

    // 3. Teacher's assignments (any that have at least one link to one of these classes).
    // Pull links first, then assignments. Filter by from/to via assignments.due_at.
    const needLinks = fields.has('upcoming') || fields.has('classes')
    const { data: linkRows } = needLinks
      ? await supabase
          .from('assignment_class_links')
          .select('assignment_id, class_id')
          .in('class_id', visibleClassIds)
      : { data: [] as Array<{ assignment_id: string; class_id: string }> }
    const links = linkRows ?? []
    const linkedAssignmentIds = Array.from(new Set(links.map(l => l.assignment_id)))

    // 4. Assignments in window (we already filter teacher_id for safety)
    const { data: assignmentRows } = needLinks && linkedAssignmentIds.length
      ? await supabase
          .from('assignments')
          .select('id, title, due_at, total_possible_marks, is_published, teacher_id')
          .eq('teacher_id', user.id)
          .in('id', linkedAssignmentIds)
      : { data: [] as Array<{ id: string; title: string; due_at: string | null; total_possible_marks: number | null; is_published: boolean; teacher_id: string }> }
    const teacherAssignments = assignmentRows ?? []
    const assignmentMap = new Map(teacherAssignments.map(a => [a.id, a]))

    // 5. Submissions for those assignments (used for ratios + pending review)
    const needSubs = fields.has('upcoming') || fields.has('grades') || fields.has('classes')
    const { data: submissionRows } = needSubs && teacherAssignments.length
      ? await supabase
          .from('assignment_submissions')
          .select('id, assignment_id, class_id, student_id, status, submitted_at, grading_result_id')
          .in('assignment_id', teacherAssignments.map(a => a.id))
      : { data: [] as Array<{ id: string; assignment_id: string; class_id: string; student_id: string; status: string; submitted_at: string; grading_result_id: string | null }> }
    const submissions = submissionRows ?? []

    // submitted-count per (assignment, class). Counts any non-failed submission
    // as "turned in" for the ratio (submitted/grading/pending_review/graded).
    const submittedByAssignmentClass = new Map<string, number>()
    for (const s of submissions) {
      if (s.status === 'failed') continue
      const k = `${s.assignment_id}:${s.class_id}`
      submittedByAssignmentClass.set(k, (submittedByAssignmentClass.get(k) ?? 0) + 1)
    }

    // ---------- classes ----------
    let classesOut: unknown[] | undefined
    if (fields.has('classes')) {
      classesOut = visibleClasses.map(c => ({
        id: c.id,
        name: c.name,
        period: c.period,
        subject: c.subject,
        student_count: enrolledByClass.get(c.id) ?? 0,
        color: c.color ?? null,
        effective_color: c.effective_color,
      }))
    }

    // ---------- upcoming ----------
    let upcomingOut: unknown[] | undefined
    if (fields.has('upcoming')) {
      const fromMs = from.getTime()
      const toMs = to.getTime()

      // assignment_id -> class_ids it's linked to (within visibleClasses)
      const classesByAssignment = new Map<string, string[]>()
      for (const l of links) {
        if (!classMap.has(l.class_id)) continue
        const arr = classesByAssignment.get(l.assignment_id) ?? []
        arr.push(l.class_id)
        classesByAssignment.set(l.assignment_id, arr)
      }

      type Item = {
        assignment_id: string
        title: string
        due_at: string | null
        total_possible_marks: number | null
        is_published: boolean
        per_class: Array<{ class_id: string; class_name: string; period: string | null; class_color: string; submitted: number; enrolled: number }>
        total_submitted: number
        total_enrolled: number
      }

      const items: Item[] = []
      for (const a of teacherAssignments) {
        if (a.due_at) {
          const t = new Date(a.due_at).getTime()
          if (t < fromMs || t > toMs) continue
        }
        const linkedClassIds = classesByAssignment.get(a.id) ?? []
        if (linkedClassIds.length === 0) continue
        const perClass = linkedClassIds
          .map(cid => {
            const cls = classMap.get(cid)
            if (!cls) return null
            return {
              class_id: cid,
              class_name: cls.name,
              period: cls.period,
              class_color: cls.effective_color,
              submitted: submittedByAssignmentClass.get(`${a.id}:${cid}`) ?? 0,
              enrolled: enrolledByClass.get(cid) ?? 0,
            }
          })
          .filter((x): x is NonNullable<typeof x> => x !== null)

        const totalSubmitted = perClass.reduce((acc, x) => acc + x.submitted, 0)
        const totalEnrolled = perClass.reduce((acc, x) => acc + x.enrolled, 0)

        items.push({
          assignment_id: a.id,
          title: a.title,
          due_at: a.due_at,
          total_possible_marks: a.total_possible_marks,
          is_published: a.is_published,
          per_class: perClass,
          total_submitted: totalSubmitted,
          total_enrolled: totalEnrolled,
        })
      }

      items.sort((a, b) => {
        if (!a.due_at && !b.due_at) return 0
        if (!a.due_at) return 1
        if (!b.due_at) return -1
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
      })
      upcomingOut = items.slice(0, MAX_UPCOMING)
    }

    // ---------- grades (pending review queue) ----------
    let gradesOut: unknown[] | undefined
    if (fields.has('grades')) {
      const pending = submissions
        .filter(s => s.status === 'pending_review')
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, MAX_GRADES)

      // Pull student profiles + grading results for shown items
      const studentIds = Array.from(new Set(pending.map(s => s.student_id)))
      const resultIds = pending.map(s => s.grading_result_id).filter((x): x is string => !!x)

      const [studentRes, resultRes] = await Promise.all([
        studentIds.length
          ? supabase
              .from('user_profiles')
              .select('id, first_name, last_name, email')
              .in('id', studentIds)
          : Promise.resolve({ data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; email: string }> }),
        resultIds.length
          ? supabase
              .from('grading_results')
              .select('id, total_marks, total_possible_marks, percentage, grade')
              .in('id', resultIds)
          : Promise.resolve({ data: [] as Array<{ id: string; total_marks: number | null; total_possible_marks: number | null; percentage: number | null; grade: string | null }> }),
      ])
      const studentMap = new Map((studentRes.data ?? []).map(s => [s.id, s]))
      const resultMap = new Map((resultRes.data ?? []).map(r => [r.id, r]))

      gradesOut = pending
        .map(s => {
          const a = assignmentMap.get(s.assignment_id)
          const cls = classMap.get(s.class_id)
          if (!a || !cls) return null
          const student = studentMap.get(s.student_id)
          const r = s.grading_result_id ? resultMap.get(s.grading_result_id) ?? null : null
          return {
            submission_id: s.id,
            assignment_id: s.assignment_id,
            assignment_title: a.title,
            class_id: s.class_id,
            class_name: cls.name,
            class_period: cls.period,
            class_color: cls.effective_color,
            student: student
              ? {
                  id: student.id,
                  first_name: student.first_name,
                  last_name: student.last_name,
                  email: student.email,
                }
              : null,
            submitted_at: s.submitted_at,
            total_marks: r?.total_marks ?? null,
            total_possible_marks: r?.total_possible_marks ?? null,
            percentage: r?.percentage ?? null,
            grade: r?.grade ?? null,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
    }

    // ---------- guides ----------
    let guidesOut: unknown[] | undefined
    if (fields.has('guides')) {
      const { data: sgaRows } = await supabase
        .from('study_guide_assignments')
        .select('study_guide_id, class_id, assigned_at')
        .in('class_id', visibleClassIds)
        .order('assigned_at', { ascending: false })

      type GuideAgg = {
        study_guide_id: string
        assigned_at: string
        class_ids: string[]
        class_names: string[]
        class_periods: (string | null)[]
        class_colors: string[]
      }
      const byGuide = new Map<string, GuideAgg>()
      for (const row of sgaRows ?? []) {
        const cls = classMap.get(row.class_id)
        if (!cls) continue
        const existing = byGuide.get(row.study_guide_id)
        if (!existing) {
          byGuide.set(row.study_guide_id, {
            study_guide_id: row.study_guide_id,
            assigned_at: row.assigned_at,
            class_ids: [row.class_id],
            class_names: [cls.name],
            class_periods: [cls.period],
            class_colors: [cls.effective_color],
          })
        } else {
          if (new Date(row.assigned_at) > new Date(existing.assigned_at)) {
            existing.assigned_at = row.assigned_at
          }
          existing.class_ids.push(row.class_id)
          existing.class_names.push(cls.name)
          existing.class_periods.push(cls.period)
          existing.class_colors.push(cls.effective_color)
        }
      }

      const guideIds = Array.from(byGuide.keys())
      const { data: guideRows } = guideIds.length
        ? await supabase
            .from('study_guides')
            .select('id, title, subject, format, grade_level')
            .in('id', guideIds)
        : { data: [] as Array<{ id: string; title: string; subject: string; format: string; grade_level: string }> }
      const guideMap = new Map((guideRows ?? []).map(g => [g.id, g]))

      guidesOut = Array.from(byGuide.values())
        .map(agg => {
          const g = guideMap.get(agg.study_guide_id)
          if (!g) return null
          return {
            study_guide_id: g.id,
            title: g.title,
            subject: g.subject,
            format: g.format,
            grade_level: g.grade_level,
            assigned_at: agg.assigned_at,
            class_ids: agg.class_ids,
            class_names: agg.class_names,
            class_periods: agg.class_periods,
            class_colors: agg.class_colors,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
        .slice(0, MAX_GUIDES)
    }

    return NextResponse.json({
      classes: classesOut,
      upcoming: upcomingOut,
      grades: gradesOut,
      guides: guidesOut,
    })
  } catch (error) {
    console.error('Teacher dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
