"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Plus, Users, ChevronRight, Archive, Loader2 } from "lucide-react"
import ClassFormDialog from "@/components/teacher-classes/class-form-dialog"

interface ClassRecord {
  id: string
  name: string
  period: string | null
  subject: string | null
  enrollment_code: string
  is_archived: boolean
  created_at: string
  student_count: number
}

export default function TeacherClassesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [classes, setClasses] = useState<ClassRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)

  const isTeacher = user?.user_type === "teacher"

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/classes?includeArchived=${showArchived ? "true" : "false"}`)
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to load classes", variant: "destructive" })
        return
      }
      setClasses(json.classes ?? [])
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [showArchived, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    if (!isTeacher) {
      router.push("/")
      return
    }
    fetchClasses()
  }, [authLoading, user, isTeacher, router, fetchClasses])

  const onCreated = (cls: { id: string }) => {
    router.push(`/teacher/classes/${cls.id}`)
  }

  if (authLoading || !user || !isTeacher) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">My Classes</h1>
            <p className="text-muted-foreground text-sm">Create classes and share the enrollment code with your students.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowArchived((s) => !s)}
            >
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? "Hide archived" : "Show archived"}
            </Button>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create class
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-40" />
            ))}
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground mb-4">You don't have any classes yet.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first class
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/teacher/classes/${cls.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="min-w-0 flex-1">
                        <h2 className="font-semibold text-lg truncate">{cls.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          {cls.period && <span>Period {cls.period}</span>}
                          {cls.period && cls.subject && <span>·</span>}
                          {cls.subject && <span>{cls.subject}</span>}
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="font-mono tracking-wider">
                          {cls.enrollment_code}
                        </Badge>
                        {cls.is_archived && (
                          <Badge variant="outline" className="text-muted-foreground">Archived</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{cls.student_count}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      <ClassFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        onSaved={onCreated}
      />
    </div>
  )
}
