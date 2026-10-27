// Loads everything /teacher/progress shows for one school year (service role;
// the route checks the teacher first). Student names stay in the response for
// the teacher; nothing here goes to an AI.

import type { SupabaseClient } from '@supabase/supabase-js'
import { areaBatchesFromRows, topicsForBatches, type AreaPaperRow } from '@/lib/classes/server'
import { courseKey, courseName, schoolYearFor, sortYears } from '@/lib/classes/years'
import { sortClasses } from '@/lib/classes/sort'
import { classWeakSpots, type ClassWeakSpot } from '@/lib/classes/weak-spots'
import { buildProfile, type AnswerRow } from '@/lib/learner/profile'
import { fetchByIds } from '@/lib/school/server'
import { assignedGuidesByRoster, assignmentProgress, ASSIGNMENT_COLUMNS, type AssignmentRow } from '@/lib/practice/server'
import { courseAreas, focusSuggestions, scoreTrend, setSummaries, studentTrends, type CourseArea, type PracticeSummary, type ScoreRow, type StudentTrend, type Suggestion } from './progress'

export interface ProgressClass {
  id: string
  name: string
  period: string | null
  students: number
  sets: number
  average: number | null
  trend: number | null
  latest: { batchId: string; title: string | null; date: string; average: number } | null
}

export interface CourseProgress {
  key: string
  name: string
  classes: ProgressClass[]
  sets: number
  /** Distinct students with a graded paper. */
  graded: number
  average: number | null
  trend: number | null
  areas: CourseArea[]
  practice: PracticeSummary[]
  weakSpots: ClassWeakSpot[]
  /** Students with an account linked to a class-list name (only their answers on assigned guides are read). */
  linkedStudents: number
  /** Every graded student in the course, weakest first. */
  students: StudentTrend[]
  studentsToWatch: StudentTrend[]
  suggestions: Suggestion[]
}

export interface TeacherProgress {
  year: string
  years: string[]
  courses: CourseProgress[]
  suggestions: Suggestion[]
}

type ClassRow = { id: string; name: string; period: string | null; course: string | null; school_year: string; is_archived: boolean | null; created_at: string }

