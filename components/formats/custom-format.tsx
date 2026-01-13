"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  ChevronDown,
  ChevronUp,
  CheckCircle,
  Circle,
  BookOpen,
  Info,
  AlertTriangle,
  Star,
  CheckSquare,
  RefreshCw
} from 'lucide-react'
import {
  CustomGuideContent,
  CustomSection,
  isTextContent,
  isDefinitionContent,
  isAlertContent,
  isQuizContent,
  isChecklistContent,
  isTableContent,
  QuizQuestion,
  DefinitionColorVariant
} from '@/lib/types/custom-guide'

interface CustomFormatProps {
  content: CustomGuideContent
  studyGuideId: string
}

export default function CustomFormat({ content, studyGuideId }: CustomFormatProps) {
  // Get all section IDs for progress tracking
  const allSectionIds = getAllSectionIds(content.sections)

  // State for tracking progress
  const [expandedSections, setExpandedSections] = useState<string[]>(allSectionIds)
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({})

  // Load saved progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem(`custom-guide-progress-${studyGuideId}`)
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress)
        if (parsed.completedSections) setCompletedSections(parsed.completedSections)
        if (parsed.checklistItems) setChecklistItems(parsed.checklistItems)
      } catch (e) {
        console.error('Error loading progress:', e)
      }
    }
  }, [studyGuideId])

  // Save progress to localStorage when it changes
  useEffect(() => {
    const progress = { completedSections, checklistItems }
    localStorage.setItem(`custom-guide-progress-${studyGuideId}`, JSON.stringify(progress))
  }, [completedSections, checklistItems, studyGuideId])

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const toggleCompleted = (sectionId: string) => {
    setCompletedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const toggleChecklistItem = (itemId: string) => {
    setChecklistItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }

  const progressPercentage = allSectionIds.length > 0
    ? (completedSections.length / allSectionIds.length) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Progress Card */}
      <div className="max-w-5xl mx-auto px-4 print:hidden">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {completedSections.length} of {allSectionIds.length} sections complete
                  </span>
                </div>
                <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
                  {Math.round(progressPercentage)}%
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
              {progressPercentage === 100 && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Congratulations! You've completed all sections.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Sections */}
      <div className="max-w-5xl mx-auto space-y-4 px-4">
        {content.sections.map(section => (
          <SectionRenderer
            key={section.id}
            section={section}
            expandedSections={expandedSections}
            completedSections={completedSections}
            toggleSection={toggleSection}
            toggleCompleted={toggleCompleted}
            checklistItems={checklistItems}
            toggleChecklistItem={toggleChecklistItem}
            level={0}
          />
        ))}
      </div>
    </div>
  )
}

// Get all section IDs that should be tracked for progress
function getAllSectionIds(sections: CustomSection[]): string[] {
  const ids: string[] = []
  for (const section of sections) {
    if (section.type === 'section') {
      ids.push(section.id)
    }
    if (section.children) {
      ids.push(...getAllSectionIds(section.children))
    }
  }
  return ids
}

// Section Renderer Component
function SectionRenderer({
  section,
  expandedSections,
  completedSections,
  toggleSection,
  toggleCompleted,
  checklistItems,
  toggleChecklistItem,
  level
}: {
  section: CustomSection
  expandedSections: string[]
  completedSections: string[]
  toggleSection: (id: string) => void
  toggleCompleted: (id: string) => void
  checklistItems: Record<string, boolean>
  toggleChecklistItem: (id: string) => void
  level: number
}) {
  const isExpanded = expandedSections.includes(section.id)
  const isCompleted = completedSections.includes(section.id)
  const hasChildren = section.children && section.children.length > 0

  // Render different content types
  switch (section.type) {
    case 'section':
      return (
        <SectionCard
          section={section}
          isExpanded={isExpanded}
          isCompleted={isCompleted}
          hasChildren={hasChildren}
          toggleSection={toggleSection}
          toggleCompleted={toggleCompleted}
          expandedSections={expandedSections}
          completedSections={completedSections}
          checklistItems={checklistItems}
          toggleChecklistItem={toggleChecklistItem}
          level={level}
        />
      )

    case 'text':
      if (isTextContent(section.content)) {
        return <TextBlock content={section.content.markdown} />
      }
      return null

    case 'definition':
      if (isDefinitionContent(section.content)) {
        return (
          <DefinitionBlock
            term={section.content.term}
            definition={section.content.definition}
            examples={section.content.examples}
            colorVariant={section.content.colorVariant}
          />
        )
      }
      return null

    case 'alert':
      if (isAlertContent(section.content)) {
        return (
          <AlertBlock
            variant={section.content.variant}
            title={section.content.title}
            message={section.content.message}
          />
        )
      }
      return null

    case 'quiz':
      if (isQuizContent(section.content)) {
        return <QuizBlock questions={section.content.questions} sectionId={section.id} />
      }
      return null

    case 'checklist':
      if (isChecklistContent(section.content)) {
        return (
          <ChecklistBlock
            items={section.content.items}
            checklistItems={checklistItems}
            toggleChecklistItem={toggleChecklistItem}
            sectionId={section.id}
          />
        )
      }
      return null

    case 'table':
      if (isTableContent(section.content)) {
        return (
          <TableBlock
            headers={section.content.headers}
            rows={section.content.rows}
            headerStyle={section.content.headerStyle}
          />
        )
      }
      return null

    default:
      return null
  }
}

