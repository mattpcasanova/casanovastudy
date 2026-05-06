"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import StudyGuideFilterBar, { applyGuideFilters, type SortOption } from "@/components/study-guide-filter-bar"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
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
import {
  ArrowLeft,
  Copy,
  RefreshCw,
  Pencil,
  Archive,
  ArchiveRestore,
  Trash2,
  Loader2,
  UserMinus,
  Plus,
  ClipboardList,
  ChevronRight,
  BookOpen,
  AlignLeft,
  Layers,
  ListChecks,
  Brain,
  X,
} from "lucide-react"
import ClassFormDialog from "@/components/teacher-classes/class-form-dialog"
import CreateAssignmentDialog from "@/components/teacher-assignments/create-assignment-dialog"

interface ClassRecord {
  id: string
  teacher_id: string
  name: string
  period: string | null
  subject: string | null
  enrollment_code: string
  is_archived: boolean
  created_at: string
  updated_at: string
}

interface Enrollment {
  id: string
  student_id: string
  status: "active" | "removed"
  joined_at: string
  student: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  } | null
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

interface AssignmentSummary {
  id: string
  title: string
  description: string | null
  due_at: string | null
  total_possible_marks: number | null
  is_published: boolean
  has_mark_scheme: boolean
  submission_stats: { total: number; pending: number; graded: number }
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "No due date"
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function studentDisplay(e: Enrollment): string {
  if (!e.student) return "Unknown student"
  const { first_name, last_name, email } = e.student
  if (first_name || last_name) return `${first_name ?? ""} ${last_name ?? ""}`.trim()
  return email
}

export default function TeacherClassDetailPage() {
  const params = useParams<{ id: string }>()
  const classId = params?.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [cls, setCls] = useState<ClassRecord | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [assignments, setAssignments] = useState<AssignmentSummary[]>([])
  const [studyGuides, setStudyGuides] = useState<AssignedGuide[]>([])
  const [unassigningId, setUnassigningId] = useState<string | null>(null)
  const [guideSearch, setGuideSearch] = useState("")
  const [guideSubject, setGuideSubject] = useState("all")
  const [guideFormat, setGuideFormat] = useState("all")
  const [guideSort, setGuideSort] = useState<SortOption>("date-desc")
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [createAssignmentOpen, setCreateAssignmentOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const isTeacher = user?.user_type === "teacher"
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
  const joinUrl = useMemo(() => {
    if (!cls) return ""
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/classes/join?code=${cls.enrollment_code}`
  }, [cls])
  const qrSrc = useMemo(() => {
    if (!joinUrl) return ""
    return `https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(joinUrl)}&size=240x240&margin=12`
  }, [joinUrl])

  const fetchAll = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      const [classRes, rosterRes, assignmentsRes, guidesRes] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/classes/${classId}/enrollments`),
        fetch(`/api/classes/${classId}/assignments`),
        fetch(`/api/classes/${classId}/study-guides`),
      ])
      const classJson = await classRes.json()
      const rosterJson = await rosterRes.json()
      const assignmentsJson = await assignmentsRes.json()

      if (!classRes.ok) {
        toast({ title: classJson.error ?? "Failed to load class", variant: "destructive" })
        if (classRes.status === 403 || classRes.status === 404) {
          router.push("/teacher/classes")
        }
        return
      }
      setCls(classJson.class)

      if (rosterRes.ok) {
        setEnrollments(rosterJson.enrollments ?? [])
      } else {
        toast({ title: rosterJson.error ?? "Failed to load roster", variant: "destructive" })
      }

