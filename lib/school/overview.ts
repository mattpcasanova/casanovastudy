// School overview for a principal / department head (pure, unit-tested).
// Counts per teacher and for the school, a weekly activity series, and a
// by-course breakdown. Teacher-level only: no student names ever reach this
// module. The page recomputes it client-side for whichever time range the
// administrator picks (from / to / weeks), so the inputs are the raw activity.

export interface SchoolTeacher { id: string; name: string; email: string | null }
export interface GradingActivity { userId: string; batchId: string | null; createdAt: string; course?: string | null }
export interface GuideActivity { userId: string; createdAt: string }
export interface PracticeActivity { teacherId: string; id: string; createdAt: string; students: number; finished: number }
export interface ClassActivity { teacherId: string; id: string; students: number }

export interface SchoolActivity {
  teachers: SchoolTeacher[]
  gradings: GradingActivity[]
  guides: GuideActivity[]
  practice: PracticeActivity[]
  classes: ClassActivity[]
}

export interface TeacherStats {
  id: string
  name: string
  email: string | null
  papers: number
  papersRecent: number
  sets: number
  classes: number
  students: number
  practiceAssigned: number
  practiceStudents: number
  practiceFinished: number
  guides: number
  lastActive: string | null
  /** Papers graded per week, aligned with `SchoolOverview.weeks`. */
  weekly: number[]
}

export interface SchoolWeek { start: string; papers: number; practice: number; guides: number }

/** Papers graded by course name across the school's teachers. */
export interface CourseStats { course: string; papers: number; sets: number; teachers: number; lastGraded: string }

export interface SchoolOverview {
  totals: {
    teachers: number
    activeTeachers: number
    papers: number
    sets: number
    classes: number
    students: number
    practiceAssigned: number
    practiceStudents: number
    practiceFinished: number
    guides: number
  }
  teachers: TeacherStats[]
  weeks: SchoolWeek[]
  courses: CourseStats[]
}

const DAY = 24 * 60 * 60 * 1000
const WEEK = 7 * DAY
export const RECENT_DAYS = 30
export const WEEKS = 12
export const NO_COURSE = 'Not in a class'

/** Monday 00:00 UTC of the week holding `t`. */
export function weekStart(t: number): number {
  const d = new Date(t)
  const day = (d.getUTCDay() + 6) % 7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - day * DAY
}

/** How many Monday weeks a chart needs to show everything from `from` through `now` (at least 1). */
export function weeksBetween(from: number, now: number): number {
  return Math.max(1, Math.floor((weekStart(now) - weekStart(from)) / WEEK) + 1)
}

export interface OverviewOptions {
  now?: number
  /** Count activity at or after this time (ms). Classes and students are counted whatever the range. */
  from?: number
  /** Count activity before this time (ms); defaults to `now`. */
  to?: number
  /** Weeks in the series, ending with the week holding `to`. */
  weeks?: number
}

