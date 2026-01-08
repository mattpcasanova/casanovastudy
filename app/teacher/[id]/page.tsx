"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { FollowButton } from "@/components/follow-button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import {
  BookOpen,
  Calendar,
  GraduationCap,
  Layers,
  Brain,
  ListChecks,
  AlignLeft,
  ArrowLeft
} from "lucide-react"
import { Button } from "@/components/ui/button"

interface TeacherProfile {
  id: string
  email: string
  first_name?: string
  last_name?: string
  display_name?: string
  bio?: string
  is_profile_public?: boolean
  created_at: string
  guideCount: number
  followerCount: number
}

interface StudyGuide {
  id: string
  title: string
  subject: string
  grade_level: string
  format: string
  topic_focus?: string
  difficulty_level?: string
  file_count: number
  is_published: boolean
  published_at: string
  created_at: string
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

export default function TeacherProfilePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id: teacherId } = use(params)
  const { user } = useAuth()
  const router = useRouter()
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [guides, setGuides] = useState<StudyGuide[]>([])
  const [isFollowing, setIsFollowing] = useState(false)
  const [isSelf, setIsSelf] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTeacherProfile = async () => {
      try {
        const response = await fetch(`/api/teachers/${teacherId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch teacher profile")
        }

        setTeacher(data.teacher)
        setGuides(data.guides)
        setIsFollowing(data.isFollowing)
        setIsSelf(data.isSelf)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }

    fetchTeacherProfile()
  }, [teacherId])

  const handleFollowChange = (isNowFollowing: boolean) => {
    setIsFollowing(isNowFollowing)
    if (teacher) {
      setTeacher({
        ...teacher,
        followerCount: teacher.followerCount + (isNowFollowing ? 1 : -1)
      })
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <NavigationHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <Skeleton className="h-48 w-full rounded-lg mb-8" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </main>
      </div>
    )
  }

  if (error || !teacher) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <NavigationHeader />
        <main className="container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center py-16">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">
              {error || "Teacher not found"}
            </h1>
            <Button onClick={() => router.back()} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </main>
      </div>
    )
  }

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
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <NavigationHeader />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Teacher Profile Header */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarFallback className="bg-primary/10 text-primary text-2xl font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                      <h1 className="text-2xl font-bold text-gray-900">
                        {displayName}
                      </h1>
                      {teacher.bio && (
                        <p className="text-muted-foreground mt-1">
                          {teacher.bio}
                        </p>
                      )}
                    </div>

                    {!isSelf && (
                      <FollowButton
                        teacherId={teacher.id}
                        initialIsFollowing={isFollowing}
                        onFollowChange={handleFollowChange}
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4" />
                      <strong className="text-foreground">{teacher.guideCount}</strong>
                      {teacher.guideCount === 1 ? " guide" : " guides"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      Joined {new Date(teacher.created_at).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Published Guides */}
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              Published Study Guides
            </h2>
            <Badge variant="secondary">{guides.length} guides</Badge>
          </div>

          {guides.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No published guides yet
                </h3>
                <p className="text-muted-foreground">
                  This teacher hasn&apos;t published any study guides yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guides.map((guide) => {
                const FormatIcon = formatIcons[guide.format] || BookOpen
                const colorClass = subjectColors[guide.subject] || subjectColors.other

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
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <GraduationCap className="h-3.5 w-3.5" />
                            {guide.grade_level}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5" />
                            {new Date(guide.published_at || guide.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {guide.topic_focus && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-1">
                            {guide.topic_focus}
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
