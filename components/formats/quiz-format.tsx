"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, X, Award, RotateCw } from 'lucide-react'

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
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1)
    }
  }

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1)
    }
  }

  const handleSubmit = async () => {
    setSubmitted(true)
    setIsScoring(true)

    // Score all short answer questions
    const shortAnswerQuestions = questions.filter(q => q.type === 'sa') as ShortAnswerQuestion[]
    const scores: Record<string, ShortAnswerScore> = {}

    for (const question of shortAnswerQuestions) {
      const studentAnswer = answers[question.id]

      // Only score if student provided an answer
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

          if (result.success) {
            scores[question.id] = result.data
          }
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

  const calculateScore = () => {
    let correct = 0
    let total = 0

    questions.forEach(q => {
      if (q.type === 'mc') {
        total++
        if (answers[q.id] === q.correctAnswer) correct++
      } else if (q.type === 'tf') {
        total++
        if (answers[q.id] === (q.correctAnswer ? 'true' : 'false')) correct++
      } else if (q.type === 'sa') {
        // Include short answer questions that have been scored
        if (shortAnswerScores[q.id]) {
          total++
          if (shortAnswerScores[q.id].isCorrect) correct++
        }
      }
    })

    return {
      correct,
      total,
      percentage: total > 0 ? Math.round((correct / total) * 100) : 0
    }
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Question {currentQuestionIndex + 1} of {questions.length}
              </span>
              <Badge variant={submitted ? "default" : "secondary"}>
                {submitted ? 'Submitted' : `${Object.keys(answers).length}/${questions.length} Answered`}
              </Badge>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Question Card */}
      <Card className="border-4 border-blue-400">
        <CardHeader>
          <CardTitle className="text-2xl text-blue-900">
            Question {currentQuestionIndex + 1}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-lg font-medium text-gray-800">{currentQuestion.question}</p>

          {currentQuestion.type === 'mc' && (
            <RadioGroup
              value={answers[currentQuestion.id] || ''}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              disabled={submitted}
            >
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => {
                  const letter = String.fromCharCode(65 + index)
                  const isCorrect = submitted && option === currentQuestion.correctAnswer
                  const isSelected = answers[currentQuestion.id] === option
                  const isWrong = submitted && isSelected && option !== currentQuestion.correctAnswer

                  return (
                    <div
                      key={index}
                      onClick={() => !submitted && handleAnswerChange(currentQuestion.id, option)}
                      className={`flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                        isCorrect
                          ? 'border-green-400 bg-green-50'
                          : isWrong
                          ? 'border-red-400 bg-red-50'
                          : isSelected
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      } ${!submitted ? 'cursor-pointer' : ''}`}
                    >
                      <RadioGroupItem value={option} id={`${currentQuestion.id}-${index}`} />
                      <Label
                        htmlFor={`${currentQuestion.id}-${index}`}
                        className="flex-1 cursor-pointer flex items-center gap-2"
                      >
                        <span className={`font-bold ${
                          isCorrect ? 'text-green-700' : isWrong ? 'text-red-700' : 'text-blue-600'
                        }`}>
                          {letter}.
                        </span>
                        <span className={isCorrect ? 'font-semibold' : ''}>{option}</span>
                        {isCorrect && <CheckCircle className="h-5 w-5 text-green-600 ml-auto" />}
                        {isWrong && <X className="h-5 w-5 text-red-600 ml-auto" />}
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
              <div className="flex gap-4">
                {['true', 'false'].map((value) => {
                  const isCorrect = submitted && (value === 'true') === currentQuestion.correctAnswer
                  const isSelected = answers[currentQuestion.id] === value
                  const isWrong = submitted && isSelected && (value === 'true') !== currentQuestion.correctAnswer

                  return (
                    <div
                      key={value}
                      onClick={() => !submitted && handleAnswerChange(currentQuestion.id, value)}
                      className={`flex-1 flex items-center space-x-3 p-4 rounded-lg border-2 transition-colors ${
                        isCorrect
                          ? 'border-green-400 bg-green-50'
                          : isWrong
                          ? 'border-red-400 bg-red-50'
                          : isSelected
                          ? 'border-blue-400 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      } ${!submitted ? 'cursor-pointer' : ''}`}
                    >
                      <RadioGroupItem value={value} id={`${currentQuestion.id}-${value}`} />
                      <Label
                        htmlFor={`${currentQuestion.id}-${value}`}
                        className="flex-1 cursor-pointer font-medium capitalize"
                      >
                        {value}
                        {isCorrect && <CheckCircle className="h-5 w-5 text-green-600 inline ml-2" />}
                        {isWrong && <X className="h-5 w-5 text-red-600 inline ml-2" />}
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
                placeholder="Type your answer here..."
                rows={5}
                disabled={submitted}
                className="resize-none"
              />
              {submitted && isScoring && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                  <p className="font-semibold text-yellow-900 mb-2">Scoring your answer...</p>
                  <p className="text-gray-700 text-sm">Using Claude to evaluate your response</p>
                </div>
              )}
              {submitted && !isScoring && shortAnswerScores[currentQuestion.id] && (
                <div className={`border-2 rounded-lg p-4 ${
                  shortAnswerScores[currentQuestion.id].isCorrect
                    ? 'bg-green-50 border-green-300'
                    : 'bg-orange-50 border-orange-300'
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    {shortAnswerScores[currentQuestion.id].isCorrect ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : (
                      <X className="h-5 w-5 text-orange-600" />
                    )}
                    <p className={`font-semibold ${
                      shortAnswerScores[currentQuestion.id].isCorrect
                        ? 'text-green-900'
                        : 'text-orange-900'
                    }`}>
                      Score: {shortAnswerScores[currentQuestion.id].score}/100
                    </p>
                  </div>
                  <p className="text-gray-700 mb-3">{shortAnswerScores[currentQuestion.id].feedback}</p>
                  <div className="border-t-2 border-gray-200 pt-3 mt-3">
                    <p className="font-semibold text-blue-900 mb-2">Sample Answer:</p>
                    <p className="text-gray-700">{currentQuestion.sampleAnswer}</p>
                  </div>
                </div>
              )}
              {submitted && !isScoring && !shortAnswerScores[currentQuestion.id] && (
                <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                  <p className="font-semibold text-blue-900 mb-2">Sample Answer:</p>
                  <p className="text-gray-700">{currentQuestion.sampleAnswer}</p>
                  <p className="text-sm text-gray-500 mt-2 italic">No answer provided</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
          variant="outline"
          size="lg"
        >
          Previous
        </Button>

        {currentQuestionIndex === questions.length - 1 && !submitted ? (
          <Button
            onClick={handleSubmit}
            disabled={Object.keys(answers).length === 0}
            size="lg"
            className="bg-green-600 hover:bg-green-700"
          >
            Submit Quiz
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={currentQuestionIndex === questions.length - 1 || submitted}
            size="lg"
          >
            Next
          </Button>
        )}
      </div>

      {/* Print version */}
      <div className="hidden print:block space-y-8">
        {questions.map((question, index) => (
          <div key={question.id} className="border-2 border-gray-300 rounded-lg p-6 break-inside-avoid">
            <p className="font-bold text-lg mb-4">
              {index + 1}. {question.question}
            </p>
            {question.type === 'mc' && (
              <div className="space-y-2 ml-6">
                {question.options.map((option, optIndex) => (
                  <div key={optIndex}>
                    {String.fromCharCode(65 + optIndex)}. {option}
                  </div>
                ))}
              </div>
            )}
            {question.type === 'tf' && (
              <div className="ml-6">
                <div>○ True</div>
                <div>○ False</div>
              </div>
            )}
            {question.type === 'sa' && (
              <div className="ml-6 space-y-2">
                <div className="border-b border-gray-300 h-8"></div>
                <div className="border-b border-gray-300 h-8"></div>
                <div className="border-b border-gray-300 h-8"></div>
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
    if (percentage >= 90) return { letter: 'A', color: 'text-green-600', bg: 'bg-green-50' }
    if (percentage >= 80) return { letter: 'B', color: 'text-blue-600', bg: 'bg-blue-50' }
    if (percentage >= 70) return { letter: 'C', color: 'text-yellow-600', bg: 'bg-yellow-50' }
    if (percentage >= 60) return { letter: 'D', color: 'text-orange-600', bg: 'bg-orange-50' }
    return { letter: 'F', color: 'text-red-600', bg: 'bg-red-50' }
  }

  const grade = getGrade(score.percentage)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Score Card */}
      <Card className={`border-4 ${grade.bg} border-gray-300`}>
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <Award className={`h-16 w-16 ${grade.color} mx-auto`} />
            <div>
              <div className={`text-6xl font-bold ${grade.color} mb-2`}>{grade.letter}</div>
              <div className="text-2xl font-semibold text-gray-700">
                {score.correct} / {score.total} Correct
              </div>
              <div className="text-lg text-gray-600">{score.percentage}%</div>
            </div>
            <Button onClick={onReset} size="lg" className="mt-4">
              <RotateCw className="h-4 w-4 mr-2" />
              Retake Quiz
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Review */}
      <Card>
        <CardHeader>
          <CardTitle>Answer Review</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {questions.map((question, index) => {
            let isCorrect = false
            let saScore: ShortAnswerScore | undefined

            if (question.type === 'mc') {
              isCorrect = answers[question.id] === question.correctAnswer
            } else if (question.type === 'tf') {
              isCorrect = answers[question.id] === (question.correctAnswer ? 'true' : 'false')
            } else if (question.type === 'sa') {
              saScore = shortAnswerScores[question.id]
              isCorrect = saScore?.isCorrect || false
            }

            return (
              <div
                key={question.id}
                className={`p-4 rounded-lg border-2 ${
                  question.type === 'sa' && !saScore
                    ? 'border-blue-200 bg-blue-50'
                    : isCorrect
                    ? 'border-green-200 bg-green-50'
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div>
                    {question.type === 'sa' && !saScore ? (
                      <div className="h-6 w-6" />
                    ) : isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <X className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold mb-2">
                      {index + 1}. {question.question}
                    </p>
                    {question.type === 'mc' && (
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Your answer:</span>{' '}
                          <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {answers[question.id] || 'Not answered'}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p>
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-700">{question.correctAnswer}</span>
                          </p>
                        )}
                      </div>
                    )}
                    {question.type === 'tf' && (
                      <div className="space-y-1 text-sm">
                        <p>
                          <span className="font-medium">Your answer:</span>{' '}
                          <span className={isCorrect ? 'text-green-700 capitalize' : 'text-red-700 capitalize'}>
                            {answers[question.id] || 'Not answered'}
                          </span>
                        </p>
                        {!isCorrect && (
                          <p>
                            <span className="font-medium">Correct answer:</span>{' '}
                            <span className="text-green-700 capitalize">
                              {question.correctAnswer ? 'True' : 'False'}
                            </span>
                          </p>
                        )}
                      </div>
                    )}
                    {question.type === 'sa' && (
                      <div className="space-y-2 text-sm">
                        {saScore && (
                          <div className="mb-3">
                            <p className="font-medium mb-1">Score: {saScore.score}/100</p>
                            <p className="text-gray-700 bg-white/50 p-2 rounded">{saScore.feedback}</p>
                          </div>
                        )}
                        <div>
                          <p className="font-medium">Your answer:</p>
                          <p className="text-gray-700 mt-1 bg-white/50 p-2 rounded">
                            {answers[question.id] || 'Not answered'}
                          </p>
                        </div>
                        <div>
                          <p className="font-medium">Sample answer:</p>
                          <p className="text-gray-700 mt-1 bg-white/50 p-2 rounded">{question.sampleAnswer}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function parseQuizContent(content: string): Question[] {
  const questions: Question[] = []
  const lines = content.split('\n').filter(l => l.trim())

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Multiple choice questions
    if (line.includes('MC_QUESTION:')) {
      const questionText = line.replace(/\*\*MC_QUESTION:\*\*/, '').replace('MC_QUESTION:', '').trim()
      const options: string[] = []

      // Collect options
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const optionLine = lines[j].trim()
        if (optionLine.match(/^[A-D]\)/)) {
          options.push(optionLine.substring(3).trim())
        } else if (optionLine.includes('_QUESTION:')) {
          break
        }
      }

      if (options.length > 0) {
        questions.push({
          type: 'mc',
          id: `q-${questions.length}`,
          question: questionText,
          options,
          correctAnswer: options[0] // First option as default, should be parsed from answer key
        })
      }
    }
    // True/False questions
    else if (line.includes('TF_QUESTION:')) {
      const questionText = line.replace(/\*\*TF_QUESTION:\*\*/, '').replace('TF_QUESTION:', '').trim()
      questions.push({
        type: 'tf',
        id: `q-${questions.length}`,
        question: questionText,
        correctAnswer: true // Default, should be parsed from answer key
      })
    }
    // Short answer questions
    else if (line.includes('SA_QUESTION:')) {
      const questionText = line.replace(/\*\*SA_QUESTION:\*\*/, '').replace('SA_QUESTION:', '').trim()
      questions.push({
        type: 'sa',
        id: `q-${questions.length}`,
        question: questionText,
        sampleAnswer: 'Review the study materials for guidance on this topic.'
      })
    }
  }

  return questions
}
