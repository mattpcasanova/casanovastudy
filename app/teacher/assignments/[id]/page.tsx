"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
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
  Pencil,
  Trash2,
  Loader2,
  ExternalLink,
  Sparkles,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  MessageSquare,
} from "lucide-react"
import CreateAssignmentDialog from "@/components/teacher-assignments/create-assignment-dialog"

interface Assignment {
  id: string
  teacher_id: string
  title: string
  description: string | null
  due_at: string | null
  mark_scheme_url: string | null
  mark_scheme_text: string | null
  grading_instructions: string | null
  total_possible_marks: number | null
  is_published: boolean
  created_at: string
  updated_at: string
}

interface ClassSummary {
  id: string
  name: string
  period: string | null
  subject: string | null
}

interface Submission {
  id: string
  student_id: string
  class_id: string
  status: "submitted" | "grading" | "pending_review" | "graded" | "failed"
  is_late: boolean
  file_urls: Array<{ url: string; name: string | null; type: string | null }>
  student_comment: string | null
  submitted_at: string
  grading_result_id: string | null
  updated_at: string
  student: {
    id: string
    email: string
    first_name: string | null
    last_name: string | null
  } | null
  grading_result: {
    id: string
    total_marks: number
    total_possible_marks: number
    percentage: number
    grade: string
  } | null
  class: { id: string; name: string; period: string | null } | null
}

function studentDisplay(s: Submission["student"]): string {
  if (!s) return "Unknown student"
  if (s.first_name || s.last_name) return `${s.first_name ?? ""} ${s.last_name ?? ""}`.trim()
  return s.email
}

function statusBadge(status: Submission["status"], isLate: boolean) {
  const map: Record<Submission["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
    submitted: { label: "Submitted", variant: "secondary", icon: Clock },
    grading: { label: "Grading…", variant: "secondary", icon: Loader2 },
    pending_review: { label: "Pending review", variant: "default", icon: Clock },
    graded: { label: "Graded", variant: "default", icon: CheckCircle2 },
    failed: { label: "Grading failed", variant: "destructive", icon: AlertCircle },
  }
  const m = map[status]
  const Icon = m.icon
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge variant={m.variant} className="flex items-center gap-1">
        <Icon className={`h-3 w-3 ${status === "grading" ? "animate-spin" : ""}`} />
        {m.label}
      </Badge>
      {isLate && <Badge variant="outline" className="text-amber-600 border-amber-600">Late</Badge>}
    </div>
  )
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "No due date"
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

