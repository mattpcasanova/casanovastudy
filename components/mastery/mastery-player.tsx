"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import NavigationHeader from "@/components/navigation-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Loader2, Target } from "lucide-react"
import QuestionView from "@/components/mastery/question-view"
import AnswerFeedback from "@/components/mastery/answer-feedback"
import RoundSummary from "@/components/mastery/round-summary"
import CompletionScreen from "@/components/mastery/completion-screen"
import ConceptProgress from "@/components/mastery/concept-progress"
import type {
  AnswerResult,
  MasteryAttemptState,
  MasteryFinalScore,
  MasteryQuestion,
  MasteryRollup,
  StudentAnswer,
} from "@/components/mastery/types"

type Phase =
  | { name: "loading" }
  | { name: "intro" }
  | { name: "question"; queue: MasteryQuestion[]; index: number; round: number }
  | { name: "feedback"; queue: MasteryQuestion[]; index: number; round: number; result: AnswerResult }
  | { name: "round_summary"; round: number; newlyMastered: string[] }
  | { name: "completed"; finalScore: MasteryFinalScore }
  | { name: "error"; message: string }

interface MasteryPlayerProps {
  assignmentId: string
  classId: string
  title: string
  description: string | null
  dueAt: string | null
}

// Client orchestrator for the adaptive loop. Server state is authoritative;
// this component tracks rollups locally between answers and re-syncs on every
// round transition, so a refresh anywhere resumes cleanly.
export default function MasteryPlayer({ assignmentId, classId, title, description, dueAt }: MasteryPlayerProps) {
  const { toast } = useToast()
  const [state, setState] = useState<MasteryAttemptState | null>(null)
  const [phase, setPhase] = useState<Phase>({ name: "loading" })
  const [rollups, setRollups] = useState<MasteryRollup[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [starting, setStarting] = useState(false)
  const [loadingNext, setLoadingNext] = useState(false)
  const initialized = useRef(false)

  const enterPlayableState = useCallback((data: MasteryAttemptState) => {
    setState(data)
    setRollups(data.rollups)
    if (!data.attempt) {
      setPhase({ name: "intro" })
    } else if (data.attempt.status === "completed" && data.final_score) {
      setPhase({ name: "completed", finalScore: data.final_score })
    } else if (data.questions.length > 0) {
      setPhase({ name: "question", queue: data.questions, index: 0, round: data.attempt.current_round })
    } else {
      // Round fully answered before a refresh — show the summary so the
      // student can continue into the next round.
      setPhase({ name: "round_summary", round: data.attempt.current_round, newlyMastered: [] })
    }
  }, [])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    const load = async () => {
      try {
        const res = await fetch(`/api/assignments/${assignmentId}/mastery/attempt`)
        const json = await res.json()
        if (!res.ok) {
          setPhase({ name: "error", message: json.error ?? "Failed to load the quiz" })
          return
        }
        enterPlayableState(json)
      } catch {
        setPhase({ name: "error", message: "Network error — check your connection and refresh" })
      }
    }
    load()
  }, [assignmentId, enterPlayableState])

  const handleStart = async () => {
    setStarting(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/mastery/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ class_id: classId }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to start the quiz", variant: "destructive" })
        return
      }
      enterPlayableState(json)
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setStarting(false)
    }
  }

  const handleAnswer = async (answer: StudentAnswer) => {
    if (phase.name !== "question") return
    setSubmitting(true)
    try {
      const question = phase.queue[phase.index]
      const res = await fetch(`/api/assignments/${assignmentId}/mastery/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response_id: question.response_id, answer }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to submit answer", variant: "destructive" })
        return
      }
      const result = json as AnswerResult
      setRollups(prev => prev.map(r => (r.concept_id === result.concept.concept_id ? result.concept : r)))
      setPhase({ ...phase, name: "feedback", result })
    } catch {
      toast({ title: "Network error — your answer wasn't submitted", variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  const handleNextAfterFeedback = () => {
    if (phase.name !== "feedback") return
    if (phase.result.attempt_complete && phase.result.final_score) {
      setPhase({ name: "completed", finalScore: phase.result.final_score })
      return
    }
    // Skip queued questions whose concept is no longer in progress —
    // no point drilling a concept that just got mastered.
    const active = new Set(rollups.filter(r => r.status === "in_progress").map(r => r.concept_id))
    let next = phase.index + 1
    while (next < phase.queue.length && !active.has(phase.queue[next].concept_id)) next++

    if (next < phase.queue.length) {
      setPhase({ name: "question", queue: phase.queue, index: next, round: phase.round })
    } else {
      const mastered = phase.result.concept.status === "mastered" ? [phase.result.concept.concept_id] : []
      const names = (state?.concepts ?? [])
        .filter(c => mastered.includes(c.id))
        .map(c => c.name)
      setPhase({ name: "round_summary", round: phase.round, newlyMastered: names })
    }
  }

  const handleContinue = async () => {
    setLoadingNext(true)
    try {
      const res = await fetch(`/api/assignments/${assignmentId}/mastery/next-round`, { method: "POST" })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to load the next round", variant: "destructive" })
        return
      }
      setRollups(json.rollups)
      if (json.status === "completed") {
        setPhase({ name: "completed", finalScore: json.final_score })
      } else {
        setPhase({ name: "question", queue: json.questions, index: 0, round: json.round })
      }
    } catch {
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setLoadingNext(false)
    }
  }

  const conceptName = (conceptId: string) =>
    state?.concepts.find(c => c.id === conceptId)?.name ?? "Concept"

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold">{title}</h1>
            <Badge variant="secondary">
              <Target className="h-3 w-3 mr-1" />
              Mastery Quiz
            </Badge>
          </div>
          {dueAt && (
            <p className="text-sm text-muted-foreground mt-1">
              Due {new Date(dueAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
            </p>
          )}
        </div>

        {phase.name === "loading" && (
          <div className="space-y-4">
            <Skeleton className="h-32" />
            <Skeleton className="h-64" />
          </div>
        )}

        {phase.name === "error" && (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{phase.message}</p>
            </CardContent>
          </Card>
        )}

        {phase.name === "intro" && state && (
          <Card>
            <CardContent className="p-6">
              {description && <p className="mb-4 whitespace-pre-wrap">{description}</p>}
              <p className="text-sm text-muted-foreground mb-4">
                Answer questions on each concept until you master it — you need{" "}
                {Math.round(state.config.mastery_threshold * 100)}% correct on your recent answers.
                Wrong answers don&apos;t count against you once you get back on track. You can leave
                and pick up where you left off anytime.
              </p>
              <div className="mb-6">
                <p className="text-sm font-semibold mb-3">
                  Concepts to master ({state.concepts.length})
                </p>
                <ConceptProgress
                  concepts={state.concepts}
                  rollups={rollups}
                  config={state.config}
                  compact
                />
              </div>
              <Button onClick={handleStart} disabled={starting} size="lg" className="w-full">
                {starting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Start quiz
              </Button>
            </CardContent>
          </Card>
        )}

        {(phase.name === "question" || phase.name === "feedback") && state && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Round {phase.round}</span>
              <span>
                Question {phase.index + 1} of {phase.queue.length}
              </span>
            </div>

            {phase.name === "question" ? (
              <QuestionView
                key={phase.queue[phase.index].response_id}
                question={phase.queue[phase.index]}
                conceptName={conceptName(phase.queue[phase.index].concept_id)}
                submitting={submitting}
                onSubmit={handleAnswer}
              />
            ) : (
              <div className="space-y-4">
                <Card className="bg-muted/40">
                  <CardContent className="p-4">
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {phase.queue[phase.index].question_text}
                    </p>
                  </CardContent>
                </Card>
                <AnswerFeedback
                  question={phase.queue[phase.index]}
                  result={phase.result}
                  isLastInRound={phase.index === phase.queue.length - 1}
                  onNext={handleNextAfterFeedback}
                />
              </div>
            )}

            <Card>
              <CardContent className="p-4">
                <ConceptProgress
                  concepts={state.concepts}
                  rollups={rollups}
                  config={state.config}
                  compact
                />
              </CardContent>
            </Card>
          </div>
        )}

        {phase.name === "round_summary" && state && (
          <RoundSummary
            round={phase.round}
            concepts={state.concepts}
            rollups={rollups}
            config={state.config}
            newlyMastered={phase.newlyMastered}
            loadingNext={loadingNext}
            onContinue={handleContinue}
          />
        )}

        {phase.name === "completed" && state && (
          <CompletionScreen
            classId={classId}
            concepts={state.concepts}
            rollups={rollups}
            config={state.config}
            finalScore={phase.finalScore}
          />
        )}
      </div>
    </div>
  )
}
