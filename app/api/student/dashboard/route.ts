import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getAuthenticatedUser } from '@/lib/supabase-server'
import { isPendingForStudent, type SubmissionStatus } from '@/lib/student-assignments'
import { resolveClassColor } from '@/lib/class-colors'

// Cross-class aggregator backing /dashboard and /calendar.
//
// Query params:
//   fields  comma list, any of: classes,upcoming,grades,guides (default: all)
//   from    ISO date — earliest due_at to include in `upcoming` (default: 30 days ago)
//   to      ISO date — latest due_at to include in `upcoming` (default: 90 days from now)
//
// Defaults are tuned for the dashboard view. The calendar passes month bounds
// via from/to and fields=upcoming.

const DEFAULT_PAST_DAYS = 30
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

    // 1. Active enrollments → class set
    const { data: enrollments, error: enrErr } = await supabase
      .from('class_enrollments')
      .select('class_id, joined_at, student_color')
      .eq('student_id', user.id)
      .eq('status', 'active')
    if (enrErr) {
      console.error('dashboard: enrollments error', enrErr)
      return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
    }

    const classIds = (enrollments ?? []).map(e => e.class_id)
    if (classIds.length === 0) {
      return NextResponse.json({
        classes: fields.has('classes') ? [] : undefined,
        upcoming: fields.has('upcoming') ? [] : undefined,
        grades: fields.has('grades') ? [] : undefined,
        guides: fields.has('guides') ? [] : undefined,
      })
    }

    // 2. Classes (visible, non-archived) + their teachers
    const { data: classRows } = await supabase
      .from('classes')
      .select('id, teacher_id, name, period, subject, color, is_archived')
      .in('id', classIds)
      .eq('is_archived', false)

    const studentColorByClass = new Map<string, string | null>()
    for (const e of enrollments ?? []) studentColorByClass.set(e.class_id, e.student_color ?? null)

    const visibleClasses = (classRows ?? []).map(c => ({
      ...c,
      effective_color: resolveClassColor(c.color, studentColorByClass.get(c.id) ?? null),
    }))
    const visibleClassIds = visibleClasses.map(c => c.id)
    const classMap = new Map(visibleClasses.map(c => [c.id, c]))

    const teacherIds = Array.from(new Set(visibleClasses.map(c => c.teacher_id)))
    const { data: teacherRows } = teacherIds.length
      ? await supabase
          .from('user_profiles')
          .select('id, first_name, last_name, display_name, email')
          .in('id', teacherIds)
      : { data: [] as Array<{ id: string; first_name: string | null; last_name: string | null; display_name: string | null; email: string }> }
    const teacherMap = new Map((teacherRows ?? []).map(t => [t.id, t]))

    // 3. Assignment links for these classes (needed for upcoming + classes pending count)
    const needLinks = fields.has('upcoming') || fields.has('classes')
    const { data: linkRows } = needLinks && visibleClassIds.length
      ? await supabase
          .from('assignment_class_links')
          .select('assignment_id, class_id')
          .in('class_id', visibleClassIds)
      : { data: [] as Array<{ assignment_id: string; class_id: string }> }
    const links = linkRows ?? []
    const linkedAssignmentIds = Array.from(new Set(links.map(l => l.assignment_id)))

    // 4. Assignments (published only for students)
    const { data: assignmentRows } = needLinks && linkedAssignmentIds.length
      ? await supabase
          .from('assignments')
          .select('id, title, due_at, total_possible_marks, is_published')
          .in('id', linkedAssignmentIds)
          .eq('is_published', true)
      : { data: [] as Array<{ id: string; title: string; due_at: string | null; total_possible_marks: number | null; is_published: boolean }> }
    const publishedAssignments = assignmentRows ?? []
    const assignmentMap = new Map(publishedAssignments.map(a => [a.id, a]))

    // 5. The student's submissions for these assignments (used by upcoming + grades)
    const needSubs = fields.has('upcoming') || fields.has('grades') || fields.has('classes')
    const { data: submissionRows } = needSubs && publishedAssignments.length
      ? await supabase
          .from('assignment_submissions')
          .select('id, assignment_id, status, submitted_at, grading_result_id, class_id')
          .eq('student_id', user.id)
          .in('assignment_id', publishedAssignments.map(a => a.id))
      : { data: [] as Array<{ id: string; assignment_id: string; status: string; submitted_at: string; grading_result_id: string | null; class_id: string }> }
    const submissions = submissionRows ?? []
    const submissionStatusByAssignment = new Map<string, SubmissionStatus>()
    for (const s of submissions) submissionStatusByAssignment.set(s.assignment_id, s.status as SubmissionStatus)

    // ---------- classes ----------
    let classesOut: unknown[] | undefined
    if (fields.has('classes')) {
      const pendingByClass = new Map<string, number>()
      for (const l of links) {
        if (!assignmentMap.has(l.assignment_id)) continue
        if (isPendingForStudent(submissionStatusByAssignment.get(l.assignment_id))) {
          pendingByClass.set(l.class_id, (pendingByClass.get(l.class_id) ?? 0) + 1)
        }
      }
      classesOut = visibleClasses.map(c => ({
        id: c.id,
        name: c.name,
        period: c.period,
        subject: c.subject,
        teacher: teacherMap.get(c.teacher_id) ?? null,
        pending_count: pendingByClass.get(c.id) ?? 0,
        color: c.color ?? null,
        effective_color: c.effective_color,
      }))
    }

    // ---------- upcoming ----------
    let upcomingOut: unknown[] | undefined
    if (fields.has('upcoming')) {
      const fromMs = from.getTime()
      const toMs = to.getTime()
      // assignment_id -> the class(es) it's linked to (for the student's enrolled classes)
      const classesByAssignment = new Map<string, string[]>()
      for (const l of links) {
        if (!classMap.has(l.class_id)) continue
        const arr = classesByAssignment.get(l.assignment_id) ?? []
        arr.push(l.class_id)
        classesByAssignment.set(l.assignment_id, arr)
      }

      const items: Array<{
        assignment_id: string
        title: string
        due_at: string | null
        total_possible_marks: number | null
        class_id: string
        class_name: string
        class_color: string
        status: SubmissionStatus | null
      }> = []
      for (const a of publishedAssignments) {
        if (a.due_at) {
          const t = new Date(a.due_at).getTime()
          if (t < fromMs || t > toMs) continue
        } else {
          // No due date: only include if there's no submission yet (visible "to-do").
          if (submissionStatusByAssignment.has(a.id)) continue
        }
        const linkedClassIds = classesByAssignment.get(a.id) ?? []
        // One row per (assignment, class) so the calendar/dashboard can display
        // class context. Usually 1; if a teacher posted to multiple of the
        // student's classes, both rows show.
        for (const cid of linkedClassIds) {
          const cls = classMap.get(cid)
          if (!cls) continue
          items.push({
            assignment_id: a.id,
            title: a.title,
            due_at: a.due_at,
            total_possible_marks: a.total_possible_marks,
            class_id: cid,
            class_name: cls.name,
            class_color: cls.effective_color,
            status: submissionStatusByAssignment.get(a.id) ?? null,
          })
        }
      }
      // Sort: items without due_at last, otherwise by due_at asc
      items.sort((a, b) => {
        if (!a.due_at && !b.due_at) return 0
        if (!a.due_at) return 1
        if (!b.due_at) return -1
        return new Date(a.due_at).getTime() - new Date(b.due_at).getTime()
      })
      upcomingOut = items.slice(0, MAX_UPCOMING)
    }

    // ---------- grades ----------
    let gradesOut: unknown[] | undefined
    if (fields.has('grades')) {
      const gradedSubs = submissions.filter(s => s.status === 'graded' && s.grading_result_id)
      const resultIds = gradedSubs.map(s => s.grading_result_id as string)
      const { data: resultRows } = resultIds.length
        ? await supabase
            .from('grading_results')
            .select('id, total_marks, total_possible_marks, percentage, grade')
            .in('id', resultIds)
        : { data: [] as Array<{ id: string; total_marks: number | null; total_possible_marks: number | null; percentage: number | null; grade: string | null }> }
      const resultMap = new Map((resultRows ?? []).map(r => [r.id, r]))

      const grades = gradedSubs
        .map(s => {
          const a = assignmentMap.get(s.assignment_id)
          const cls = classMap.get(s.class_id)
          const r = resultMap.get(s.grading_result_id as string)
          if (!a || !cls || !r) return null
          return {
            submission_id: s.id,
            assignment_id: s.assignment_id,
            assignment_title: a.title,
            class_id: s.class_id,
            class_name: cls.name,
            class_color: cls.effective_color,
            submitted_at: s.submitted_at,
            total_marks: r.total_marks,
            total_possible_marks: r.total_possible_marks,
            percentage: r.percentage,
            grade: r.grade,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
        .slice(0, MAX_GRADES)
      gradesOut = grades
    }

    // ---------- guides ----------
    let guidesOut: unknown[] | undefined
    if (fields.has('guides')) {
      const { data: sgaRows } = visibleClassIds.length
        ? await supabase
            .from('study_guide_assignments')
            .select('study_guide_id, class_id, assigned_at')
            .in('class_id', visibleClassIds)
            .order('assigned_at', { ascending: false })
        : { data: [] as Array<{ study_guide_id: string; class_id: string; assigned_at: string }> }

      // Dedup by study_guide_id, keeping the earliest assigned_at and aggregating class_ids.
      type GuideAgg = {
        study_guide_id: string
        assigned_at: string
        class_ids: string[]
        class_names: string[]
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
            class_colors: [cls.effective_color],
          })
        } else {
          // Keep the most recent assigned_at across all classes
          if (new Date(row.assigned_at) > new Date(existing.assigned_at)) {
            existing.assigned_at = row.assigned_at
          }
          existing.class_ids.push(row.class_id)
          existing.class_names.push(cls.name)
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

      const merged = Array.from(byGuide.values())
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
            class_colors: agg.class_colors,
          }
        })
        .filter((x): x is NonNullable<typeof x> => x !== null)
        .sort((a, b) => new Date(b.assigned_at).getTime() - new Date(a.assigned_at).getTime())
        .slice(0, MAX_GUIDES)
      guidesOut = merged
    }

    return NextResponse.json({
      classes: classesOut,
      upcoming: upcomingOut,
      grades: gradesOut,
      guides: guidesOut,
    })
  } catch (error) {
    console.error('Student dashboard error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
