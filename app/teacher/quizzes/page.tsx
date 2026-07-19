"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import CreateAssignmentDialog from "@/components/teacher-assignments/create-assignment-dialog"
import { useAuth } from "@/lib/auth"
import { Target, Plus, Library, ChevronRight, Users, CheckCircle2, ArrowRight } from "lucide-react"

interface AssignmentRow {
  id: string
  type?: "file_upload" | "mastery_quiz"
  title: string
  description?: string | null
  classes?: { id: string; name: string }[]
  submission_stats?: { total?: number; graded?: number; pending?: number }
  created_at?: string
}

interface ConceptCount {
  id: string
  name: string
  approved_count: number
  suggested_count: number
}

export default function QuizzesPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const [quizzes, setQuizzes] = useState<AssignmentRow[]>([])
  const [concepts, setConcepts] = useState<ConceptCount[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)

  // Teachers only — bounce students back home.
  useEffect(() => {
    if (!authLoading && user && user.user_type !== "teacher") {
      router.replace("/")
    }
  }, [authLoading, user, router])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, cRes] = await Promise.all([
        fetch("/api/assignments"),
        fetch("/api/concepts"),
      ])
      const aJson = await aRes.json().catch(() => ({}))
      const cJson = await cRes.json().catch(() => ({}))
      const all: AssignmentRow[] = Array.isArray(aJson.assignments) ? aJson.assignments : []
      setQuizzes(all.filter((a) => a.type === "mastery_quiz"))
      setConcepts(Array.isArray(cJson.concepts) ? cJson.concepts : [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.user_type === "teacher") load()
  }, [user, load])

  const readyConcepts = concepts.filter((c) => c.approved_count > 0).length
  const pendingSuggestions = concepts.reduce((s, c) => s + (c.suggested_count || 0), 0)
  const bankReady = readyConcepts > 0

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8">
        <ClassesSectionNav />

        {/* Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quizzes</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Adaptive quizzes built from your question bank. Students loop through concept-tagged
              questions until they master each one — and you get live progress and per-question insights.
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Create quiz
          </Button>
        </div>

        {/* How it works / readiness */}
        <div className="mb-8 grid gap-3 sm:grid-cols-2">
          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                1
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Library className="h-3.5 w-3.5 text-muted-foreground" /> Build your question bank
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {concepts.length === 0
                    ? "Create concepts, then add questions — AI-suggested or written by you. Approve the ones you want students to see."
                    : (
                      <>
                        <span className={bankReady ? "font-medium text-foreground" : "font-medium text-amber-700"}>
                          {readyConcepts} of {concepts.length}
                        </span>{" "}
                        concepts have approved questions
                        {pendingSuggestions > 0 && ` · ${pendingSuggestions} awaiting review`}.
                      </>
                    )}
                </p>
                <Link
                  href="/teacher/question-bank"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                >
                  Manage Question Bank <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-start gap-3 p-4">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                2
              </span>
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-medium">
                  <Target className="h-3.5 w-3.5 text-muted-foreground" /> Create &amp; assign a quiz
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Pick the concepts to cover, choose a class, and set the mastery threshold. Students
                  keep going until every concept is mastered.
                </p>
                {!bankReady ? (
                  <p className="mt-1.5 text-xs font-medium text-amber-700">
                    Approve at least one question first so a quiz has something to serve.
                  </p>
                ) : (
                  <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Ready to create
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quiz list */}
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Your quizzes</h2>
        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : quizzes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Target className="h-6 w-6 text-primary" />
              </span>
              <div>
                <p className="font-medium">No quizzes yet</p>
                <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
                  Create your first adaptive quiz. Once you assign it to a class, this is where you&apos;ll
                  track mastery progress and question-level insights.
                </p>
              </div>
              <Button onClick={() => setCreateOpen(true)} className="mt-1">
                <Plus className="mr-2 h-4 w-4" /> Create quiz
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {quizzes.map((q) => {
              const classNames = (q.classes ?? []).map((c) => c.name).filter(Boolean)
              const submitted = q.submission_stats?.total ?? 0
              return (
                <Link key={q.id} href={`/teacher/assignments/${q.id}`} className="block">
                  <Card className="transition-colors hover:border-primary/40 hover:bg-accent/30">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate font-medium">{q.title}</p>
                          <Badge variant="secondary" className="shrink-0 text-[10px]">
                            <Target className="mr-0.5 h-3 w-3" /> Mastery
                          </Badge>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {classNames.length ? classNames.join(", ") : "Not assigned to a class"}
                          {submitted > 0 && (
                            <span className="ml-2 inline-flex items-center gap-1">
                              <Users className="h-3 w-3" /> {submitted} submitted
                            </span>
                          )}
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}

        <CreateAssignmentDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          mode="create"
          defaultType="mastery_quiz"
          onSaved={() => {
            setCreateOpen(false)
            load()
          }}
        />
      </div>
    </div>
  )
}
