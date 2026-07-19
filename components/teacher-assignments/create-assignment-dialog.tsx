"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"
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
import { FileUp, Loader2, Target, Upload, X } from "lucide-react"
import MasteryConfigFields, {
  DEFAULT_MASTERY_CONFIG,
  type MasteryConfigValues,
} from "@/components/teacher-assignments/mastery-config-fields"

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
  defaultType?: "file_upload" | "mastery_quiz"
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
  defaultType,
  onSaved,
}: Props) {
  const { toast } = useToast()
  const [values, setValues] = useState<InitialValues>(initialValues ?? EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  const [uploadingMarkScheme, setUploadingMarkScheme] = useState(false)
  const [savingDefaults, setSavingDefaults] = useState(false)
  // Assignment type is chosen at creation and fixed afterwards
  const [assignmentType, setAssignmentType] = useState<"file_upload" | "mastery_quiz">(defaultType ?? "file_upload")
  const [masteryConfig, setMasteryConfig] = useState<MasteryConfigValues>(DEFAULT_MASTERY_CONFIG)
  const isMastery = mode === "create" && assignmentType === "mastery_quiz"

  useEffect(() => {
    if (!open) return
    let cancelled = false

    if (mode === "create") {
      // Fetch teacher's saved preferences to pre-fill toggle defaults
      fetch("/api/teacher/preferences")
        .then(r => r.ok ? r.json() : null)
        .then(j => {
          if (cancelled || !j?.preferences) return
          const p = j.preferences
          const base = defaultClassId ? { ...EMPTY, class_ids: [defaultClassId] } : EMPTY
          setValues({
            ...base,
            auto_grade: p.pref_auto_grade ?? true,
            students_can_see_grade: p.pref_students_can_see_grade ?? true,
            students_can_see_report: p.pref_students_can_see_report ?? true,
          })
        })
        .catch(() => {
          if (!cancelled) setValues(defaultClassId ? { ...EMPTY, class_ids: [defaultClassId] } : EMPTY)
        })
    } else {
      setValues(initialValues ?? EMPTY)
    }
    setAssignmentType(defaultType ?? "file_upload")
    setMasteryConfig(DEFAULT_MASTERY_CONFIG)

    setClassesLoading(true)
    fetch("/api/classes")
      .then(r => r.json())
      .then(j => {
        if (cancelled) return
        if (Array.isArray(j.classes)) setClasses(j.classes)
      })
      .finally(() => { if (!cancelled) setClassesLoading(false) })
    return () => { cancelled = true }
  }, [open, initialValues, defaultClassId, defaultType, mode])

  const saveDefaults = async () => {
    setSavingDefaults(true)
    try {
      const res = await fetch("/api/teacher/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pref_auto_grade: values.auto_grade,
          pref_students_can_see_grade: values.students_can_see_grade,
          pref_students_can_see_report: values.students_can_see_report,
        }),
      })
      if (!res.ok) throw new Error("Save failed")
      toast({ title: "Saved as your defaults" })
    } catch {
      toast({ title: "Failed to save defaults", variant: "destructive" })
    } finally {
      setSavingDefaults(false)
    }
  }

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
    if (isMastery && masteryConfig.concept_ids.length === 0) {
      toast({ title: "Pick at least one concept", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const payload: Record<string, unknown> = isMastery
        ? {
            type: "mastery_quiz",
            title,
            description: values.description.trim() || null,
            mastery: masteryConfig,
          }
        : {
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
      if (!isMastery) {
        if (values.total_possible_marks) {
          const n = parseInt(values.total_possible_marks, 10)
          if (!Number.isFinite(n) || n < 0) {
            toast({ title: "Total marks must be a non-negative number", variant: "destructive" })
            setSubmitting(false)
            return
          }
          payload.total_possible_marks = n
        } else payload.total_possible_marks = null
      }

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
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto p-0 gap-0 [&>button]:top-5 [&>button]:right-5 [&>button]:text-white/80 [&>button:hover]:text-white">
        <DialogHeader className="rounded-t-lg bg-gradient-to-br from-blue-800 via-blue-600 to-cyan-500 px-6 py-5 text-white">
          <DialogTitle className="text-lg text-white">{mode === "create" ? "Create Assignment" : "Edit Assignment"}</DialogTitle>
          <DialogDescription className="text-blue-50/90">
            {mode === "create"
              ? "Post this to one or more of your classes. You can add or change the mark scheme later."
              : "Edit assignment details. Changing class links replaces the current set."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 px-6 pt-5">
          {mode === "create" && (
            <div className="space-y-2">
              <Label>Assignment type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setAssignmentType("file_upload")}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    assignmentType === "file_upload" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <FileUp className="h-4 w-4 mb-1.5 text-muted-foreground" />
                  <p className="text-sm font-medium">File upload</p>
                  <p className="text-xs text-muted-foreground">Students submit work; AI grades against your mark scheme</p>
                </button>
                <button
                  type="button"
                  onClick={() => setAssignmentType("mastery_quiz")}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    assignmentType === "mastery_quiz" ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                  )}
                >
                  <Target className="h-4 w-4 mb-1.5 text-muted-foreground" />
                  <p className="text-sm font-medium">Mastery quiz</p>
                  <p className="text-xs text-muted-foreground">Students loop through your question bank until they master each concept</p>
                </button>
              </div>
            </div>
          )}

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
            {!isMastery && (
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
            )}
          </div>

          <div className="space-y-2">
            <Label>Classes</Label>
            {classesLoading ? (
              <p className="text-sm text-muted-foreground">Loading classes…</p>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">You don't have any classes yet.</p>
            ) : (
              <div className="border rounded-md divide-y max-h-44 overflow-y-auto">
                {classes.map(c => {
                  const checked = values.class_ids.includes(c.id)
                  return (
                    <label
                      key={c.id}
                      className={cn(
                        "relative flex items-center gap-3 px-3 py-2.5 cursor-pointer select-none transition-colors hover:bg-muted/50",
                        checked && "bg-primary/5"
                      )}
                    >
                      {checked && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-primary rounded-l-md" />}
                      <Checkbox
                        checked={checked}
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
                  )
                })}
              </div>
            )}
            {values.class_ids.length > 0 && (
              <p className="text-xs text-muted-foreground">{values.class_ids.length} class{values.class_ids.length === 1 ? "" : "es"} selected</p>
            )}
          </div>

          {isMastery && (
            <MasteryConfigFields value={masteryConfig} onChange={setMasteryConfig} />
          )}

          {!isMastery && (
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
          )}

          {!isMastery && (
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
          )}

          {!isMastery && (
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Grading &amp; visibility settings</p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={saveDefaults}
                disabled={savingDefaults}
              >
                {savingDefaults && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
                Save as my defaults
              </Button>
            </div>
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
          )}
        </div>

        <DialogFooter className="px-6 pb-6 pt-2">
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
