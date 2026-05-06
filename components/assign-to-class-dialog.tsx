"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Loader2, GraduationCap } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ClassItem {
  id: string
  name: string
  period: string | null
  subject: string | null
}

interface AssignToClassDialogProps {
  studyGuideIds: string[]
  studyGuideTitle?: string
  trigger: React.ReactNode
  onSaved?: () => void
}

export default function AssignToClassDialog({
  studyGuideIds,
  studyGuideTitle,
  trigger,
  onSaved,
}: AssignToClassDialogProps) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [originalIds, setOriginalIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isBulk = studyGuideIds.length > 1
  const guideCount = studyGuideIds.length

  useEffect(() => {
    if (!open) return

    const load = async () => {
      setLoading(true)
      try {
        // Always fetch the teacher's classes
        const classesRes = await fetch('/api/classes')
        if (classesRes.ok) {
          const json = await classesRes.json()
          setClasses(json.classes ?? [])
        }

        // For single-guide mode, pre-fetch current assignments to enable diff-edit.
        // For bulk mode, start unchecked — saving is purely additive.
        if (!isBulk && studyGuideIds[0]) {
          const assignRes = await fetch(`/api/study-guides/${studyGuideIds[0]}/assign`)
          if (assignRes.ok) {
            const json = await assignRes.json()
            const ids = new Set<string>(json.classIds ?? [])
            setSelectedIds(ids)
            setOriginalIds(new Set(ids))
          }
        } else {
          setSelectedIds(new Set())
          setOriginalIds(new Set())
        }
      } catch (err) {
        console.error('Failed to load assign dialog data:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [open, isBulk, studyGuideIds])

  const toggle = (classId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(classId)) next.delete(classId)
      else next.add(classId)
      return next
    })
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (isBulk) {
        // Bulk mode: purely additive — POST selected classIds for each guide in parallel.
        const classIds = Array.from(selectedIds)
        if (classIds.length === 0) {
          setOpen(false)
          return
        }

        const results = await Promise.allSettled(
          studyGuideIds.map(guideId =>
            fetch(`/api/study-guides/${guideId}/assign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ classIds }),
            }).then(async res => {
              if (!res.ok) {
                const j = await res.json().catch(() => ({}))
                throw new Error(j.error ?? 'Failed to assign')
              }
            })
          )
        )

        const failed = results.filter(r => r.status === 'rejected').length
        if (failed > 0) {
          toast({
            title: 'Partial failure',
            description: `${guideCount - failed} of ${guideCount} guides assigned. ${failed} failed.`,
            variant: 'destructive',
          })
        } else {
          toast({
            title: 'Saved',
            description: `${guideCount} guides assigned to ${classIds.length} ${classIds.length === 1 ? 'class' : 'classes'}.`,
          })
        }
      } else {
        // Single mode: diff-edit — POST additions, DELETE removals.
        const guideId = studyGuideIds[0]
        const toAdd = [...selectedIds].filter(id => !originalIds.has(id))
        const toRemove = [...originalIds].filter(id => !selectedIds.has(id))

        const ops: Promise<void>[] = []

        if (toAdd.length > 0) {
          ops.push(
            fetch(`/api/study-guides/${guideId}/assign`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ classIds: toAdd }),
            }).then(async res => {
              if (!res.ok) {
                const j = await res.json()
                throw new Error(j.error ?? 'Failed to assign')
              }
            })
          )
        }

        for (const classId of toRemove) {
          ops.push(
            fetch(`/api/study-guides/${guideId}/assign?class_id=${classId}`, {
              method: 'DELETE',
            }).then(async res => {
              if (!res.ok) {
                const j = await res.json()
                throw new Error(j.error ?? 'Failed to unassign')
              }
            })
          )
        }

        await Promise.all(ops)
        setOriginalIds(new Set(selectedIds))
        toast({ title: 'Saved', description: 'Class assignments updated.' })
      }

      onSaved?.()
      setOpen(false)
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to save assignments',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = isBulk
    ? selectedIds.size > 0
    : [...selectedIds].some(id => !originalIds.has(id)) ||
      [...originalIds].some(id => !selectedIds.has(id))

  const dialogTitle = isBulk
    ? `Assign ${guideCount} guides to classes`
    : 'Assign to Class'

  const dialogDescription = isBulk
    ? `Pick the classes that should see all ${guideCount} selected guides.`
    : studyGuideTitle
      ? `Select which classes should see "${studyGuideTitle}".`
      : 'Select which classes should see this guide.'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        <div className="py-2">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : classes.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              You haven&apos;t created any classes yet.
            </p>
          ) : (
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {classes.map(cls => (
                <label
                  key={cls.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selectedIds.has(cls.id)}
                    onCheckedChange={() => toggle(cls.id)}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{cls.name}</p>
                    {(cls.period || cls.subject) && (
                      <p className="text-xs text-muted-foreground">
                        {[cls.period && `Period ${cls.period}`, cls.subject]
                          .filter(Boolean)
                          .join(' · ')}
                      </p>
                    )}
                  </div>
                  {selectedIds.has(cls.id) && (
                    <GraduationCap className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </label>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges || loading}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isBulk ? `Assign ${guideCount} guides` : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
