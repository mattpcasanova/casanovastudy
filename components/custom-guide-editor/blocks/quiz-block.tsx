"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { EditorBlock, QuizBlockData, EditorQuizQuestion, generateQuestionId } from "@/lib/types/editor-blocks"
import { Plus, Trash2, ChevronDown, ChevronUp, Check } from "lucide-react"
import { useState } from "react"

interface QuizBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const questionTypes = [
  { value: 'multiple-choice', label: 'Multiple Choice' },
  { value: 'true-false', label: 'True/False' },
  { value: 'short-answer', label: 'Short Answer' },
  { value: 'calculation', label: 'Calculation' },
]

export function QuizBlock({ block, onUpdate }: QuizBlockProps) {
  const data = block.data as QuizBlockData
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set(data.questions.map(q => q.id))
  )

  const handleChange = (updates: Partial<QuizBlockData>) => {
    onUpdate({
      data: { ...data, ...updates }
    })
  }

  const updateQuestion = (id: string, updates: Partial<EditorQuizQuestion>) => {
    const newQuestions = data.questions.map(q =>
      q.id === id ? { ...q, ...updates } : q
    )
    handleChange({ questions: newQuestions })
  }

  const addQuestion = () => {
    const newQuestion: EditorQuizQuestion = {
      id: generateQuestionId(),
      questionType: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: '',
      explanation: ''
    }
    handleChange({ questions: [...data.questions, newQuestion] })
    setExpandedQuestions(prev => new Set([...prev, newQuestion.id]))
  }

  const removeQuestion = (id: string) => {
    if (data.questions.length <= 1) return
    handleChange({ questions: data.questions.filter(q => q.id !== id) })
    setExpandedQuestions(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleQuestion = (id: string) => {
    setExpandedQuestions(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = data.questions.find(q => q.id === questionId)
    if (!question || !question.options) return

    const newOptions = [...question.options]
    newOptions[optionIndex] = value
    updateQuestion(questionId, { options: newOptions })
  }

  const addOption = (questionId: string) => {
    const question = data.questions.find(q => q.id === questionId)
    if (!question || !question.options) return

    updateQuestion(questionId, { options: [...question.options, ''] })
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = data.questions.find(q => q.id === questionId)
    if (!question || !question.options || question.options.length <= 2) return

    const newOptions = question.options.filter((_, i) => i !== optionIndex)
    // Update correct answer if needed
    const correctIndex = question.options.findIndex(o => o === question.correctAnswer)
    const newCorrectAnswer = correctIndex === optionIndex ? '' : question.correctAnswer

    updateQuestion(questionId, { options: newOptions, correctAnswer: newCorrectAnswer })
  }

  return (
    <div className="space-y-3">
      {data.questions.map((question, index) => {
        const isExpanded = expandedQuestions.has(question.id)

        return (
          <Card key={question.id} className="border">
            <CardHeader
              className="py-2 px-3 cursor-pointer flex flex-row items-center justify-between"
              onClick={() => toggleQuestion(question.id)}
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Q{index + 1}
                </span>
                <span className="text-sm truncate max-w-[300px]">
                  {question.question || 'New Question'}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {data.questions.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeQuestion(question.id)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Question Type</Label>
                    <Select
                      value={question.questionType}
                      onValueChange={(value: EditorQuizQuestion['questionType']) => {
                        const updates: Partial<EditorQuizQuestion> = { questionType: value }
                        if (value === 'true-false') {
                          updates.options = ['True', 'False']
                          updates.correctAnswer = ''
                        } else if (value === 'multiple-choice' && (!question.options || question.options.length < 2)) {
                          updates.options = ['', '', '', '']
                          updates.correctAnswer = ''
                        } else if (value === 'short-answer' || value === 'calculation') {
                          updates.options = undefined
                        }
                        updateQuestion(question.id, updates)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {questionTypes.map(({ value, label }) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Question</Label>
                  <Textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                    placeholder="Enter your question..."
                    className="min-h-[60px] resize-y"
                  />
                </div>

                {/* Options for multiple choice and true/false */}
                {(question.questionType === 'multiple-choice' || question.questionType === 'true-false') && question.options && (
                  <div>
                    <Label>Options (click to mark correct)</Label>
                    <div className="space-y-2 mt-1">
                      {question.options.map((option, optionIndex) => (
                        <div key={optionIndex} className="flex items-center gap-2">
                          <Button
                            variant={question.correctAnswer === option && option ? 'default' : 'outline'}
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => updateQuestion(question.id, { correctAnswer: option })}
                            disabled={!option}
                          >
                            {question.correctAnswer === option && option ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">{String.fromCharCode(65 + optionIndex)}</span>
                            )}
                          </Button>
                          <Input
                            value={option}
                            onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                            placeholder={`Option ${String.fromCharCode(65 + optionIndex)}...`}
                            className="flex-1"
                            disabled={question.questionType === 'true-false'}
                          />
                          {question.questionType === 'multiple-choice' && question.options!.length > 2 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => removeOption(question.id, optionIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      {question.questionType === 'multiple-choice' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addOption(question.id)}
                          className="w-full bg-blue-50 border-blue-300 text-blue-700 hover:bg-blue-100 hover:border-blue-400"
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Add Option
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                {/* Correct answer for short answer and calculation */}
                {(question.questionType === 'short-answer' || question.questionType === 'calculation') && (
                  <div>
                    <Label>Correct Answer</Label>
                    <Input
                      value={question.correctAnswer}
                      onChange={(e) => updateQuestion(question.id, { correctAnswer: e.target.value })}
                      placeholder="Enter the correct answer..."
                    />
                  </div>
                )}

                <div>
                  <Label>Explanation (optional)</Label>
                  <Textarea
                    value={question.explanation || ''}
                    onChange={(e) => updateQuestion(question.id, { explanation: e.target.value })}
                    placeholder="Explain why this is the correct answer..."
                    className="min-h-[60px] resize-y"
                  />
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}

      <Button
        variant="outline"
        onClick={addQuestion}
        className="w-full bg-purple-50 border-purple-300 text-purple-700 hover:bg-purple-100 hover:border-purple-400"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Question
      </Button>
    </div>
  )
}