      if (assignmentsRes.ok) {
        setAssignments(assignmentsJson.assignments ?? [])
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
    if (!isTeacher) {
      router.push("/")
      return
    }
    fetchAll()
  }, [authLoading, user, isTeacher, router, fetchAll])

  const copyCode = async () => {
    if (!cls) return
    try {
      await navigator.clipboard.writeText(cls.enrollment_code)
      toast({ title: "Code copied" })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  const copyJoinLink = async () => {
    if (!joinUrl) return
    try {
      await navigator.clipboard.writeText(joinUrl)
      toast({ title: "Join link copied" })
    } catch {
      toast({ title: "Could not copy", variant: "destructive" })
    }
  }

  const regenerate = async () => {
    if (!cls) return
    setWorking(true)
    try {
      const res = await fetch(`/api/classes/${cls.id}/regenerate-code`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to regenerate code", variant: "destructive" })
        return
      }
      setCls({ ...cls, enrollment_code: json.class.enrollment_code })
      toast({ title: "New code generated" })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setWorking(false)
      setRegenOpen(false)
    }
  }

  const toggleArchive = async () => {
    if (!cls) return
    setWorking(true)
    try {
      const res = await fetch(`/api/classes/${cls.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_archived: !cls.is_archived }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to update class", variant: "destructive" })
        return
      }
      setCls({ ...cls, is_archived: json.class.is_archived })
      toast({ title: json.class.is_archived ? "Class archived" : "Class restored" })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setWorking(false)
    }
  }

  const deleteClass = async () => {
    if (!cls) return
    setWorking(true)
    try {
      const res = await fetch(`/api/classes/${cls.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to delete class", variant: "destructive" })
        return
      }
      toast({ title: "Class deleted" })
      router.push("/teacher/classes")
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setWorking(false)
      setDeleteOpen(false)
    }
  }

  const unassignGuide = async (guideId: string) => {
    if (!cls) return
    setUnassigningId(guideId)
    try {
      const res = await fetch(`/api/study-guides/${guideId}/assign?class_id=${cls.id}`, { method: "DELETE" })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to unassign", variant: "destructive" })
        return
      }
      setStudyGuides(current => current.filter(g => g.id !== guideId))
      toast({ title: "Study guide unassigned" })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setUnassigningId(null)
    }
  }

  const removeStudent = async (enrollment: Enrollment) => {
    if (!cls) return
    setRemovingId(enrollment.id)
    try {
      const res = await fetch(`/api/classes/${cls.id}/enrollments/${enrollment.student_id}`, {
        method: "DELETE",
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to remove student", variant: "destructive" })
        return
      }
      setEnrollments((current) => current.filter((e) => e.id !== enrollment.id))
      toast({ title: "Student removed" })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setRemovingId(null)
    }
  }

  if (authLoading || !user || !isTeacher) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  if (loading || !cls) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-10 w-72 mb-6" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-64 md:col-span-1" />
            <Skeleton className="h-64 md:col-span-2" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <Link href="/teacher/classes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          All classes
        </Link>

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              {cls.name}
              {cls.is_archived && <Badge variant="outline">Archived</Badge>}
            </h1>
            <div className="text-muted-foreground text-sm mt-1">
              {cls.period && <span>Period {cls.period}</span>}
              {cls.period && cls.subject && <span> · </span>}
              {cls.subject && <span>{cls.subject}</span>}
              {!cls.period && !cls.subject && <span>No period or subject set</span>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} disabled={working}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={toggleArchive} disabled={working}>
              {cls.is_archived ? (
                <>
                  <ArchiveRestore className="h-4 w-4 mr-2" />
                  Restore
                </>
              ) : (
                <>
                  <Archive className="h-4 w-4 mr-2" />
                  Archive
                </>
              )}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} disabled={working} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Enrollment code + QR */}
          <Card className="md:col-span-1">
            <CardContent className="p-6 flex flex-col items-center text-center">
              <p className="text-sm text-muted-foreground mb-1">Enrollment code</p>
              <p className="font-mono text-3xl tracking-[0.3em] font-bold mb-3">{cls.enrollment_code}</p>
              <div className="flex gap-2 mb-4">
                <Button size="sm" variant="outline" onClick={copyCode}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy code
                </Button>
                <Button size="sm" variant="outline" onClick={() => setRegenOpen(true)} disabled={working}>
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Regenerate
                </Button>
              </div>
              {qrSrc && (
                <img
                  src={qrSrc}
                  alt={`QR code for joining ${cls.name}`}
                  width={240}
                  height={240}
                  className="rounded-lg border"
                />
              )}
              <Button size="sm" variant="link" className="mt-2" onClick={copyJoinLink}>
                Copy join link
              </Button>
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card className="md:col-span-2">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Assignments
                </h2>
                <Button size="sm" onClick={() => setCreateAssignmentOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Create
                </Button>
              </div>
              {assignments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No assignments yet. Click "Create" to post one.
                </p>
              ) : (
                <div className="space-y-2">
                  {assignments.map(a => (
                    <div key={a.id}>
                      <Link href={`/teacher/assignments/${a.id}`} className="flex items-center justify-between p-3 hover:bg-muted/50 rounded-lg border transition-colors">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{a.title}</p>
                          <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground mt-0.5">
                            <span>Due: {formatDueDate(a.due_at)}</span>
                            <span>·</span>
                            <span>{a.submission_stats.total} submitted</span>
                            {a.submission_stats.pending > 0 && (
                              <Badge variant="secondary" className="text-xs">{a.submission_stats.pending} to review</Badge>
                            )}
                            {!a.has_mark_scheme && (
                              <Badge variant="outline" className="text-xs text-amber-600 border-amber-600">No mark scheme</Badge>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Study Guides */}
          <Card className="md:col-span-3">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Study Guides
                </h2>
                <Badge variant="secondary">{studyGuides.length}</Badge>
              </div>
              {studyGuides.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No study guides assigned. Open a guide from{" "}
                  <Link href="/my-guides" className="underline">My Guides</Link>{" "}
                  and click <span className="font-medium">Assign to Class</span> to share it here.
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
                    const isUnassigning = unassigningId === guide.id
                    return (
                      <div
                        key={guide.assignmentId}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <Link href={`/study-guide/${guide.id}`} className="flex items-center gap-3 min-w-0 flex-1">
                          <FormatIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{guide.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {guide.subject} · Grade {guide.grade_level} · {guide.format}
                            </p>
                          </div>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => unassignGuide(guide.id)}
                          disabled={isUnassigning}
                          className="text-red-600 hover:text-red-700 ml-2"
                        >
                          {isUnassigning ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <X className="h-4 w-4 mr-1" />
                              Unassign
                            </>
                          )}
                        </Button>
                      </div>
                    )
                  })}
                </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {/* Roster */}
          <Card className="md:col-span-3">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-lg">Roster</h2>
                <Badge variant="secondary">{enrollments.length} active</Badge>
              </div>

              {enrollments.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No students yet. Share the enrollment code or QR with your class.
                </p>
              ) : (
                <ul className="divide-y">
                  {enrollments.map((e) => (
                    <li key={e.id} className="flex items-center justify-between py-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{studentDisplay(e)}</p>
                        {e.student?.email && (
                          <p className="text-sm text-muted-foreground truncate">{e.student.email}</p>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStudent(e)}
                        disabled={removingId === e.id}
                        className="text-red-600 hover:text-red-700"
                      >
                        {removingId === e.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <UserMinus className="h-4 w-4 mr-1" />
                            Remove
                          </>
                        )}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <ClassFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        classId={cls.id}
        initialValues={{ name: cls.name, period: cls.period, subject: cls.subject }}
        onSaved={(updated) => setCls({ ...cls, ...updated })}
      />

      <CreateAssignmentDialog
        open={createAssignmentOpen}
        onOpenChange={setCreateAssignmentOpen}
        mode="create"
        defaultClassId={cls.id}
        onSaved={(a) => {
          router.push(`/teacher/assignments/${a.id}`)
        }}
      />

      <AlertDialog open={regenOpen} onOpenChange={setRegenOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate enrollment code?</AlertDialogTitle>
            <AlertDialogDescription>
              The current code will stop working immediately. Anyone with the old code (or QR) won't be able to join. Existing enrollments are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={regenerate} disabled={working}>
              {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this class?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the class and all student enrollments. Grade reports tied to this class are not deleted but will no longer be linked. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteClass} disabled={working} className="bg-red-600 hover:bg-red-700">
              {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
