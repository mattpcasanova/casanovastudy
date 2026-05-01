"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import { Plus, ChevronRight, School } from "lucide-react"

interface MyClass {
  id: string
  teacher_id: string
  name: string
  period: string | null
  subject: string | null
  is_archived: boolean
  created_at: string
  enrollment_id?: string
  joined_at?: string
  teacher: {
    id: string
    first_name: string | null
    last_name: string | null
    display_name: string | null
    email: string
  } | null
}

function teacherDisplay(t: MyClass["teacher"]): string {
  if (!t) return "Unknown teacher"
  if (t.display_name) return t.display_name
  if (t.first_name || t.last_name) return `${t.first_name ?? ""} ${t.last_name ?? ""}`.trim()
  return t.email
}

export default function MyClassesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [classes, setClasses] = useState<MyClass[]>([])
  const [loading, setLoading] = useState(true)

  const isStudent = user?.user_type === "student"

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/my-classes")
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
  }, [toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.push("/auth/signin")
      return
    }
    if (!isStudent) {
      router.push("/teacher/classes")
      return
    }
    fetchClasses()
  }, [authLoading, user, isStudent, router, fetchClasses])

  if (authLoading || !user || !isStudent) {
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
            <p className="text-muted-foreground text-sm">Classes you've joined with an enrollment code.</p>
          </div>
          <Button asChild>
            <Link href="/classes/join">
              <Plus className="h-4 w-4 mr-2" />
              Join class
            </Link>
          </Button>
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
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-muted mb-3">
                <School className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-4">You haven't joined any classes yet.</p>
              <Button asChild>
                <Link href="/classes/join">
                  <Plus className="h-4 w-4 mr-2" />
                  Join your first class
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {classes.map((cls) => (
              <Link key={cls.id} href={`/classes/${cls.id}`}>
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
                    <p className="text-sm text-muted-foreground truncate">
                      {teacherDisplay(cls.teacher)}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
