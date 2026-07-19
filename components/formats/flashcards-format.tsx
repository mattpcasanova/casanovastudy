"use client"

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { ChevronLeft, ChevronRight, Shuffle, Check, X, RotateCcw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { formatContent } from '@/lib/formats/format-content'
import { fontDisplay, eyebrow, state as stateStyle, capitalizeFirst, formatAccent } from '@/lib/formats/design'

const accent = formatAccent.flashcards

// Split a prose answer into a bold TL;DR (first sentence) + a muted extended
// remainder. Answers that lead with a table/list/heading are left whole (the
// TL;DR split would break their structure).
function structureAnswer(answer: string): { tldr: string; rest: string; block: boolean } {
  const block = /^\s*\|.*\|/m.test(answer) || /^\s*[-•]\s/m.test(answer) || /^#{1,4}\s/m.test(answer)
  if (block) return { tldr: '', rest: answer, block: true }
  const m = answer.match(/^([\s\S]{24,}?[.!?])\s+([\s\S]+)$/)
  if (m && m[2].trim()) return { tldr: m[1].trim().replace(/\*\*/g, ''), rest: m[2].trim(), block: false }
  return { tldr: answer.trim().replace(/\*\*/g, ''), rest: '', block: false }
}

interface FlashcardsFormatProps {
  content: string
  subject: string
  studyGuideId?: string
  userId?: string
}

interface Flashcard {
  id: string
  question: string
  answer: string
}

export default function FlashcardsFormat({ content, subject, studyGuideId, userId }: FlashcardsFormatProps) {
  const flashcards = parseFlashcards(content)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set())
  const [difficultCards, setDifficultCards] = useState<Set<string>>(new Set())
  const [isLoadingProgress, setIsLoadingProgress] = useState(!!userId)
  const [isSavingProgress, setIsSavingProgress] = useState(false)
  const hasLoadedProgressRef = useRef(false)

  const currentCard = flashcards[currentIndex]
  const progress = ((currentIndex + 1) / flashcards.length) * 100

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    const headers: HeadersInit = { 'Content-Type': 'application/json' }
    if (session?.access_token) headers['Authorization'] = `Bearer ${session.access_token}`
    return headers
  }

  useEffect(() => {
    const loadProgress = async () => {
      if (!studyGuideId || !userId) {
        hasLoadedProgressRef.current = false
        setIsLoadingProgress(false)
        return
      }
      if (hasLoadedProgressRef.current) return

      hasLoadedProgressRef.current = true
      setIsLoadingProgress(true)

      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/flashcard-progress?studyGuideId=${studyGuideId}`, { headers })
        if (!response.ok) return

        const data = await response.json()
        const { progress } = data

        if (progress && typeof progress === 'object') {
          const mastered = new Set<string>()
          const difficult = new Set<string>()
          Object.entries(progress).forEach(([cardId, status]) => {
            if (status === 'mastered') mastered.add(cardId)
            else if (status === 'difficult') difficult.add(cardId)
          })
          setMasteredCards(mastered)
          setDifficultCards(difficult)
        }
      } catch (error) {
        console.error('Error loading flashcard progress:', error)
      } finally {
        setIsLoadingProgress(false)
      }
    }

    loadProgress()
  }, [studyGuideId, userId])

  const saveProgress = async (cardId: string, status: 'mastered' | 'difficult') => {
    if (!studyGuideId || !userId) return
    setIsSavingProgress(true)
    try {
      const headers = await getAuthHeaders()
      await fetch('/api/flashcard-progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ studyGuideId, cardId, status, userId })
      })
    } catch (error) {
      console.error('Error saving progress:', error)
    } finally {
      setIsSavingProgress(false)
    }
  }

  const resetProgress = async () => {
    if (!studyGuideId || !userId) {
      setMasteredCards(new Set())
      setDifficultCards(new Set())
      return
    }
    try {
      const headers = await getAuthHeaders()
      const response = await fetch(`/api/flashcard-progress?studyGuideId=${studyGuideId}`, { method: 'DELETE', headers })
      if (response.ok) {
        setMasteredCards(new Set())
        setDifficultCards(new Set())
      }
    } catch (error) {
      console.error('Error resetting progress:', error)
    }
  }

  const nextCard = () => {
    setIsFlipped(false)
    setShowMore(false)
    setCurrentIndex((prev) => (prev + 1) % flashcards.length)
  }

  const prevCard = () => {
    setIsFlipped(false)
    setShowMore(false)
    setCurrentIndex((prev) => (prev - 1 + flashcards.length) % flashcards.length)
  }

  const markMastered = () => {
    setMasteredCards(prev => new Set(prev).add(currentCard.id))
    setDifficultCards(prev => { const u = new Set(prev); u.delete(currentCard.id); return u })
    saveProgress(currentCard.id, 'mastered')
    nextCard()
  }

  const markDifficult = () => {
    setDifficultCards(prev => new Set(prev).add(currentCard.id))
    setMasteredCards(prev => { const u = new Set(prev); u.delete(currentCard.id); return u })
    saveProgress(currentCard.id, 'difficult')
    nextCard()
  }

  const shuffleCards = () => {
    setCurrentIndex(Math.floor(Math.random() * flashcards.length))
    setIsFlipped(false)
    setShowMore(false)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowLeft') prevCard()
    else if (e.key === 'ArrowRight') nextCard()
    else if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault()
      setIsFlipped(f => !f)
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  const cleanQuestion = (text: string) => text.replace(/^\*\*|\*\*$/g, '').trim()

  const isMastered = masteredCards.has(currentCard.id)
  const isDifficult = difficultCards.has(currentCard.id)
  const hasState = isMastered || isDifficult
  const subjectLabel = capitalizeFirst(subject)

  const cardState = isMastered
    ? stateStyle.mastered
    : isDifficult
    ? stateStyle.difficult
    : stateStyle.neutral

  // Ring: strong status color when marked, quiet slate when not.
  const ringCls = hasState ? cn('ring-2', cardState.ring) : 'ring-1 ring-slate-200'
  const { tldr, rest, block } = structureAnswer(currentCard.answer)

  const face = 'absolute inset-0 backface-hidden overflow-hidden rounded-2xl border border-slate-200 shadow-md ring-inset flex flex-col'

  // Prominent per-card status ribbon so "Got it" / "Still learning" is obvious.
  const statusBand = hasState ? (
    <div className={cn('flex items-center justify-center gap-1.5 py-1.5 text-xs font-semibold uppercase tracking-wide text-white', isMastered ? 'bg-emerald-500' : 'bg-amber-500')}>
      {isMastered ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
      {isMastered ? 'Got it' : 'Still learning'}
    </div>
  ) : null

  return (
    <div className={cn(displaySerif.variable, 'max-w-2xl mx-auto space-y-6')}>
      {/* Progress */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-5 print:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-600">
            Card <span className="text-slate-900 font-semibold">{currentIndex + 1}</span> of {flashcards.length}
          </span>
          <div className="flex items-center gap-2">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', stateStyle.mastered.soft)}>
              <Check className="h-3 w-3" />{masteredCards.size}
            </span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', stateStyle.difficult.soft)}>
              <X className="h-3 w-3" />{difficultCards.size}
            </span>
          </div>
        </div>
        <Progress value={progress} className="h-1.5" />
      </div>

      {/* Flashcard */}
      <div className="relative h-[460px] perspective-1000 print:hidden">
        {isLoadingProgress && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80">
            <div className="flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
              <span className="text-sm text-slate-600">Loading your progress…</span>
            </div>
          </div>
        )}
        <div
          className={cn('relative w-full h-full transition-transform duration-500 transform-style-3d cursor-pointer motion-reduce:transition-none', isFlipped && 'rotate-y-180')}
          onClick={() => setIsFlipped(!isFlipped)}
          role="button"
          tabIndex={0}
          aria-label="Flip card"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setIsFlipped(f => !f) } }}
        >
          {/* Front — Question (white face, format-color label) */}
          <div className={cn(face, 'bg-white', ringCls)}>
            {statusBand}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-3">
              <span className={cn(eyebrow, accent.text)}>Question</span>
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">{subjectLabel}</span>
            </div>
            <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-6">
              <p className={cn(fontDisplay, 'text-center text-[1.5rem] leading-snug font-medium text-slate-900')}>
                {cleanQuestion(currentCard.question)}
              </p>
            </div>
            <p className="pb-5 text-center text-xs text-slate-400">Click, or press Space, to flip</p>
          </div>

          {/* Back — Answer (tinted face, filled label) so it reads distinctly from the question */}
          <div className={cn(face, 'rotate-y-180 bg-slate-50', ringCls)}>
            {statusBand}
            <div className="flex items-center justify-between border-b border-slate-200/70 bg-white/60 px-6 py-3">
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white', accent.solid)}>Answer</span>
              <span className="text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">{subjectLabel}</span>
            </div>
            <div className="flex-1 overflow-y-auto px-8 py-6">
              {block ? (
                <div
                  className="prose prose-sm max-w-none text-slate-700 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: formatContent(currentCard.answer) }}
                />
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <p className={cn(fontDisplay, 'text-[1.4rem] font-medium leading-snug text-slate-900')}>
                    {tldr}
                  </p>
                  {/* Extended answer is collapsed by default — the card stays brief. */}
                  {rest && !showMore && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setShowMore(true) }}
                      className={cn('mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] hover:underline', accent.text)}
                    >
                      Show more
                    </button>
                  )}
                  {rest && showMore && (
                    <>
                      <div className="my-4 h-px w-10 bg-slate-300" />
                      <div
                        className="prose prose-sm max-w-none text-left text-slate-500 [&_p]:mb-2"
                        dangerouslySetInnerHTML={{ __html: formatContent(rest) }}
                      />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setShowMore(false) }}
                        className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-slate-400 hover:underline"
                      >
                        Show less
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
            <p className="pb-5 text-center text-xs text-slate-400">Click to flip back</p>
          </div>
        </div>
      </div>

      {/* Rate + navigate */}
      <div className="grid grid-cols-2 gap-3 print:hidden">
        <Button
          onClick={markDifficult}
          variant="outline"
          size="lg"
          className="border-amber-200 text-amber-700 hover:bg-amber-500 hover:text-white hover:border-amber-500"
        >
          <X className="h-4 w-4 mr-2" />
          Still learning
        </Button>
        <Button
          onClick={markMastered}
          variant="outline"
          size="lg"
          className="border-emerald-200 text-emerald-700 hover:bg-emerald-500 hover:text-white hover:border-emerald-500"
        >
          <Check className="h-4 w-4 mr-2" />
          Got it
        </Button>
      </div>

      <div className="flex items-center justify-between gap-3 print:hidden">
        <Button onClick={prevCard} variant="ghost" size="sm" className="text-slate-600">
          <ChevronLeft className="h-4 w-4 mr-1" /> Previous
        </Button>
        <div className="flex gap-1">
          <Button onClick={shuffleCards} variant="ghost" size="sm" className="text-slate-600">
            <Shuffle className="h-4 w-4 mr-1.5" /> Shuffle
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-600"
                disabled={masteredCards.size === 0 && difficultCards.size === 0}
              >
                <RotateCcw className="h-4 w-4 mr-1.5" /> Reset
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
                <AlertDialogDescription>
                  This clears every "Got it" and "Still learning" marking for this guide. You'll start fresh. This can't be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction className="bg-indigo-600 hover:bg-indigo-700" onClick={resetProgress}>
                  Reset progress
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Button onClick={nextCard} variant="ghost" size="sm" className="text-slate-600">
          Next <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Print version — all cards */}
      <div className="hidden print:block space-y-6">
        {flashcards.map((card, index) => (
          <div key={card.id} className="rounded-lg border border-slate-300 p-6 break-inside-avoid">
            <p className={cn(eyebrow, 'text-slate-500')}>Question {index + 1}</p>
            <p className="text-lg font-semibold mt-1">{cleanQuestion(card.question)}</p>
            <div className="mt-4 border-t border-slate-200 pt-4">
              <p className={cn(eyebrow, 'text-slate-500')}>Answer</p>
              <div className="mt-1 prose prose-sm" dangerouslySetInnerHTML={{ __html: formatContent(card.answer) }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function parseFlashcards(content: string): Flashcard[] {
  const cards: Flashcard[] = []
  const lines = content.split('\n')
  let counter = 0

  const qMarker = /^\*{0,2}(?:Q|Question)\s*:\s*/i
  const aMarker = /^\*{0,2}(?:A|Answer)\s*:\s*\*{0,2}\s*/i
  // A line that ends the current answer / key-terms block.
  const isBreak = (l: string) =>
    /^#{1,6}\s/.test(l) ||
    /^-{3,}$/.test(l) ||
    qMarker.test(l) ||
    /^\*{0,2}(?:key terms|exam|remember|study tips)/i.test(l)

  const cleanInline = (s: string) => s.replace(/\*\*/g, '').replace(/^\*|\*$/g, '').trim()

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    // Q/A pair — the documented flashcard format. Q and A are usually separated
    // by a blank line, so scan across lines rather than splitting on \n\n (the
    // old split() dropped every card because it separated each Q from its A).
    if (qMarker.test(line)) {
      let q = cleanInline(line.replace(qMarker, ''))
      i++
      while (i < lines.length && lines[i].trim() && !aMarker.test(lines[i].trim()) && !qMarker.test(lines[i].trim())) {
        q += ' ' + cleanInline(lines[i].trim())
        i++
      }
      while (i < lines.length && !lines[i].trim()) i++ // skip blanks between Q and A
      let a = ''
      if (i < lines.length && aMarker.test(lines[i].trim())) {
        a = lines[i].trim().replace(aMarker, '')
        i++
        // Keep original lines (incl. blanks) so multi-line answers and markdown
        // tables retain structure — never flatten before formatContent (ReDoS).
        while (i < lines.length && !isBreak(lines[i].trim())) {
          a += '\n' + lines[i]
          i++
        }
      }
      a = a.trim()
      if (q && a) cards.push({ id: `card-${counter++}`, question: q, answer: a })
      continue
    }

    // "Key Terms to Master" list → one card per term (front = term, back = def).
    if (/^\*{0,2}key terms/i.test(line)) {
      i++
      while (i < lines.length) {
        const t = lines[i].trim()
        if (isBreak(t)) break
        const bullet = t.match(/^[-•*]\s+(.+)$/)
        if (bullet) {
          const m = bullet[1].match(/^\*{0,2}(.+?)\*{0,2}\s*[-–—:]\s+(.+)$/)
          if (m) {
            const term = cleanInline(m[1])
            const def = cleanInline(m[2])
            if (term && def) cards.push({ id: `card-${counter++}`, question: term, answer: def })
          }
        }
        i++
      }
      continue
    }

    i++
  }

  // Fallback for content that uses neither Q:/A: markers nor a key-terms list:
  // treat each blank-line-separated block as a card.
  if (cards.length === 0) {
    const sections = content.split('\n\n').filter(s => s.trim())
    for (const section of sections) {
      const ls = section.split('\n').filter(l => l.trim())
      if (ls.length < 2) continue
      const first = ls[0].trim()
      if (first === first.toUpperCase() || first.toLowerCase().includes('flashcard') || first.toLowerCase().includes('study guide')) continue
      const question = cleanInline(ls[0])
      const answer = ls.slice(1).join('\n').trim()
      if (question && answer) cards.push({ id: `card-${counter++}`, question, answer })
    }
  }

  return cards
}