export function schoolOverview(input: SchoolActivity & OverviewOptions): SchoolOverview {
  const now = input.now ?? Date.now()
  const end = input.to ?? now
  const from = input.from ?? -Infinity
  const inRange = (at: string) => { const t = Date.parse(at); return t >= from && t < end }
  const recentFrom = end - RECENT_DAYS * DAY
  const weekCount = input.weeks ?? WEEKS
  const ids = new Set(input.teachers.map((t) => t.id))
  const stats = new Map<string, TeacherStats>(input.teachers.map((t) => [t.id, {
    id: t.id, name: t.name, email: t.email, papers: 0, papersRecent: 0, sets: 0, classes: 0, students: 0,
    practiceAssigned: 0, practiceStudents: 0, practiceFinished: 0, guides: 0, lastActive: null, weekly: Array(weekCount).fill(0),
  }]))
  const touch = (s: TeacherStats, at: string) => { if (!s.lastActive || at > s.lastActive) s.lastActive = at }

  const firstWeek = weekStart(end) - (weekCount - 1) * WEEK
  const weeks: SchoolWeek[] = Array.from({ length: weekCount }, (_, i) => ({ start: new Date(firstWeek + i * WEEK).toISOString().slice(0, 10), papers: 0, practice: 0, guides: 0 }))
  const weekIndex = (at: string) => {
    const i = Math.floor((weekStart(Date.parse(at)) - firstWeek) / WEEK)
    return i >= 0 && i < weekCount ? i : -1
  }

  const setsByTeacher = new Map<string, Set<string>>()
  const courses = new Map<string, { papers: number; sets: Set<string>; teachers: Set<string>; lastGraded: string }>()
  for (const g of input.gradings) {
    const s = stats.get(g.userId)
    if (!s || !inRange(g.createdAt)) continue
    s.papers++
    if (Date.parse(g.createdAt) >= recentFrom) s.papersRecent++
    if (g.batchId) {
      const set = setsByTeacher.get(g.userId) ?? new Set<string>()
      set.add(g.batchId)
      setsByTeacher.set(g.userId, set)
    }
    touch(s, g.createdAt)
    const w = weekIndex(g.createdAt)
    if (w >= 0) { weeks[w].papers++; s.weekly[w]++ }
    const name = g.course?.trim() || NO_COURSE
    const c = courses.get(name) ?? { papers: 0, sets: new Set<string>(), teachers: new Set<string>(), lastGraded: g.createdAt }
    c.papers++
    if (g.batchId) c.sets.add(g.batchId)
    c.teachers.add(g.userId)
    if (g.createdAt > c.lastGraded) c.lastGraded = g.createdAt
    courses.set(name, c)
  }
  for (const [id, set] of setsByTeacher) stats.get(id)!.sets = set.size

  for (const g of input.guides) {
    const s = stats.get(g.userId)
    if (!s || !inRange(g.createdAt)) continue
    s.guides++
    touch(s, g.createdAt)
    const w = weekIndex(g.createdAt)
    if (w >= 0) weeks[w].guides++
  }

  for (const p of input.practice) {
    const s = stats.get(p.teacherId)
    if (!s || !inRange(p.createdAt)) continue
    s.practiceAssigned++
    s.practiceStudents += p.students
    s.practiceFinished += Math.min(p.finished, p.students)
    touch(s, p.createdAt)
    const w = weekIndex(p.createdAt)
    if (w >= 0) weeks[w].practice++
  }

  for (const c of input.classes) {
    const s = stats.get(c.teacherId)
    if (!s) continue
    s.classes++
    s.students += c.students
  }

  const teachers = [...stats.values()].filter((t) => ids.has(t.id)).sort((a, b) =>
    b.papersRecent - a.papersRecent || b.papers - a.papers || (b.lastActive ?? '').localeCompare(a.lastActive ?? '') || a.name.localeCompare(b.name))
  const sum = (k: keyof TeacherStats) => teachers.reduce((n, t) => n + (t[k] as number), 0)
  return {
    totals: {
      teachers: teachers.length,
      activeTeachers: teachers.filter((t) => t.lastActive && Date.parse(t.lastActive) >= recentFrom).length,
      papers: sum('papers'),
      sets: sum('sets'),
      classes: sum('classes'),
      students: sum('students'),
      practiceAssigned: sum('practiceAssigned'),
      practiceStudents: sum('practiceStudents'),
      practiceFinished: sum('practiceFinished'),
      guides: sum('guides'),
    },
    teachers,
    weeks,
    courses: [...courses.entries()]
      .map(([course, c]) => ({ course, papers: c.papers, sets: c.sets.size, teachers: c.teachers.size, lastGraded: c.lastGraded }))
      .sort((a, b) => b.papers - a.papers || a.course.localeCompare(b.course)),
  }
}

/** Does `email` belong to the school's domain (or a subdomain of it)? */
export function emailOnDomain(email: string | null | undefined, domain: string): boolean {
  const d = String(email ?? '').toLowerCase().split('@')[1]
  return !!d && (d === domain || d.endsWith(`.${domain}`))
}
