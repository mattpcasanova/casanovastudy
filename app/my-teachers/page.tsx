"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { TeacherSearchDialog } from "@/components/teacher-search-dialog"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAuth } from "@/lib/auth"
import {
  BookOpen,
  Users,
  Calendar,
  GraduationCap,
  Layers,
  Brain,
  ListChecks,
  AlignLeft,
  Search,
  UserPlus,
  FileText
} from "lucide-react"

interface StudyGuide {
  id: string
  title: string
  subject: string
  grade_level: string
  format: string
  topic_focus?: string
  difficulty_level?: string
  file_count: number
  created_at: string
  user_id: string
  user_profiles?: {
    id: string
    first_name?: string
    last_name?: string
    display_name?: string
  }
}

interface SavedTeacher {
  id: string
  created_at: string
  teacher: {
    id: string
    email: string
    first_name?: string
    last_name?: string
    display_name?: string
    bio?: string
  }
}

interface GradeReport {
  id: string
  created_at: string
  user_id: string
  exam_title?: string
  class_name?: string
  class_period?: string
  total_marks: number
  total_possible_marks: number
  percentage: number
  grade: string
  teacher: {
    first_name?: string
    last_name?: string
    email: string
  }
}

const formatIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  outline: AlignLeft,
  flashcards: Layers,
  quiz: ListChecks,
  summary: Brain,
  custom: BookOpen
}

const subjectColors: Record<string, string> = {
  mathematics: "bg-blue-100 text-blue-800 border-blue-300",
  science: "bg-green-100 text-green-800 border-green-300",
  english: "bg-purple-100 text-purple-800 border-purple-300",
  history: "bg-amber-100 text-amber-800 border-amber-300",
  "foreign-language": "bg-pink-100 text-pink-800 border-pink-300",
  other: "bg-gray-100 text-gray-800 border-gray-300"
}

