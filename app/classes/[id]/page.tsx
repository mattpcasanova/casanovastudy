"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
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
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { ArrowLeft, Loader2, LogOut } from "lucide-react"

interface ClassRecord {
  id: string
  teacher_id: string
  name: string
  period: string | null
  subject: string | null
  is_archived: boolean
  created_at: string
}

interface TeacherProfile {
  id: string
  first_name: string | null
  last_name: string | null
  display_name: string | null
  email: string
}

function teacherDisplay(t: TeacherProfile | null): string {
  if (!t) return "Unknown teacher"
  if (t.display_name) return t.display_name
  if (t.first_name || t.last_name) return `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim()
  return t.email
}

export default function StudentClassDetailPage() {
  const params = useParams<{ id: string }>()
  const classId = params?.id
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [cls, setCls] = useState<ClassRecord | null>(null)
  const [teacher, setTeacher] = useState<TeacherProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [leaving, setLeaving] = useState(false)

  const isStudent = user?.user_type === "student"

  const fetchClass = useCallback(async () => {
    if (!classId) return
    setLoading(true)
    try {
      // Single class fetch returns redacted teacher_id; we then look up the teacher's profile
      // by reading the my-classes list (cheap; usually 1-3 entries).
      const [classRes, myClassesRes] = await Promise.all([
        fetch(`/api/classes/${classId}`),
        fetch(`/api/my-classes`),
      ])
      const classJson = await classRes.json()

      if (!classRes.ok) {
        toast({ title: classJson.error ?? "Failed to load class", variant: "destructive" })
        if (classRes.status === 403 || classRes.status === 404) {
          router.push("/my-classes")
        }
        return
      }
      setCls(classJson.class)

      if (myClassesRes.ok) {
        const myClassesJson = await myClassesRes.json()
        const match = (myClassesJson.classes ?? []).find((c: { id: string }) => c.id === classId)
        if (match?.teacher) setTeacher(match.teacher)
      }
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [classId, router, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    if (!isStudent) {
      router.push("/")
      return
    }
    fetchClass()
  }, [authLoading, user, isStudent, router, fetchClass])

  const leaveClass = async () => {
    if (!cls || !user) return
    setLeaving(true)
    try {
      const res = await fetch(`/api/classes/${cls.id}/enrollments/${user.id}`, { method: "DELETE" })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to leave class", variant: "destructive" })
        return
      }
      toast({ title: "You've left the class" })
      router.push("/my-classes")
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLeaving(false)
      setLeaveOpen(false)
    }
  }

  if (authLoading || !user || !isStudent || loading || !cls) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-6 w-32 mb-4" />
          <Skeleton className="h-10 w-72 mb-6" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <Link href="/my-classes" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-4">
          <ArrowLeft className="h-4 w-4 mr-1" />
          All classes
        </Link>

        <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold">{cls.name}</h1>
            <div className="text-muted-foreground text-sm mt-1">
              {cls.period && <span>Period {cls.period}</span>}
              {cls.period && cls.subject && <span> · </span>}
              {cls.subject && <span>{cls.subject}</span>}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Teacher: {teacherDisplay(teacher)}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => setLeaveOpen(true)} className="text-red-600 hover:text-red-700">
            <LogOut className="h-4 w-4 mr-2" />
            Leave class
          </Button>
        </div>

        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <p className="text-sm">Assignments, study guides, and grade reports for this class will appear here as your teacher posts them.</p>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={leaveOpen} onOpenChange={setLeaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this class?</AlertDialogTitle>
            <AlertDialogDescription>
              You won't see new assignments or study guides for this class. You can rejoin later with the enrollment code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaving}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={leaveClass} disabled={leaving} className="bg-red-600 hover:bg-red-700">
              {leaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Leave class
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
