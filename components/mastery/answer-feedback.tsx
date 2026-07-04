"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CheckCircle2, XCircle } from "lucide-react"
import type { AnswerResult, MasteryQuestion } from "@/components/mastery/types"

// Post-answer feedback: verdict, the correct answer, teacher explanation,
// and AI feedback for short answers. Immediate feedback is the pedagogy of
// the mastery loop — never make students wait until the end of a round.
export default function AnswerFeedback({
  question,
  result,
  isLastInRound,
  onNext,
}: {
  question: MasteryQuestion
  result: AnswerResult
  isLastInRound: boolean
  onNext: () => void
}) {
  const correctAnswerText = (() => {
    if (question.type === "multiple_choice" && question.options) {
      const index = result.correct_answer.index as number
      return `${String.fromCharCode(65 + index)}. ${question.options[index]}`
    }
    if (question.type === "true_false") {
      return result.correct_answer.value ? "True" : "False"
    }
    return String(result.correct_answer.sample_answer ?? "")
  })()

  return (
    <Card className={result.is_correct ? "border-green-300" : "border-red-300"}>
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          {result.is_correct ? (
            <>
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <span className="text-lg font-semibold text-green-700 dark:text-green-400">Correct!</span>
            </>
          ) : (
            <>
              <XCircle className="h-6 w-6 text-red-500" />
              <span className="text-lg font-semibold text-red-600 dark:text-red-400">Not quite</span>
            </>
          )}
          {question.type === "short_answer" && result.score !== null && (
            <span className="ml-auto text-sm text-muted-foreground">Score: {result.score}/100</span>
          )}
        </div>

        {!result.is_correct && (
          <div className="mb-3">
            <p className="text-sm font-medium text-muted-foreground mb-1">
              {question.type === "short_answer" ? "Sample answer" : "Correct answer"}
            </p>
            <p className="text-sm">{correctAnswerText}</p>
          </div>
        )}

        {result.feedback && (
          <div className="mb-3">
            <p className="text-sm font-medium text-muted-foreground mb-1">Feedback</p>
            <p className="text-sm">{result.feedback}</p>
          </div>
        )}

        {result.explanation && (
          <div className="mb-3">
            <p className="text-sm font-medium text-muted-foreground mb-1">Explanation</p>
            <p className="text-sm whitespace-pre-wrap">{result.explanation}</p>
          </div>
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={onNext}>
            {result.attempt_complete ? "See results" : isLastInRound ? "Round summary" : "Next question"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
