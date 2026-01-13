"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  ArrowLeft,
  FileText,
  Calendar,
  Trash2,
  Loader2,
  ExternalLink,
  GraduationCap
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { ClassAssignmentDialog } from "@/components/class-assignment-dialog"
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

interface Student {
  id: string
  email?: string
  first_name?: string
  last_name?: string
}

interface GradeReport {
  id: string
  created_at: string
  student_name: string
  student_first_name?: string
  student_last_name?: string
  exam_title?: string
  class_name?: string
  class_period?: string
  total_marks: number
  total_possible_marks: number
  percentage: number
  grade: string
}

interface ClassAssignment {
  id: string
  class_name: string
  class_period?: string
}

export default function StudentDetailPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const params = useParams()
  const studentId = params.studentId as string
  const { toast } = useToast()

  const [student, setStudent] = useState<Student | null>(null)
  const [reports, setReports] = useState<GradeReport[]>([])
  const [classes, setClasses] = useState<ClassAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [reportToDelete, setReportToDelete] = useState<GradeReport | null>(null)

  const fetchStudentData = useCallback(async () => {
    if (!user || !studentId) return

    try {
      const [reportsResponse, classesResponse] = await Promise.all([
        fetch(`/api/grade-reports/student/${studentId}`),
        fetch(`/api/student-classes?studentId=${studentId}`)
      ])

      const reportsData = await reportsResponse.json()
      const classesData = await classesResponse.json()

      if (reportsResponse.ok) {
        setStudent(reportsData.student)
        setReports(reportsData.reports || [])
      } else {
        toast({
          title: "Error",
          description: reportsData.error || "Failed to fetch student data",
          variant: "destructive"
        })
        router.push("/my-students")
        return
      }

      if (classesResponse.ok) {
        setClasses(classesData.classes || [])
      }
    } catch (error) {
      console.error("Error fetching student data:", error)
      toast({
        title: "Error",
        description: "Failed to fetch student data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }, [user, studentId, router, toast])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (user && user.user_type !== "teacher") {
      router.push("/")
      return
    }

    if (user) {
      fetchStudentData()
    }
  }, [user, authLoading, router, fetchStudentData])

  const deleteReport = async (reportId: string) => {
    setDeletingId(reportId)
    try {
      const response = await fetch(`/api/grading-results/${reportId}`, {
        method: "DELETE"
      })

      if (!response.ok) {
        const data = await response.json()
        toast({
          title: "Error",
          description: data.error || "Failed to delete report",
          variant: "destructive"
        })
        return
      }

      toast({
        title: "Report deleted",
        description: "The grade report has been removed."
      })

      setReports(prev => prev.filter(r => r.id !== reportId))
    } catch (error) {
      console.error("Error deleting report:", error)
      toast({
        title: "Error",
        description: "Failed to delete report",
        variant: "destructive"
      })
    } finally {
      setDeletingId(null)
      setReportToDelete(null)
    }
  }

  const getStudentName = () => {
    if (!student) return "Student"
    if (student.first_name && student.last_name) {
      return `${student.first_name} ${student.last_name}`
    }
    if (student.first_name) {
      return student.first_name
    }
    return student.email?.split("@")[0] || "Student"
  }

  const getInitials = () => {
    const name = getStudentName()
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    })
  }

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case "A": return "text-green-600 bg-green-100"
      case "B": return "text-blue-600 bg-blue-100"
      case "C": return "text-yellow-600 bg-yellow-100"
      case "D": return "text-orange-600 bg-orange-100"
      default: return "text-red-600 bg-red-100"
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader />
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
          <div className="container mx-auto px-4 py-10">
            <Skeleton className="h-8 w-48 bg-white/20" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push("/my-students")}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="h-16 w-16 rounded-full bg-white/20 flex items-center justify-center text-2xl font-bold">
              {getInitials()}
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold">{getStudentName()}</h1>
              {student?.email && (
                <p className="text-sm opacity-75">{student.email}</p>
              )}
              {classes.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {classes.map(cls => (
                    <Badge
                      key={cls.id}
                      variant="secondary"
                      className="bg-white/20 text-white border-white/30 text-xs"
                    >
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {cls.class_name}
                      {cls.class_period && ` (${cls.class_period})`}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <ClassAssignmentDialog
              studentId={studentId}
              studentName={getStudentName()}
              onUpdate={fetchStudentData}
              trigger={
                <Button
                  variant="ghost"
                  className="bg-white/20 hover:bg-white/30 text-white border border-white/30"
                >
                  <GraduationCap className="h-4 w-4 mr-2" />
                  Manage Classes
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              Grade Reports ({reports.length})
            </h2>
          </div>

          {reports.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No grade reports yet
                </h3>
                <p className="text-muted-foreground mb-6">
                  Grade reports linked to this student will appear here.
                </p>
                <Button onClick={() => router.push("/grade-exam")}>
                  Grade an Exam
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => (
                <Card key={report.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-lg font-bold ${getGradeColor(report.grade)}`}>
                        {report.grade}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {report.exam_title || "Untitled Exam"}
                        </p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(report.created_at)}</span>
                          {report.class_name && (
                            <>
                              <span>•</span>
                              <span>{report.class_name}</span>
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {report.total_marks}/{report.total_possible_marks} ({report.percentage.toFixed(1)}%)
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          asChild
                        >
                          <Link href={`/grade-report/${report.id}`}>
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setReportToDelete(report)}
                          disabled={deletingId === report.id}
                          className="text-muted-foreground hover:text-red-600"
                        >
                          {deletingId === report.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!reportToDelete} onOpenChange={() => setReportToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Grade Report?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the grade report for &quot;{reportToDelete?.exam_title || "Untitled Exam"}&quot;.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => reportToDelete && deleteReport(reportToDelete.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
