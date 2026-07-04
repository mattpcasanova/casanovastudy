"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Loader2 } from "lucide-react"
import type { MasteryQuestion, StudentAnswer } from "@/components/mastery/types"

// One question, one submit. Visual patterns follow the study-guide quiz
// (option cards + radio), but grading is entirely server-side.
export default function QuestionView({
  question,
  conceptName,
  submitting,
  onSubmit,
}: {
  question: MasteryQuestion
  conceptName: string
  submitting: boolean
  onSubmit: (answer: StudentAnswer) => void
}) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [tfValue, setTfValue] = useState<boolean | null>(null)
  const [text, setText] = useState("")

  const canSubmit =
    question.type === "multiple_choice"
      ? selectedIndex !== null
      : question.type === "true_false"
        ? tfValue !== null
        : text.trim().length > 0

  const handleSubmit = () => {
    if (!canSubmit || submitting) return
    if (question.type === "multiple_choice") onSubmit({ index: selectedIndex! })
    else if (question.type === "true_false") onSubmit({ value: tfValue! })
    else onSubmit({ text: text.trim() })
  }

  return (
    <Card>
      <CardContent className="p-6">
        <Badge variant="outline" className="mb-3">{conceptName}</Badge>
        <p className="text-lg font-medium whitespace-pre-wrap mb-5">{question.question_text}</p>

        {question.type === "multiple_choice" && question.options && (
          <RadioGroup
            value={selectedIndex === null ? "" : String(selectedIndex)}
            onValueChange={v => setSelectedIndex(Number(v))}
            className="space-y-2"
          >
            {question.options.map((option, i) => (
              <Label
                key={i}
                htmlFor={`${question.response_id}-${i}`}
                className={`flex items-center gap-3 rounded-lg border p-4 cursor-pointer transition-colors font-normal ${
                  selectedIndex === i ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                <RadioGroupItem value={String(i)} id={`${question.response_id}-${i}`} />
                <span className="min-w-0">
                  <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                  {option}
                </span>
              </Label>
            ))}
          </RadioGroup>
        )}

        {question.type === "true_false" && (
          <div className="grid grid-cols-2 gap-3">
            {[true, false].map(value => (
              <button
                key={String(value)}
                type="button"
                onClick={() => setTfValue(value)}
                className={`rounded-lg border p-4 text-center font-medium transition-colors ${
                  tfValue === value ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                }`}
              >
                {value ? "True" : "False"}
              </button>
            ))}
          </div>
        )}

        {question.type === "short_answer" && (
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Type your answer — show your reasoning"
            rows={4}
            maxLength={2000}
          />
        )}

        <div className="mt-5 flex justify-end">
          <Button onClick={handleSubmit} disabled={!canSubmit || submitting}>
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {submitting && question.type === "short_answer" ? "Grading..." : "Submit answer"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
