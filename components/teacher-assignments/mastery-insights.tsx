"use client"

import { useCallback, useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronRight, CheckCircle2, Clock, Sparkles } from "lucide-react"
import type { ConceptInsight, QuestionInsight } from "@/lib/mastery/analytics"

interface Props {
  assignmentId: string
}

function fmtTime(sec: number | null): string {
  if (sec === null) return "—"
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

// Shared red -> amber -> emerald scale for % correct.
function pctBar(pct: number | null): string {
  if (pct === null) return "bg-slate-300"
  if (pct >= 80) return "bg-emerald-500"
  if (pct >= 60) return "bg-amber-500"
  return "bg-rose-500"
}
function pctText(pct: number | null): string {
  if (pct === null) return "text-slate-400"
  if (pct >= 80) return "text-emerald-700"
  if (pct >= 60) return "text-amber-700"
  return "text-rose-700"
}

const SLOW_SEC = 90

export default function MasteryInsights({ assignmentId }: Props) {
  const { toast } = useToast()
  const [concepts, setConcepts] = useState<ConceptInsight[]>([])
  const [questions, setQuestions] = useState<QuestionInsight[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/mastery/insights`)
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to load insights", variant: "destructive" })
        return
      }
      setConcepts(json.concepts)
      setQuestions(json.questions)
      // Default-expand the weakest concept so the most useful drill-down is visible.
      const worst = (json.concepts as ConceptInsight[]).find((c) => c.pct !== null)
      if (worst) setExpanded(new Set([worst.concept_id]))
    } finally {
      setLoading(false)
    }
  }, [assignmentId, toast])

  useEffect(() => {
    load()
  }, [load])

  const toggle = (conceptId: string) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(conceptId) ? next.delete(conceptId) : next.add(conceptId)
      return next
    })

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-6">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-32" />
        </CardContent>
      </Card>
    )
  }

  const anyAnswers = concepts.some((c) => c.answered > 0)

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-semibold text-lg">Question insights</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Concepts and questions sorted weakest first — where your class needs the most review.
        </p>

        {!anyAnswers ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No answers yet. Insights appear once students start answering questions.
          </p>
        ) : (
          <div className="space-y-2.5">
            {concepts.map((c) => {
              const isOpen = expanded.has(c.concept_id)
              const conceptQuestions = questions.filter((q) => q.concept_id === c.concept_id)
              return (
                <div key={c.concept_id} className="rounded-lg border border-slate-200 overflow-hidden">
                  {/* Concept summary row */}
                  <button
                    type="button"
                    onClick={() => toggle(c.concept_id)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                  >
                    <span className="shrink-0 text-slate-400">
                      {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="font-medium text-slate-900 block truncate">{c.name}</span>
                      <span className="text-xs text-slate-500">
                        {c.answered} answered · {c.masteredStudents}/{c.totalStudents} mastered
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 text-xs text-slate-500 shrink-0">
                      <Clock className="h-3.5 w-3.5" /> {fmtTime(c.avgTimeSec)}
                    </span>
                    {/* % meter */}
                    <span className="flex w-28 shrink-0 items-center gap-2">
                      <span className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
                        <span
                          className={cn("block h-full rounded-full", pctBar(c.pct))}
                          style={{ width: `${c.pct ?? 0}%` }}
                        />
                      </span>
                      <span className={cn("w-9 text-right text-sm font-semibold tabular-nums", pctText(c.pct))}>
                        {c.pct === null ? "—" : `${c.pct}%`}
                      </span>
                    </span>
                  </button>

                  {/* Question drill-down */}
                  {isOpen && (
                    <div className="border-t border-slate-100 divide-y divide-slate-100">
                      {conceptQuestions.length === 0 ? (
                        <p className="px-4 py-4 text-sm text-slate-400">No answered questions in this concept yet.</p>
                      ) : (
                        conceptQuestions.map((q) => <QuestionRow key={q.question_id} q={q} />)
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function QuestionRow({ q }: { q: QuestionInsight }) {
  const needsReview = q.pct !== null && q.pct < 50
  const slow = q.avgTimeSec !== null && q.avgTimeSec > SLOW_SEC

  return (
    <div className="px-4 py-3.5">
      <div className="flex items-start gap-3">
        <p className="flex-1 text-sm text-slate-800 leading-snug">{q.question_text}</p>
        <div className="flex shrink-0 items-center gap-2">
          {needsReview && (
            <Badge variant="outline" className="border-rose-200 bg-rose-50 text-rose-700 text-[10px] px-1.5 py-0">
              Needs review
            </Badge>
          )}
          {slow && (
            <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 text-[10px] px-1.5 py-0">
              Slow
            </Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" /> {fmtTime(q.avgTimeSec)}
          </span>
          <span className={cn("w-10 text-right text-sm font-semibold tabular-nums", pctText(q.pct))}>
            {q.pct === null ? "—" : `${q.pct}%`}
          </span>
        </div>
      </div>

      {/* MC / TF distractor distribution */}
      {q.distribution && q.answered > 0 && (
        <div className="mt-3 space-y-1.5">
          {q.distribution.map((choice, i) => {
            const share = Math.round((choice.count / q.answered) * 100)
            return (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="w-5 shrink-0 text-slate-400">
                  {choice.isCorrect ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> : String.fromCharCode(65 + i)}
                </span>
                <span className={cn("flex-1 min-w-0 truncate", choice.isCorrect ? "font-medium text-slate-900" : "text-slate-600")}>
                  {choice.label}
                </span>
                <span className="h-1.5 w-24 shrink-0 rounded-full bg-slate-100 overflow-hidden">
                  <span
                    className={cn("block h-full rounded-full", choice.isCorrect ? "bg-emerald-500" : choice.count > 0 ? "bg-slate-400" : "bg-transparent")}
                    style={{ width: `${share}%` }}
                  />
                </span>
                <span className="w-9 shrink-0 text-right tabular-nums text-slate-500">{choice.count}</span>
              </div>
            )
          })}
        </div>
      )}

      {/* Short-answer: avg score + representative wrong answers */}
      {q.type === "short_answer" && (
        <div className="mt-2.5 text-xs">
          <div className="flex items-center gap-2 text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> AI-judged
            </span>
            {q.avgScore !== null && q.avgScore !== undefined && <span>· avg score {q.avgScore}/100</span>}
          </div>
          {q.sampleWrong && q.sampleWrong.length > 0 && (
            <div className="mt-2 space-y-1">
              <p className="text-slate-400">Common wrong answers:</p>
              {q.sampleWrong.map((w, i) => (
                <p key={i} className="rounded bg-slate-50 px-2 py-1 text-slate-600 ring-1 ring-inset ring-slate-100">
                  “{w}”
                </p>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
