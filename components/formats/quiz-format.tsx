"use client"

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle2, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { surface, surfaceMuted, fontDisplay, eyebrow, answer as answerStyle } from '@/lib/formats/design'

interface QuizFormatProps {
  content: string
  subject: string
}

interface MultipleChoiceQuestion {
  type: 'mc'
  id: string
  question: string
  options: string[]
  correctAnswer: string
}

interface TrueFalseQuestion {
  type: 'tf'
  id: string
  question: string
  correctAnswer: boolean
}

interface ShortAnswerQuestion {
  type: 'sa'
  id: string
  question: string
  sampleAnswer: string
}

type Question = MultipleChoiceQuestion | TrueFalseQuestion | ShortAnswerQuestion

interface ShortAnswerScore {
  score: number
  feedback: string
  isCorrect: boolean
}

export default function QuizFormat({ content, subject }: QuizFormatProps) {
  const questions = parseQuizContent(content)
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [shortAnswerScores, setShortAnswerScores] = useState<Record<string, ShortAnswerScore>>({})
  const [isScoring, setIsScoring] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }))
  }

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) setCurrentQuestionIndex(prev => prev + 1)
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(prev => prev - 1)
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    setIsScoring(true)

    const shortAnswerQuestions = questions.filter(q => q.type === 'sa') as ShortAnswerQuestion[]
    const scores: Record<string, ShortAnswerScore> = {}

    for (const question of shortAnswerQuestions) {
      const studentAnswer = answers[question.id]
      if (studentAnswer && studentAnswer.trim()) {
        try {
          const response = await fetch('/api/score-short-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              question: question.question,
              sampleAnswer: question.sampleAnswer,
              studentAnswer: studentAnswer,
              subject: subject
            })
          })
          const result = await response.json()
          if (result.success) scores[question.id] = result.data
        } catch (error) {
          console.error('Error scoring short answer:', error)
        }
      }
    }

    setShortAnswerScores(scores)
    setIsScoring(false)
    setShowResults(true)
  }

  const handleReset = () => {
    setAnswers({})
    setSubmitted(false)
    setShowResults(false)
    setCurrentQuestionIndex(0)
    setShortAnswerScores({})
    setIsScoring(false)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (submitted) return
    if (e.key === 'ArrowLeft') handlePrevious()
    else if (e.key === 'ArrowRight') handleNext()
  }, [submitted, currentQuestionIndex, questions.length])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const calculateScore = () => {
    let correct = 0
    let total = 0
    questions.forEach(q => {
      if (q.type === 'mc') { total++; if (answers[q.id] === q.correctAnswer) correct++ }
      else if (q.type === 'tf') { total++; if (answers[q.id] === (q.correctAnswer ? 'true' : 'false')) correct++ }
      else if (q.type === 'sa') { if (shortAnswerScores[q.id]) { total++; if (shortAnswerScores[q.id].isCorrect) correct++ } }
    })
    return { correct, total, percentage: total > 0 ? Math.round((correct / total) * 100) : 0 }
  }

  if (showResults) {
    const score = calculateScore()
    return (
      <QuizResults
        score={score}
        questions={questions}
        answers={answers}
        shortAnswerScores={shortAnswerScores}
        onReset={handleReset}
      />
    )
  }

  const answeredCount = Object.keys(answers).length

  return (
    <div className={cn(displaySerif.variable, 'max-w-2xl mx-auto space-y-5')}>
      {/* Progress */}
      <div className={cn(surface, 'p-5 print:hidden')}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-600">
            Question <span className="text-slate-900 font-semibold">{currentQuestionIndex + 1}</span> of {questions.length}
          </span>
          <span className="text-sm font-medium text-slate-500">{answeredCount}/{questions.length} answered</span>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Question */}
      <div className={cn(surface, 'p-6 border-l-4 border-l-purple-500 print:hidden')}>
        <p className={cn(eyebrow, 'text-purple-600 mb-2')}>Question {currentQuestionIndex + 1}</p>
        <p className={cn(fontDisplay, 'text-xl font-medium text-slate-900 leading-snug mb-6')}>{currentQuestion.question}</p>

        {currentQuestion.type === 'mc' && (
          <RadioGroup
            value={answers[currentQuestion.id] || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            disabled={submitted}
          >
            <div className="space-y-2.5">
              {currentQuestion.options.map((option, index) => {
                const letter = String.fromCharCode(65 + index)
                const isCorrect = submitted && option === currentQuestion.correctAnswer
                const isSelected = answers[currentQuestion.id] === option
                const isWrong = submitted && isSelected && option !== currentQuestion.correctAnswer
                return (
                  <div
                    key={index}
                    onClick={() => !submitted && handleAnswerChange(currentQuestion.id, option)}
                    className={cn(
                      'flex items-center gap-3 rounded-lg border p-3.5 transition-colors',
                      isCorrect ? answerStyle.correct : isWrong ? answerStyle.wrong : isSelected ? answerStyle.selected : answerStyle.idle,
                      !submitted && 'cursor-pointer'
                    )}
                  >
                    <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                    <Label htmlFor={`${currentQuestion.id}-${index}`} className="flex flex-1 cursor-pointer items-center gap-2.5">
                      <span className={cn('font-semibold', isCorrect ? 'text-emerald-700' : isWrong ? 'text-rose-700' : 'text-slate-400')}>{letter}</span>
                      <span className={cn('text-slate-700', isCorrect && 'font-medium text-slate-900')}>{option}</span>
                      {isCorrect && <CheckCircle2 className="ml-auto h-5 w-5 text-emerald-600" />}
                      {isWrong && <X className="ml-auto h-5 w-5 text-rose-600" />}
                    </Label>
                  </div>
                )
              })}
            </div>
          </RadioGroup>
        )}

        {currentQuestion.type === 'tf' && (
          <RadioGroup
            value={answers[currentQuestion.id] || ''}
            onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            disabled={submitted}
          >
            <div className="flex gap-3">
              {['true', 'false'].map((value) => {
                const isCorrect = submitted && (value === 'true') === currentQuestion.correctAnswer
                const isSelected = answers[currentQuestion.id] === value
                const isWrong = submitted && isSelected && (value === 'true') !== currentQuestion.correctAnswer
                return (
                  <div
                    key={value}
                    onClick={() => !submitted && handleAnswerChange(currentQuestion.id, value)}
                    className={cn(
                      'flex flex-1 items-center gap-3 rounded-lg border p-3.5 transition-colors',
                      isCorrect ? answerStyle.correct : isWrong ? answerStyle.wrong : isSelected ? answerStyle.selected : answerStyle.idle,
                      !submitted && 'cursor-pointer'
                    )}
                  >
                    <RadioGroupItem value={value} id={`${currentQuestion.id}-${value}`} />
                    <Label htmlFor={`${currentQuestion.id}-${value}`} className="flex-1 cursor-pointer font-medium capitalize text-slate-700">
                      {value}
                      {isCorrect && <CheckCircle2 className="ml-2 inline h-5 w-5 text-emerald-600" />}
                      {isWrong && <X className="ml-2 inline h-5 w-5 text-rose-600" />}
                    </Label>
                  </div>
                )
              })}
            </div>
          </RadioGroup>
        )}

        {currentQuestion.type === 'sa' && (
          <div className="space-y-3">
            <Textarea
              value={answers[currentQuestion.id] || ''}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              placeholder="Type your answer here…"
              rows={5}
              disabled={submitted}
              className="resize-none text-base"
            />
            {submitted && isScoring && (
              <div className={cn(surfaceMuted, 'p-4')}>
                <p className="font-medium text-slate-700">Scoring your answer…</p>
              </div>
            )}
            {submitted && !isScoring && shortAnswerScores[currentQuestion.id] && (
              <div className={cn('rounded-lg border p-4', shortAnswerScores[currentQuestion.id].isCorrect ? answerStyle.correct : answerStyle.wrong)}>
                <div className="mb-2 flex items-center gap-2">
                  {shortAnswerScores[currentQuestion.id].isCorrect
                    ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    : <X className="h-5 w-5 text-rose-600" />}
                  <p className="font-semibold text-slate-900">Score: {shortAnswerScores[currentQuestion.id].score}/100</p>
                </div>
                <p className="text-slate-700">{shortAnswerScores[currentQuestion.id].feedback}</p>
                <div className="mt-3 border-t border-slate-200 pt-3">
                  <p className={cn(eyebrow, 'text-slate-500 mb-1')}>Sample answer</p>
                  <p className="text-slate-700">{currentQuestion.sampleAnswer}</p>
                </div>
              </div>
            )}
            {submitted && !isScoring && !shortAnswerScores[currentQuestion.id] && (
              <div className={cn(surfaceMuted, 'p-4')}>
                <p className={cn(eyebrow, 'text-slate-500 mb-1')}>Sample answer</p>
                <p className="text-slate-700">{currentQuestion.sampleAnswer}</p>
                <p className="mt-2 text-sm italic text-slate-400">No answer provided</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button onClick={handlePrevious} disabled={currentQuestionIndex === 0} variant="ghost" className="text-slate-600">
          Previous
        </Button>
        {currentQuestionIndex === questions.length - 1 && !submitted ? (
          <Button onClick={handleSubmit} disabled={answeredCount === 0} size="lg" className="bg-emerald-600 hover:bg-emerald-700">
            Submit quiz
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={currentQuestionIndex === questions.length - 1 || submitted}
            size="lg"
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            Next
          </Button>
        )}
      </div>

      {/* Print version */}
      <div className="hidden print:block space-y-6">
        {questions.map((question, index) => (
          <div key={question.id} className="rounded-lg border border-slate-300 p-6 break-inside-avoid">
            <p className="font-semibold text-lg mb-4">{index + 1}. {question.question}</p>
            {question.type === 'mc' && (
              <div className="space-y-2 ml-6">
                {question.options.map((option, optIndex) => (
                  <div key={optIndex}>{String.fromCharCode(65 + optIndex)}. {option}</div>
                ))}
              </div>
            )}
            {question.type === 'tf' && (<div className="ml-6"><div>○ True</div><div>○ False</div></div>)}
            {question.type === 'sa' && (
              <div className="ml-6 space-y-2">
                <div className="border-b border-slate-300 h-8" />
                <div className="border-b border-slate-300 h-8" />
                <div className="border-b border-slate-300 h-8" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function QuizResults({
  score,
  questions,
  answers,
  shortAnswerScores,
  onReset
}: {
  score: { correct: number; total: number; percentage: number }
  questions: Question[]
  answers: Record<string, string>
  shortAnswerScores: Record<string, ShortAnswerScore>
  onReset: () => void
}) {
  const getGrade = (percentage: number) => {
    if (percentage >= 90) return { letter: 'A', color: 'text-emerald-600' }
    if (percentage >= 80) return { letter: 'B', color: 'text-purple-600' }
    if (percentage >= 70) return { letter: 'C', color: 'text-amber-600' }
    if (percentage >= 60) return { letter: 'D', color: 'text-orange-600' }
    return { letter: 'F', color: 'text-rose-600' }
  }

  const grade = getGrade(score.percentage)

  return (
    <div className={cn(displaySerif.variable, 'max-w-2xl mx-auto space-y-5')}>
      {/* Score */}
      <div className={cn(surface, 'p-8 text-center')}>
        <p className={cn(eyebrow, 'text-slate-500 mb-3')}>Your result</p>
        <div className={cn(fontDisplay, 'text-7xl font-semibold leading-none', grade.color)}>{grade.letter}</div>
        <p className="mt-3 text-lg font-medium text-slate-900">{score.correct} / {score.total} correct</p>
        <p className="text-slate-500">{score.percentage}%</p>
        <Button onClick={onReset} size="lg" className="mt-6 bg-purple-600 hover:bg-purple-700">
          <RotateCcw className="h-4 w-4 mr-2" /> Retake quiz
        </Button>
      </div>

      {/* Review */}
      <div className={cn(surface, 'p-6')}>
        <h3 className={cn(fontDisplay, 'text-lg font-semibold text-slate-900 mb-4')}>Answer review</h3>
        <div className="space-y-3">
          {questions.map((question, index) => {
            let isCorrect = false
            let saScore: ShortAnswerScore | undefined

            if (question.type === 'mc') isCorrect = answers[question.id] === question.correctAnswer
            else if (question.type === 'tf') isCorrect = answers[question.id] === (question.correctAnswer ? 'true' : 'false')
            else if (question.type === 'sa') { saScore = shortAnswerScores[question.id]; isCorrect = saScore?.isCorrect || false }

            const unscored = question.type === 'sa' && !saScore

            return (
              <div
                key={question.id}
                className={cn(
                  'rounded-lg border p-4',
                  unscored ? 'border-slate-200 bg-slate-50' : isCorrect ? answerStyle.correct : answerStyle.wrong
                )}
              >
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 shrink-0">
                    {unscored ? <span className="block h-5 w-5" /> : isCorrect ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <X className="h-5 w-5 text-rose-600" />}
                  </span>
                  <div className="flex-1">
                    <p className="font-medium text-slate-900 mb-2">{index + 1}. {question.question}</p>
                    {question.type === 'mc' && (
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium text-slate-600">Your answer:</span> <span className={isCorrect ? 'text-emerald-700' : 'text-rose-700'}>{answers[question.id] || 'Not answered'}</span></p>
                        {!isCorrect && <p><span className="font-medium text-slate-600">Correct answer:</span> <span className="text-emerald-700">{question.correctAnswer}</span></p>}
                      </div>
                    )}
                    {question.type === 'tf' && (
                      <div className="space-y-1 text-sm">
                        <p><span className="font-medium text-slate-600">Your answer:</span> <span className={cn('capitalize', isCorrect ? 'text-emerald-700' : 'text-rose-700')}>{answers[question.id] || 'Not answered'}</span></p>
                        {!isCorrect && <p><span className="font-medium text-slate-600">Correct answer:</span> <span className="capitalize text-emerald-700">{question.correctAnswer ? 'True' : 'False'}</span></p>}
                      </div>
                    )}
                    {question.type === 'sa' && (
                      <div className="space-y-2 text-sm">
                        {saScore && (
                          <div className="mb-2">
                            <p className="font-medium text-slate-700 mb-1">Score: {saScore.score}/100</p>
                            <p className="rounded bg-white/60 p-2 text-slate-700">{saScore.feedback}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-600">Your answer</p>
                          <p className="mt-1 rounded bg-white/60 p-2 text-slate-700">{answers[question.id] || 'Not answered'}</p>
                        </div>
                        <div>
                          <p className="font-medium text-slate-600">Sample answer</p>
                          <p className="mt-1 rounded bg-white/60 p-2 text-slate-700">{question.sampleAnswer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function parseQuizContent(content: string): Question[] {
  const questions: Question[] = []
  const lines = content.split('\n').filter(l => l.trim())

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    if (line.includes('MC_QUESTION:')) {
      const questionText = line.replace(/\*\*MC_QUESTION:\*\*/, '').replace('MC_QUESTION:', '').trim()
      if (!questionText) continue

      const options: string[] = []
      let correctAnswer = ''

      for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
        const optionLine = lines[j].trim()
        if (optionLine.match(/^[A-D]\)/)) {
          options.push(optionLine.substring(3).trim())
        } else if (optionLine.toLowerCase().includes('correct answer:') || optionLine.toLowerCase().includes('answer:')) {
          const answerMatch = optionLine.match(/(?:correct )?answer:\s*([A-D])/i)
          if (answerMatch && options.length > 0) {
            const answerIndex = answerMatch[1].charCodeAt(0) - 65
            if (answerIndex >= 0 && answerIndex < options.length) correctAnswer = options[answerIndex]
          }
        } else if (optionLine.includes('_QUESTION:')) {
          break
        }
      }

      if (options.length > 0 && questionText) {
        questions.push({ type: 'mc', id: `q-${questions.length}`, question: questionText, options, correctAnswer: correctAnswer || options[0] })
      }
    }
    else if (line.includes('TF_QUESTION:')) {
      const questionText = line.replace(/\*\*TF_QUESTION:\*\*/, '').replace('TF_QUESTION:', '').trim()
      if (!questionText) continue

      let correctAnswer = true
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const answerLine = lines[j].trim().toLowerCase()
        if (answerLine.includes('answer:')) { correctAnswer = answerLine.includes('true'); break }
        else if (answerLine.includes('_QUESTION:')) break
      }

      questions.push({ type: 'tf', id: `q-${questions.length}`, question: questionText, correctAnswer })
    }
    else if (line.includes('SA_QUESTION:')) {
      const questionText = line.replace(/\*\*SA_QUESTION:\*\*/, '').replace('SA_QUESTION:', '').trim()
      if (!questionText) continue

      let sampleAnswer = ''
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const answerLine = lines[j].trim()
        if (answerLine.toLowerCase().includes('sample answer:') || answerLine.toLowerCase().includes('answer:')) {
          sampleAnswer = answerLine.replace(/^(?:sample )?answer:\s*/i, '').trim()
          for (let k = j + 1; k < Math.min(j + 5, lines.length); k++) {
            const nextLine = lines[k].trim()
            if (nextLine.includes('_QUESTION:') || nextLine === '') break
            sampleAnswer += ' ' + nextLine
          }
          break
        } else if (answerLine.includes('_QUESTION:')) {
          break
        }
      }

      questions.push({ type: 'sa', id: `q-${questions.length}`, question: questionText, sampleAnswer: sampleAnswer || 'A comprehensive answer covering the key concepts from the study material.' })
    }
  }

  return questions
}
