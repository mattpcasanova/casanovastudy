"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import NavigationHeader from "@/components/navigation-header"
import ClassesSectionNav from "@/components/classes-section-nav"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
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
import {
  AnswerKey,
  AnswerLetter,
  BigIdea,
  PracticeTestRecord,
  PracticeTestResultsPayload,
} from "@/lib/types/practice-test"
import { BigIdeaBars } from "@/components/practice-tests/big-idea-bars"
import {
  ArrowLeft,
  Copy,
  Check,
  Loader2,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react"

const ANSWER_LETTERS: AnswerLetter[] = ["A", "B", "C", "D"]
const BIG_IDEA_OPTIONS: BigIdea[] = [1, 2, 3, 4, 5, 6]

type EditableRow = { qNum: number; answer: AnswerLetter | ""; bigIdea: BigIdea | "" }

function answerKeyToRows(ak: AnswerKey | undefined | null): EditableRow[] {
  if (!ak) return []
  return Object.entries(ak)
    .map(([k, v]) => ({ qNum: Number(k), answer: v.answer as AnswerLetter, bigIdea: v.bigIdea as BigIdea }))
    .filter(r => Number.isInteger(r.qNum) && r.qNum >= 1)
    .sort((a, b) => a.qNum - b.qNum)
}

function rowsToAnswerKey(rows: EditableRow[]): AnswerKey {
  const out: AnswerKey = {}
  for (const r of rows) {
    if (r.answer === "" || r.bigIdea === "") continue
    out[String(r.qNum)] = { answer: r.answer, bigIdea: r.bigIdea }
  }
  return out
}

// Parse "1,A,5\n2,C,5\n..." (commas, tabs, or whitespace separated). Returns rows
// with question_number, answer letter, and Big Idea, sorted ascending.
function parseBulkAnswerKey(text: string): EditableRow[] | { error: string } {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
  const rows: EditableRow[] = []
  for (const [i, line] of lines.entries()) {
    const parts = line.split(/[,\t\s]+/).map(p => p.trim()).filter(Boolean)
    if (parts.length < 3) {
      return { error: `Line ${i + 1}: expected "q#,answer,bigIdea" (got "${line}")` }
    }
    const qNum = Number(parts[0])
    const answer = parts[1].toUpperCase()
    const bigIdea = Number(parts[2])
    if (!Number.isInteger(qNum) || qNum < 1) return { error: `Line ${i + 1}: invalid question number "${parts[0]}"` }
    if (!ANSWER_LETTERS.includes(answer as AnswerLetter)) return { error: `Line ${i + 1}: answer must be A/B/C/D (got "${parts[1]}")` }
    if (!BIG_IDEA_OPTIONS.includes(bigIdea as BigIdea)) return { error: `Line ${i + 1}: Big Idea must be 1–6 (got "${parts[2]}")` }
    rows.push({ qNum, answer: answer as AnswerLetter, bigIdea: bigIdea as BigIdea })
  }
  // Dedupe — last one wins
  const map = new Map<number, EditableRow>()
  for (const r of rows) map.set(r.qNum, r)
  return Array.from(map.values()).sort((a, b) => a.qNum - b.qNum)
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
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
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}

export default function TeacherPracticeTestEditPage() {
  const params = useParams<{ id: string }>()
  const id = params?.id as string
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const { toast } = useToast()

  const [test, setTest] = useState<PracticeTestRecord | null>(null)
  const [results, setResults] = useState<PracticeTestResultsPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regenWhich, setRegenWhich] = useState<null | "share" | "results">(null)

  // Editable state
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [isActive, setIsActive] = useState(true)
  const [rows, setRows] = useState<EditableRow[]>([])
  const [bulkPaste, setBulkPaste] = useState("")
  const [questionsContentRaw, setQuestionsContentRaw] = useState("")
  const [questionsContentExpanded, setQuestionsContentExpanded] = useState(false)

  const isTeacher = user?.user_type === "teacher"

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [testRes, resultsRes] = await Promise.all([
        fetch(`/api/practice-tests/${id}`),
        fetch(`/api/practice-tests/${id}/results`),
      ])
      const testJson = await testRes.json()
      if (!testRes.ok) {
        toast({ title: testJson.error ?? "Failed to load practice test", variant: "destructive" })
        router.push("/teacher/practice-tests")
        return
      }
      setTest(testJson.test)
      setTitle(testJson.test.title ?? "")
      setDescription(testJson.test.description ?? "")
      setIsActive(testJson.test.is_active ?? true)
      setRows(answerKeyToRows(testJson.test.answer_key))
      setQuestionsContentRaw(
        testJson.test.questions_content
          ? JSON.stringify(testJson.test.questions_content, null, 2)
          : ""
      )

      if (resultsRes.ok) {
        const r = await resultsRes.json()
        setResults(r)
      }
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }, [id, router, toast])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.push("/auth/signin"); return }
    if (!isTeacher) { router.push("/"); return }
    if (!id) return
    fetchAll()
  }, [authLoading, user, isTeacher, router, id, fetchAll])

  const studentUrl = useMemo(() => {
    if (!test || typeof window === "undefined") return ""
    return `${window.location.origin}/p/${test.share_token}`
  }, [test])
  const resultsUrl = useMemo(() => {
    if (!test || typeof window === "undefined") return ""
    return `${window.location.origin}/p/results/${test.results_share_token}`
  }, [test])

  const onApplyBulk = () => {
    const parsed = parseBulkAnswerKey(bulkPaste)
    if ("error" in parsed) {
      toast({ title: parsed.error, variant: "destructive" })
      return
    }
    if (parsed.length === 0) {
      toast({ title: "Nothing to import", variant: "destructive" })
      return
    }
    setRows(parsed)
    setBulkPaste("")
    toast({ title: `Imported ${parsed.length} answer key rows` })
  }

  const setRowAnswer = (qNum: number, answer: AnswerLetter | "") => {
    setRows(prev => prev.map(r => r.qNum === qNum ? { ...r, answer } : r))
  }
  const setRowBigIdea = (qNum: number, bigIdea: BigIdea | "") => {
    setRows(prev => prev.map(r => r.qNum === qNum ? { ...r, bigIdea } : r))
  }
  const addRow = () => {
    const next = rows.length === 0 ? 1 : Math.max(...rows.map(r => r.qNum)) + 1
    setRows(prev => [...prev, { qNum: next, answer: "", bigIdea: "" }])
  }
  const removeRow = (qNum: number) => {
    setRows(prev => prev.filter(r => r.qNum !== qNum))
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const update: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        is_active: isActive,
        answer_key: rowsToAnswerKey(rows),
      }
      if (questionsContentRaw.trim()) {
        try {
          update.questions_content = JSON.parse(questionsContentRaw)
        } catch {
          toast({ title: "Questions content is not valid JSON", variant: "destructive" })
          setSaving(false)
          return
        }
      } else {
        update.questions_content = null
      }
      const res = await fetch(`/api/practice-tests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(update),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to save", variant: "destructive" })
        return
      }
      setTest(json.test)
      toast({ title: "Saved" })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const onRegen = async (which: "share" | "results") => {
    try {
      const res = await fetch(`/api/practice-tests/${id}/regenerate-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ which }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to regenerate", variant: "destructive" })
        return
      }
      setTest(prev => prev ? {
        ...prev,
        share_token: json.share_token ?? prev.share_token,
        results_share_token: json.results_share_token ?? prev.results_share_token,
      } : prev)
      toast({ title: `Rotated ${which === "share" ? "student" : "colleague"} link` })
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setRegenWhich(null)
    }
  }

  const onDelete = async () => {
    try {
      const res = await fetch(`/api/practice-tests/${id}`, { method: "DELETE" })
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        toast({ title: json.error ?? "Failed to delete", variant: "destructive" })
        return
      }
      toast({ title: "Practice test deleted" })
      router.push("/teacher/practice-tests")
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setDeleteOpen(false)
    }
  }

  if (authLoading || !user || !isTeacher || loading || !test) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <div className="container mx-auto px-4 py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <ClassesSectionNav />

        <Button variant="ghost" size="sm" className="mb-4" onClick={() => router.push("/teacher/practice-tests")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          All practice tests
        </Button>

        <div className="flex items-start justify-between gap-3 mb-6 flex-wrap">
          <div className="min-w-0 flex-1">
            <h1 className="text-3xl font-bold truncate">{title || "Untitled practice test"}</h1>
            {test.description && (
              <p className="text-muted-foreground text-sm mt-1">{test.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1.5" />
              Delete
            </Button>
            <Button onClick={onSave} disabled={saving || !title.trim()}>
              {saving ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Save className="h-4 w-4 mr-1.5" />}
              Save
            </Button>
          </div>
        </div>

        {/* Links */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Share links</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Student link (no login)</Label>
                <div className="flex items-center gap-2">
                  <CopyLink url={studentUrl} />
                  <Button variant="outline" size="sm" onClick={() => setRegenWhich("share")}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                </div>
              </div>
              <code className="block text-xs bg-muted rounded px-2 py-1.5 break-all">{studentUrl}</code>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Colleague link (read-only results)</Label>
                <div className="flex items-center gap-2">
                  <CopyLink url={resultsUrl} />
                  <Button variant="outline" size="sm" onClick={() => setRegenWhich("results")}>
                    <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    Regenerate
                  </Button>
                </div>
              </div>
              <code className="block text-xs bg-muted rounded px-2 py-1.5 break-all">{resultsUrl}</code>
            </div>
          </CardContent>
        </Card>

        {/* Metadata */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Test details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pt-title">Title</Label>
              <Input id="pt-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pt-desc">Description (optional)</Label>
              <Textarea id="pt-desc" value={description} onChange={e => setDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={isActive} onCheckedChange={setIsActive} id="pt-active" />
              <Label htmlFor="pt-active" className="cursor-pointer">
                {isActive ? "Accepting student responses" : "Closed (link will show a closed message)"}
              </Label>
            </div>
          </CardContent>
        </Card>

        {/* Answer key + Big Idea editor */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Answer key + Big Idea map</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pt-bulk">Bulk paste (one row per line: <code>q#,answer,bigIdea</code>)</Label>
              <Textarea
                id="pt-bulk"
                value={bulkPaste}
                onChange={e => setBulkPaste(e.target.value)}
                placeholder={"1,A,4\n2,C,4\n3,B,1\n..."}
                rows={4}
                className="font-mono text-sm"
              />
              <Button variant="outline" size="sm" onClick={onApplyBulk} disabled={!bulkPaste.trim()}>
                Apply paste (replaces current rows)
              </Button>
              <p className="text-xs text-muted-foreground">
                Big Ideas: 1 Atoms, 2 Bonding/IMFs, 3 Reactions, 4 Kinetics, 5 Thermo, 6 Equilibrium/Acids/Electrochem.
              </p>
            </div>

            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium w-16">Q#</th>
                    <th className="text-left px-3 py-2 font-medium">Correct answer</th>
                    <th className="text-left px-3 py-2 font-medium">Big Idea</th>
                    <th className="px-3 py-2 w-12"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                        No questions yet. Use bulk paste above or click "Add question" below.
                      </td>
                    </tr>
                  )}
                  {rows.map(row => (
                    <tr key={row.qNum} className="border-t">
                      <td className="px-3 py-1.5 font-mono">{row.qNum}</td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-1">
                          {ANSWER_LETTERS.map(letter => (
                            <Button
                              key={letter}
                              type="button"
                              size="sm"
                              variant={row.answer === letter ? "default" : "outline"}
                              className="h-7 w-7 p-0 font-mono"
                              onClick={() => setRowAnswer(row.qNum, row.answer === letter ? "" : letter)}
                            >
                              {letter}
                            </Button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex gap-1">
                          {BIG_IDEA_OPTIONS.map(bi => (
                            <Button
                              key={bi}
                              type="button"
                              size="sm"
                              variant={row.bigIdea === bi ? "default" : "outline"}
                              className="h-7 w-7 p-0 font-mono"
                              onClick={() => setRowBigIdea(row.qNum, row.bigIdea === bi ? "" : bi)}
                            >
                              {bi}
                            </Button>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <Button variant="ghost" size="sm" onClick={() => removeRow(row.qNum)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <Button variant="outline" size="sm" onClick={addRow}>
              Add question
            </Button>

            <p className="text-xs text-muted-foreground">
              {rows.filter(r => r.answer && r.bigIdea).length} of {rows.length} rows complete.
              Incomplete rows are discarded on save.
            </p>
          </CardContent>
        </Card>

        {/* Questions content (optional) */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-3">
              <span>Question content (optional, in-app rendering)</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQuestionsContentExpanded(v => !v)}
              >
                {questionsContentExpanded ? "Hide" : "Show"}
              </Button>
            </CardTitle>
          </CardHeader>
          {questionsContentExpanded && (
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">
                Paste a JSON object with shape <code>{"{ \"questions\": [...], \"stems\": {...} }"}</code> matching the standalone quiz HTML's data structure. Leave empty to skip — students will only see "Question N" and four answer letters.
              </p>
              <Textarea
                value={questionsContentRaw}
                onChange={e => setQuestionsContentRaw(e.target.value)}
                rows={14}
                className="font-mono text-xs"
                placeholder='{"questions":[{"n":1,"prompt":"...","choices":["..."]}], "stems":{}}'
              />
            </CardContent>
          )}
        </Card>

        {/* Class-level Big Idea aggregate */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between gap-3">
              <span>Class performance by Big Idea</span>
              <Badge variant="secondary">
                {results?.aggregate.submissions ?? 0} {results?.aggregate.submissions === 1 ? "submission" : "submissions"}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {results && results.aggregate.submissions > 0 ? (
              <BigIdeaBars breakdown={results.aggregate.big_idea} />
            ) : (
              <p className="text-sm text-muted-foreground">
                No submissions yet. Share the student link above and results will appear here.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Submissions table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            {!results || results.submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No submissions yet.</p>
            ) : (
              <div className="border rounded-md overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Student</th>
                      <th className="text-right px-3 py-2 font-medium">Score</th>
                      <th className="text-right px-3 py-2 font-medium">Percent</th>
                      <th className="text-right px-3 py-2 font-medium">Submitted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.submissions.map(s => {
                      const pct = s.score_max > 0 ? (s.score_total / s.score_max) * 100 : 0
                      return (
                        <tr key={s.id} className="border-t">
                          <td className="px-3 py-2">{s.student_name}</td>
                          <td className="px-3 py-2 text-right font-mono">{s.score_total}/{s.score_max}</td>
                          <td className="px-3 py-2 text-right font-mono">{pct.toFixed(0)}%</td>
                          <td className="px-3 py-2 text-right text-muted-foreground">
                            {new Date(s.submitted_at).toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Regenerate confirm */}
      <AlertDialog open={regenWhich !== null} onOpenChange={open => !open && setRegenWhich(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Regenerate {regenWhich === "share" ? "student" : "colleague"} link?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The current URL will stop working immediately. Anyone who has the old URL will need the new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => regenWhich && onRegen(regenWhich)}>
              Regenerate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete confirm */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this practice test?</AlertDialogTitle>
            <AlertDialogDescription>
              All submissions will also be deleted. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
