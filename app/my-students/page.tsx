"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  Users,
  Search,
  UserPlus,
  X,
  Loader2
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
    } finally {
      setLoading(false)
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
      fetchStudents()
    }
  }, [user, authLoading, router, fetchStudents])

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
        <div className="max-w-2xl mx-auto">
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
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground mb-4">
                {students.length} {students.length === 1 ? "student" : "students"}
              </div>
              {students.map((follow) => {
                const student = follow.student
                return (
                  <Card key={follow.id} className="hover:shadow-sm transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                          {getInitials(student)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{getStudentName(student)}</p>
                          <p className="text-sm text-muted-foreground">{student.email}</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => removeStudent(student.id)}
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
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