export default function MyTeachersPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [guides, setGuides] = useState<StudyGuide[]>([])
  const [savedTeachers, setSavedTeachers] = useState<SavedTeacher[]>([])
  const [gradeReports, setGradeReports] = useState<GradeReport[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("feed")

  const fetchFeed = useCallback(async () => {
    try {
      const response = await fetch("/api/follows/feed")
      const data = await response.json()

      if (response.ok) {
        setGuides(data.guides || [])
      }
    } catch (error) {
      console.error("Error fetching feed:", error)
    }
  }, [])

  const fetchSavedTeachers = useCallback(async () => {
    try {
      const response = await fetch("/api/follows")
      const data = await response.json()

      if (response.ok) {
        setSavedTeachers(data.follows || [])
      }
    } catch (error) {
      console.error("Error fetching saved teachers:", error)
    }
  }, [])

  const fetchGradeReports = useCallback(async () => {
    try {
      const response = await fetch("/api/my-grade-reports")
      const data = await response.json()

      if (response.ok) {
        setGradeReports(data.reports || [])
      }
    } catch (error) {
      console.error("Error fetching grade reports:", error)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth/signin")
      return
    }

    if (user) {
      Promise.all([fetchFeed(), fetchSavedTeachers(), fetchGradeReports()]).finally(() => {
        setLoading(false)
      })
    }
  }, [user, authLoading, router, fetchFeed, fetchSavedTeachers, fetchGradeReports])

  const handleTeacherChange = (teacherId: string, isAdded: boolean) => {
    if (!isAdded) {
      setSavedTeachers((prev) =>
        prev.filter((f) => f.teacher.id !== teacherId)
      )
      // Also refresh the feed to remove guides from removed teacher
      fetchFeed()
    } else {
      // Refresh both lists
      fetchSavedTeachers()
      fetchFeed()
    }
  }

  const savedTeacherIds = savedTeachers.map((f) => f.teacher.id)

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <NavigationHeader />
        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
          <div className="container mx-auto px-4 py-10">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">My Teachers</h1>
              <p className="text-sm sm:text-base opacity-75">
                View study guides from teachers you follow
              </p>
            </div>
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-40 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const getTeacherName = (guide: StudyGuide) => {
    const profile = guide.user_profiles
    if (!profile) return "Unknown Teacher"
    return (
      profile.display_name ||
      (profile.first_name && profile.last_name
        ? `${profile.first_name} ${profile.last_name}`
        : profile.first_name || "Unknown Teacher")
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <NavigationHeader />

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-primary via-secondary to-accent text-white">
        <div className="container mx-auto px-4 py-10">
          <div className="relative">
            <div className="text-center">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-1">My Teachers</h1>
              <p className="text-sm sm:text-base opacity-75">
                View study guides from teachers you follow
              </p>
            </div>
            <TeacherSearchDialog
              trigger={
                <Button size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 absolute top-0 right-0 hidden sm:flex">
                  <Search className="h-5 w-5 mr-2" />
                  Find Teachers
                </Button>
              }
              followedTeacherIds={savedTeacherIds}
              onFollowChange={handleTeacherChange}
            />
            <TeacherSearchDialog
              trigger={
                <Button size="lg" className="bg-white/20 hover:bg-white/30 text-white border-2 border-white/50 mt-4 sm:hidden w-full">
                  <Search className="h-5 w-5 mr-2" />
                  Find Teachers
                </Button>
              }
              followedTeacherIds={savedTeacherIds}
              onFollowChange={handleTeacherChange}
            />
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList>
              <TabsTrigger value="feed" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Study Guides
                {guides.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {guides.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="teachers" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Teachers
                {savedTeachers.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {savedTeachers.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="grades" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Grade Reports
                {gradeReports.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {gradeReports.length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="feed" className="mt-6">
              {savedTeachers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Add teachers to see their guides
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      When you add teachers, their study guides will appear here.
                    </p>
                    <TeacherSearchDialog
                      trigger={
                        <Button>
                          <Search className="h-4 w-4 mr-2" />
                          Find Teachers
                        </Button>
                      }
                      followedTeacherIds={savedTeacherIds}
                      onFollowChange={handleTeacherChange}
                    />
                  </CardContent>
                </Card>
              ) : guides.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No guides yet
                    </h3>
                    <p className="text-muted-foreground">
                      Your teachers haven&apos;t created any study guides yet.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {guides.map((guide) => {
                    const FormatIcon = formatIcons[guide.format] || BookOpen
                    const colorClass =
                      subjectColors[guide.subject] || subjectColors.other

                    return (
                      <Link key={guide.id} href={`/study-guide/${guide.id}`}>
                        <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                          <CardHeader className="pb-2">
                            <div className="flex items-start justify-between gap-2">
                              <Badge
                                variant="outline"
                                className={`${colorClass} capitalize text-xs`}
                              >
                                {guide.subject.replace("-", " ")}
                              </Badge>
                              <FormatIcon className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <CardTitle className="text-base font-semibold line-clamp-2 mt-2">
                              {guide.title}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <Link
                              href={`/teacher/${guide.user_id}`}
                              className="text-sm text-primary hover:underline"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {getTeacherName(guide)}
                            </Link>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                              <span className="flex items-center gap-1">
                                <GraduationCap className="h-3.5 w-3.5" />
                                {guide.grade_level}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                {new Date(guide.created_at).toLocaleDateString()}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="teachers" className="mt-6">
              {savedTeachers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No teachers added yet
                    </h3>
                    <p className="text-muted-foreground mb-6">
                      Find and add teachers to get their study guides.
                    </p>
                    <TeacherSearchDialog
                      trigger={
                        <Button>
                          <Search className="h-4 w-4 mr-2" />
                          Find Teachers
                        </Button>
                      }
                      followedTeacherIds={savedTeacherIds}
                      onFollowChange={handleTeacherChange}
                    />
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {savedTeachers.map((saved) => {
                    const teacher = saved.teacher
                    const displayName =
                      teacher.display_name ||
                      (teacher.first_name && teacher.last_name
                        ? `${teacher.first_name} ${teacher.last_name}`
                        : teacher.first_name || teacher.email.split("@")[0])

                    const initials = displayName
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)

                    return (
                      <Card
                        key={saved.id}
                        className="hover:shadow-sm transition-shadow"
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center gap-4">
                            <Link href={`/teacher/${teacher.id}`}>
                              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium cursor-pointer hover:bg-primary/20 transition-colors">
                                {initials}
                              </div>
                            </Link>
                            <div className="flex-1">
                              <Link
                                href={`/teacher/${teacher.id}`}
                                className="font-semibold hover:text-primary transition-colors"
                              >
                                {displayName}
                              </Link>
                              {teacher.bio && (
                                <p className="text-sm text-muted-foreground line-clamp-1">
                                  {teacher.bio}
                                </p>
                              )}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleTeacherChange(teacher.id, false)}
                            >
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="grades" className="mt-6">
              {gradeReports.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No grade reports yet
                    </h3>
                    <p className="text-muted-foreground">
                      When teachers grade your exams and link them to your account, they&apos;ll appear here.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {gradeReports.map((report) => {
                    const teacherName = report.teacher.first_name && report.teacher.last_name
                      ? `${report.teacher.first_name} ${report.teacher.last_name}`
                      : report.teacher.first_name || report.teacher.email.split("@")[0]

                    const gradeColor = (() => {
                      switch (report.grade) {
                        case "A": return "text-green-600 bg-green-100"
                        case "B": return "text-blue-600 bg-blue-100"
                        case "C": return "text-yellow-600 bg-yellow-100"
                        case "D": return "text-orange-600 bg-orange-100"
                        default: return "text-red-600 bg-red-100"
                      }
                    })()

                    return (
                      <Link key={report.id} href={`/grade-report/${report.id}`}>
                        <Card className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-4">
                              <div className={`h-12 w-12 rounded-lg flex items-center justify-center text-lg font-bold ${gradeColor}`}>
                                {report.grade}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold truncate">
                                  {report.exam_title || "Untitled Exam"}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  From {teacherName}
                                </p>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                                  <Calendar className="h-3 w-3" />
                                  <span>{new Date(report.created_at).toLocaleDateString()}</span>
                                  <span>•</span>
                                  <span>{report.total_marks}/{report.total_possible_marks} ({report.percentage.toFixed(1)}%)</span>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    )
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
      </div>
    </div>
  )
}