export default function TeacherAssignmentDetailPage() {
  const params = useParams<{ id: string }>()
  const assignmentId = params?.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [linkedClasses, setLinkedClasses] = useState<ClassSummary[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [working, setWorking] = useState(false)
  const [gradingId, setGradingId] = useState<string | null>(null)

  const isTeacher = user?.user_type === "teacher"

  const fetchAll = useCallback(async () => {
    if (!assignmentId) return
    setLoading(true)
    try {
      const [aRes, sRes] = await Promise.all([
        fetch(`/api/assignments/${assignmentId}`),
        fetch(`/api/assignments/${assignmentId}/submissions`),
      ])
      const aJson = await aRes.json()
      const sJson = await sRes.json()
      if (!aRes.ok) {
        toast({ title: aJson.error ?? "Failed to load assignment", variant: "destructive" })
        if (aRes.status === 403 || aRes.status === 404) router.push("/teacher/classes")
        return
      }
      setAssignment(aJson.assignment)
      setLinkedClasses(aJson.classes ?? [])
      if (sRes.ok) setSubmissions(sJson.submissions ?? [])
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [assignmentId, router, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/auth/signin"); return }
    if (!isTeacher) { router.push("/"); return }
    fetchAll()
  }, [authLoading, user, isTeacher, router, fetchAll])

  const deleteAssignment = async () => {
    if (!assignment) return
    setWorking(true)
    try {
      const res = await fetch(`/api/assignments/${assignment.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to delete", variant: "destructive" })
        return
      }
      toast({ title: "Assignment deleted" })
      router.push(linkedClasses[0] ? `/teacher/classes/${linkedClasses[0].id}` : "/teacher/classes")
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setWorking(false)
      setDeleteOpen(false)
    }
  }

  const gradeSubmission = async (submission: Submission) => {
    if (!assignment) return
    if (!assignment.mark_scheme_url) {
      toast({ title: "Add a mark scheme to this assignment first", variant: "destructive" })
      return
    }
    setGradingId(submission.id)
    // Optimistic UI: flip status to 'grading' immediately
    setSubmissions(curr => curr.map(s => s.id === submission.id ? { ...s, status: "grading" } : s))
    try {
      const res = await fetch(`/api/submissions/${submission.id}/grade`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Grading failed", variant: "destructive" })
        // Refresh to pick up the persisted 'failed' status
        fetchAll()
        return
      }
      toast({ title: "Graded" })
      fetchAll()
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
      fetchAll()
    } finally {
      setGradingId(null)
    }
  }

  const returnSubmission = async (submission: Submission) => {
    setGradingId(submission.id)
    try {
      const res = await fetch(`/api/submissions/${submission.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "graded" }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to return", variant: "destructive" })
        return
      }
      toast({ title: "Returned to student" })
      fetchAll()
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setGradingId(null)
    }
  }

  const editInitialValues = useMemo(() => {
    if (!assignment) return undefined
    return {
      title: assignment.title,
      description: assignment.description ?? "",
      due_at: assignment.due_at,
      grading_instructions: assignment.grading_instructions ?? "",
      total_possible_marks: assignment.total_possible_marks?.toString() ?? "",
      mark_scheme_url: assignment.mark_scheme_url,
      class_ids: linkedClasses.map(c => c.id),
    }
  }, [assignment, linkedClasses])

  if (authLoading || !user || !isTeacher) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-64 mb-6" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  if (loading || !assignment) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-10 w-72 mb-6" />
          <Skeleton className="h-48" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <Link
          href={linkedClasses[0] ? `/teacher/classes/${linkedClasses[0].id}` : "/teacher/classes"}
          className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to class
        </Link>

        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold">{assignment.title}</h1>
            <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mt-1">
              <span>Due: {formatDateTime(assignment.due_at)}</span>
              {assignment.total_possible_marks != null && (
                <>
                  <span>·</span>
                  <span>Out of {assignment.total_possible_marks}</span>
                </>
              )}
              {!assignment.mark_scheme_url && !assignment.mark_scheme_text && (
                <>
                  <span>·</span>
                  <Badge variant="outline" className="text-amber-600 border-amber-600">No mark scheme</Badge>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-2">
              {linkedClasses.map(c => (
                <Badge key={c.id} variant="secondary">
                  {c.name}{c.period ? ` · P${c.period}` : ""}
                </Badge>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)} className="text-red-600 hover:text-red-700">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>

        {assignment.description && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
            </CardContent>
          </Card>
        )}

        {assignment.mark_scheme_url && (
          <Card className="mb-6">
            <CardContent className="p-5 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">Mark scheme uploaded</span>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={assignment.mark_scheme_url} target="_blank" rel="noreferrer">
                  Open <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg">Submissions</h2>
              <Badge variant="secondary">{submissions.length}</Badge>
            </div>

            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No submissions yet.
              </p>
            ) : (
              <ul className="divide-y">
                {submissions.map(s => (
                  <li key={s.id} className="py-4 flex items-start justify-between gap-3 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{studentDisplay(s.student)}</p>
                      <p className="text-xs text-muted-foreground">
                        Submitted {formatDateTime(s.submitted_at)}
                        {s.class && ` · ${s.class.name}${s.class.period ? ` P${s.class.period}` : ""}`}
                      </p>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {statusBadge(s.status, s.is_late)}
                        {s.grading_result && (
                          <Badge variant="outline" className="font-mono">
                            {s.grading_result.total_marks}/{s.grading_result.total_possible_marks} ({s.grading_result.percentage}%) · {s.grading_result.grade}
                          </Badge>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-2 flex-wrap text-xs">
                        {s.file_urls.map((f, i) => (
                          <a key={i} href={f.url} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate max-w-xs">
                            {f.name ?? `Page ${i + 1}`}
                          </a>
                        ))}
                      </div>
                      {s.student_comment && (
                        <div className="mt-2 text-sm bg-muted/50 rounded-md px-3 py-2">
                          <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            Student comment
                          </p>
                          <p className="whitespace-pre-wrap">{s.student_comment}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {s.grading_result && (
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/grade-report/${s.grading_result.id}`}>
                            View report
                          </Link>
                        </Button>
                      )}
                      {(s.status === "submitted" || s.status === "failed") && (
                        <Button
                          size="sm"
                          onClick={() => gradeSubmission(s)}
                          disabled={gradingId === s.id || !assignment.mark_scheme_url}
                        >
                          {gradingId === s.id ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4 mr-2" />
                          )}
                          Grade with AI
                        </Button>
                      )}
                      {s.status === "pending_review" && (
                        <Button size="sm" onClick={() => returnSubmission(s)} disabled={gradingId === s.id}>
                          {gradingId === s.id && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                          Return to student
                        </Button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {editInitialValues && (
        <CreateAssignmentDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          mode="edit"
          assignmentId={assignment.id}
          initialValues={editInitialValues}
          onSaved={fetchAll}
        />
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this assignment?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the assignment and all student submissions. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteAssignment} disabled={working} className="bg-red-600 hover:bg-red-700">
              {working && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
