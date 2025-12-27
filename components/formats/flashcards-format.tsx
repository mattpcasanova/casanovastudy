"use client"

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ChevronLeft, ChevronRight, RotateCw, CheckCircle, X, BookOpen } from 'lucide-react'

interface FlashcardsFormatProps {
  content: string
  subject: string
}

interface Flashcard {
  id: string
  question: string
  answer: string
}

export default function FlashcardsFormat({ content, subject }: FlashcardsFormatProps) {
  const flashcards = parseFlashcards(content)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set())
  const [difficultCards, setDifficultCards] = useState<Set<string>>(new Set())

  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100

  const nextCard = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
  }

  const prevCard = () => {
    setIsFlipped(false)
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
  }

  const markMastered = () => {
    setMasteredCards(prev => new Set(prev).add(currentCard.id))
    setDifficultCards(prev => {
      const updated = new Set(prev)
      updated.delete(currentCard.id)
      return updated
    })
    nextCard()
  }

  const markDifficult = () => {
    setDifficultCards(prev => new Set(prev).add(currentCard.id))
    setMasteredCards(prev => {
      const updated = new Set(prev)
      updated.delete(currentCard.id)
      return updated
    })
    nextCard()
  }

  const shuffleCards = () => {
    setCurrentIndex(Math.floor(Math.random() * flashcards.length))
    setIsFlipped(false)
  }

  // Keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      prevCard()
    } else if (e.key === 'ArrowRight') {
      nextCard()
    } else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setIsFlipped(f => !f)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  // Clean question text (remove ** markers)
  const cleanQuestion = (text: string) => text.replace(/^\*\*|\*\*$/g, '').trim()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Card */}
      <Card className="print:hidden">
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                <span className="text-sm font-medium">
                  Card {currentIndex + 1} of {flashcards.length}
                </span>
              </div>
              <div className="flex gap-4">
                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {masteredCards.size} Mastered
                </Badge>
                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                  <X className="h-3 w-3 mr-1" />
                  {difficultCards.size} Difficult
                </Badge>
              </div>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Flashcard */}
      <div className="relative h-[500px] perspective-1000">
        <div
          className={`relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={() => setIsFlipped(!isFlipped)}
        >
          {/* Front of card */}
          <Card
            className={`absolute inset-0 backface-hidden border-4 shadow-2xl bg-white p-0 ${
              masteredCards.has(currentCard.id)
                ? 'border-green-500'
                : difficultCards.has(currentCard.id)
                ? 'border-red-500'
                : 'border-blue-500'
            }`}
          >
            <div className={`h-20 flex items-center justify-center rounded-t-lg ${
              masteredCards.has(currentCard.id)
                ? 'bg-green-500'
                : difficultCards.has(currentCard.id)
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}>
              <Badge className="bg-white/20 text-white border-white/30">Question</Badge>
            </div>
            <CardContent className="flex flex-col items-center justify-center h-[calc(500px-5rem)] p-8 bg-white">
              <div className="text-center space-y-4">
                <p className="text-2xl font-semibold text-gray-800 leading-relaxed">
                  {cleanQuestion(currentCard.question)}
                </p>
                <p className="text-sm text-gray-500 mt-8">
                  Click to flip
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Back of card */}
          <Card
            className={`absolute inset-0 backface-hidden rotate-y-180 border-4 shadow-2xl bg-white p-0 ${
              masteredCards.has(currentCard.id)
                ? 'border-green-500'
                : difficultCards.has(currentCard.id)
                ? 'border-red-500'
                : 'border-blue-500'
            }`}
          >
            <div className={`h-20 flex items-center justify-center rounded-t-lg ${
              masteredCards.has(currentCard.id)
                ? 'bg-green-500'
                : difficultCards.has(currentCard.id)
                ? 'bg-red-500'
                : 'bg-blue-500'
            }`}>
              <Badge className="bg-white/20 text-white border-white/30">Answer</Badge>
            </div>
            <CardContent className="flex flex-col items-center justify-center h-[calc(500px-5rem)] p-8 bg-white">
              <div className="text-center space-y-4">
                <div
                  className="text-xl text-gray-800 leading-relaxed prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: formatContent(currentCard.answer)
                  }}
                />
                <p className="text-sm text-gray-500 mt-8">
                  Click to flip back
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4 print:hidden">
        <Button
          onClick={prevCard}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          <ChevronLeft className="h-4 w-4 mr-2" />
          Previous
        </Button>

        <div className="flex gap-2">
          <Button
            onClick={markDifficult}
            variant="outline"
            size="lg"
            className="border-red-300 text-red-700 hover:bg-red-600 hover:text-white hover:border-red-600"
          >
            <X className="h-4 w-4 mr-2" />
            Difficult
          </Button>
          <Button
            onClick={markMastered}
            variant="outline"
            size="lg"
            className="border-green-300 text-green-700 hover:bg-green-600 hover:text-white hover:border-green-600"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Mastered
          </Button>
        </div>

        <Button
          onClick={nextCard}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          Next
          <ChevronRight className="h-4 w-4 ml-2" />
        </Button>
      </div>

      <div className="flex justify-center print:hidden">
        <Button
          onClick={shuffleCards}
          variant="outline"
          size="sm"
          className="bg-gray-100 hover:bg-blue-500 hover:text-white hover:border-blue-500 border-gray-300"
        >
          <RotateCw className="h-4 w-4 mr-2" />
          Shuffle Cards
        </Button>
      </div>

      {/* Print version - all cards */}
      <div className="hidden print:block space-y-8">
        {flashcards.map((card, index) => (
          <div key={card.id} className="border-2 border-gray-300 rounded-lg p-6 break-inside-avoid">
            <div className="mb-4">
              <Badge className="bg-blue-600 text-white">Question {index + 1}</Badge>
              <p className="text-lg font-semibold mt-2">{cleanQuestion(card.question)}</p>
            </div>
            <div className="border-t-2 border-gray-200 pt-4">
              <Badge className="bg-indigo-600 text-white">Answer</Badge>
              <div
                className="mt-2 prose prose-sm"
                dangerouslySetInnerHTML={{ __html: formatContent(card.answer) }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function parseFlashcards(content: string): Flashcard[] {
  const flashcards: Flashcard[] = []
  const sections = content.split('\n\n').filter(s => s.trim())

  let cardCounter = 0

  for (const section of sections) {
    const lines = section.split('\n').filter(l => l.trim())
    if (lines.length < 2) continue

    // Skip sections that look like titles/headers (all uppercase, contains "FLASHCARD", etc.)
    const firstLine = lines[0].trim()
    if (
      firstLine === firstLine.toUpperCase() ||
      firstLine.toLowerCase().includes('flashcard') ||
      firstLine.toLowerCase().includes('study guide') ||
      lines.length === 1
    ) {
      continue
    }

    let question = ''
    let answer = ''

    // Look for Q: and A: markers
    const qIndex = lines.findIndex(line =>
      line.toLowerCase().includes('q:') ||
      line.toLowerCase().includes('question:')
    )
    const aIndex = lines.findIndex(line =>
      line.toLowerCase().includes('a:') ||
      line.toLowerCase().includes('answer:')
    )

    if (qIndex !== -1 && aIndex !== -1) {
      question = lines[qIndex].replace(/^(Q:|Question:)\s*/i, '').trim()
      answer = lines.slice(aIndex).join(' ').replace(/^(A:|Answer:)\s*/i, '').trim()
    } else if (lines.length >= 2) {
      // Assume first line is question, rest is answer
      question = lines[0].trim()
      answer = lines.slice(1).join(' ').trim()
    }

    if (question && answer) {
      flashcards.push({
        id: `card-${cardCounter++}`,
        question,
        answer
      })
    }
  }

  return flashcards
}

function formatContent(content: string): string {
  // Handle markdown tables with separator row
  const tableRegex = /\|(.+\|)+\n\|[-:\s|]+\|\n(\|.+\|(\n)?)+/gm
  let processedContent = content.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n')
    if (lines.length < 2) return match

    const headerCells = lines[0].split('|').filter(cell => cell.trim())
    const bodyRows = lines.slice(2)

    let tableHtml = '<div class="overflow-x-auto my-2"><table class="min-w-full border-collapse border border-gray-300 rounded text-sm">'
    tableHtml += '<thead class="bg-blue-50"><tr>'
    headerCells.forEach(cell => {
      tableHtml += `<th class="border border-gray-300 px-2 py-1 text-left font-semibold">${cell.trim()}</th>`
    })
    tableHtml += '</tr></thead><tbody>'

    bodyRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell.trim())
      const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      tableHtml += `<tr class="${bgClass}">`
      cells.forEach(cell => {
        tableHtml += `<td class="border border-gray-300 px-2 py-1">${cell.trim()}</td>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</tbody></table></div>'
    return tableHtml
  })

  // Handle simpler tables without separator row (consecutive lines with pipes)
  const simpleTableRegex = /(\|[^|\n]+\|[^|\n]*\|?\n?){2,}/gm
  processedContent = processedContent.replace(simpleTableRegex, (match) => {
    // Check if already processed (contains HTML)
    if (match.includes('<table') || match.includes('<div')) return match

    const lines = match.trim().split('\n').filter(l => l.includes('|'))
    if (lines.length < 2) return match

    // First line is header
    const headerCells = lines[0].split('|').filter(cell => cell.trim())
    if (headerCells.length < 2) return match // Not a real table

    // Check if second line is a separator (skip it if so)
    let startRow = 1
    if (lines[1] && /^[\s|:-]+$/.test(lines[1])) {
      startRow = 2
    }
    const bodyRows = lines.slice(startRow)

    let tableHtml = '<div class="overflow-x-auto my-2"><table class="min-w-full border-collapse border border-gray-300 rounded text-sm">'
    tableHtml += '<thead class="bg-blue-50"><tr>'
    headerCells.forEach(cell => {
      tableHtml += `<th class="border border-gray-300 px-2 py-1 text-left font-semibold">${cell.trim()}</th>`
    })
    tableHtml += '</tr></thead><tbody>'

    bodyRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell.trim())
      if (cells.length === 0) return
      const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      tableHtml += `<tr class="${bgClass}">`
      cells.forEach(cell => {
        tableHtml += `<td class="border border-gray-300 px-2 py-1">${cell.trim()}</td>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</tbody></table></div>'
    return tableHtml
  })

  return processedContent
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-700">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-6 space-y-1">$&</ul>')
}
