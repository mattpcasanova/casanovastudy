"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  Users,
  Search,
  UserPlus,
  X,
  Loader2,
  ChevronRight,
  Trash2,
  Check,
  GraduationCap,
  Plus,
  ArrowUpDown
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface Student {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

interface StudentFollow {
  id: string
  created_at: string
  follower_id: string
  student: Student
}

interface ClassAssignment {
  id: string
  student_id: string
  class_name: string
  class_period?: string
}

interface ExistingClass {
  class_name: string
  class_period?: string
}

export default function MyStudentsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [students, setStudents] = useState<StudentFollow[]>([])
  const [loading, setLoading] = useState(true)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<Student[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [filterQuery, setFilterQuery] = useState("")
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [isRemovingMultiple, setIsRemovingMultiple] = useState(false)
  const [bulkClassOpen, setBulkClassOpen] = useState(false)
  const [bulkClassName, setBulkClassName] = useState("")
  const [bulkClassPeriod, setBulkClassPeriod] = useState("")
  const [isAssigningClass, setIsAssigningClass] = useState(false)
  const [studentClasses, setStudentClasses] = useState<Map<string, ClassAssignment[]>>(new Map())
  const [existingClasses, setExistingClasses] = useState<ExistingClass[]>([])
  const [removingClassId, setRemovingClassId] = useState<string | null>(null)
  const [showClassSuggestions, setShowClassSuggestions] = useState(false)
  const [classFilter, setClassFilter] = useState<string>("all")
  const [periodFilter, setPeriodFilter] = useState<string>("all")
  const [sortBy, setSortBy] = useState<string>("first_name")

  // Get unique class names and periods for filter dropdowns
  const uniqueClassNames = useMemo(() => {
    const names = new Set<string>()
    existingClasses.forEach(cls => names.add(cls.class_name))
    return Array.from(names).sort()
  }, [existingClasses])

  const uniquePeriods = useMemo(() => {
    const periods = new Set<string>()
    existingClasses.forEach(cls => {
      if (cls.class_period) periods.add(cls.class_period)
    })
    return Array.from(periods).sort((a, b) => {
      const numA = parseInt(a)
      const numB = parseInt(b)
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB
      return a.localeCompare(b)
    })
  }, [existingClasses])

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let result = [...students]

    // Filter by search query
    if (filterQuery.trim()) {
      const query = filterQuery.toLowerCase()
      result = result.filter(follow => {
        const student = follow.student
        const name = (student.first_name && student.last_name)
          ? `${student.first_name} ${student.last_name}`
          : student.first_name || student.email.split("@")[0]
        return name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query)
      })
    }

    // Filter by class
    if (classFilter !== "all") {
      result = result.filter(follow => {
        const classes = studentClasses.get(follow.student.id) || []
        return classes.some(cls => cls.class_name === classFilter)
      })
    }

    // Filter by period
    if (periodFilter !== "all") {
      result = result.filter(follow => {
        const classes = studentClasses.get(follow.student.id) || []
        return classes.some(cls => cls.class_period === periodFilter)
      })
    }

    // Sort
    result.sort((a, b) => {
      const studentA = a.student
      const studentB = b.student

      if (sortBy === "last_name") {
        const lastA = studentA.last_name || studentA.first_name || studentA.email.split("@")[0]
        const lastB = studentB.last_name || studentB.first_name || studentB.email.split("@")[0]
        return lastA.localeCompare(lastB)
      } else {
        const firstA = studentA.first_name || studentA.email.split("@")[0]
        const firstB = studentB.first_name || studentB.email.split("@")[0]
        return firstA.localeCompare(firstB)
      }
    })

    return result
  }, [students, filterQuery, classFilter, periodFilter, sortBy, studentClasses])

  const fetchStudents = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch(`/api/my-students?teacherId=${user.id}`)
      const data = await response.json()

      if (response.ok) {
        setStudents(data.students || [])
      }
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }, [user])

  // Sort classes by period (numeric) first, then alphabetically
  const sortClasses = (classes: ExistingClass[]) => {
    return [...classes].sort((a, b) => {
      // Extract numeric period if available
      const periodA = a.class_period ? parseInt(a.class_period) : null
      const periodB = b.class_period ? parseInt(b.class_period) : null

      // If both have numeric periods, sort by period
      if (periodA !== null && !isNaN(periodA) && periodB !== null && !isNaN(periodB)) {
        return periodA - periodB
      }
      // If only one has a period, prioritize the one with period
      if (periodA !== null && !isNaN(periodA)) return -1
      if (periodB !== null && !isNaN(periodB)) return 1

      // Fall back to alphabetical by class name
      return a.class_name.localeCompare(b.class_name)
    })
  }

  const fetchClasses = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch("/api/student-classes")
      const data = await response.json()

      if (response.ok) {
        const classes: ClassAssignment[] = data.classes || []

        // Group by student ID
        const classMap = new Map<string, ClassAssignment[]>()
        classes.forEach(cls => {
          const existing = classMap.get(cls.student_id) || []
          classMap.set(cls.student_id, [...existing, cls])
        })
        setStudentClasses(classMap)

        // Extract unique class names for suggestions
        const uniqueClasses = new Map<string, ExistingClass>()
        classes.forEach(cls => {
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
      console.error("Error fetching classes:", error)
    }
  }, [user])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    // Only teachers can access this page
    if (user && user.user_type !== "teacher") {
      router.push("/")
      return
    }

    if (user) {
      Promise.all([fetchStudents(), fetchClasses()]).finally(() => {
        setLoading(false)
      })
    }
  }, [user, authLoading, router, fetchStudents, fetchClasses])

  const searchStudents = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const response = await fetch(`/api/students/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (response.ok) {
        // Filter out students already added
        const existingIds = new Set(students.map(s => s.student.id))
        setSearchResults((data.students || []).filter((s: Student) => !existingIds.has(s.id)))
      }
    } catch (error) {
      console.error("Error searching students:", error)
    } finally {
      setSearching(false)
    }
  }

  const handleSearchChange = (value: string) => {
    setSearchQuery(value)
    // Debounce search
    const timeoutId = setTimeout(() => {
      searchStudents(value)
    }, 300)
    return () => clearTimeout(timeoutId)
  }

  const addStudent = async (studentId: string) => {
    if (!user) return

    setAddingId(studentId)
    try {
      const response = await fetch("/api/my-students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teacherId: user.id,
          studentId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        toast({
          title: "Error",
          description: data.error || "Failed to add student",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Student added",
        description: "The student can now see your study guides."
      })

      // Refresh the list
      fetchStudents()
      // Remove from search results
      setSearchResults(prev => prev.filter(s => s.id !== studentId))
    } catch (error) {
      console.error("Error adding student:", error)
      toast({
        title: "Error",
        description: "Failed to add student",
        variant: "destructive"
      })
    } finally {
      setAddingId(null)
    }
  }

  const removeStudent = async (studentId: string) => {
    if (!user) return

    setRemovingId(studentId)
    try {
      const response = await fetch(
        `/api/my-students/${studentId}?teacherId=${user.id}`,
        { method: "DELETE" }
      )

      if (!response.ok) {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to remove student",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Student removed",
        description: "The student will no longer see your study guides."
      })

      // Remove from list
      setStudents(prev => prev.filter(s => s.student.id !== studentId))
      // Also remove from selection
      setSelectedIds(prev => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })
    } catch (error) {
      console.error("Error removing student:", error)
      toast({
        title: "Error",
        description: "Failed to remove student",
        variant: "destructive"
      })
    } finally {
      setRemovingId(null)
    }
  }

  const toggleSelect = (studentId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) {
        next.delete(studentId)
      } else {
        next.add(studentId)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredStudents.map(f => f.student.id)))
    }
  }

  const removeSelectedStudents = async () => {
    if (!user || selectedIds.size === 0) return

    setIsRemovingMultiple(true)
    const idsToRemove = Array.from(selectedIds)
    let successCount = 0

    for (const studentId of idsToRemove) {
      try {
        const response = await fetch(
          `/api/my-students/${studentId}?teacherId=${user.id}`,
          { method: "DELETE" }
        )
        if (response.ok) {
          successCount++
        }
      } catch (error) {
        console.error("Error removing student:", error)
      }
    }

    if (successCount > 0) {
      toast({
        title: `${successCount} student${successCount > 1 ? 's' : ''} removed`,
        description: "The students will no longer see your study guides."
      })
      // Refresh the list
      fetchStudents()
      setSelectedIds(new Set())
    }

    setIsRemovingMultiple(false)
  }

  const assignSelectedToClass = async () => {
    if (!user || selectedIds.size === 0 || !bulkClassName.trim()) return

    setIsAssigningClass(true)
    const idsToAssign = Array.from(selectedIds)
    let successCount = 0

    for (const studentId of idsToAssign) {
      try {
        const response = await fetch("/api/student-classes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            studentId,
            className: bulkClassName.trim(),
            classPeriod: bulkClassPeriod.trim() || null
          })
        })
        if (response.ok) {
          successCount++
        }
      } catch (error) {
        console.error("Error assigning class:", error)
      }
    }

    if (successCount > 0) {
      // Immediately add to existing classes if it's new
      const newClassKey = `${bulkClassName.trim()}|${bulkClassPeriod.trim() || ''}`
      const alreadyExists = existingClasses.some(
        cls => `${cls.class_name}|${cls.class_period || ''}` === newClassKey
      )
      if (!alreadyExists) {
        setExistingClasses(prev => sortClasses([...prev, {
          class_name: bulkClassName.trim(),
          class_period: bulkClassPeriod.trim() || undefined
        }]))
      }

      toast({
        title: `${successCount} student${successCount > 1 ? 's' : ''} assigned`,
        description: `Added to ${bulkClassName}${bulkClassPeriod ? ` (${bulkClassPeriod})` : ''}`
      })
      setBulkClassOpen(false)
      setBulkClassName("")
      setBulkClassPeriod("")
      setSelectedIds(new Set())
      // Refresh classes to show new assignments
      fetchClasses()
    }

    setIsAssigningClass(false)
  }

  const removeClass = async (classId: string, className: string) => {
    setRemovingClassId(classId)
    try {
      const response = await fetch(`/api/student-classes/${classId}`, {
        method: "DELETE"
      })

      if (response.ok) {
        toast({
          title: "Class removed",
          description: `Removed from ${className}`
        })
        // Refresh classes
        fetchClasses()
      } else {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to remove class",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error("Error removing class:", error)
      toast({
        title: "Error",
        description: "Failed to remove class",
        variant: "destructive"
      })
    } finally {
      setRemovingClassId(null)
    }
  }

  // Filter suggestions based on input
  const filteredClassSuggestions = useMemo(() => {
    if (!bulkClassName.trim()) return existingClasses
    const query = bulkClassName.toLowerCase()
    return existingClasses.filter(cls =>
      cls.class_name.toLowerCase().includes(query)
    )
  }, [bulkClassName, existingClasses])

  // Get current classes for all selected students (intersection - classes they ALL share)
  const selectedStudentsCurrentClasses = useMemo(() => {
    if (selectedIds.size === 0) return []

    const selectedStudentIds = Array.from(selectedIds)

    // Get all class assignments for selected students
    const allAssignments: ClassAssignment[] = []
    selectedStudentIds.forEach(studentId => {
      const classes = studentClasses.get(studentId) || []
      allAssignments.push(...classes)
    })

    // Count how many students have each class
    const classCount = new Map<string, { count: number; cls: ClassAssignment }>()
    allAssignments.forEach(cls => {
      const key = `${cls.class_name}|${cls.class_period || ''}`
      const existing = classCount.get(key)
      if (existing) {
        existing.count++
      } else {
        classCount.set(key, { count: 1, cls })
      }
    })

    // Return classes that ALL selected students share, sorted
    const sharedClasses = Array.from(classCount.values())
      .filter(item => item.count === selectedStudentIds.length)
      .map(item => item.cls)

    return sortClasses(sharedClasses.map(c => ({
      class_name: c.class_name,
      class_period: c.class_period
    })))
  }, [selectedIds, studentClasses])

  const getStudentName = (student: Student) => {
    if (student.first_name && student.last_name) {
      return `${student.first_name} ${student.last_name}`
    }
    if (student.first_name) {
      return student.first_name
    }
    return student.email.split("@")[0]
  }

  const getInitials = (student: Student) => {
    const name = getStudentName(student)
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader />
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
          <div className="container mx-auto px-4 py-10">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">My Students</h1>
              <p className="text-sm sm:text-base opacity-75">
                Manage students who can access your study guides
              </p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user || user.user_type !== "teacher") {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="relative">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">My Students</h1>
              <p className="text-sm sm:text-base opacity-75">
                Manage students who can access your study guides
              </p>
            </div>
            <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 absolute top-0 right-0 hidden sm:flex"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogTrigger asChild>
                <Button
                  size="lg"
                  className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 mt-4 sm:hidden w-full"
                >
                  <UserPlus className="h-5 w-5 mr-2" />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Add a Student</DialogTitle>
                  <DialogDescription>
                    Search for students by name or email address to add them to your class.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or email..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {searching && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {!searching && searchQuery && searchResults.length === 0 && (
                    <p className="text-center text-muted-foreground py-4">
                      No students found
                    </p>
                  )}

                  {!searching && searchResults.length > 0 && (
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {searchResults.map((student) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                              {getInitials(student)}
                            </div>
                            <div>
                              <p className="font-medium">{getStudentName(student)}</p>
                              <p className="text-sm text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => addStudent(student.id)}
                            disabled={addingId === student.id}
                          >
                            {addingId === student.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Add"
                            )}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {students.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No students yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Add students so they can access your study guides.
                </p>
                <Button onClick={() => setSearchOpen(true)}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Student
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {/* Header with count, search, and add button */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {students.length} {students.length === 1 ? "student" : "students"}
                  </span>
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Filter students..."
                      value={filterQuery}
                      onChange={(e) => setFilterQuery(e.target.value)}
                      className="pl-10 h-9 bg-white shadow-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {selectedIds.size > 0 && (
                    <>
                      <Dialog open={bulkClassOpen} onOpenChange={setBulkClassOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline">
                            <GraduationCap className="h-4 w-4 mr-2" />
                            Assign to Class
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                          <DialogHeader>
                            <DialogTitle>Class Assignments</DialogTitle>
                            <DialogDescription>
                              Manage class assignments for {selectedIds.size} selected student{selectedIds.size > 1 ? 's' : ''}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            {/* Current classes for selected students */}
                            <div>
                              <Label className="text-sm font-medium mb-2 block">Current Classes</Label>
                              {selectedStudentsCurrentClasses.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-2">
                                  No shared classes{selectedIds.size > 1 ? ' among selected students' : ''}
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-2">
                                  {selectedStudentsCurrentClasses.map((cls, idx) => (
                                    <Badge
                                      key={idx}
                                      variant="secondary"
                                      className="flex items-center gap-1"
                                    >
                                      <GraduationCap className="h-3 w-3" />
                                      {cls.class_name}
                                      {cls.class_period && (
                                        <span className="text-muted-foreground">
                                          ({cls.class_period})
                                        </span>
                                      )}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Add to class section */}
                            <div className="border-t pt-4 space-y-3">
                              <Label className="text-sm font-medium block">Add to Class</Label>

                              {/* Existing classes as quick select */}
                              {existingClasses.length > 0 && (
                                <div>
                                  <p className="text-xs text-muted-foreground mb-2">Select existing class:</p>
                                  <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto">
                                    {existingClasses.map((cls, idx) => (
                                      <Button
                                        key={idx}
                                        variant={bulkClassName === cls.class_name && bulkClassPeriod === (cls.class_period || '') ? "default" : "outline"}
                                        size="sm"
                                        onClick={() => {
                                          setBulkClassName(cls.class_name)
                                          setBulkClassPeriod(cls.class_period || '')
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

                              {/* Or create new */}
                              <div>
                                <p className="text-sm font-medium mb-2">
                                  {existingClasses.length > 0 ? 'Or create new class:' : 'Class details:'}
                                </p>
                                <div className="flex gap-2">
                                  <div className="flex-1 relative">
                                    <Input
                                      placeholder="Class name (e.g. Algebra)"
                                      value={bulkClassName}
                                      onChange={(e) => {
                                        setBulkClassName(e.target.value)
                                        setShowClassSuggestions(true)
                                      }}
                                      onFocus={() => setShowClassSuggestions(true)}
                                      onBlur={() => setTimeout(() => setShowClassSuggestions(false), 150)}
                                    />
                                    {/* Autocomplete dropdown */}
                                    {showClassSuggestions && bulkClassName && filteredClassSuggestions.length > 0 && (
                                      <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-32 overflow-y-auto">
                                        {filteredClassSuggestions.map((cls, idx) => (
                                          <button
                                            key={idx}
                                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
                                            onMouseDown={(e) => {
                                              e.preventDefault()
                                              setBulkClassName(cls.class_name)
                                              setBulkClassPeriod(cls.class_period || '')
                                              setShowClassSuggestions(false)
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
                                    value={bulkClassPeriod}
                                    onChange={(e) => setBulkClassPeriod(e.target.value)}
                                    className="w-20"
                                  />
                                  <Button
                                    onClick={assignSelectedToClass}
                                    disabled={isAssigningClass || !bulkClassName.trim()}
                                    size="icon"
                                  >
                                    {isAssigningClass ? (
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
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={removeSelectedStudents}
                        disabled={isRemovingMultiple}
                      >
                        {isRemovingMultiple ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Trash2 className="h-4 w-4 mr-2" />
                        )}
                        Remove {selectedIds.size}
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    onClick={() => setSearchOpen(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Student
                  </Button>
                </div>
              </div>

              {/* Filter and Sort Row */}
              {(existingClasses.length > 0 || students.length > 1) && (
                <div className="flex flex-wrap items-center gap-3 bg-white rounded-lg border p-3">
                  {uniqueClassNames.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Class:</Label>
                      <Select value={classFilter} onValueChange={setClassFilter}>
                        <SelectTrigger className="w-[140px] h-8">
                          <SelectValue placeholder="All Classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {uniqueClassNames.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {uniquePeriods.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-muted-foreground whitespace-nowrap">Period:</Label>
                      <Select value={periodFilter} onValueChange={setPeriodFilter}>
                        <SelectTrigger className="w-[100px] h-8">
                          <SelectValue placeholder="All" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All</SelectItem>
                          {uniquePeriods.map((period) => (
                            <SelectItem key={period} value={period}>{period}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex items-center gap-2 ml-auto">
                    <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                    <Label className="text-sm text-muted-foreground whitespace-nowrap">Sort:</Label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[130px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="first_name">First Name</SelectItem>
                        <SelectItem value="last_name">Last Name</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Select all checkbox */}
              {filteredStudents.length > 0 && (
                <div className="flex items-center gap-3 px-1">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all cursor-pointer ${
                      selectedIds.size === filteredStudents.length
                        ? 'bg-blue-100'
                        : 'bg-transparent hover:bg-gray-100'
                    }`}
                    onClick={toggleSelectAll}
                  >
                    <div
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
                        selectedIds.size === filteredStudents.length
                          ? 'bg-blue-500 border-blue-500 shadow-md'
                          : 'bg-white border-gray-300 shadow-sm hover:border-gray-400'
                      }`}
                    >
                      {selectedIds.size === filteredStudents.length && (
                        <Check className="h-3.5 w-3.5 text-white" />
                      )}
                    </div>
                  </div>
                  <span
                    className="text-sm text-muted-foreground cursor-pointer"
                    onClick={toggleSelectAll}
                  >
                    Select all
                  </span>
                </div>
              )}

              {/* Student list */}
              <div className="space-y-3">
                {filteredStudents.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No students match your filter
                  </p>
                ) : (
                  filteredStudents.map((follow) => {
                    const student = follow.student
                    const isSelected = selectedIds.has(student.id)
                    const classes = studentClasses.get(student.id) || []
                    return (
                      <Card key={follow.id} className={`hover:shadow-md transition-all group ${isSelected ? 'ring-2 ring-blue-500 bg-blue-50/50' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-4">
                            <div
                              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all cursor-pointer shrink-0 mt-1 ${
                                isSelected
                                  ? 'bg-blue-100'
                                  : 'bg-transparent hover:bg-gray-100'
                              }`}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                toggleSelect(student.id)
                              }}
                            >
                              <div
                                className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
                                  isSelected
                                    ? 'bg-blue-500 border-blue-500 shadow-md'
                                    : 'bg-white border-gray-300 shadow-sm group-hover:border-gray-400'
                                }`}
                              >
                                {isSelected && <Check className="h-4 w-4 text-white" />}
                              </div>
                            </div>
                            <Link href={`/my-students/${student.id}`} className="flex items-center gap-4 flex-1 min-w-0">
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium shrink-0">
                                {getInitials(student)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">{getStudentName(student)}</p>
                                <p className="text-sm text-muted-foreground truncate">{student.email}</p>
                                {classes.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-2">
                                    {classes.map((cls) => (
                                      <Badge
                                        key={cls.id}
                                        variant="secondary"
                                        className="flex items-center gap-1 pr-1 text-xs"
                                      >
                                        <GraduationCap className="h-3 w-3" />
                                        {cls.class_name}
                                        {cls.class_period && (
                                          <span className="text-muted-foreground">
                                            ({cls.class_period})
                                          </span>
                                        )}
                                        <button
                                          className="ml-1 h-4 w-4 rounded-full hover:bg-destructive/20 flex items-center justify-center"
                                          onClick={(e) => {
                                            e.preventDefault()
                                            e.stopPropagation()
                                            removeClass(cls.id, cls.class_name)
                                          }}
                                          disabled={removingClassId === cls.id}
                                        >
                                          {removingClassId === cls.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : (
                                            <X className="h-3 w-3" />
                                          )}
                                        </button>
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </Link>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeStudent(student.id)
                                }}
                                disabled={removingId === student.id}
                              >
                                {removingId === student.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <X className="h-4 w-4 mr-1" />
                                    Remove
                                  </>
                                )}
                              </Button>
                              <Link href={`/my-students/${student.id}`}>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
