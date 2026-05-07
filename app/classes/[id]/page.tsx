"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import StudyGuideFilterBar, { applyGuideFilters, type SortOption } from "@/components/study-guide-filter-bar"
import Link from "next/link"
import { useParams, useRouter, useSearchParams } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, LogOut, ChevronRight, ClipboardList, CheckCircle2, Clock, AlertCircle, BookOpen, AlignLeft, Layers, ListChecks, Brain, GraduationCap } from "lucide-react"
import ClassColorPicker from "@/components/class-color-picker"
import { isClassColorToken, type ClassColorToken } from "@/lib/class-colors"

interface ClassRecord {
  id: string
  teacher_id: string
  name: string
  period: string | null
  subject: string | null
  is_archived: boolean
  created_at: string
  color?: string | null
  student_color?: string | null
  effective_color?: string | null
}

interface TeacherProfile {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  email: string
}

interface AssignedGuide {
  assignmentId: string
  assignedAt: string
  id: string
  title: string
  subject: string
  format: string
  grade_level: string
  created_at: string
}

interface GradingResult {
  total_marks: number | null
  total_possible_marks: number | null
  percentage: number | null
  grade: string | null
}

interface StudentSubmission {
  id: string
  status: "submitted" | "grading" | "pending_review" | "graded" | "failed"
  is_late: boolean
  submitted_at: string
  grading_result_id: string | null
  grading_result?: GradingResult | null
}

interface StudentAssignment {
  id: string
  title: string
  due_at: string | null
  total_possible_marks: number | null
  is_published: boolean
  my_submission: StudentSubmission | null
}

const VALID_TABS = ["assignments", "guides", "grades"] as const
type TabValue = (typeof VALID_TABS)[number]

function formatDueDate(iso: string | null): string {
  if (!iso) return "No due date"
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}

function studentStatusBadge(sub: StudentSubmission | null) {
  if (!sub) {
    return (
      <Badge variant="outline" className="flex items-center gap-1">
        <AlertCircle className="h-3 w-3" />
        Not submitted
      </Badge>
    )
  }
  const map = {
    submitted: { label: "Submitted", icon: Clock, variant: "secondary" as const },
    grading: { label: "Grading", icon: Loader2, variant: "secondary" as const },
    pending_review: { label: "Awaiting review", icon: Clock, variant: "default" as const },
    graded: { label: "Graded", icon: CheckCircle2, variant: "default" as const },
    failed: { label: "Grading failed", icon: AlertCircle, variant: "destructive" as const },
  }
  const m = map[sub.status]
  const Icon = m.icon
  return (
    <Badge variant={m.variant} className="flex items-center gap-1">
      <Icon className={`h-3 w-3 ${sub.status === "grading" ? "animate-spin" : ""}`} />
      {m.label}
    </Badge>
  )
}

