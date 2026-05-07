"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import DashboardFilterBar, {
  type DashboardFilters,
  DEFAULT_FILTERS,
  readStoredFilters,
} from "@/components/dashboard-filter-bar"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  Clock,
  School,
  Users,
  ExternalLink,
} from "lucide-react"
import { COLOR_DOT, resolveClassColor, type ClassColorToken } from "@/lib/class-colors"

interface StudentRow {
  assignment_id: string
  title: string
  due_at: string | null
  total_possible_marks?: number | null
  class_id: string
  class_name: string
  class_color?: string | null
  status: "submitted" | "grading" | "pending_review" | "graded" | "failed" | null
}

interface TeacherRow {
  assignment_id: string
  title: string
  due_at: string | null
  total_possible_marks?: number | null
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

interface CalEvent {
  key: string
  assignment_id: string
  title: string
  due_at: string
  total_possible_marks?: number | null
  class_id: string
  class_name: string
  period: string | null
  color: ClassColorToken
  studentStatus?: StudentRow["status"]
  teacherSubmitted?: number
  teacherEnrolled?: number
  href: string
}

interface ClassRow {
  id: string
  name: string
  period: string | null
  effective_color?: string | null
}

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}
function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1)
}
function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
function buildMonthGrid(monthStart: Date): Date[] {
  const startWeekday = monthStart.getDay()
  const gridStart = new Date(monthStart)
  gridStart.setDate(monthStart.getDate() - startWeekday)
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }
  return cells
}

function formatFullDue(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })
}

function studentStatusLabel(status: StudentRow["status"]): string {
  switch (status) {
    case "graded":
      return "Graded"
    case "pending_review":
      return "Awaiting teacher review"
    case "grading":
      return "Grading…"
    case "submitted":
      return "Submitted"
    case "failed":
      return "Grading failed"
    default:
      return "Not submitted"
  }
}

interface MonthCache {
  events: CalEvent[]
  classes: ClassRow[]
}