// Section Card (collapsible section with children)
function SectionCard({
  section,
  isExpanded,
  isCompleted,
  hasChildren,
  toggleSection,
  toggleCompleted,
  expandedSections,
  completedSections,
  checklistItems,
  toggleChecklistItem,
  level
}: {
  section: CustomSection
  isExpanded: boolean
  isCompleted: boolean
  hasChildren: boolean
  toggleSection: (id: string) => void
  toggleCompleted: (id: string) => void
  expandedSections: string[]
  completedSections: string[]
  checklistItems: Record<string, boolean>
  toggleChecklistItem: (id: string) => void
  level: number
}) {
  const getBorderColor = () => {
    if (level === 0) return 'border-l-4 border-blue-600'
    if (level === 1) return 'border-l-4 border-indigo-500'
    return 'border-l-4 border-gray-400'
  }

  const getTitleSize = () => {
    if (level === 0) return 'text-xl'
    if (level === 1) return 'text-lg'
    return 'text-base'
  }

  return (
    <Card className={`${getBorderColor()} print:break-inside-avoid`}>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50/50 transition-colors print:cursor-default"
        onClick={() => toggleSection(section.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleCompleted(section.id)
              }}
              className="p-1 h-auto print:hidden"
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </Button>
            <CardTitle className={getTitleSize()}>
              {section.title}
            </CardTitle>
          </div>
          {(hasChildren || section.content) && (
            <div className="print:hidden">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          )}
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="print:block space-y-4">
          {/* Render section content if present */}
          {section.content && section.type === 'section' && isTextContent(section.content) && (
            <TextBlock content={section.content.markdown} />
          )}

          {/* Render children */}
          {hasChildren && (
            <div className="space-y-3">
              {section.children!.map(child => (
                <SectionRenderer
                  key={child.id}
                  section={child}
                  expandedSections={expandedSections}
                  completedSections={completedSections}
                  toggleSection={toggleSection}
                  toggleCompleted={toggleCompleted}
                  checklistItems={checklistItems}
                  toggleChecklistItem={toggleChecklistItem}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

// Text Block
function TextBlock({ content }: { content: string }) {
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: formatMarkdown(content) }}
    />
  )
}

// Definition Block
function DefinitionBlock({
  term,
  definition,
  examples,
  colorVariant = 'purple'
}: {
  term: string
  definition: string
  examples?: string[]
  colorVariant?: DefinitionColorVariant
}) {
  const getDefinitionStyles = () => {
    switch (colorVariant) {
      case 'blue':
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50',
          title: 'text-blue-900',
          text: 'text-blue-800',
          textLight: 'text-blue-700'
        }
      case 'teal':
        return {
          border: 'border-teal-500',
          bg: 'bg-teal-50',
          title: 'text-teal-900',
          text: 'text-teal-800',
          textLight: 'text-teal-700'
        }
      case 'green':
        return {
          border: 'border-green-500',
          bg: 'bg-green-50',
          title: 'text-green-900',
          text: 'text-green-800',
          textLight: 'text-green-700'
        }
      case 'pink':
        return {
          border: 'border-pink-500',
          bg: 'bg-pink-50',
          title: 'text-pink-900',
          text: 'text-pink-800',
          textLight: 'text-pink-700'
        }
      case 'orange':
        return {
          border: 'border-orange-500',
          bg: 'bg-orange-50',
          title: 'text-orange-900',
          text: 'text-orange-800',
          textLight: 'text-orange-700'
        }
      case 'purple':
      default:
        return {
          border: 'border-purple-500',
          bg: 'bg-purple-50',
          title: 'text-purple-900',
          text: 'text-purple-800',
          textLight: 'text-purple-700'
        }
    }
  }

  const styles = getDefinitionStyles()

  return (
    <div className={`border-l-4 ${styles.border} ${styles.bg} p-4 rounded-r-lg`}>
      <h4 className={`font-bold ${styles.title} mb-1`}>{term}</h4>
      <p className={styles.text}>{definition}</p>
      {examples && examples.length > 0 && (
        <div className={`mt-2 text-sm ${styles.textLight}`}>
          <span className="font-medium">Examples:</span>
          <ul className="list-disc ml-5 mt-1">
            {examples.map((example, i) => (
              <li key={i}>{example}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// Alert Block
function AlertBlock({
  variant,
  title,
  message
}: {
  variant: 'info' | 'warning' | 'success' | 'exam-tip'
  title?: string
  message: string
}) {
  const getAlertStyles = () => {
    switch (variant) {
      case 'info':
        return {
          border: 'border-blue-200',
          bg: 'bg-blue-50',
          text: 'text-blue-800',
          icon: <Info className="h-4 w-4 text-blue-600" />
        }
      case 'warning':
        return {
          border: 'border-red-200',
          bg: 'bg-red-50',
          text: 'text-red-800',
          icon: <AlertTriangle className="h-4 w-4 text-red-600" />
        }
      case 'success':
        return {
          border: 'border-green-200',
          bg: 'bg-green-50',
          text: 'text-green-800',
          icon: <CheckCircle className="h-4 w-4 text-green-600" />
        }
      case 'exam-tip':
        return {
          border: 'border-yellow-200',
          bg: 'bg-yellow-50',
          text: 'text-yellow-800',
          icon: <Star className="h-4 w-4 text-yellow-600" />
        }
    }
  }

  const styles = getAlertStyles()

  return (
    <Alert className={`${styles.border} ${styles.bg}`}>
      {styles.icon}
      <AlertDescription className={styles.text}>
        {title && <strong>{title}: </strong>}
        {message}
      </AlertDescription>
    </Alert>
  )
}

// Quiz Block
function QuizBlock({
  questions,
  sectionId
}: {
  questions: QuizQuestion[]
  sectionId: string
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [showAnswer, setShowAnswer] = useState(false)
  const [shuffledQuestions, setShuffledQuestions] = useState(questions)

  const currentQuestion = shuffledQuestions[currentIndex]

  const shuffleQuestions = () => {
    const shuffled = [...questions].sort(() => Math.random() - 0.5)
    setShuffledQuestions(shuffled)
    setCurrentIndex(0)
    setUserAnswer('')
    setShowAnswer(false)
  }

  const handleSubmit = () => {
    setShowAnswer(true)
  }

  const nextQuestion = () => {
    if (currentIndex < shuffledQuestions.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setUserAnswer('')
      setShowAnswer(false)
    }
  }

  const prevQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setUserAnswer('')
      setShowAnswer(false)
    }
  }

  const isCorrect = () => {
    if (currentQuestion.questionType === 'true-false') {
      return userAnswer.toLowerCase() === String(currentQuestion.correctAnswer).toLowerCase()
    }
    return userAnswer.toLowerCase().trim() === String(currentQuestion.correctAnswer).toLowerCase().trim()
  }

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader className="bg-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-indigo-600" />
            Practice Questions
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {currentIndex + 1} / {shuffledQuestions.length}
            </Badge>
            <Button variant="ghost" size="sm" onClick={shuffleQuestions}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6 space-y-4">
        <div className="font-medium text-gray-900">
          {currentQuestion.question}
        </div>

        {/* Multiple Choice */}
        {currentQuestion.questionType === 'multiple-choice' && currentQuestion.options && (
          <RadioGroup value={userAnswer} onValueChange={setUserAnswer}>
            {currentQuestion.options.map((option, i) => (
              <div key={i} className="flex items-center space-x-2">
                <RadioGroupItem
                  value={option}
                  id={`${sectionId}-q${currentIndex}-opt${i}`}
                  className="border-2 border-gray-400 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
                />
                <Label
                  htmlFor={`${sectionId}-q${currentIndex}-opt${i}`}
                  className={`cursor-pointer ${
                    showAnswer && option === currentQuestion.correctAnswer
                      ? 'text-green-600 font-medium'
                      : showAnswer && option === userAnswer && option !== currentQuestion.correctAnswer
                      ? 'text-red-600'
                      : ''
                  }`}
                >
                  {option}
                </Label>
              </div>
            ))}
          </RadioGroup>
        )}

        {/* True/False */}
        {currentQuestion.questionType === 'true-false' && (
          <RadioGroup value={userAnswer} onValueChange={setUserAnswer}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="true"
                id={`${sectionId}-q${currentIndex}-true`}
                className="border-2 border-gray-400 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor={`${sectionId}-q${currentIndex}-true`}>True</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem
                value="false"
                id={`${sectionId}-q${currentIndex}-false`}
                className="border-2 border-gray-400 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <Label htmlFor={`${sectionId}-q${currentIndex}-false`}>False</Label>
            </div>
          </RadioGroup>
        )}

        {/* Short Answer */}
        {currentQuestion.questionType === 'short-answer' && (
          <Textarea
            placeholder="Type your answer..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
            className="min-h-[100px]"
          />
        )}

        {/* Calculation */}
        {currentQuestion.questionType === 'calculation' && (
          <Input
            placeholder="Enter your answer..."
            value={userAnswer}
            onChange={(e) => setUserAnswer(e.target.value)}
          />
        )}

        {/* Answer feedback */}
        {showAnswer && (
          <Alert className={isCorrect() ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <AlertDescription className={isCorrect() ? 'text-green-800' : 'text-red-800'}>
              {isCorrect() ? (
                <span className="font-medium">Correct!</span>
              ) : (
                <>
                  <span className="font-medium">Correct answer: </span>
                  {String(currentQuestion.correctAnswer)}
                </>
              )}
              {currentQuestion.explanation && (
                <p className="mt-2 text-sm">{currentQuestion.explanation}</p>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={prevQuestion}
            disabled={currentIndex === 0}
          >
            Previous
          </Button>
          {!showAnswer ? (
            <Button onClick={handleSubmit} disabled={!userAnswer}>
              Check Answer
            </Button>
          ) : (
            <Button onClick={nextQuestion} disabled={currentIndex === shuffledQuestions.length - 1}>
              Next
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// Checklist Block
function ChecklistBlock({
  items,
  checklistItems,
  toggleChecklistItem,
  sectionId
}: {
  items: { id: string; label: string }[]
  checklistItems: Record<string, boolean>
  toggleChecklistItem: (id: string) => void
  sectionId: string
}) {
  return (
    <div className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50/50">
      <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
        <CheckSquare className="h-4 w-4" />
        Checklist
      </h4>
      <div className="space-y-2">
        {items.map(item => {
          const itemId = `${sectionId}-${item.id}`
          const isChecked = checklistItems[itemId] || false

          return (
            <div key={item.id} className="flex items-start gap-2">
              <Checkbox
                id={itemId}
                checked={isChecked}
                onCheckedChange={() => toggleChecklistItem(itemId)}
                className="mt-0.5 border-2 border-gray-400 data-[state=checked]:border-blue-600 data-[state=checked]:bg-blue-600"
              />
              <label
                htmlFor={itemId}
                className={`text-sm leading-relaxed cursor-pointer select-none ${
                  isChecked ? 'line-through text-gray-500' : ''
                }`}
              >
                {item.label}
              </label>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Table Block
function TableBlock({
  headers,
  rows,
  headerStyle = 'default'
}: {
  headers: string[]
  rows: string[][]
  headerStyle?: 'default' | 'blue' | 'green' | 'purple'
}) {
  const getHeaderBg = () => {
    switch (headerStyle) {
      case 'blue':
        return 'bg-blue-100'
      case 'green':
        return 'bg-green-100'
      case 'purple':
        return 'bg-purple-100'
      default:
        return 'bg-gray-100'
    }
  }

  return (
    <div className="overflow-x-auto my-4">
      <table className="min-w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">
        <thead className={getHeaderBg()}>
          <tr>
            {headers.map((header, i) => (
              <th
                key={i}
                className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="border border-gray-300 px-4 py-2 text-gray-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// Markdown formatter with improved regex patterns
function formatMarkdown(content: string): string {
  return content
    // Headers (process first, line-based)
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-4 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>')
    // Bold: use [\s\S] to match across newlines, +? for non-empty non-greedy
    .replace(/\*\*([\s\S]+?)\*\*/g, '<strong class="text-blue-700">$1</strong>')
    // Italic: match single * not adjacent to other * (process after bold so ** is already converted)
    .replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>')
    // Lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-6 space-y-1">$&</ul>')
    // Line breaks (do last)
    .replace(/\n/g, '<br>')
}
