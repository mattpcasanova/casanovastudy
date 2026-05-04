"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { Switch } from "@/components/ui/switch"
import { Loader2, Upload, X } from "lucide-react"

interface ClassOption {
  id: string
  name: string
  period: string | null
  subject: string | null
}

interface InitialValues {
  title: string
  description: string
  due_at: string | null
  grading_instructions: string
  total_possible_marks: string
  mark_scheme_url: string | null
  class_ids: string[]
  auto_grade: boolean
  students_can_see_grade: boolean
  students_can_see_report: boolean
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: InitialValues
  assignmentId?: string
  defaultClassId?: string
  onSaved: (a: { id: string }) => void
}

const EMPTY: InitialValues = {
  title: "",
  description: "",
  due_at: null,
  grading_instructions: "",
  total_possible_marks: "",
  mark_scheme_url: null,
  class_ids: [],
  auto_grade: true,
  students_can_see_grade: true,
  students_can_see_report: true,
}

function toLocalInputValue(iso: string | null): string {
  if (!iso) return ""
  const d = new Date(iso)
  const offset = d.getTimezoneOffset() * 60000
  return new Date(d.getTime() - offset).toISOString().slice(0, 16)
}

export default function CreateAssignmentDialog({
  open,
  onOpenChange,
  mode,
  initialValues,
  assignmentId,
  defaultClassId,
  onSaved,
}: Props) {
  const { toast } = useToast()
  const [values, setValues] = useState<InitialValues>(initialValues ?? EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [uploadingMarkScheme, setUploadingMarkScheme] = useState(false)

  useEffect(() => {
    if (!open) return
    setValues(initialValues ?? (defaultClassId ? { ...EMPTY, class_ids: [defaultClassId] } : EMPTY))
    let cancelled = false
    setClassesLoading(true)
    fetch("/api/classes")
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (Array.isArray(j.classes)) setClasses(j.classes)
      })
      .finally(() => { if (!cancelled) setClassesLoading(false) })
    return () => { cancelled = true }
  }, [open, initialValues, defaultClassId])

  const toggleClass = (id: string) => {
    setValues(v => ({
      ...v,
      class_ids: v.class_ids.includes(id)
        ? v.class_ids.filter(c => c !== id)
        : [...v.class_ids, id],
    }))
  }

  const uploadMarkScheme = async (file: File) => {
    if (!file) return
    setUploadingMarkScheme(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("folder", "casanovastudy/mark-schemes")
      const res = await fetch("/api/upload-to-cloudinary", { method: "POST", body: fd })
      const json = await res.json()
      if (!res.ok || !json.url) {
        toast({ title: json.error ?? "Upload failed", variant: "destructive" })
        return
      }
      setValues(v => ({ ...v, mark_scheme_url: json.url }))
      toast({ title: "Mark scheme uploaded" })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setUploadingMarkScheme(false)
    }
  }

  const submit = async () => {
    const title = values.title.trim()
    if (!title) {
      toast({ title: "Title is required", variant: "destructive" })
      return
    }
    if (values.class_ids.length === 0) {
      toast({ title: "Pick at least one class", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        title,
        description: values.description.trim() || null,
        grading_instructions: values.grading_instructions.trim() || null,
        mark_scheme_url: values.mark_scheme_url || null,
        auto_grade: values.auto_grade,
        students_can_see_grade: values.students_can_see_grade,
        students_can_see_report: values.students_can_see_report,
      }
      if (values.due_at) payload.due_at = new Date(values.due_at).toISOString()
      else payload.due_at = null
      if (values.total_possible_marks) {
        const n = parseInt(values.total_possible_marks, 10)
        if (!Number.isFinite(n) || n < 0) {
          toast({ title: "Total marks must be a non-negative number", variant: "destructive" })
          setSubmitting(false)
          return
        }
        payload.total_possible_marks = n
      } else payload.total_possible_marks = null

      if (mode === "create") {
        payload.class_ids = values.class_ids
      } else if (Array.isArray(values.class_ids) && values.class_ids.length > 0) {
        payload.class_ids = values.class_ids
      }

      const url = mode === "create" ? "/api/assignments" : `/api/assignments/${assignmentId}`
      const method = mode === "create" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Something went wrong", variant: "destructive" })
        return
      }
      toast({ title: mode === "create" ? "Assignment created" : "Assignment updated" })
      onSaved(json.assignment)
      onOpenChange(false)
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Assignment" : "Edit Assignment"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Post this to one or more of your classes. You can add or change the mark scheme later."
              : "Edit assignment details. Changing class links replaces the current set."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={values.title}
              onChange={(e) => setValues({ ...values, title: e.target.value })}
              maxLength={200}
              placeholder="Chapter 1 Review"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Instructions to students</Label>
            <Textarea
              id="description"
              value={values.description}
              onChange={(e) => setValues({ ...values, description: e.target.value })}
              placeholder="Show all work. Submit photos of your handwritten solutions..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="due_at">Due date (optional)</Label>
              <Input
                id="due_at"
                type="datetime-local"
                value={toLocalInputValue(values.due_at)}
                onChange={(e) => {
                  const val = e.target.value
                  if (!val) { setValues(v => ({ ...v, due_at: null })); return }
                  // When picking a date for the first time the browser defaults to T00:00;
                  // auto-advance to end-of-day (23:59) so deadlines land at midnight.
                  const adjusted = !values.due_at && val.endsWith('T00:00')
                    ? val.slice(0, 10) + 'T23:59'
                    : val
                  setValues(v => ({ ...v, due_at: adjusted }))
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="total">Total marks (optional)</Label>
              <Input
                id="total"
                type="number"
                min="0"
                value={values.total_possible_marks}
                onChange={(e) => setValues({ ...values, total_possible_marks: e.target.value })}
                placeholder="60"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Classes</Label>
            {classesLoading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">You don't have any classes yet.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
                {classes.map(c => (
                  <label key={c.id} className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/40">
                    <Checkbox
                      checked={values.class_ids.includes(c.id)}
                      onCheckedChange={() => toggleClass(c.id)}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.period ? `Period ${c.period}` : "No period"}
                        {c.subject ? ` · ${c.subject}` : ""}
                      </p>
                    </div>
                  </label>
                ))}
              </div>
            )}
            {values.class_ids.length > 0 && (
              <p className="text-xs text-muted-foreground">{values.class_ids.length} class{values.class_ids.length === 1 ? "" : "es"} selected</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Mark scheme (PDF or DOCX, optional)</Label>
            {values.mark_scheme_url ? (
              <div className="flex items-center justify-between gap-2 border rounded-md px-3 py-2 bg-muted/30">
                <a href={values.mark_scheme_url} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline truncate">
                  Uploaded mark scheme
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setValues(v => ({ ...v, mark_scheme_url: null }))}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  id="mark-scheme"
                  type="file"
                  accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) uploadMarkScheme(file)
                  }}
                  disabled={uploadingMarkScheme}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById("mark-scheme")?.click()}
                  disabled={uploadingMarkScheme}
                >
                  {uploadingMarkScheme ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {uploadingMarkScheme ? "Uploading…" : "Upload mark scheme"}
                </Button>
                <Badge variant="secondary" className="text-xs">Required for AI grading</Badge>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="instructions">Grading instructions for AI (optional)</Label>
            <Textarea
              id="instructions"
              value={values.grading_instructions}
              onChange={(e) => setValues({ ...values, grading_instructions: e.target.value })}
              placeholder="Award method marks even if final answer is wrong. Penalize unit errors by 1 mark each."
              rows={3}
            />
          </div>

          <div className="border rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium">Grading &amp; visibility settings</p>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm">Auto-grade on submit</p>
                <p className="text-xs text-muted-foreground">AI grades the submission immediately when a student submits (requires mark scheme)</p>
              </div>
              <Switch
                checked={values.auto_grade}
                onCheckedChange={(v) => setValues(vals => ({ ...vals, auto_grade: v }))}
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm">Students can see their grade</p>
                <p className="text-xs text-muted-foreground">Show score and grade after teacher returns the work</p>
              </div>
              <Switch
                checked={values.students_can_see_grade}
                onCheckedChange={(v) => setValues(vals => ({ ...vals, students_can_see_grade: v }))}
              />
            </label>
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-sm">Students can view full report</p>
                <p className="text-xs text-muted-foreground">Allow students to open the detailed AI grade report</p>
              </div>
              <Switch
                checked={values.students_can_see_report}
                onCheckedChange={(v) => setValues(vals => ({ ...vals, students_can_see_report: v }))}
              />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting || classesLoading}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Create assignment" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