function teacherDisplay(t: TeacherProfile | null): string {
  if (!t) return "Unknown teacher"
  if (t.display_name) return t.display_name
  if (t.first_name || t.last_name) return `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim()
  return t.email
}

export default function StudentClassDetailPage() {
  const params = useParams<{ id: string }>()
  const classId = params?.id
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [cls, setCls] = useState<ClassRecord | null>(null)
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [assignments, setAssignments] = useState<StudentAssignment[]>([])
  const [studyGuides, setStudyGuides] = useState<AssignedGuide[]>([])
  const [guideSearch, setGuideSearch] = useState("")
  const [guideSubject, setGuideSubject] = useState("all")
  const [guideFormat, setGuideFormat] = useState("all")
  const [guideSort, setGuideSort] = useState<SortOption>("date-desc")
  const [loading, setLoading] = useState(true)

  const tabFromUrl = searchParams?.get("tab") as TabValue | null
  const initialTab: TabValue = tabFromUrl && VALID_TABS.includes(tabFromUrl) ? tabFromUrl : "assignments"
  const [tab, setTab] = useState<TabValue>(initialTab)

  const onTabChange = (value: string) => {
    if (!VALID_TABS.includes(value as TabValue)) return
    const next = value as TabValue
    setTab(next)
    const sp = new URLSearchParams(searchParams?.toString() ?? "")
    if (next === "assignments") sp.delete("tab")
    else sp.set("tab", next)
    const qs = sp.toString()
    router.replace(`/classes/${classId}${qs ? `?${qs}` : ""}`, { scroll: false })
  }

  const filteredGuides = useMemo(
    () => applyGuideFilters(studyGuides, {
      search: guideSearch,
      subject: guideSubject,
      format: guideFormat,
      sort: guideSort,
    }),
    [studyGuides, guideSearch, guideSubject, guideFormat, guideSort]
  )
  const availableGuideSubjects = useMemo(
    () => Array.from(new Set(studyGuides.map(g => g.subject))).sort(),
    [studyGuides]
  )
  const gradedAssignments = useMemo(
    () => assignments.filter(a => a.my_submission?.status === "graded" && a.my_submission.grading_result),
    [assignments]
  )
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const isStudent = user?.user_type === "student"

  const fetchClass = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      const [classRes, myClassesRes, assignmentsRes, guidesRes] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/my-classes`),
        fetch(`/api/classes/${classId}/assignments`),
        fetch(`/api/classes/${classId}/study-guides`),
      ])
      const classJson = await classRes.json()

      if (!classRes.ok) {
        toast({ title: classJson.error ?? "Failed to load class", variant: "destructive" })
        if (classRes.status === 403 || classRes.status === 404) {
          router.push("/my-classes")
        }
        return
      }
      setCls(classJson.class)

      if (myClassesRes.ok) {
        const myClassesJson = await myClassesRes.json()
        const match = (myClassesJson.classes ?? []).find((c: { id: string }) => c.id === classId)
        if (match?.teacher) setTeacher(match.teacher)
      }

      if (assignmentsRes.ok) {
        const j = await assignmentsRes.json()
        setAssignments(j.assignments ?? [])
      }

      if (guidesRes.ok) {
        const j = await guidesRes.json()
        setStudyGuides(j.guides ?? [])
      }
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [classId, router, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    if (!isStudent) {
      router.push("/")
      return
    }
    fetchClass()
  }, [authLoading, user, isStudent, router, fetchClass])

  const leaveClass = async () => {
    if (!cls || !user) return
    setLeaving(true)
    try {
      const res = await fetch(`/api/classes/${cls.id}/enrollments/${user.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to leave class", variant: "destructive" })
        return
      }
      toast({ title: "You've left the class" })
      router.push("/my-classes")
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLeaving(false)
      setLeaveOpen(false)
    }
  }

  if (authLoading || !user || !isStudent || loading || !cls) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-10 w-72 mb-6" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <Link href="/my-classes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          All classes
        </Link>

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{cls.name}</h1>
            <div className="text-muted-foreground text-sm mt-1">
              {cls.period && <span>Period {cls.period}</span>}
              {cls.period && cls.subject && <span> · </span>}
              {cls.subject && <span>{cls.subject}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Teacher: {teacherDisplay(teacher)}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <ClassColorPicker
              size="sm"
              value={isClassColorToken(cls.student_color) ? (cls.student_color as ClassColorToken) : null}
              fallbackColor={isClassColorToken(cls.color) ? (cls.color as ClassColorToken) : null}
              onChange={async (next) => {
                try {
                  const res = await fetch(`/api/classes/${cls.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ student_color: next }),
                  })
                  const json = await res.json()
                  if (!res.ok) {
                    toast({ title: json.error ?? "Failed to set color", variant: "destructive" })
                    return
                  }
                  setCls(prev => (prev ? { ...prev, student_color: next } : prev))
                } catch (err) {
                  console.error(err)
                  toast({ title: "Network error", variant: "destructive" })
                }
              }}
            />
            <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)} className="text-red-600 hover:text-red-700">
              <LogOut className="h-4 w-4 mr-2" />
              Leave class
            </Button>
          </div>
        </div>

        <Tabs value={tab} onValueChange={onTabChange}>
          <TabsList className="mb-4">
            <TabsTrigger value="assignments">
              <ClipboardList className="h-4 w-4" />
              Assignments
              <Badge variant="secondary" className="ml-1">{assignments.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="guides">
              <BookOpen className="h-4 w-4" />
              Study Guides
              <Badge variant="secondary" className="ml-1">{studyGuides.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="grades">
              <GraduationCap className="h-4 w-4" />
              Grades
              <Badge variant="secondary" className="ml-1">{gradedAssignments.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assignments">
            <Card>
              <CardContent className="p-6">
                {assignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No assignments yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <Link
                        key={a.id}
                        href={`/classes/${classId}/assignments/${a.id}`}
                        className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg border transition-colors"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{a.title}</p>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                            <span>Due: {formatDueDate(a.due_at)}</span>
                            {a.total_possible_marks != null && (
                              <>
                                <span>·</span>
                                <span>Out of {a.total_possible_marks}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {studentStatusBadge(a.my_submission)}
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="guides">
            <Card>
              <CardContent className="p-6">
                {studyGuides.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No study guides assigned yet.
                  </p>
                ) : (
                  <>
                    {studyGuides.length > 3 && (
                      <StudyGuideFilterBar
                        searchQuery={guideSearch}
                        onSearchChange={setGuideSearch}
                        subjectFilter={guideSubject}
                        onSubjectChange={setGuideSubject}
                        formatFilter={guideFormat}
                        onFormatChange={setGuideFormat}
                        sortBy={guideSort}
                        onSortChange={setGuideSort}
                        availableSubjects={availableGuideSubjects}
                      />
                    )}
                    {filteredGuides.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-6 text-center">
                        No guides match your filters.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {filteredGuides.map(guide => {
                          const formatIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
                            outline: AlignLeft,
                            flashcards: Layers,
                            quiz: ListChecks,
                            summary: Brain,
                            custom: BookOpen,
                          }
                          const FormatIcon = formatIconMap[guide.format] ?? BookOpen
                          return (
                            <Link
                              key={guide.assignmentId}
                              href={`/study-guide/${guide.id}`}
                              className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg border transition-colors"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-medium truncate">{guide.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {guide.subject} · Grade {guide.grade_level}
                                </p>
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <FormatIcon className="h-4 w-4 text-muted-foreground" />
                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="grades">
            <Card>
              <CardContent className="p-6">
                {gradedAssignments.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-8 text-center">
                    No graded work yet. Assignments your teacher has returned will appear here.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {gradedAssignments.map(a => {
                      const sub = a.my_submission!
                      const r = sub.grading_result!
                      const score =
                        r.total_marks != null && r.total_possible_marks != null
                          ? `${r.total_marks}/${r.total_possible_marks}`
                          : null
                      const pct = r.percentage != null ? `${Math.round(r.percentage)}%` : null
                      return (
                        <Link
                          key={a.id}
                          href={`/classes/${classId}/assignments/${a.id}`}
                          className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg border transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{a.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Submitted {formatDate(sub.submitted_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {score && <span className="text-sm font-medium">{score}</span>}
                            {pct && (
                              <Badge variant="default" className="flex items-center gap-1">
                                {pct}
                              </Badge>
                            )}
                            {r.grade && (
                              <Badge variant="secondary">{r.grade}</Badge>
                            )}
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this class?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see new assignments or study guides for this class. You can rejoin later with the enrollment code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={leaveClass} disabled={leaving} className="bg-red-600 hover:bg-red-700">
              {leaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Leave class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