export async function loadTeacherProgress(supabase: SupabaseClient, userId: string, opts: { year?: string | null; course?: string | null; now?: number } = {}): Promise<TeacherProgress> {
  const now = opts.now ?? Date.now()
  const { data: allClasses } = await supabase.from('classes').select('id, name, period, course, school_year, is_archived, created_at').eq('teacher_id', userId)
  const years = sortYears((allClasses ?? []).map((c) => c.school_year as string))
  const year = opts.year && years.includes(opts.year) ? opts.year : years.includes(schoolYearFor(new Date(now))) ? schoolYearFor(new Date(now)) : years[0] ?? schoolYearFor(new Date(now))
  let classes = sortClasses(((allClasses ?? []) as ClassRow[]).filter((c) => c.school_year === year && !c.is_archived))
  if (opts.course) classes = classes.filter((c) => courseKey(c.name, c.course) === opts.course)
  const classIds = classes.map((c) => c.id)
  if (!classIds.length) return { year, years, courses: [], suggestions: [] }

  const [papers, roster, assignments] = await Promise.all([
    fetchByIds<AreaPaperRow & { percentage: number | string | null }>(classIds, (chunk, from, to) =>
      supabase.from('grading_results').select('batch_id, class_id, exam_title, created_at, roster_id, student_name, grade_breakdown, percentage')
        .in('class_id', chunk).eq('user_id', userId).not('batch_id', 'is', null).order('created_at').range(from, to)),
    fetchByIds<{ id: string; class_id: string; student_user_id: string | null }>(classIds, (chunk, from, to) =>
      supabase.from('class_roster').select('id, class_id, student_user_id').in('class_id', chunk).is('left_at', null).range(from, to)),
    fetchByIds<AssignmentRow>(classIds, (chunk, from, to) =>
      supabase.from('practice_assignments').select(ASSIGNMENT_COLUMNS).in('class_id', chunk).eq('teacher_id', userId).range(from, to)),
  ])

  const [topicsOf, progress, answers] = await Promise.all([
    topicsForBatches(supabase, userId, [...new Set(papers.map((p) => p.batch_id))]),
    assignmentProgress(supabase, assignments),
    (async () => {
      // Only answers on guides this teacher assigned to that student (a direct relation), never their other studying.
      const linked = roster.filter((r) => r.student_user_id)
      if (!linked.length) return [] as Array<AnswerRow & { user_id: string }>
      const assigned = await assignedGuidesByRoster(supabase, userId, linked.map((r) => r.id))
      const allGuides = [...new Set([...assigned.values()].flatMap((s) => [...s]))]
      if (!allGuides.length) return [] as Array<AnswerRow & { user_id: string }>
      const guidesOf = new Map<string, Set<string>>()
      for (const r of linked) {
        const set = guidesOf.get(r.student_user_id as string) ?? new Set<string>()
        for (const g of assigned.get(r.id) ?? []) set.add(g)
        guidesOf.set(r.student_user_id as string, set)
      }
      const { data } = await supabase.from('study_results').select('user_id, study_guide_id, subject, topic, correct, answered_at').in('user_id', [...guidesOf.keys()]).in('study_guide_id', allGuides).order('answered_at', { ascending: false }).limit(20000)
      return ((data ?? []) as Array<AnswerRow & { user_id: string; study_guide_id: string }>).filter((r) => guidesOf.get(r.user_id)?.has(r.study_guide_id))
    })(),
  ])

  const scoreRows: ScoreRow[] = papers.map((p) => ({ batchId: p.batch_id, classId: p.class_id as string, title: p.exam_title, createdAt: p.created_at, rosterId: p.roster_id, name: p.student_name ?? '', pct: Number(p.percentage) || 0 }))
  const areaBatches = areaBatchesFromRows(papers, topicsOf)
  const allSets = setSummaries(scoreRows)
  const allStudents = studentTrends(scoreRows)
  const profiles = new Map<string, ReturnType<typeof buildProfile>>()
  {
    const byStudent = new Map<string, AnswerRow[]>()
    for (const r of answers) {
      const list = byStudent.get(r.user_id) ?? []
      list.push(r)
      byStudent.set(r.user_id, list)
    }
    for (const [id, list] of byStudent) profiles.set(id, buildProfile(list, new Date(now)))
  }

  const byCourse = new Map<string, ClassRow[]>()
  for (const c of classes) {
    const k = courseKey(c.name, c.course)
    byCourse.set(k, [...(byCourse.get(k) ?? []), c])
  }

  const courses: CourseProgress[] = [...byCourse.entries()].map(([key, inCourse]) => {
    const ids = new Set(inCourse.map((c) => c.id))
    const sets = allSets.filter((s) => ids.has(s.classId))
    const students = allStudents.filter((s) => ids.has(s.classId))
    const course = scoreTrend(sets)
    const progressClasses: ProgressClass[] = inCourse.map((c) => {
      const mine = sets.filter((s) => s.classId === c.id)
      const t = scoreTrend(mine)
      return {
        id: c.id, name: c.name, period: c.period,
        students: roster.filter((r) => r.class_id === c.id).length,
        sets: mine.length, average: t.average, trend: t.trend,
        latest: t.latest ? { batchId: t.latest.batchId, title: t.latest.title, date: t.latest.date, average: t.latest.average } : null,
      }
    })
    const practice: PracticeSummary[] = assignments.filter((a) => ids.has(a.class_id)).map((a) => {
      const rows = progress.get(a.id) ?? []
      return { id: a.id, title: a.title, classId: a.class_id, dueAt: a.due_at, assigned: rows.length, done: rows.filter((r) => r.status === 'done' || r.status === 'late').length, missing: rows.filter((r) => r.status === 'missing').length }
    })
    const linked = roster.filter((r) => ids.has(r.class_id) && r.student_user_id)
    const weakSpots = classWeakSpots([...new Set(linked.map((r) => r.student_user_id as string))].map((id) => profiles.get(id)).filter((p): p is ReturnType<typeof buildProfile> => !!p))
    const areas = courseAreas(areaBatches.filter((b) => b.classId && ids.has(b.classId)))
    const classInfo = inCourse.map((c) => ({ id: c.id, name: c.name, period: c.period }))
    return {
      key, name: courseName(inCourse[0].name, inCourse[0].course),
      classes: progressClasses,
      sets: sets.length,
      graded: new Set(students.map((s) => `${s.classId}:${s.key}`)).size,
      average: course.average, trend: course.trend,
      areas, practice, weakSpots, linkedStudents: linked.length,
      students,
      studentsToWatch: students.filter((s) => s.why),
      suggestions: focusSuggestions({ classes: classInfo, sets, areas, students, practice, weakSpots, now }),
    }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // Across courses: each course's best, then the next best, so one course can't take every slot.
  const top: Array<Suggestion & { course: string; courseName: string }> = []
  for (let i = 0; i < 3; i += 1) for (const c of courses) if (c.suggestions[i]) top.push({ ...c.suggestions[i], course: c.key, courseName: c.name })
  return { year, years, courses, suggestions: top.slice(0, 6) }
}
