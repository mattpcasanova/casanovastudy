"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { CheckCircle2, XCircle, Clock, Sparkles } from "lucide-react"

interface StudentResponse {
  concept_name: string
  type: "multiple_choice" | "true_false" | "short_answer"
  question_text: string
  their_answer: string
  correct_answer: string
  is_correct: boolean
  score: number | null
  ai_feedback: string | null
  time_sec: number | null
}

interface StudentDetail {
  name: string
  status: "in_progress" | "completed"
  total_time_sec: number
  answered: number
  correct: number
  responses: StudentResponse[]
}

interface Props {
  assignmentId: string
  attemptId: string | null
  onClose: () => void
}

function fmtTime(sec: number | null): string {
  if (sec === null) return "—"
  if (sec < 60) return `${sec}s`
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return s ? `${m}m ${s}s` : `${m}m`
}

export default function StudentAttemptDialog({ assignmentId, attemptId, onClose }: Props) {
  const [detail, setDetail] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!attemptId) {
      setDetail(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setDetail(null)
    fetch(`/api/assignments/${assignmentId}/mastery/student?attempt_id=${attemptId}`)
      .then((r) => r.json())
      .then((j) => {
        if (!cancelled && !j.error) setDetail(j)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assignmentId, attemptId])

  const pct = detail && detail.answered > 0 ? Math.round((detail.correct / detail.answered) * 100) : null

  return (
    <Dialog open={!!attemptId} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{detail?.name ?? "Student"}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : !detail ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Couldn't load this attempt.</p>
        ) : (
          <>
            {/* Summary */}
            <div className="flex flex-wrap items-center gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm ring-1 ring-inset ring-slate-100">
              <span className="inline-flex items-center gap-1.5 text-slate-600">
                <Clock className="h-4 w-4" /> {fmtTime(detail.total_time_sec)} on task
              </span>
              <span className="text-slate-600">
                <span className="font-semibold text-slate-900">{detail.correct}</span>/{detail.answered} correct
                {pct !== null && <span className="text-slate-400"> · {pct}%</span>}
              </span>
              <Badge variant="secondary" className="ml-auto">
                {detail.status === "completed" ? "Completed" : "In progress"}
              </Badge>
            </div>

            {/* Per-question detail */}
            {detail.responses.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No answered questions yet.</p>
            ) : (
              <div className="mt-4 space-y-3">
                {detail.responses.map((r, i) => (
                  <div key={i} className="rounded-lg border border-slate-200 p-3.5">
                    <div className="flex items-start gap-2.5">
                      {r.is_correct ? (
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm text-slate-800 leading-snug">{r.question_text}</p>
                          <span className="inline-flex shrink-0 items-center gap-1 text-xs text-slate-400">
                            <Clock className="h-3 w-3" /> {fmtTime(r.time_sec)}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[0.7rem] uppercase tracking-wide text-slate-400">{r.concept_name}</p>

                        <p className="mt-2 text-sm">
                          <span className="text-slate-500">Answered: </span>
                          <span className={cn(r.is_correct ? "text-emerald-700" : "text-rose-700", "font-medium")}>
                            {r.their_answer}
                          </span>
                        </p>
                        {!r.is_correct && r.type !== "short_answer" && (
                          <p className="text-sm">
                            <span className="text-slate-500">Correct: </span>
                            <span className="font-medium text-emerald-700">{r.correct_answer}</span>
                          </p>
                        )}
                        {r.type === "short_answer" && (
                          <div className="mt-1.5 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1">
                              <Sparkles className="h-3 w-3" /> AI-judged
                            </span>
                            {r.score !== null && <span> · {r.score}/100</span>}
                            {r.ai_feedback && <p className="mt-1 text-slate-600">{r.ai_feedback}</p>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