export default function CalendarPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()))
  const [cache, setCache] = useState<Record<string, MonthCache>>({})
  const [loadingMonths, setLoadingMonths] = useState<Record<string, boolean>>({})
  const [filters, setFilters] = useState<DashboardFilters>(DEFAULT_FILTERS)
  const [openEvent, setOpenEvent] = useState<CalEvent | null>(null)
  const inflight = useRef<Set<string>>(new Set())

  const isTeacher = user?.user_type === "teacher"
  const isStudent = user?.user_type === "student"
  const monthKey = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}`

  useEffect(() => {
    if (user?.id) setFilters(readStoredFilters(user.id))
  }, [user?.id])

  const fetchMonth = useCallback(
    async (anchor: Date) => {
      if (!user) return
      const key = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, "0")}`
      if (cache[key] || inflight.current.has(key)) return
      inflight.current.add(key)
      setLoadingMonths(m => ({ ...m, [key]: true }))
      try {
        const from = startOfMonth(anchor).toISOString()
        const to = endOfMonth(anchor).toISOString()
        const endpoint = isTeacher ? "/api/teacher/dashboard" : "/api/student/dashboard"
        const res = await fetch(
          `${endpoint}?fields=upcoming,classes&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        )
        const json = await res.json()
        if (!res.ok) {
          toast({ title: json.error ?? "Failed to load calendar", variant: "destructive" })
          return
        }
        const classes: ClassRow[] = (json.classes ?? []).map((c: ClassRow) => ({
          id: c.id,
          name: c.name,
          period: c.period,
          effective_color: c.effective_color,
        }))
        const classPeriodMap = new Map(classes.map(c => [c.id, c.period]))
        const classColorMap = new Map(classes.map(c => [c.id, c.effective_color ?? null]))

        let events: CalEvent[]
        if (isTeacher) {
          const rows = (json.upcoming ?? []) as TeacherRow[]
          events = []
          for (const r of rows) {
            if (!r.due_at) continue
            for (const pc of r.per_class) {
              events.push({
                key: `${r.assignment_id}:${pc.class_id}`,
                assignment_id: r.assignment_id,
                title: r.title,
                due_at: r.due_at,
                total_possible_marks: r.total_possible_marks ?? null,
                class_id: pc.class_id,
                class_name: pc.class_name,
                period: pc.period,
                color: resolveClassColor(pc.class_color ?? classColorMap.get(pc.class_id), null),
                teacherSubmitted: pc.submitted,
                teacherEnrolled: pc.enrolled,
                href: `/teacher/assignments/${r.assignment_id}`,
              })
            }
          }
        } else {
          const rows = (json.upcoming ?? []) as StudentRow[]
          events = rows
            .filter(r => !!r.due_at)
            .map(r => ({
              key: `${r.assignment_id}:${r.class_id}`,
              assignment_id: r.assignment_id,
              title: r.title,
              due_at: r.due_at as string,
              total_possible_marks: r.total_possible_marks ?? null,
              class_id: r.class_id,
              class_name: r.class_name,
              period: classPeriodMap.get(r.class_id) ?? null,
              color: resolveClassColor(r.class_color ?? classColorMap.get(r.class_id), null),
              studentStatus: r.status,
              href: `/classes/${r.class_id}/assignments/${r.assignment_id}`,
            }))
        }

        setCache(c => ({ ...c, [key]: { events, classes } }))
      } catch (err) {
        console.error(err)
        toast({ title: "Network error", variant: "destructive" })
      } finally {
        inflight.current.delete(key)
        setLoadingMonths(m => ({ ...m, [key]: false }))
      }
    },
    [cache, isTeacher, toast, user]
  )

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    fetchMonth(cursor)
  }, [authLoading, user, router, cursor, fetchMonth])

  const grid = useMemo(() => buildMonthGrid(cursor), [cursor])
  const today = new Date()
  const monthData = cache[monthKey]
  const monthLoading = !!loadingMonths[monthKey]
  const allEvents = monthData?.events ?? []
  const classes = monthData?.classes ?? []

  const filteredEvents = useMemo(() => {
    return allEvents.filter(ev => {
      if (filters.classId !== "all" && ev.class_id !== filters.classId) return false
      if (filters.period !== "all" && (ev.period ?? "") !== filters.period) return false
      if (filters.hidePast && new Date(ev.due_at).getTime() < Date.now()) return false
      if (filters.hideSubmitted) {
        if (isTeacher) {
          const enrolled = ev.teacherEnrolled ?? 0
          const submitted = ev.teacherSubmitted ?? 0
          if (enrolled > 0 && submitted >= enrolled) return false
        } else {
          if (ev.studentStatus && ["submitted", "grading", "pending_review", "graded"].includes(ev.studentStatus)) return false
        }
      }
      return true
    })
  }, [allEvents, filters, isTeacher])

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalEvent[]>()
    for (const ev of filteredEvents) {
      const key = dateKey(new Date(ev.due_at))
      const arr = map.get(key) ?? []
      arr.push(ev)
      map.set(key, arr)
    }
    return map
  }, [filteredEvents])

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-96" />
        </div>
      </div>
    )
  }

  if (!isStudent && !isTeacher) {
    return null
  }

  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" })

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <ClassesSectionNav />

        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <CalendarDays className="h-7 w-7" />
              Calendar
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Due dates across all your classes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, -1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(startOfMonth(new Date()))}>
              Today
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCursor(addMonths(cursor, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <DashboardFilterBar
          userId={user.id}
          filters={filters}
          onChange={setFilters}
          classes={classes}
          showRange={false}
        />

        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xl font-semibold">{monthLabel}</h2>
          {monthLoading && <span className="text-xs text-muted-foreground">Loading…</span>}
        </div>

        {/* Desktop month grid */}
        <Card className="hidden md:block">
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {WEEKDAYS.map(d => (
                <div key={d} className="px-2 py-2 text-xs font-medium text-muted-foreground text-center">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {grid.map((day, idx) => {
                const inMonth = day.getMonth() === cursor.getMonth()
                const items = eventsByDay.get(dateKey(day)) ?? []
                const isToday = sameDay(day, today)
                return (
                  <div
                    key={idx}
                    className={`min-h-[110px] border-r border-b last:border-r-0 p-2 ${
                      inMonth ? "bg-background" : "bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-xs ${
                          isToday
                            ? "inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground font-semibold"
                            : inMonth
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {day.getDate()}
                      </span>
                      {items.length > 0 && (
                        <span className="text-[10px] text-muted-foreground">{items.length}</span>
                      )}
                    </div>
                    <div className="space-y-1">
                      {items.slice(0, 3).map(ev => (
                        <button
                          key={ev.key}
                          type="button"
                          onClick={() => setOpenEvent(ev)}
                          className={`w-full text-left text-[11px] truncate flex items-center gap-1 px-1.5 py-1 rounded ${COLOR_DOT[ev.color]} text-white hover:brightness-110 transition`}
                          title={`${ev.title} — ${ev.class_name}`}
                        >
                          <span className="truncate">{ev.title}</span>
                        </button>
                      ))}
                      {items.length > 3 && (
                        <div className="text-[10px] text-muted-foreground px-1">+{items.length - 3} more</div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Mobile agenda list */}
        <div className="md:hidden space-y-3">
          {filteredEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                Nothing due this month.
              </CardContent>
            </Card>
          ) : (
            (() => {
              const monthEvents = filteredEvents
                .filter(ev => {
                  const d = new Date(ev.due_at)
                  return d.getMonth() === cursor.getMonth() && d.getFullYear() === cursor.getFullYear()
                })
                .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime())
              const groups = new Map<string, CalEvent[]>()
              for (const ev of monthEvents) {
                const k = dateKey(new Date(ev.due_at))
                const arr = groups.get(k) ?? []
                arr.push(ev)
                groups.set(k, arr)
              }
              return Array.from(groups.entries()).map(([k, items]) => {
                const day = new Date(items[0].due_at)
                return (
                  <Card key={k}>
                    <CardContent className="p-4">
                      <p className="text-xs font-medium text-muted-foreground mb-2">
                        {day.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
                      </p>
                      <div className="space-y-2">
                        {items.map(ev => (
                          <button
                            key={ev.key}
                            type="button"
                            onClick={() => setOpenEvent(ev)}
                            className="w-full flex items-center justify-between p-2 rounded-lg border hover:bg-muted/50"
                          >
                            <div className="min-w-0 flex-1 text-left">
                              <p className="text-sm font-medium truncate">{ev.title}</p>
                              <p className="text-xs text-muted-foreground truncate">
                                {ev.class_name}
                                {isTeacher && ev.teacherEnrolled != null && (
                                  <>
                                    {" · "}
                                    <span className="inline-flex items-center gap-0.5">
                                      <Users className="h-3 w-3" />
                                      {ev.teacherSubmitted}/{ev.teacherEnrolled}
                                    </span>
                                  </>
                                )}
                              </p>
                            </div>
                            <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ml-2 ${COLOR_DOT[ev.color]}`} />
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            })()
          )}
        </div>
      </div>

      <Dialog open={!!openEvent} onOpenChange={o => !o && setOpenEvent(null)}>
        <DialogContent>
          {openEvent && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-2">
                  <span className={`inline-block w-1 self-stretch rounded-full ${COLOR_DOT[openEvent.color]} flex-shrink-0`} />
                  <span>{openEvent.title}</span>
                </DialogTitle>
                <DialogDescription>Assignment details</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 mt-2">
                <DetailRow icon={<School className="h-4 w-4" />} label="Class">
                  {openEvent.class_name}
                  {openEvent.period && (
                    <span className="text-muted-foreground"> · Period {openEvent.period}</span>
                  )}
                </DetailRow>
                <DetailRow icon={<Clock className="h-4 w-4" />} label="Due">
                  {formatFullDue(openEvent.due_at)}
                </DetailRow>
                {openEvent.total_possible_marks != null && (
                  <DetailRow label="Out of">
                    {openEvent.total_possible_marks} marks
                  </DetailRow>
                )}
                {isTeacher && openEvent.teacherEnrolled != null && (
                  <DetailRow icon={<Users className="h-4 w-4" />} label="Submitted">
                    <span className="tabular-nums">
                      {openEvent.teacherSubmitted}/{openEvent.teacherEnrolled}
                    </span>
                  </DetailRow>
                )}
                {isStudent && (
                  <DetailRow label="Status">
                    <Badge variant="outline">{studentStatusLabel(openEvent.studentStatus ?? null)}</Badge>
                  </DetailRow>
                )}
              </div>

              <div className="mt-4 flex justify-end">
                <Button asChild>
                  <Link href={openEvent.href}>
                    {isTeacher ? "Open assignment" : "Go to assignment"}
                    <ExternalLink className="h-4 w-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon?: React.ReactNode
  label: string
  children: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="text-muted-foreground flex items-center gap-1.5 min-w-[80px]">
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  )
}
