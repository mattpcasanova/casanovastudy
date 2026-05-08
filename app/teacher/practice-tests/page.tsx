"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useAuth } from "@/lib/auth"
import { useToast } from "@/hooks/use-toast"
import {
  Plus,
  ChevronRight,
  Loader2,
  ClipboardCheck,
  Copy,
  Check,
  Users,
} from "lucide-react"

interface TestRow {
  id: string
  title: string
  description: string | null
  share_token: string
  results_share_token: string
  is_active: boolean
  question_count: number
  submission_count: number
  avg_score_pct: number | null
  created_at: string
  updated_at: string
}

function originUrl(): string {
  if (typeof window === "undefined") return ""
  return window.location.origin
}

function CopyLinkButton({ url, label }: { url: string; label: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async (e) => {
        e.preventDefault()
        e.stopPropagation()
        try {
          await navigator.clipboard.writeText(url)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          // ignore
        }
      }}
    >
      {copied ? <Check className="h-3.5 w-3.5 mr-1.5" /> : <Copy className="h-3.5 w-3.5 mr-1.5" />}
      {copied ? "Copied" : label}
    </Button>
  )
}

export default function TeacherPracticeTestsPage() {
  const { user, loading: authLoading } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [tests, setTests] = useState<TestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [creating, setCreating] = useState(false)

  const isTeacher = user?.user_type === "teacher"

  const fetchTests = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/practice-tests")
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to load practice tests", variant: "destructive" })
        return
      }
      setTests(json.tests ?? [])
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
    if (!isTeacher) {
      router.push("/")
      return
    }
    fetchTests()
  }, [authLoading, user, isTeacher, router, fetchTests])

  const onCreate = async () => {
    const title = createTitle.trim()
    if (!title) {
      toast({ title: "Please enter a title", variant: "destructive" })
      return
    }
    setCreating(true)
    try {
      const res = await fetch("/api/practice-tests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description: createDescription.trim() || null }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to create", variant: "destructive" })
        return
      }
      setCreateOpen(false)
      setCreateTitle("")
      setCreateDescription("")
      router.push(`/teacher/practice-tests/${json.test.id}`)
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setCreating(false)
    }
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
        <ClassesSectionNav />
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-bold">Practice Tests</h1>
            <p className="text-muted-foreground text-sm">
              Anonymous, link-based MC quizzes. Scores aggregate by AP Chem Big Idea (1–6).
            </p>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New practice test
          </Button>
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-44" />
            ))}
          </div>
        ) : tests.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <ClipboardCheck className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground mb-4">No practice tests yet.</p>
              <Button onClick={() => setCreateOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create your first practice test
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {tests.map((t) => {
              const studentUrl = `${originUrl()}/p/${t.share_token}`
              const resultsUrl = `${originUrl()}/p/results/${t.results_share_token}`
              return (
                <Card key={t.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-5 space-y-3">
                    <Link href={`/teacher/practice-tests/${t.id}`} className="block">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h2 className="font-semibold text-lg truncate">{t.title}</h2>
                          {t.description && (
                            <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{t.description}</p>
                          )}
                        </div>
                        <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                      </div>
                    </Link>

                    <div className="flex items-center gap-3 text-sm flex-wrap">
                      <Badge variant={t.is_active ? "default" : "outline"}>
                        {t.is_active ? "Active" : "Closed"}
                      </Badge>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <ClipboardCheck className="h-4 w-4" />
                        {t.question_count} {t.question_count === 1 ? "question" : "questions"}
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <Users className="h-4 w-4" />
                        {t.submission_count} {t.submission_count === 1 ? "submission" : "submissions"}
                      </span>
                      {t.avg_score_pct !== null && (
                        <span className="font-mono text-xs text-muted-foreground">
                          avg {t.avg_score_pct.toFixed(0)}%
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap pt-1 border-t">
                      <CopyLinkButton url={studentUrl} label="Student link" />
                      <CopyLinkButton url={resultsUrl} label="Colleague link" />
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New practice test</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pt-title">Title</Label>
              <Input
                id="pt-title"
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="AP Chem — Section I Practice"
                disabled={creating}
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-desc">Description (optional)</Label>
              <Textarea
                id="pt-desc"
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Princeton Review Practice Test 1, 60 MC, 90 minutes."
                disabled={creating}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={onCreate} disabled={creating || !createTitle.trim()}>
              {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
