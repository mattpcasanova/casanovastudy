"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import type { QuestionRecord, QuestionType } from "@/lib/types/question-bank"

interface ManualQuestionFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conceptId: string
  /** When set, the dialog edits this question instead of creating a new one. */
  question?: QuestionRecord
  onSaved?: () => void
}

const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple choice",
  true_false: "True / False",
  short_answer: "Short answer (AI-graded)",
}

export default function ManualQuestionForm({
  open,
  onOpenChange,
  conceptId,
  question,
  onSaved,
}: ManualQuestionFormProps) {
  const { toast } = useToast()
  const isEdit = !!question

  const [type, setType] = useState<QuestionType>("multiple_choice")
  const [questionText, setQuestionText] = useState("")
  const [options, setOptions] = useState<string[]>(["", "", "", ""])
  const [correctIndex, setCorrectIndex] = useState(0)
  const [tfAnswer, setTfAnswer] = useState(true)
  const [sampleAnswer, setSampleAnswer] = useState("")
  const [rubricNotes, setRubricNotes] = useState("")
  const [explanation, setExplanation] = useState("")
  const [difficulty, setDifficulty] = useState(2)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    if (question) {
      setType(question.type)
      setQuestionText(question.question_text)
      setOptions(question.options ?? ["", "", "", ""])
      const answer = question.correct_answer as Record<string, unknown>
      setCorrectIndex(typeof answer.index === "number" ? answer.index : 0)
      setTfAnswer(typeof answer.value === "boolean" ? answer.value : true)
      setSampleAnswer(typeof answer.sample_answer === "string" ? answer.sample_answer : "")
      setRubricNotes(typeof answer.rubric_notes === "string" ? answer.rubric_notes : "")
      setExplanation(question.explanation ?? "")
      setDifficulty(question.difficulty)
    } else {
      setType("multiple_choice")
      setQuestionText("")
      setOptions(["", "", "", ""])
      setCorrectIndex(0)
      setTfAnswer(true)
      setSampleAnswer("")
      setRubricNotes("")
      setExplanation("")
      setDifficulty(2)
    }
  }, [open, question])

  const buildPayload = () => {
    const correct_answer =
      type === "multiple_choice"
        ? { index: correctIndex }
        : type === "true_false"
          ? { value: tfAnswer }
          : { sample_answer: sampleAnswer, rubric_notes: rubricNotes.trim() || undefined }
    return {
      concept_id: conceptId,
      type,
      question_text: questionText,
      options: type === "multiple_choice" ? options.map(o => o.trim()) : null,
      correct_answer,
      explanation: explanation.trim() || null,
      difficulty,
    }
  }

  const validate = (): string | null => {
    if (!questionText.trim()) return "Question text is required"
    if (type === "multiple_choice") {
      const filled = options.filter(o => o.trim())
      if (filled.length !== options.length || options.length < 2) {
        return "All options need text (remove empty ones)"
      }
      if (correctIndex >= options.length) return "Pick the correct option"
    }
    if (type === "short_answer" && !sampleAnswer.trim()) {
      return "A sample answer is required — the AI grades against it"
    }
    return null
  }

  const handleSave = async () => {
    const validationError = validate()
    if (validationError) {
      toast({ title: validationError, variant: "destructive" })
      return
    }
    setSaving(true)
    try {
      const url = isEdit ? `/api/question-bank/${question.id}` : "/api/question-bank"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      })
      const json = await res.json()
      if (!res.ok) {
        toast({ title: json.error ?? "Failed to save question", variant: "destructive" })
        return
      }
      onOpenChange(false)
      onSaved?.()
    } catch (err) {
      console.error(err)
      toast({ title: "Network error", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const setOption = (index: number, value: string) => {
    setOptions(prev => prev.map((o, i) => (i === index ? value : o)))
  }

  const removeOption = (index: number) => {
    setOptions(prev => prev.filter((_, i) => i !== index))
    setCorrectIndex(prev => (index < prev ? prev - 1 : Math.min(prev, options.length - 2)))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit question" : "Add question"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Changes apply to future quizzes; past attempts keep the version they saw."
              : "Approved questions are served to students in mastery quizzes."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={v => setType(v as QuestionType)} disabled={isEdit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(TYPE_LABELS) as QuestionType[]).map(t => (
                    <SelectItem key={t} value={t}>{TYPE_LABELS[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Difficulty</Label>
              <Select value={String(difficulty)} onValueChange={v => setDifficulty(Number(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 — Intro</SelectItem>
                  <SelectItem value="2">2 — Standard</SelectItem>
                  <SelectItem value="3">3 — Challenge</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question-text">Question</Label>
            <Textarea
              id="question-text"
              value={questionText}
              onChange={e => setQuestionText(e.target.value)}
              placeholder="Type the question exactly as students will see it"
              rows={3}
            />
          </div>

          {type === "multiple_choice" && (
            <div className="space-y-2">
              <Label>Options <span className="text-muted-foreground font-normal">(select the correct one)</span></Label>
              <RadioGroup
                value={String(correctIndex)}
                onValueChange={v => setCorrectIndex(Number(v))}
                className="space-y-2"
              >
                {options.map((option, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <RadioGroupItem value={String(i)} id={`option-${i}`} />
                    <Input
                      value={option}
                      onChange={e => setOption(i, e.target.value)}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1"
                    />
                    {options.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0"
                        onClick={() => removeOption(i)}
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </RadioGroup>
              {options.length < 6 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setOptions(prev => [...prev, ""])}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add option
                </Button>
              )}
            </div>
          )}

          {type === "true_false" && (
            <div className="space-y-2">
              <Label>Correct answer</Label>
              <RadioGroup
                value={tfAnswer ? "true" : "false"}
                onValueChange={v => setTfAnswer(v === "true")}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="true" id="tf-true" />
                  <Label htmlFor="tf-true" className="font-normal">True</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="false" id="tf-false" />
                  <Label htmlFor="tf-false" className="font-normal">False</Label>
                </div>
              </RadioGroup>
            </div>
          )}

          {type === "short_answer" && (
            <>
              <div className="space-y-2">
                <Label htmlFor="sample-answer">Sample answer</Label>
                <Textarea
                  id="sample-answer"
                  value={sampleAnswer}
                  onChange={e => setSampleAnswer(e.target.value)}
                  placeholder="A model correct answer — the AI grades student responses against this"
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rubric-notes">
                  Grading notes <span className="text-muted-foreground font-normal">(optional)</span>
                </Label>
                <Textarea
                  id="rubric-notes"
                  value={rubricNotes}
                  onChange={e => setRubricNotes(e.target.value)}
                  placeholder='e.g. "Accept 0.61–0.63" or "Must mention both conditions"'
                  rows={2}
                />
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="explanation">
              Explanation <span className="text-muted-foreground font-normal">(optional, shown after answering)</span>
            </Label>
            <Textarea
              id="explanation"
              value={explanation}
              onChange={e => setExplanation(e.target.value)}
              placeholder="Why is this the answer? Students see this after they respond."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEdit ? "Save changes" : "Add question"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
