"use client"

import { useState, useEffect, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Check, ChevronsUpDown, Link2, Link2Off, Loader2, User } from "lucide-react"
import { cn } from "@/lib/utils"

interface StudentClass {
  id: string
  class_name: string
  class_period?: string
}

interface Student {
  id: string
  email: string
  first_name?: string
  last_name?: string
  classes?: StudentClass[]
}

interface StudentLinkSelectorProps {
  teacherId: string
  firstName: string
  lastName: string
  selectedStudentId: string | null
  onSelect: (studentId: string | null, student: Student | null) => void
  disabled?: boolean
}

export function StudentLinkSelector({
  teacherId,
  firstName,
  lastName,
  selectedStudentId,
  onSelect,
  disabled = false
}: StudentLinkSelectorProps) {
  const [open, setOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<Student[]>([])
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)
  const [manualSearch, setManualSearch] = useState("")
  const [allStudents, setAllStudents] = useState<Student[]>([])
  const [loadingAll, setLoadingAll] = useState(false)

  // Fetch suggestions when first/last name changes
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (!firstName && !lastName) {
        setSuggestions([])
        return
      }

      try {
        const params = new URLSearchParams()
        if (firstName) params.set('firstName', firstName)
        if (lastName) params.set('lastName', lastName)

        const response = await fetch(`/api/students/suggest?${params}`)
        const data = await response.json()

        if (response.ok) {
          setSuggestions(data.suggestions || [])
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error)
      }
    }

    const timeoutId = setTimeout(fetchSuggestions, 300)
    return () => clearTimeout(timeoutId)
  }, [firstName, lastName])

  // Fetch all students for manual selection (from teacher's student list)
  const fetchAllStudents = useCallback(async (forceRefresh = false) => {
    if (!teacherId) return
    if (!forceRefresh && allStudents.length > 0) return // Already loaded

    setLoadingAll(true)
    try {
      // Fetch students and their classes
      const [studentsRes, classesRes] = await Promise.all([
        fetch(`/api/my-students?teacherId=${teacherId}`),
        fetch('/api/student-classes')
      ])

      const studentsData = await studentsRes.json()
      const classesData = await classesRes.json()

      if (studentsRes.ok) {
        // Create a map of classes by student ID
        const classMap = new Map<string, StudentClass[]>()
        if (classesRes.ok && classesData.classes) {
          classesData.classes.forEach((cls: StudentClass & { student_id: string }) => {
            const existing = classMap.get(cls.student_id) || []
            classMap.set(cls.student_id, [...existing, {
              id: cls.id,
              class_name: cls.class_name,
              class_period: cls.class_period
            }])
          })
        }

        // Transform the response to match our Student interface with classes
        const students = (studentsData.students || []).map((follow: { student: Student }) => ({
          ...follow.student,
          classes: classMap.get(follow.student.id) || []
        }))
        setAllStudents(students)
      }
    } catch (error) {
      console.error('Error fetching all students:', error)
    } finally {
      setLoadingAll(false)
    }
  }, [allStudents.length, teacherId])

  // Load all students on mount to have class data ready for suggestions
  useEffect(() => {
    if (teacherId) {
      fetchAllStudents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId])

  // Refresh when popover opens (in case new students were added)
  useEffect(() => {
    if (open && teacherId) {
      fetchAllStudents(true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, teacherId])

  // Enrich suggestions with class data when allStudents loads
  const enrichedSuggestions = suggestions.map(sug => {
    const studentWithClasses = allStudents.find(s => s.id === sug.id)
    return studentWithClasses || sug
  })

  const handleSelect = (student: Student | null) => {
    if (student) {
      // Try to find the student in allStudents to get class data (most up-to-date)
      const studentWithClasses = allStudents.find(s => s.id === student.id)
      const enrichedStudent = studentWithClasses || student
      setSelectedStudent(enrichedStudent)
      onSelect(enrichedStudent.id, enrichedStudent)
    } else {
      setSelectedStudent(null)
      onSelect(null, null)
    }
    setOpen(false)
  }

  const getStudentName = (student: Student) => {
    if (student.first_name && student.last_name) {
      return `${student.first_name} ${student.last_name}`
    }
    return student.first_name || student.email.split('@')[0]
  }

  // Filter all students by manual search
  const filteredStudents = manualSearch
    ? allStudents.filter(s => {
        const name = getStudentName(s).toLowerCase()
        const email = s.email.toLowerCase()
        const query = manualSearch.toLowerCase()
        return name.includes(query) || email.includes(query)
      })
    : allStudents

  // Combine suggestions with all students, removing duplicates
  // Use enrichedSuggestions which have class data attached
  const displayStudents = manualSearch
    ? filteredStudents
    : [...enrichedSuggestions, ...allStudents.filter(s => !enrichedSuggestions.find(sug => sug.id === s.id))]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Link to Student Account</Label>

      {/* Auto-suggestions based on name */}
      {(firstName || lastName) && enrichedSuggestions.length > 0 && !selectedStudentId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-sm text-blue-700 font-medium flex items-center gap-2">
            <User className="h-4 w-4" />
            Suggested matches for &quot;{[firstName, lastName].filter(Boolean).join(' ')}&quot;
          </p>
          <div className="flex flex-wrap gap-2">
            {enrichedSuggestions.slice(0, 3).map((student) => (
              <Button
                key={student.id}
                variant="outline"
                size="sm"
                onClick={() => handleSelect(student)}
                className="bg-white"
                disabled={disabled}
              >
                <Check className="h-3 w-3 mr-1" />
                {getStudentName(student)}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Selected student display */}
      {selectedStudentId && selectedStudent && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-green-700">
            <Link2 className="h-4 w-4" />
            <span className="text-sm font-medium">
              Linked to: {getStudentName(selectedStudent)}
            </span>
            <span className="text-xs text-green-600">({selectedStudent.email})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSelect(null)}
            disabled={disabled}
            className="text-green-700 hover:text-green-800 hover:bg-green-100"
          >
            <Link2Off className="h-4 w-4 mr-1" />
            Unlink
          </Button>
        </div>
      )}

      {/* Manual selection popover */}
      {!selectedStudentId && (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              <span className="text-muted-foreground">
                Select a student manually...
              </span>
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <div className="p-2 border-b">
              <Input
                placeholder="Search students..."
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                className="h-8"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loadingAll ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : displayStudents.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  {manualSearch ? 'No students found' : 'No students in your list'}
                </p>
              ) : (
                displayStudents.map((student) => {
                  const isSuggested = enrichedSuggestions.find(s => s.id === student.id)
                  return (
                    <button
                      key={student.id}
                      className={cn(
                        "w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center gap-2",
                        isSuggested && "bg-blue-50"
                      )}
                      onClick={() => handleSelect(student)}
                    >
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-medium">
                        {getStudentName(student).split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {getStudentName(student)}
                          {isSuggested && (
                            <span className="ml-2 text-xs text-blue-600">(suggested)</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{student.email}</p>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </PopoverContent>
        </Popover>
      )}

      <p className="text-xs text-muted-foreground">
        {selectedStudentId
          ? "This student will be able to see this grade report in their My Teachers page."
          : "Link this report to a student account so they can view it."}
      </p>
    </div>
  )
}
