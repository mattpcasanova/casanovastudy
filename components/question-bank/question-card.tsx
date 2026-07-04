"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Check, Pencil, Archive, ArchiveRestore } from "lucide-react"
import type { QuestionRecord, QuestionType } from "@/lib/types/question-bank"

const TYPE_BADGES: Record<QuestionType, string> = {
  multiple_choice: "MC",
  true_false: "T/F",
  short_answer: "Short answer",
}

const SOURCE_LABELS: Record<QuestionRecord["source"], string | null> = {
  manual: null, // teacher-authored is the default; no badge noise
  ai_suggested: "AI suggested",
  ai_extracted: "From material",
  ai_runtime: "AI (in-quiz)",
}

interface QuestionCardProps {
  question: QuestionRecord
  onEdit: (question: QuestionRecord) => void
  onArchiveToggle: (question: QuestionRecord) => void
}

export default function QuestionCard({ question, onEdit, onArchiveToggle }: QuestionCardProps) {
  const answer = question.correct_answer as Record<string, unknown>
  const isArchived = question.status === "archived"
  const sourceLabel = SOURCE_LABELS[question.source]

  return (
    <Card className={isArchived ? "opacity-60" : undefined}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline">{TYPE_BADGES[question.type]}</Badge>
              <Badge variant="outline" className="text-muted-foreground">
                Difficulty {question.difficulty}
              </Badge>
              {sourceLabel && <Badge variant="secondary">{sourceLabel}</Badge>}
              {isArchived && <Badge variant="outline">Archived</Badge>}
              {question.times_served > 0 && (
                <span className="text-xs text-muted-foreground">
                  Served {question.times_served}× · {question.times_served > 0
                    ? `${Math.round((question.times_correct / question.times_served) * 100)}% correct`
                    : ""}
                </span>
              )}
            </div>
            <p className="text-sm whitespace-pre-wrap">{question.question_text}</p>

            {question.type === "multiple_choice" && question.options && (
              <ul className="mt-2 space-y-1">
                {question.options.map((option, i) => {
                  const isCorrect = answer.index === i
                  return (
                    <li
                      key={i}
                      className={`text-sm flex items-center gap-2 ${
                        isCorrect ? "text-green-700 dark:text-green-400 font-medium" : "text-muted-foreground"
                      }`}
                    >
                      <span className="w-5 flex-shrink-0">{String.fromCharCode(65 + i)}.</span>
                      <span className="min-w-0">{option}</span>
                      {isCorrect && <Check className="h-3.5 w-3.5 flex-shrink-0" />}
                    </li>
                  )
                })}
              </ul>
            )}

            {question.type === "true_false" && (
              <p className="mt-2 text-sm text-green-700 dark:text-green-400 font-medium">
                Answer: {answer.value ? "True" : "False"}
              </p>
            )}

            {question.type === "short_answer" && (
              <div className="mt-2 text-sm space-y-1">
                <p className="text-green-700 dark:text-green-400">
                  <span className="font-medium">Sample:</span> {String(answer.sample_answer ?? "")}
                </p>
                {typeof answer.rubric_notes === "string" && answer.rubric_notes && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">Grading notes:</span> {answer.rubric_notes}
                  </p>
                )}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1 flex-shrink-0">
            <Button variant="ghost" size="icon" onClick={() => onEdit(question)} title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onArchiveToggle(question)}
              title={isArchived ? "Restore" : "Archive"}
            >
              {isArchived
                ? <ArchiveRestore className="h-4 w-4" />
                : <Archive className="h-4 w-4 text-muted-foreground" />}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
