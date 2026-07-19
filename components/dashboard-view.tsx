"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import DashboardFilterBar, {
  type DashboardFilters,
  DEFAULT_FILTERS,
  rangeToFromTo,
  readStoredFilters,
  applyStudentUpcomingFilters,
  applyTeacherUpcomingFilters,
  applyGradesFilters,
  applyGuidesFilters,
} from "@/components/dashboard-filter-bar"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  ClipboardList,
  School,
  BookOpen,
  GraduationCap,
  ChevronRight,
  AlertCircle,
  Users,
  Plus,
  Sparkles,
} from "lucide-react"
import {
  resolveClassColor,
  COLOR_DOT,
  COLOR_STRIPE,
  COLOR_TINT_BG,
  COLOR_TINT_BORDER,
  type ClassColorToken,
} from "@/lib/class-colors"

interface ClassRow {
  id: string
  name: string
  period: string | null
  subject: string | null
  effective_color?: string | null
  pending_count?: number
  student_count?: number
  teacher?: {
    first_name: string | null
    last_name: string | null
    display_name: string | null
    email: string
  } | null
}

interface StudentUpcomingRow {
  assignment_id: string
  title: string
  due_at: string | null
  total_possible_marks: number | null
  class_id: string
  class_name: string
  class_color?: string | null
  status: "submitted" | "grading" | "pending_review" | "graded" | "failed" | null
}

interface TeacherUpcomingRow {
  assignment_id: string
  title: string
  due_at: string | null
  total_possible_marks: number | null
  is_published: boolean
  per_class: Array<{
    class_id: string
    class_name: string
    period: string | null
    class_color?: string | null
    submitted: number
    enrolled: number
  }>
  total_submitted: number
  total_enrolled: number
}

interface StudentGradeRow {
  submission_id: string
  assignment_id: string
  assignment_title: string
  class_id: string
  class_name: string
  class_color?: string | null
  submitted_at: string
  total_marks: number | null
  total_possible_marks: number | null
  percentage: number | null
  grade: string | null
}

interface TeacherPendingRow {
  submission_id: string
  assignment_id: string
  assignment_title: string
  class_id: string
  class_name: string
  class_period: string | null
  class_color?: string | null
  student: {
    id: string
    first_name: string | null
    last_name: string | null
    email: string
  } | null
  submitted_at: string
  total_marks: number | null
  total_possible_marks: number | null
  percentage: number | null
}

interface GuideRow {
  study_guide_id: string
  title: string
  subject: string
  format: string
  grade_level: string
  assigned_at: string
  class_ids: string[]
  class_names: string[]
  class_colors?: string[]
}

interface DashboardData {
  classes: ClassRow[]
  upcoming: StudentUpcomingRow[] | TeacherUpcomingRow[]
  grades: StudentGradeRow[] | TeacherPendingRow[]
  guides: GuideRow[]
}

function dueDateLabel(iso: string | null): { label: string; tone: "danger" | "warn" | "muted" | "ok" } {
  if (!iso) return { label: "No due date", tone: "muted" }
  const due = new Date(iso)
  const now = new Date()
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const days = Math.round((startOfDay(due).getTime() - startOfDay(now).getTime()) / 86400_000)
  if (days < 0) return { label: `Overdue by ${Math.abs(days)} ${Math.abs(days) === 1 ? "day" : "days"}`, tone: "danger" }
  if (days === 0) return { label: "Due today", tone: "danger" }
  if (days === 1) return { label: "Due tomorrow", tone: "warn" }
  if (days <= 3) return { label: `Due in ${days} days`, tone: "warn" }
  return { label: `Due ${due.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`, tone: "ok" }
}

function toneBadgeClass(tone: "danger" | "warn" | "muted" | "ok"): string {
  switch (tone) {
    case "danger":
      return "bg-red-500 hover:bg-red-600 text-white"
    case "warn":
      return "bg-amber-500 hover:bg-amber-600 text-white"
    case "ok":
      return "bg-blue-500 hover:bg-blue-600 text-white"
    default:
      return ""
  }
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

function studentName(s: { first_name: string | null; last_name: string | null; email: string }): string {
  if (s.first_name || s.last_name) return `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()
  return s.email
}

function colorOf(token: string | null | undefined): ClassColorToken {
  return resolveClassColor(token, null)
}

// Mini progress bar used on teacher per-class submission lines.
function ProgressBar({ submitted, enrolled, color }: { submitted: number; enrolled: number; color: ClassColorToken }) {
  const pct = enrolled > 0 ? Math.min(100, Math.round((submitted / enrolled) * 100)) : 0
  return (
    <div className="h-1.5 rounded-full bg-muted overflow-hidden">
      <div className={`h-full ${COLOR_DOT[color]} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  )
}

