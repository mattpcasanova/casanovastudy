"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Loader2, Plus, X, GraduationCap } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ClassAssignment {
  id: string
  student_id: string
  class_name: string
  class_period?: string
  created_at: string
}

interface ExistingClass {
  class_name: string
  class_period?: string
}

interface ClassAssignmentDialogProps {
  studentId: string
  studentName: string
  trigger: React.ReactNode
  onUpdate?: () => void
}

export function ClassAssignmentDialog({
  studentId,
  studentName,
  trigger,
  onUpdate
}: ClassAssignmentDialogProps) {
  const [open, setOpen] = useState(false)
  const [classes, setClasses] = useState<ClassAssignment[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [newClassName, setNewClassName] = useState("")
  const [newClassPeriod, setNewClassPeriod] = useState("")
  const [existingClasses, setExistingClasses] = useState<ExistingClass[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const { toast } = useToast()

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/student-classes?studentId=${studentId}`)
      const data = await response.json()

      if (response.ok) {
        setClasses(data.classes || [])
      }
    } catch (error) {
      console.error("Error fetching classes:", error)
    } finally {
      setLoading(false)
    }
  }, [studentId])

  // Sort classes by period (numeric) first, then alphabetically
  const sortClasses = useCallback((classes: ExistingClass[]) => {
    return [...classes].sort((a, b) => {
      const periodA = a.class_period ? parseInt(a.class_period) : null
      const periodB = b.class_period ? parseInt(b.class_period) : null

      if (periodA !== null && !isNaN(periodA) && periodB !== null && !isNaN(periodB)) {
        return periodA - periodB
      }
      if (periodA !== null && !isNaN(periodA)) return -1
      if (periodB !== null && !isNaN(periodB)) return 1

      return a.class_name.localeCompare(b.class_name)
    })
  }, [])

  // Fetch all teacher's classes for suggestions
  const fetchAllTeacherClasses = useCallback(async () => {
    try {
      const response = await fetch("/api/student-classes")
      const data = await response.json()

      if (response.ok) {
        const allClasses: ClassAssignment[] = data.classes || []

        // Extract unique class names for suggestions
        const uniqueClasses = new Map<string, ExistingClass>()
        allClasses.forEach(cls => {
          const key = `${cls.class_name}|${cls.class_period || ''}`
          if (!uniqueClasses.has(key)) {
            uniqueClasses.set(key, {
              class_name: cls.class_name,
              class_period: cls.class_period
            })
          }
        })
        setExistingClasses(sortClasses(Array.from(uniqueClasses.values())))
      }
    } catch (error) {
      console.error("Error fetching all classes:", error)
    }
  }, [sortClasses])

  useEffect(() => {
    if (open) {
      fetchClasses()
      fetchAllTeacherClasses()
    }
  }, [open, fetchClasses, fetchAllTeacherClasses])

  // Filter suggestions based on input
  const filteredSuggestions = useMemo(() => {
    if (!newClassName.trim()) return sortClasses(existingClasses)
    const query = newClassName.toLowerCase()
    return sortClasses(existingClasses.filter(cls =>
      cls.class_name.toLowerCase().includes(query)
    ))
  }, [newClassName, existingClasses, sortClasses])

  const addClass = async () => {
    if (!newClassName.trim()) return

    setSaving(true)
    try {
      const response = await fetch("/api/student-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId,
          className: newClassName.trim(),
          classPeriod: newClassPeriod.trim() || null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to add class",
          variant: "destructive"
        })
        return
      }

      setClasses(prev => [...prev, data.class])
      setNewClassName("")
      setNewClassPeriod("")

      // Immediately add to existing classes if it's new
      const newClassKey = `${data.class.class_name}|${data.class.class_period || ''}`
      const alreadyExists = existingClasses.some(
        cls => `${cls.class_name}|${cls.class_period || ''}` === newClassKey
      )
      if (!alreadyExists) {
        setExistingClasses(prev => sortClasses([...prev, {
          class_name: data.class.class_name,
          class_period: data.class.class_period
        }]))
      }

      onUpdate?.()

      toast({
        title: "Class added",
        description: `${studentName} has been added to ${data.class.class_name}`
      })
    } catch (error) {
      console.error("Error adding class:", error)
      toast({
        title: "Error",
        description: "Failed to add class",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const removeClass = async (classId: string, className: string) => {
    setRemovingId(classId)
    try {
      const response = await fetch(`/api/student-classes/${classId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to remove class",
          variant: "destructive"
        })
        return
      }

      setClasses(prev => prev.filter(c => c.id !== classId))
      onUpdate?.()

      toast({
        title: "Class removed",
        description: `${studentName} has been removed from ${className}`
      })
    } catch (error) {
      console.error("Error removing class:", error)
      toast({
        title: "Error",
        description: "Failed to remove class",
        variant: "destructive"
      })
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Class Assignments</DialogTitle>
          <DialogDescription>
            Manage class assignments for {studentName}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current classes */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Current Classes</Label>
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : classes.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                No classes assigned yet
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {classes.map((cls) => (
                  <Badge
                    key={cls.id}
                    variant="secondary"
                    className="flex items-center gap-1 pr-1"
                  >
                    <GraduationCap className="h-3 w-3" />
                    {cls.class_name}
                    {cls.class_period && (
                      <span className="text-muted-foreground">
                        ({cls.class_period})
                      </span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-4 w-4 ml-1 hover:bg-destructive/20"
                      onClick={() => removeClass(cls.id, cls.class_name)}
                      disabled={removingId === cls.id}
                    >
                      {removingId === cls.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <X className="h-3 w-3" />
                      )}
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Add new class */}
          <div className="border-t pt-4 space-y-3">
            <Label className="text-sm font-medium block">Add to Class</Label>

            {/* Existing classes as quick select buttons */}
            {existingClasses.length > 0 && (
              <div>
                <p className="text-xs text-muted-foreground mb-2">Select existing class:</p>
                <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                  {existingClasses.map((cls, idx) => (
                    <Button
                      key={idx}
                      variant={newClassName === cls.class_name && newClassPeriod === (cls.class_period || '') ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setNewClassName(cls.class_name)
                        setNewClassPeriod(cls.class_period || '')
                      }}
                      className="h-7 text-xs"
                    >
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {cls.class_name}
                      {cls.class_period && ` (${cls.class_period})`}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input fields with autocomplete */}
            <div>
              <p className="text-sm font-medium mb-2">
                {existingClasses.length > 0 ? 'Or create new class:' : 'Class details:'}
              </p>
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <Input
                    placeholder="Class name (e.g. Algebra)"
                    value={newClassName}
                    onChange={(e) => {
                      setNewClassName(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  />
                  {/* Autocomplete dropdown */}
                  {showSuggestions && newClassName && filteredSuggestions.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto">
                      {filteredSuggestions.map((cls, idx) => (
                        <button
                          key={idx}
                          className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                          onMouseDown={(e) => {
                            e.preventDefault()
                            setNewClassName(cls.class_name)
                            setNewClassPeriod(cls.class_period || '')
                            setShowSuggestions(false)
                          }}
                        >
                          <GraduationCap className="h-3 w-3 text-muted-foreground" />
                          {cls.class_name}
                          {cls.class_period && (
                            <span className="text-muted-foreground">({cls.class_period})</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <Input
                  placeholder="Period"
                  value={newClassPeriod}
                  onChange={(e) => setNewClassPeriod(e.target.value)}
                  className="w-20"
                />
                <Button
                  onClick={addClass}
                  disabled={saving || !newClassName.trim()}
                  size="icon"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
