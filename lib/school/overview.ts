// School overview for a principal / department head (pure, unit-tested).
// Counts per teacher and for the school, plus a weekly activity series.
// Teacher-level only: no student names ever reach this module.

export interface SchoolTeacher { id: string; name: string; email: string | null }
export interface GradingActivity { userId: string; batchId: string | null; createdAt: string }
export interface GuideActivity { userId: string; createdAt: string }
export interface PracticeActivity { teacherId: string; id: string; createdAt: string; students: number; finished: number }
export interface ClassActivity { teacherId: string; id: string; students: number }

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
}

export interface SchoolWeek { start: string; papers: number; practice: number; guides: number }

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
}

const DAY = 24 * 60 * 60 * 1000
export const RECENT_DAYS = 30
export const WEEKS = 12

/** Monday 00:00 UTC of the week holding `t`. */
export function weekStart(t: number): number {
  const d = new Date(t)
  const day = (d.getUTCDay() + 6) % 7
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - day * DAY
}

export function schoolOverview(input: {
  teachers: SchoolTeacher[]
  gradings: GradingActivity[]
  guides: GuideActivity[]
  practice: PracticeActivity[]
  classes: ClassActivity[]
  now?: number
}): SchoolOverview {
  const now = input.now ?? Date.now()
  const recentFrom = now - RECENT_DAYS * DAY
  const ids = new Set(input.teachers.map((t) => t.id))
  const stats = new Map<string, TeacherStats>(input.teachers.map((t) => [t.id, {
    id: t.id, name: t.name, email: t.email, papers: 0, papersRecent: 0, sets: 0, classes: 0, students: 0,
    practiceAssigned: 0, practiceStudents: 0, practiceFinished: 0, guides: 0, lastActive: null,
  }]))
  const touch = (s: TeacherStats, at: string) => { if (!s.lastActive || at > s.lastActive) s.lastActive = at }

  const firstWeek = weekStart(now) - (WEEKS - 1) * 7 * DAY
  const weeks: SchoolWeek[] = Array.from({ length: WEEKS }, (_, i) => ({ start: new Date(firstWeek + i * 7 * DAY).toISOString().slice(0, 10), papers: 0, practice: 0, guides: 0 }))
  const weekOf = (at: string) => {
    const i = Math.floor((weekStart(Date.parse(at)) - firstWeek) / (7 * DAY))
    return i >= 0 && i < WEEKS ? weeks[i] : null
  }

  const setsByTeacher = new Map<string, Set<string>>()
  for (const g of input.gradings) {
    const s = stats.get(g.userId)
    if (!s) continue
    s.papers++
    if (Date.parse(g.createdAt) >= recentFrom) s.papersRecent++
    if (g.batchId) {
      const set = setsByTeacher.get(g.userId) ?? new Set<string>()
      set.add(g.batchId)
      setsByTeacher.set(g.userId, set)
    }
    touch(s, g.createdAt)
    const w = weekOf(g.createdAt)
    if (w) w.papers++
  }
  for (const [id, set] of setsByTeacher) stats.get(id)!.sets = set.size

  for (const g of input.guides) {
    const s = stats.get(g.userId)
    if (!s) continue
    s.guides++
    touch(s, g.createdAt)
    const w = weekOf(g.createdAt)
    if (w) w.guides++
  }

  for (const p of input.practice) {
    const s = stats.get(p.teacherId)
    if (!s) continue
    s.practiceAssigned++
    s.practiceStudents += p.students
    s.practiceFinished += Math.min(p.finished, p.students)
    touch(s, p.createdAt)
    const w = weekOf(p.createdAt)
    if (w) w.practice++
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
  }
}

/** Does `email` belong to the school's domain (or a subdomain of it)? */
export function emailOnDomain(email: string | null | undefined, domain: string): boolean {
  const d = String(email ?? '').toLowerCase().split('@')[1]
  return !!d && (d === domain || d.endsWith(`.${domain}`))
}