// Card section header: stripe + title.
function SectionHeader({
  icon,
  title,
  count,
  accent,
}: {
  icon: React.ReactNode
  title: string
  count: number
  accent: ClassColorToken
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold flex items-center gap-2">
        <span className={`w-1 h-5 rounded-sm ${COLOR_STRIPE[accent]}`} />
        {icon}
        {title}
      </h2>
      <Badge variant="secondary">{count}</Badge>
    </div>
  )
}

export default function DashboardView() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)

  const isTeacher = user?.user_type === "teacher"
  const isStudent = user?.user_type === "student"

  useEffect(() => {
    if (user?.id) setFilters(readStoredFilters(user.id))
  }, [user?.id])

  const fetchData = useCallback(
    async (filtersToUse: DashboardFilters) => {
      if (!user) return
      setLoading(true)
      try {
        const { from, to } = rangeToFromTo(filtersToUse.range)
        const endpoint = isTeacher ? "/api/teacher/dashboard" : "/api/student/dashboard"
        const res = await fetch(`${endpoint}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
        const json = await res.json()
        if (!res.ok) {
          toast({ title: json.error ?? "Failed to load dashboard", variant: "destructive" })
          return
        }
        setData({
          classes: json.classes ?? [],
          upcoming: json.upcoming ?? [],
          grades: json.grades ?? [],
          guides: json.guides ?? [],
        })
      } catch (err) {
        console.error(err)
        toast({ title: "Network error", variant: "destructive" })
      } finally {
        setLoading(false)
      }
    },
    [user, isTeacher, toast]
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    fetchData(filters)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, filters.range])

  const classes = data?.classes ?? []
  const classPeriodLookup = useMemo(() => {
    const map = new Map(classes.map(c => [c.id, c.period]))
    return (id: string) => map.get(id) ?? null
  }, [classes])

  const filteredUpcoming = useMemo(() => {
    if (!data) return [] as StudentUpcomingRow[] | TeacherUpcomingRow[]
    if (isTeacher) {
      return applyTeacherUpcomingFilters(data.upcoming as TeacherUpcomingRow[], filters)
    }
    return applyStudentUpcomingFilters(
      (data.upcoming as StudentUpcomingRow[]).map(u => ({ ...u })),
      filters,
      classPeriodLookup
    )
  }, [data, filters, isTeacher, classPeriodLookup])

  const filteredGrades = useMemo(() => {
    if (!data) return [] as StudentGradeRow[] | TeacherPendingRow[]
    const items = data.grades as Array<{ class_id: string; submitted_at?: string }>
    return applyGradesFilters(items, filters, classPeriodLookup) as unknown as StudentGradeRow[] | TeacherPendingRow[]
  }, [data, filters, classPeriodLookup])

  const filteredGuides = useMemo(() => {
    if (!data) return [] as GuideRow[]
    return applyGuidesFilters(data.guides, filters, classPeriodLookup)
  }, [data, filters, classPeriodLookup])

  // Stats for the hero strip
  const totalUpcoming = filteredUpcoming.length
  const totalReviewableGrades = isTeacher
    ? (filteredGrades as TeacherPendingRow[]).length
    : (filteredGrades as StudentGradeRow[]).length
  const studentCountTotal = isTeacher
    ? classes.reduce((acc, c) => acc + (c.student_count ?? 0), 0)
    : 0

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-32 mb-6" />
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const greeting = user.first_name ? `Welcome back, ${user.first_name}` : "Welcome back"
  const classCount = classes.length

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <ClassesSectionNav />

        {/* Hero card */}
        <div className="relative overflow-hidden rounded-2xl mb-6 bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 text-white shadow-lg">
          <div className="absolute inset-0 opacity-20">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)",
                backgroundSize: "24px 24px",
              }}
            />
          </div>
          <div className="relative z-10 p-6 sm:p-8 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-widest opacity-80 mb-1 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5" />
                {isTeacher ? "Teacher dashboard" : "Student dashboard"}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold">{greeting}</h1>
              <p className="text-white/80 text-sm mt-1">
                {classCount === 0
                  ? isTeacher
                    ? "Create your first class to get started."
                    : "Join your first class to get started."
                  : isTeacher
                  ? `${classCount} ${classCount === 1 ? "class" : "classes"} · ${studentCountTotal} ${studentCountTotal === 1 ? "student" : "students"}`
                  : `${classCount} ${classCount === 1 ? "class" : "classes"} you're enrolled in`}
              </p>
            </div>

            {classCount > 0 && (
              <div className="grid grid-cols-3 gap-2 sm:gap-4 min-w-fit">
                <StatBlock label="Upcoming" value={totalUpcoming} />
                <StatBlock label={isTeacher ? "To grade" : "Recent grades"} value={totalReviewableGrades} />
                <StatBlock label="Guides" value={filteredGuides.length} />
              </div>
            )}
          </div>
        </div>

        <DashboardFilterBar
          userId={user.id}
          filters={filters}
          onChange={setFilters}
          classes={classes}
        />

        {loading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-72" />
            ))}
          </div>
        ) : classCount === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 mb-4">
                <School className="h-7 w-7 text-primary" />
              </div>
              <p className="text-muted-foreground mb-4">
                {isTeacher
                  ? "You haven't created any classes yet."
                  : "You haven't joined any classes yet."}
              </p>
              <Link
                href={isTeacher ? "/teacher/classes" : "/classes/join"}
                className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline underline-offset-4"
              >
                <Plus className="h-4 w-4" />
                {isTeacher ? "Create your first class" : "Join your first class"}
              </Link>
            </CardContent>
          </Card>
        ) : isTeacher ? (
          <TeacherCards
            upcoming={filteredUpcoming as TeacherUpcomingRow[]}
            pending={filteredGrades as TeacherPendingRow[]}
            guides={filteredGuides}
          />
        ) : isStudent ? (
          <StudentCards
            upcoming={filteredUpcoming as StudentUpcomingRow[]}
            grades={filteredGrades as StudentGradeRow[]}
            guides={filteredGuides}
          />
        ) : null}
      </div>
    </div>
  )
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-white/10 backdrop-blur px-3 py-2 text-center">
      <div className="text-xl sm:text-2xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] sm:text-xs uppercase tracking-wide text-white/80">{label}</div>
    </div>
  )
}

