"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export interface ClassFormValues {
  name: string
  period: string | null
  subject: string | null
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "create" | "edit"
  initialValues?: ClassFormValues
  classId?: string
  onSaved: (cls: { id: string; name: string; period: string | null; subject: string | null; enrollment_code?: string }) => void
}

const EMPTY: ClassFormValues = { name: "", period: null, subject: null }

export default function ClassFormDialog({ open, onOpenChange, mode, initialValues, classId, onSaved }: Props) {
  const { toast } = useToast()
  const [values, setValues] = useState<ClassFormValues>(initialValues ?? EMPTY)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (open) setValues(initialValues ?? EMPTY)
  }, [open, initialValues])

  const submit = async () => {
    const name = values.name.trim()
    if (!name) {
      toast({ title: "Class name is required", variant: "destructive" })
      return
    }

    setSubmitting(true)
    try {
      const url = mode === "create" ? "/api/classes" : `/api/classes/${classId}`
      const method = mode === "create" ? "POST" : "PATCH"
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          period: values.period?.trim() || null,
          subject: values.subject?.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Something went wrong", variant: "destructive" })
        return
      }
      toast({ title: mode === "create" ? "Class created" : "Class updated" })
      onSaved(json.class)
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Create Class" : "Edit Class"}</DialogTitle>
          <DialogDescription>
            {mode === "create"
              ? "Students will join with the enrollment code generated automatically."
              : "Update the class name, period, or subject."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Name</Label>
            <Input
              id="class-name"
              placeholder="AP Statistics"
              maxLength={100}
              value={values.name}
              onChange={(e) => setValues({ ...values, name: e.target.value })}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="class-period">Period</Label>
              <Input
                id="class-period"
                placeholder="3"
                maxLength={50}
                value={values.period ?? ""}
                onChange={(e) => setValues({ ...values, period: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="class-subject">Subject</Label>
              <Input
                id="class-subject"
                placeholder="AP Stats"
                maxLength={100}
                value={values.subject ?? ""}
                onChange={(e) => setValues({ ...values, subject: e.target.value })}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === "create" ? "Create class" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
