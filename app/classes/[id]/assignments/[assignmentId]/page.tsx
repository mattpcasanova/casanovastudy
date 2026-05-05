"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { processFile, MAX_TOTAL_UPLOAD_SIZE } from "@/lib/pdf-to-images"
import {
  ArrowLeft,
  Camera,
  Upload,
  X,
  Loader2,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Send,
  MessageSquare,
} from "lucide-react"

interface Assignment {
  id: string
  title: string
  description: string | null
  due_at: string | null
  total_possible_marks: number | null
  is_published: boolean
  students_can_see_grade: boolean
  students_can_see_report: boolean
  created_at: string
}

interface Submission {
  id: string
  status: "submitted" | "grading" | "pending_review" | "graded" | "failed"
  is_late: boolean
  file_urls: Array<{ url: string; name: string | null; type: string | null }>
  student_comment: string | null
  submitted_at: string
  grading_result_id: string | null
  updated_at: string
}

interface UploadedFile {
  url: string
  name: string
  type: string
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "No due date"
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
}

function statusBadge(status: Submission["status"], isLate: boolean, canSeeGrade: boolean) {
  // When students_can_see_grade is off, show a neutral "Returned" label for graded work
  const map: Record<Submission["status"], { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: typeof CheckCircle2 }> = {
    submitted: { label: "Submitted", variant: "secondary", icon: Clock },
    grading: { label: "Grading…", variant: "secondary", icon: Loader2 },
    pending_review: { label: "Awaiting teacher review", variant: "default", icon: Clock },
    graded: canSeeGrade
      ? { label: "Graded", variant: "default", icon: CheckCircle2 }
      : { label: "Returned", variant: "secondary", icon: CheckCircle2 },
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

export default function StudentAssignmentSubmitPage() {
  const params = useParams<{ id: string; assignmentId: string }>()
  const classId = params?.id
  const assignmentId = params?.assignmentId
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [assignment, setAssignment] = useState<Assignment | null>(null)
  const [mySubmission, setMySubmission] = useState<Submission | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploads, setUploads] = useState<UploadedFile[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<string>("")
  const [submitting, setSubmitting] = useState(false)
  const [comment, setComment] = useState<string>("")

  const isStudent = user?.user_type === "student"

  const fetchAssignment = useCallback(async () => {
    if (!assignmentId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`)
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to load assignment", variant: "destructive" })
        if (res.status === 403 || res.status === 404) router.push(`/classes/${classId}`)
        return
      }
      setAssignment(json.assignment)
      setMySubmission(json.my_submission ?? null)
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [assignmentId, classId, router, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/auth/signin"); return }
    if (!isStudent) { router.push("/"); return }
    fetchAssignment()
  }, [authLoading, user, isStudent, router, fetchAssignment])

  // Upload one File to Cloudinary via /api/upload-to-cloudinary.
  // Returns the saved upload meta or throws with a useful error.
  const uploadOne = async (file: File): Promise<UploadedFile> => {
    const fd = new FormData()
    fd.append("file", file)
    fd.append("folder", "casanovastudy/submissions")

    let res: Response
    try {
      res = await fetch("/api/upload-to-cloudinary", { method: "POST", body: fd })
    } catch (err) {
      throw new Error(`Network error: ${err instanceof Error ? err.message : 'fetch failed'}`)
    }

    // The Vercel platform returns a non-JSON body (HTML or empty) for a 413
    // "request too large", so we have to handle that case explicitly before
    // calling res.json().
    if (res.status === 413) {
      throw new Error('File is too large for the server. Try a smaller file or split into multiple pages.')
    }
    let json: { url?: string; error?: string; details?: string } = {}
    try {
      json = await res.json()
    } catch {
      throw new Error(`Upload failed (status ${res.status})`)
    }
    if (!res.ok || !json.url) {
      throw new Error(json.details ?? json.error ?? `Upload failed (status ${res.status})`)
    }
    return { url: json.url, name: file.name, type: file.type || "application/octet-stream" }
  }

  const uploadFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setUploading(true)
    setUploadStatus("Preparing files…")
    try {
      const newOnes: UploadedFile[] = []
      for (const original of Array.from(files)) {
        try {
          // Run through processFile: PDFs become per-page compressed JPEGs,
          // large images get downscaled. DOCX/PPTX/TXT pass through unchanged.
          const processed = await processFile(original, (msg) => setUploadStatus(`${original.name}: ${msg}`))

          // Light total-size sanity check so we fail fast with a clear message
          // before sending one-by-one.
          const totalSize = processed.reduce((s, f) => s + f.size, 0)
          if (totalSize > MAX_TOTAL_UPLOAD_SIZE * 4) {
            // Allow generous slack since each file uploads individually, but
            // still cap to avoid a runaway browser session.
            throw new Error(`Total size ${(totalSize / 1024 / 1024).toFixed(1)}MB is too large.`)
          }

          for (let i = 0; i < processed.length; i++) {
            const f = processed[i]
            setUploadStatus(processed.length > 1 ? `${original.name}: uploading page ${i + 1}/${processed.length}…` : `Uploading ${original.name}…`)
            const uploaded = await uploadOne(f)
            newOnes.push(uploaded)
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : 'unknown error'
          console.error(`Failed to process/upload ${original.name}:`, err)
          toast({ title: `Couldn't add ${original.name}`, description: msg, variant: "destructive" })
        }
      }
      setUploads(curr => [...curr, ...newOnes])
      if (newOnes.length > 0) toast({ title: `Added ${newOnes.length} file${newOnes.length === 1 ? "" : "s"}` })
    } finally {
      setUploading(false)
      setUploadStatus("")
    }
  }

  const removeUpload = (url: string) => {
    setUploads(curr => curr.filter(f => f.url !== url))
  }

  const submit = async () => {
    if (uploads.length === 0) {
      toast({ title: "Add at least one file", variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: uploads,
          class_id: classId,
          student_comment: comment.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to submit", variant: "destructive" })
        return
      }
      toast({ title: json.resubmitted ? "Resubmitted" : "Submitted" })
      setUploads([])
      setComment("")
      fetchAssignment()
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  if (authLoading || !user || !isStudent || loading || !assignment) {
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

  const dueDate = assignment.due_at ? new Date(assignment.due_at) : null
  const isOverdue = dueDate && new Date() > dueDate
  const alreadySubmitted = !!mySubmission

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link href={`/classes/${classId}`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to class
        </Link>

        <h1 className="text-3xl font-bold">{assignment.title}</h1>
        <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mt-1 mb-6">
          <span>Due: {formatDateTime(assignment.due_at)}</span>
          {assignment.total_possible_marks != null && (
            <>
              <span>·</span>
              <span>Out of {assignment.total_possible_marks}</span>
            </>
          )}
          {isOverdue && !alreadySubmitted && (
            <Badge variant="outline" className="text-amber-600 border-amber-600">Past due — submission will be marked late</Badge>
          )}
        </div>

        {assignment.description && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <p className="text-sm whitespace-pre-wrap">{assignment.description}</p>
            </CardContent>
          </Card>
        )}

        {mySubmission && (
          <Card className="mb-6">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                <h2 className="font-semibold">Your submission</h2>
                {statusBadge(mySubmission.status, mySubmission.is_late, assignment.students_can_see_grade)}
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Submitted {formatDateTime(mySubmission.submitted_at)}
              </p>
              <div className="flex flex-wrap gap-2">
                {mySubmission.file_urls.map((f, i) => (
                  <a key={i} href={f.url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                    {f.name ?? `Page ${i + 1}`}
                  </a>
                ))}
              </div>
              {mySubmission.student_comment && (
                <div className="mt-3 text-sm bg-muted/50 rounded-md px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Your comment
                  </p>
                  <p className="whitespace-pre-wrap">{mySubmission.student_comment}</p>
                </div>
              )}
              {(mySubmission.status === "graded" || mySubmission.status === "pending_review") &&
               mySubmission.grading_result_id && assignment.students_can_see_report && (
                <div className="mt-4">
                  <Button asChild size="sm">
                    <Link href={`/grade-report/${mySubmission.grading_result_id}`}>View graded report</Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="p-6">
            <h2 className="font-semibold text-lg mb-1">{alreadySubmitted ? "Resubmit" : "Submit your work"}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Take photos of each page, or upload a single PDF.
              {alreadySubmitted ? " Resubmitting replaces your previous submission and clears the grade." : ""}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  id="camera-input"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  multiple
                  onChange={(e) => { uploadFiles(e.target.files); e.target.value = "" }}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("camera-input")?.click()}
                  disabled={uploading || submitting}
                  className="h-20 flex-col gap-1"
                >
                  <Camera className="h-5 w-5" />
                  <span className="text-sm">Take photos</span>
                </Button>

                <input
                  id="file-input"
                  type="file"
                  accept=".pdf,.docx,.pptx,.txt,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
                  multiple
                  onChange={(e) => { uploadFiles(e.target.files); e.target.value = "" }}
                  disabled={uploading}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => document.getElementById("file-input")?.click()}
                  disabled={uploading || submitting}
                  className="h-20 flex-col gap-1"
                >
                  <Upload className="h-5 w-5" />
                  <span className="text-sm">Upload files</span>
                </Button>
              </div>

              {uploading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {uploadStatus || "Uploading…"}
                </div>
              )}

              {uploads.length > 0 && (
                <div className="border rounded-md divide-y">
                  {uploads.map(f => (
                    <div key={f.url} className="flex items-center justify-between gap-2 px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm truncate">{f.name}</span>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => removeUpload(f.url)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="student-comment" className="flex items-center gap-1.5">
                  <MessageSquare className="h-3.5 w-3.5" />
                  Comments for your teacher (optional)
                </Label>
                <Textarea
                  id="student-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 2000))}
                  placeholder="e.g., Q3 has my work on the back of the page; I had to redo Q5 after a mistake..."
                  rows={3}
                  disabled={submitting}
                />
                {comment.length > 0 && (
                  <p className="text-xs text-muted-foreground text-right">{comment.length}/2000</p>
                )}
              </div>

              <Button
                onClick={submit}
                disabled={submitting || uploading || uploads.length === 0}
                className="w-full"
                size="lg"
              >
                {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <Send className="h-4 w-4 mr-2" />
                {alreadySubmitted ? "Resubmit" : "Submit"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
