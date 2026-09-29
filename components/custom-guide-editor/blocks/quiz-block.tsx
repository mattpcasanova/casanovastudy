"use client"

import { useState } from "react"
import { cn } from "@/lib/utils"
import { EditorBlock, QuizBlockData, EditorQuizQuestion, generateQuestionId } from "@/lib/types/editor-blocks"
import { Plus, ChevronRight, Check, X } from "lucide-react"
import { AddRowButton, AutoTextarea, InlineInput, Segmented, fieldLabel, focusLater } from "../editor-ui"

interface QuizBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

type QType = EditorQuizQuestion["questionType"]

const questionTypes: { value: QType; label: string }[] = [
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "true-false", label: "True / False" },
  { value: "short-answer", label: "Short answer" },
  { value: "calculation", label: "Calculation" },
]

const isAnswered = (q: EditorQuizQuestion) => !!q.question.trim() && !!String(q.correctAnswer ?? "").trim()

export function QuizBlock({ block, onUpdate }: QuizBlockProps) {
  const data = block.data as QuizBlockData
  // New/empty questions start open; AI-generated full quizzes start collapsed
  // so a 10-question quiz doesn't flood the canvas.
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(data.questions.filter(q => !q.question.trim()).map(q => q.id))
  )

  const setQuestions = (questions: EditorQuizQuestion[]) => onUpdate({ data: { ...data, questions } })

  const updateQuestion = (id: string, updates: Partial<EditorQuizQuestion>) => {
    setQuestions(data.questions.map(q => (q.id === id ? { ...q, ...updates } : q)))
  }

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const addQuestion = () => {
    const q: EditorQuizQuestion = {
      id: generateQuestionId(),
      questionType: "multiple-choice",
      question: "",
      options: ["", "", "", ""],
      correctAnswer: "",
      explanation: "",
    }
    setQuestions([...data.questions, q])
    setExpanded(prev => new Set(prev).add(q.id))
    focusLater(() => document.getElementById(`${q.id}-question`))
  }

  const changeType = (q: EditorQuizQuestion, value: QType) => {
    const updates: Partial<EditorQuizQuestion> = { questionType: value }
    if (value === "true-false") {
      updates.options = ["True", "False"]
      updates.correctAnswer = ""
    } else if (value === "multiple-choice") {
      if (!q.options || q.questionType === "true-false" || q.options.length < 2) {
        updates.options = ["", "", "", ""]
        updates.correctAnswer = ""
      }
    } else {
      updates.options = undefined
      if (q.questionType === "multiple-choice" || q.questionType === "true-false") updates.correctAnswer = ""
    }
    updateQuestion(q.id, updates)
  }

  const updateOption = (q: EditorQuizQuestion, index: number, value: string) => {
    const old = q.options![index]
    const options = q.options!.map((o, i) => (i === index ? value : o))
    // Keep the correct-answer mark attached when its option text is edited
    // (answers are stored by text, so editing used to silently un-mark it).
    const correctAnswer = q.correctAnswer && q.correctAnswer === old ? value : q.correctAnswer
    updateQuestion(q.id, { options, correctAnswer })
  }

  const removeOption = (q: EditorQuizQuestion, index: number) => {
    if (!q.options || q.options.length <= 2) return
    const removed = q.options[index]
    updateQuestion(q.id, {
      options: q.options.filter((_, i) => i !== index),
      correctAnswer: q.correctAnswer === removed ? "" : q.correctAnswer,
    })
  }

  return (
    <div className="space-y-2">
      {data.questions.map((q, index) => {
        const open = expanded.has(q.id)
        const ready = isAnswered(q)
        return (
          <div key={q.id} className={cn("rounded-xl border bg-white transition-colors", open ? "border-purple-200" : "border-slate-200")}>
            <div className="flex items-center gap-2 px-2 py-1.5">
              <button
                type="button"
                onClick={() => toggle(q.id)}
                aria-expanded={open}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 text-left hover:bg-slate-50"
              >
                <ChevronRight className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", open && "rotate-90")} />
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-purple-50 text-xs font-semibold text-purple-700">
                  {index + 1}
                </span>
                <span className={cn("truncate text-sm", q.question ? "text-slate-800" : "italic text-slate-400")}>
                  {q.question || "New question"}
                </span>
              </button>
              <span
                title={ready ? "Has an answer" : "Needs a correct answer"}
                className={cn("h-2 w-2 shrink-0 rounded-full", ready ? "bg-emerald-400" : "bg-amber-300")}
              />
              {data.questions.length > 1 && (
                <button
                  type="button"
                  onClick={() => setQuestions(data.questions.filter(x => x.id !== q.id))}
                  aria-label="Delete question"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 transition hover:bg-rose-50 hover:text-rose-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            <div className={cn("grid transition-[grid-template-rows] duration-200 ease-out", open ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
              <div className="min-h-0 overflow-hidden" inert={!open}>
                <div className="space-y-3 border-t border-slate-100 px-3 pb-3 pt-3">
                  <Segmented value={q.questionType} options={questionTypes} onChange={(v) => changeType(q, v)} />

                  <AutoTextarea
                    id={`${q.id}-question`}
                    value={q.question}
                    onChange={(e) => updateQuestion(q.id, { question: e.target.value })}
                    placeholder="Type the question…"
                    minRows={2}
                    className="text-[0.95rem] font-medium text-slate-900"
                  />

                  {q.questionType === "multiple-choice" && q.options && (
                    <div className="space-y-1">
                      <p className={cn(fieldLabel, "px-2")}>Options (click a letter to mark the correct one)</p>
                      {q.options.map((option, i) => {
                        const correct = !!option && q.correctAnswer === option
                        return (
                          <div key={i} className="group/opt flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => option && updateQuestion(q.id, { correctAnswer: option })}
                              disabled={!option}
                              title={option ? "Mark as correct" : "Type the option first"}
                              className={cn(
                                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-all duration-150",
                                correct
                                  ? "border-emerald-500 bg-emerald-500 text-white shadow-sm"
                                  : "border-slate-300 text-slate-500 hover:border-emerald-400 hover:text-emerald-600 disabled:opacity-50"
                              )}
                            >
                              {correct ? <Check className="h-3.5 w-3.5" /> : String.fromCharCode(65 + i)}
                            </button>
                            <InlineInput
                              value={option}
                              onChange={(e) => updateOption(q, i, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + i)}`}
                              className={cn("flex-1", correct && "bg-emerald-50/60 font-medium text-emerald-900")}
                            />
                            {q.options!.length > 2 && (
                              <button
                                type="button"
                                onClick={() => removeOption(q, i)}
                                aria-label="Remove option"
                                className="flex h-6 w-6 items-center justify-center rounded text-slate-300 transition hover:text-rose-600 md:opacity-0 md:group-hover/opt:opacity-100"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        )
                      })}
                      {q.options.length < 6 && (
                        <AddRowButton onClick={() => updateQuestion(q.id, { options: [...q.options!, ""] })}>
                          <Plus className="h-4 w-4" /> Add option
                        </AddRowButton>
                      )}
                    </div>
                  )}

                  {q.questionType === "true-false" && (
                    <div className="space-y-1">
                      <p className={cn(fieldLabel, "px-2")}>Correct answer</p>
                      <div className="grid grid-cols-2 gap-2">
                        {["True", "False"].map(v => {
                          const correct = String(q.correctAnswer).toLowerCase() === v.toLowerCase()
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => updateQuestion(q.id, { correctAnswer: v, options: ["True", "False"] })}
                              className={cn(
                                "flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-all duration-150",
                                correct
                                  ? "border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-100"
                                  : "border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                              )}
                            >
                              {correct && <Check className="h-4 w-4" />}
                              {v}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {(q.questionType === "short-answer" || q.questionType === "calculation") && (
                    <div className="space-y-1">
                      <p className={cn(fieldLabel, "px-2")}>{q.questionType === "calculation" ? "Correct answer" : "Model answer"}</p>
                      <AutoTextarea
                        value={q.correctAnswer}
                        onChange={(e) => updateQuestion(q.id, { correctAnswer: e.target.value })}
                        placeholder={q.questionType === "calculation" ? "e.g. 42 m/s" : "What a strong answer should say…"}
                        className="bg-emerald-50/40"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <p className={cn(fieldLabel, "px-2")}>Explanation (optional)</p>
                    <AutoTextarea
                      value={q.explanation || ""}
                      onChange={(e) => updateQuestion(q.id, { explanation: e.target.value })}
                      placeholder="Why is this the answer? Shown after students check."
                      className="text-sm text-slate-600"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      <AddRowButton onClick={addQuestion}>
        <Plus className="h-4 w-4" /> Add question
        <span className="ml-auto text-[0.7rem] font-normal text-slate-300">
          {data.questions.length} {data.questions.length === 1 ? "question" : "questions"}
        </span>
      </AddRowButton>
    </div>
  )
}