// =================== Student cards ===================

function StudentCards({
  upcoming,
  grades,
  guides,
}: {
  upcoming: StudentUpcomingRow[]
  grades: StudentGradeRow[]
  guides: GuideRow[]
}) {
  const u = upcoming.slice(0, 5)
  const g = grades.slice(0, 5)
  const gd = guides.slice(0, 5)
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <SectionHeader
            icon={<ClipboardList className="h-5 w-5" />}
            title="Upcoming"
            count={upcoming.length}
            accent="blue"
          />
          {u.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing to show.</p>
          ) : (
            <div className="space-y-2">
              {u.map(item => {
                const tone = dueDateLabel(item.due_at)
                const color = colorOf(item.class_color)
                return (
                  <Link
                    key={`${item.assignment_id}-${item.class_id}`}
                    href={`/classes/${item.class_id}/assignments/${item.assignment_id}`}
                    className="group flex items-start gap-3 p-3 rounded-lg border bg-background hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <span className={`inline-block w-1 self-stretch rounded-full ${COLOR_DOT[color]} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{item.class_name}</p>
                      <Badge
                        variant={tone.tone === "muted" ? "outline" : "default"}
                        className={`mt-2 ${toneBadgeClass(tone.tone)}`}
                      >
                        {tone.tone === "danger" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {tone.label}
                      </Badge>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-1 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <SectionHeader
            icon={<GraduationCap className="h-5 w-5" />}
            title="Recent grades"
            count={grades.length}
            accent="emerald"
          />
          {g.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No graded work yet.</p>
          ) : (
            <div className="space-y-2">
              {g.map(item => {
                const score =
                  item.total_marks != null && item.total_possible_marks != null
                    ? `${item.total_marks}/${item.total_possible_marks}`
                    : null
                const pct = item.percentage != null ? `${Math.round(item.percentage)}%` : null
                const color = colorOf(item.class_color)
                return (
                  <Link
                    key={item.submission_id}
                    href={`/classes/${item.class_id}/assignments/${item.assignment_id}`}
                    className="group flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <span className={`inline-block w-1 self-stretch rounded-full ${COLOR_DOT[color]} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.assignment_title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.class_name} · {formatDate(item.submitted_at)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {score && <span className="text-sm font-medium tabular-nums">{score}</span>}
                      {pct && <Badge variant="default">{pct}</Badge>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <SectionHeader
            icon={<BookOpen className="h-5 w-5" />}
            title="Newly assigned guides"
            count={guides.length}
            accent="violet"
          />
          {gd.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">No new guides.</p>
          ) : (
            <div className="space-y-2">
              {gd.map(item => {
                const color = colorOf(item.class_colors?.[0])
                return (
                  <Link
                    key={item.study_guide_id}
                    href={`/study-guide/${item.study_guide_id}`}
                    className="group flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <span className={`inline-block w-1 self-stretch rounded-full ${COLOR_DOT[color]} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.class_names.join(", ")} · {formatDate(item.assigned_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// =================== Teacher cards ===================

function TeacherCards({
  upcoming,
  pending,
  guides,
}: {
  upcoming: TeacherUpcomingRow[]
  pending: TeacherPendingRow[]
  guides: GuideRow[]
}) {
  const u = upcoming.slice(0, 5)
  const p = pending.slice(0, 5)
  const gd = guides.slice(0, 5)
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <SectionHeader
            icon={<ClipboardList className="h-5 w-5" />}
            title="Upcoming"
            count={upcoming.length}
            accent="blue"
          />
          {u.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Nothing to show.</p>
          ) : (
            <div className="space-y-2">
              {u.map(item => {
                const tone = dueDateLabel(item.due_at)
                const ratio =
                  item.total_enrolled > 0
                    ? `${item.total_submitted}/${item.total_enrolled}`
                    : null
                const primaryColor = colorOf(item.per_class[0]?.class_color)
                return (
                  <Link
                    key={item.assignment_id}
                    href={`/teacher/assignments/${item.assignment_id}`}
                    className="group flex gap-3 p-3 rounded-lg border bg-background hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <span className={`inline-block w-1 self-stretch rounded-full ${COLOR_DOT[primaryColor]} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm truncate flex-1">{item.title}</p>
                        {ratio && (
                          <span className="text-xs font-medium flex items-center gap-1 flex-shrink-0 tabular-nums">
                            <Users className="h-3 w-3" />
                            {ratio}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 space-y-1.5">
                        {item.per_class.map(pc => {
                          const color = colorOf(pc.class_color)
                          return (
                            <div key={pc.class_id}>
                              <div className="flex items-center justify-between text-xs text-muted-foreground mb-0.5">
                                <span className="truncate flex items-center gap-1.5">
                                  <span className={`inline-block w-2 h-2 rounded-full ${COLOR_DOT[color]}`} />
                                  {pc.class_name}
                                </span>
                                <span className="tabular-nums">{pc.submitted}/{pc.enrolled}</span>
                              </div>
                              <ProgressBar submitted={pc.submitted} enrolled={pc.enrolled} color={color} />
                            </div>
                          )
                        })}
                      </div>
                      <Badge
                        variant={tone.tone === "muted" ? "outline" : "default"}
                        className={`mt-2 ${toneBadgeClass(tone.tone)}`}
                      >
                        {tone.tone === "danger" && <AlertCircle className="h-3 w-3 mr-1" />}
                        {tone.label}
                      </Badge>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <SectionHeader
            icon={<GraduationCap className="h-5 w-5" />}
            title="Pending review"
            count={pending.length}
            accent="amber"
          />
          {p.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nothing waiting on you.
            </p>
          ) : (
            <div className="space-y-2">
              {p.map(item => {
                const score =
                  item.total_marks != null && item.total_possible_marks != null
                    ? `${item.total_marks}/${item.total_possible_marks}`
                    : null
                const pct = item.percentage != null ? `${Math.round(item.percentage)}%` : null
                const color = colorOf(item.class_color)
                return (
                  <Link
                    key={item.submission_id}
                    href={`/teacher/assignments/${item.assignment_id}?submission=${item.submission_id}`}
                    className={`group flex items-center gap-3 p-3 rounded-lg border ${COLOR_TINT_BG[color]} ${COLOR_TINT_BORDER[color]} hover:-translate-y-0.5 hover:shadow-sm transition-all`}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">
                        {item.student ? studentName(item.student) : "Unknown student"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.assignment_title} · {item.class_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {score && <span className="text-sm font-medium tabular-nums">{score}</span>}
                      {pct && <Badge variant="default">{pct}</Badge>}
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <SectionHeader
            icon={<BookOpen className="h-5 w-5" />}
            title="Recently assigned guides"
            count={guides.length}
            accent="violet"
          />
          {gd.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No guides assigned yet.
            </p>
          ) : (
            <div className="space-y-2">
              {gd.map(item => {
                const color = colorOf(item.class_colors?.[0])
                return (
                  <Link
                    key={item.study_guide_id}
                    href={`/study-guide/${item.study_guide_id}`}
                    className="group flex items-center gap-3 p-3 rounded-lg border bg-background hover:bg-muted/40 hover:-translate-y-0.5 hover:shadow-sm transition-all"
                  >
                    <span className={`inline-block w-1 self-stretch rounded-full ${COLOR_DOT[color]} flex-shrink-0`} />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">
                        {item.class_names.join(", ")} · {formatDate(item.assigned_at)}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
