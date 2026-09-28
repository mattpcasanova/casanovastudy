"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Button } from '@/components/ui/button'
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
import { ChevronLeft, ChevronRight, Shuffle, Check, X, RotateCcw, Layers, LayoutGrid, RotateCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { fontDisplay, eyebrow, state as stateStyle, capitalizeFirst, formatAccent } from '@/lib/formats/design'
import { normalizeGuideMarkdown, stripEmoji, toTitleCase, plainText } from '@/lib/formats/normalize'
import { StudyMarkdown, InlineMarkdown } from './study-markdown'

const accent = formatAccent.flashcards

// Split a prose answer into a bold TL;DR (first sentence) + a muted extended
// remainder. Answers that lead with a table/list/heading are left whole (the
// TL;DR split would break their structure).
function structureAnswer(answer: string): { tldr: string; rest: string; block: boolean } {
  const block = /^\s*\|.*\|/m.test(answer) || /^\s*[-•]\s/m.test(answer) || /^#{1,4}\s/m.test(answer) || answer.includes('~~~~') || answer.includes('```')
  if (block) return { tldr: '', rest: answer, block: true }
  const m = answer.match(/^([\s\S]{24,}?[.!?])\s+([\s\S]+)$/)
  if (m && m[2].trim()) return { tldr: m[1].trim(), rest: m[2].trim(), block: false }
  return { tldr: answer.trim(), rest: '', block: false }
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
  deck: string
}

type Mode = 'study' | 'list'

export default function FlashcardsFormat({ content, subject, studyGuideId, userId }: FlashcardsFormatProps) {
  const flashcards = useMemo(() => parseFlashcards(content), [content])
  const decks = useMemo(() => {
    const seen: string[] = []
    for (const c of flashcards) if (c.deck && !seen.includes(c.deck)) seen.push(c.deck)
    return seen
  }, [flashcards])

  const [mode, setMode] = useState<Mode>('study')
  const [deck, setDeck] = useState<string | null>(null)
  const [learningOnly, setLearningOnly] = useState(false)
  const [order, setOrder] = useState<number[] | null>(null) // shuffled order, null = natural
  const [position, setPosition] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [masteredCards, setMasteredCards] = useState<Set<string>>(new Set())
  const [difficultCards, setDifficultCards] = useState<Set<string>>(new Set())
  const [isLoadingProgress, setIsLoadingProgress] = useState(!!userId)
  const hasLoadedProgressRef = useRef(false)

  const visible = useMemo(() => {
    const base = flashcards
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => (!deck || c.deck === deck) && (!learningOnly || !masteredCards.has(c.id)))
    if (!order) return base.map(({ c }) => c)
    const rank = new Map(order.map((idx, r) => [idx, r]))
    return [...base].sort((a, b) => (rank.get(a.i) ?? 0) - (rank.get(b.i) ?? 0)).map(({ c }) => c)
    // masteredCards intentionally excluded while studying so a card doesn't vanish mid-flip;
    // the filter re-applies when the filter/deck changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashcards, deck, learningOnly, order])

  const safePos = visible.length ? Math.min(position, visible.length - 1) : 0
  const currentCard = visible[safePos]

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
        const { progress } = await response.json()
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
    try {
      const headers = await getAuthHeaders()
      await fetch('/api/flashcard-progress', {
        method: 'POST',
        headers,
        body: JSON.stringify({ studyGuideId, cardId, status, userId }),
      })
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  const resetProgress = async () => {
    if (studyGuideId && userId) {
      try {
        const headers = await getAuthHeaders()
        const response = await fetch(`/api/flashcard-progress?studyGuideId=${studyGuideId}`, { method: 'DELETE', headers })
        if (!response.ok) return
      } catch (error) {
        console.error('Error resetting progress:', error)
        return
      }
    }
    setMasteredCards(new Set())
    setDifficultCards(new Set())
  }

  const go = useCallback((delta: number) => {
    setIsFlipped(false)
    setShowMore(false)
    setPosition((p) => (visible.length ? (Math.min(p, visible.length - 1) + delta + visible.length) % visible.length : 0))
  }, [visible.length])

  const mark = (status: 'mastered' | 'difficult') => {
    if (!currentCard) return
    const id = currentCard.id
    const add = status === 'mastered' ? setMasteredCards : setDifficultCards
    const remove = status === 'mastered' ? setDifficultCards : setMasteredCards
    add((prev) => new Set(prev).add(id))
    remove((prev) => { const u = new Set(prev); u.delete(id); return u })
    saveProgress(id, status)
    go(1)
  }

  const shuffle = () => {
    const idx = flashcards.map((_, i) => i)
    for (let i = idx.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[idx[i], idx[j]] = [idx[j], idx[i]]
    }
    setOrder(idx)
    setPosition(0)
    setIsFlipped(false)
    setShowMore(false)
  }

  const pickDeck = (d: string | null) => {
    setDeck(d)
    setPosition(0)
    setIsFlipped(false)
    setShowMore(false)
  }

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (mode !== 'study') return
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    if (e.key === 'ArrowLeft') go(-1)
    else if (e.key === 'ArrowRight') go(1)
    else if (e.key === ' ' || e.key === 'Enter') {
      if (target?.tagName === 'BUTTON') return
      e.preventDefault()
      setIsFlipped((f) => !f)
    }
  }, [go, mode])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  if (flashcards.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-600">
        No flashcards were found in this guide.
      </div>
    )
  }

  const subjectLabel = capitalizeFirst(subject)
  const total = flashcards.length
  const masteredCount = flashcards.filter((c) => masteredCards.has(c.id)).length
  const learningCount = flashcards.filter((c) => difficultCards.has(c.id)).length

  return (
    <div className={cn(displaySerif.variable, 'mx-auto max-w-3xl space-y-5')}>
      {/* Overview + controls */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-4 text-sm">
            <Stat value={masteredCount} label="Got it" dot="bg-emerald-500" />
            <Stat value={learningCount} label="Learning" dot="bg-amber-500" />
            <Stat value={total - masteredCount - learningCount} label="New" dot="bg-slate-300" />
          </div>
          <div className="flex rounded-lg bg-slate-100 p-1 text-sm font-medium">
            {([['study', Layers, 'Study'], ['list', LayoutGrid, 'All cards']] as const).map(([m, Icon, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn('inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition', mode === m ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800')}
              >
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        {/* Segmented mastery bar */}
        <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100">
          <div className="bg-emerald-500 transition-all duration-500" style={{ width: `${(masteredCount / total) * 100}%` }} />
          <div className="bg-amber-400 transition-all duration-500" style={{ width: `${(learningCount / total) * 100}%` }} />
        </div>

        {(decks.length > 1 || masteredCount > 0) && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            {decks.length > 1 && (
              <>
                <DeckChip active={deck === null} onClick={() => pickDeck(null)} label="All decks" count={total} />
                {decks.map((d) => (
                  <DeckChip key={d} active={deck === d} onClick={() => pickDeck(d)} label={d} count={flashcards.filter((c) => c.deck === d).length} />
                ))}
              </>
            )}
            {masteredCount > 0 && (
              <label className="ml-auto inline-flex cursor-pointer select-none items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={learningOnly}
                  onChange={(e) => { setLearningOnly(e.target.checked); setPosition(0); setIsFlipped(false) }}
                  className="h-4 w-4 rounded border-slate-300 accent-indigo-600"
                />
                Hide cards I know
              </label>
            )}
          </div>
        )}
      </div>

      {mode === 'list' ? (
        <CardList cards={visible} mastered={masteredCards} difficult={difficultCards} />
      ) : visible.length === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center print:hidden">
          <Check className="mx-auto mb-2 h-8 w-8 text-emerald-600" />
          <p className="font-semibold text-emerald-900">You know every card in this set.</p>
          <button type="button" onClick={() => setLearningOnly(false)} className="mt-2 text-sm font-medium text-emerald-700 underline">Show all cards</button>
        </div>
      ) : (
        <StudyCard
          card={currentCard}
          position={safePos}
          count={visible.length}
          subjectLabel={subjectLabel}
          isFlipped={isFlipped}
          setIsFlipped={setIsFlipped}
          showMore={showMore}
          setShowMore={setShowMore}
          isMastered={masteredCards.has(currentCard.id)}
          isDifficult={difficultCards.has(currentCard.id)}
          isLoadingProgress={isLoadingProgress}
        />
      )}

      {mode === 'study' && visible.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 print:hidden">
            <Button onClick={() => mark('difficult')} variant="outline" size="lg" className="h-12 border-amber-200 bg-white text-amber-700 hover:border-amber-500 hover:bg-amber-500 hover:text-white">
              <RotateCw className="mr-2 h-4 w-4" /> Still learning
            </Button>
            <Button onClick={() => mark('mastered')} variant="outline" size="lg" className="h-12 border-emerald-200 bg-white text-emerald-700 hover:border-emerald-500 hover:bg-emerald-500 hover:text-white">
              <Check className="mr-2 h-4 w-4" /> Got it
            </Button>
          </div>

          <div className="flex items-center justify-between gap-3 print:hidden">
            <Button onClick={() => go(-1)} variant="ghost" size="sm" className="text-slate-600">
              <ChevronLeft className="mr-1 h-4 w-4" /> Previous
            </Button>
            <div className="flex gap-1">
              <Button onClick={shuffle} variant="ghost" size="sm" className="text-slate-600">
                <Shuffle className="mr-1.5 h-4 w-4" /> Shuffle
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-slate-600" disabled={masteredCards.size === 0 && difficultCards.size === 0}>
                    <RotateCcw className="mr-1.5 h-4 w-4" /> Reset
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset all progress?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This clears every &quot;Got it&quot; and &quot;Still learning&quot; marking for this guide. This can&apos;t be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction className="bg-indigo-600 hover:bg-indigo-700" onClick={resetProgress}>Reset progress</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
            <Button onClick={() => go(1)} variant="ghost" size="sm" className="text-slate-600">
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
          <p className="hidden text-center text-xs text-slate-400 sm:block print:hidden">
            Keyboard: <Kbd>Space</Kbd> flip · <Kbd>←</Kbd> <Kbd>→</Kbd> move between cards
          </p>
        </>
      )}

      {/* Print version — all cards */}
      <div className="hidden space-y-4 print:block">
        {flashcards.map((card, index) => (
          <div key={card.id} className="break-inside-avoid rounded-lg border border-slate-300 p-5">
            <p className={cn(eyebrow, 'text-slate-500')}>Card {index + 1}{card.deck ? ` · ${card.deck}` : ''}</p>
            <p className="mt-1 text-lg font-semibold"><InlineMarkdown text={card.question} /></p>
            <div className="mt-3 border-t border-slate-200 pt-3">
              <StudyMarkdown content={card.answer} compact />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Stat({ value, label, dot }: { value: number; label: string; dot: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-slate-600">
      <span className={cn('h-2 w-2 rounded-full', dot)} />
      <span className="font-semibold tabular-nums text-slate-900">{value}</span> {label}
    </span>
  )
}

function DeckChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex max-w-[16rem] items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium transition',
        active ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
      )}
    >
      <span className="truncate">{label}</span>
      <span className={cn('text-xs tabular-nums', active ? 'text-indigo-100' : 'text-slate-400')}>{count}</span>
    </button>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-sans text-[0.7rem] text-slate-500 shadow-sm">{children}</kbd>
}

function StudyCard({
  card, position, count, subjectLabel, isFlipped, setIsFlipped, showMore, setShowMore, isMastered, isDifficult, isLoadingProgress,
}: {
  card: Flashcard
  position: number
  count: number
  subjectLabel: string
  isFlipped: boolean
  setIsFlipped: React.Dispatch<React.SetStateAction<boolean>>
  showMore: boolean
  setShowMore: React.Dispatch<React.SetStateAction<boolean>>
  isMastered: boolean
  isDifficult: boolean
  isLoadingProgress: boolean
}) {
  const hasState = isMastered || isDifficult
  const cardState = isMastered ? stateStyle.mastered : isDifficult ? stateStyle.difficult : stateStyle.neutral
  const ringCls = hasState ? cn('ring-2', cardState.ring) : 'ring-1 ring-slate-200'
  const { tldr, rest, block } = structureAnswer(card.answer)
  const face = 'absolute inset-0 backface-hidden overflow-hidden rounded-2xl border border-slate-200 shadow-lg ring-inset flex flex-col'
  const qLen = card.question.length

  const header = (label: React.ReactNode) => (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-3">
      {label}
      <span className="flex min-w-0 items-center gap-2 text-[0.7rem] font-medium uppercase tracking-wide text-slate-400">
        {hasState && (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 normal-case tracking-normal', isMastered ? stateStyle.mastered.soft : stateStyle.difficult.soft)}>
            {isMastered ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
            {isMastered ? 'Got it' : 'Learning'}
          </span>
        )}
        <span className="truncate">{card.deck || subjectLabel}</span>
        <span className="tabular-nums">{position + 1}/{count}</span>
      </span>
    </div>
  )

  return (
    <div className="relative h-[440px] perspective-1000 print:hidden sm:h-[460px]">
      {isLoadingProgress && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
            <span className="text-sm text-slate-600">Loading your progress…</span>
          </div>
        </div>
      )}
      <div
        className={cn('relative h-full w-full cursor-pointer transition-transform duration-500 transform-style-3d motion-reduce:transition-none', isFlipped && 'rotate-y-180')}
        onClick={() => setIsFlipped(!isFlipped)}
        role="button"
        tabIndex={0}
        aria-label={isFlipped ? 'Show question' : 'Show answer'}
      >
        {/* Front */}
        <div className={cn(face, 'bg-white', ringCls)}>
          {header(<span className={cn(eyebrow, accent.text)}>Question</span>)}
          <div className="flex flex-1 items-center justify-center overflow-y-auto px-8 py-6">
            <p className={cn(fontDisplay, 'text-center font-medium leading-snug text-slate-900', qLen > 140 ? 'text-xl' : qLen > 70 ? 'text-[1.4rem]' : 'text-[1.7rem]')}>
              <InlineMarkdown text={card.question} />
            </p>
          </div>
          <p className="pb-5 text-center text-xs text-slate-400">Tap to reveal the answer</p>
        </div>

        {/* Back */}
        <div className={cn(face, 'rotate-y-180 bg-gradient-to-b from-indigo-50/60 to-white', ringCls)}>
          {header(<span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-white', accent.solid)}>Answer</span>)}
          <div className="flex-1 overflow-y-auto px-6 py-5 sm:px-8">
            {block ? (
              <StudyMarkdown content={card.answer} compact />
            ) : (
              <div className="flex min-h-full flex-col items-center justify-center text-center">
                <p className={cn(fontDisplay, 'font-medium leading-snug text-slate-900', tldr.length > 160 ? 'text-lg' : 'text-[1.35rem]')}>
                  <InlineMarkdown text={tldr} />
                </p>
                {rest && !showMore && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setShowMore(true) }}
                    className={cn('mt-5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] hover:underline', accent.text)}
                  >
                    Why? Show more
                  </button>
                )}
                {rest && showMore && (
                  <div className="mt-4 w-full border-t border-indigo-100 pt-4 text-left" onClick={(e) => e.stopPropagation()}>
                    <StudyMarkdown content={rest} compact className="text-slate-600" />
                  </div>
                )}
              </div>
            )}
          </div>
          <p className="pb-5 text-center text-xs text-slate-400">Tap to flip back</p>
        </div>
      </div>
    </div>
  )
}

function CardList({ cards, mastered, difficult }: { cards: Flashcard[]; mastered: Set<string>; difficult: Set<string> }) {
  const groups: Array<{ deck: string; cards: Flashcard[] }> = []
  for (const c of cards) {
    const g = groups[groups.length - 1]
    if (g && g.deck === c.deck) g.cards.push(c)
    else groups.push({ deck: c.deck, cards: [c] })
  }
  return (
    <div className="space-y-8 print:hidden">
      {groups.map((g, gi) => (
        <section key={`${g.deck}-${gi}`}>
          {g.deck && <h3 className={cn(fontDisplay, 'mb-3 text-lg font-semibold text-slate-900')}>{g.deck}</h3>}
          <div className="grid gap-3 sm:grid-cols-2">
            {g.cards.map((c) => (
              <div
                key={c.id}
                className={cn(
                  'rounded-xl border border-l-4 bg-white p-4 shadow-sm',
                  mastered.has(c.id) ? 'border-slate-200 border-l-emerald-500' : difficult.has(c.id) ? 'border-slate-200 border-l-amber-500' : 'border-slate-200 border-l-indigo-300'
                )}
              >
                <p className="font-semibold leading-snug text-slate-900"><InlineMarkdown text={c.question} /></p>
                <div className="mt-2 border-t border-slate-100 pt-2 text-sm">
                  <StudyMarkdown content={c.answer} compact className="text-sm" />
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}

// Card ids ("card-N", in document order across Q/A pairs and key-term lists)
// are what saved progress is keyed on — keep this parse order stable.
function parseFlashcards(content: string): Flashcard[] {
  const cards: Flashcard[] = []
  const lines = content.split('\n')
  let counter = 0
  let deck = ''

  const qMarker = /^\*{0,2}(?:Q|Question)\s*\d*\s*:\s*/i
  const aMarker = /^\*{0,2}(?:A|Answer)\s*:\s*\*{0,2}\s*/i
  const isBreak = (l: string) =>
    /^#{1,6}\s/.test(l) ||
    /^-{3,}$/.test(l) ||
    qMarker.test(l) ||
    /^\*{0,2}(?:key terms|exam|remember|study tips)/i.test(l)

  const cleanQuestion = (s: string) => stripEmoji(s).replace(/^\*\*\s*/, '').replace(/\s*\*\*$/, '').trim()
  const cleanInline = (s: string) => stripEmoji(s).replace(/\*\*/g, '').replace(/^\*|\*$/g, '').trim()
  const cleanAnswer = (s: string) => normalizeGuideMarkdown(s.replace(/^\*\*\s*/, ''))

  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()

    const heading = line.match(/^#{1,6}\s+(.+)$/)
    if (heading) {
      const title = toTitleCase(plainText(stripEmoji(heading[1])).replace(/^[\s|:\-–—]+/, '').trim())
      // Priority wrappers ("Essential Flashcards") only name a deck if nothing more specific follows.
      if (title && !/^(flashcards?|study guide)/i.test(title)) deck = title
      i++
      continue
    }

    if (qMarker.test(line)) {
      let q = cleanQuestion(line.replace(qMarker, ''))
      i++
      while (i < lines.length && lines[i].trim() && !aMarker.test(lines[i].trim()) && !qMarker.test(lines[i].trim())) {
        q += ' ' + cleanQuestion(lines[i].trim())
        i++
      }
      while (i < lines.length && !lines[i].trim()) i++
      let a = ''
      if (i < lines.length && aMarker.test(lines[i].trim())) {
        a = lines[i].trim().replace(aMarker, '')
        i++
        // Keep original lines so multi-line answers and tables keep their structure.
        while (i < lines.length && !isBreak(lines[i].trim())) {
          a += '\n' + lines[i]
          i++
        }
      }
      a = a.trim()
      if (q && a) cards.push({ id: `card-${counter++}`, question: q, answer: cleanAnswer(a), deck })
      continue
    }

    // "Key Terms" list → one card per term.
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
            if (term && def) cards.push({ id: `card-${counter++}`, question: term, answer: def, deck })
          }
        }
        i++
      }
      continue
    }

    i++
  }

  if (cards.length === 0) {
    const sections = content.split('\n\n').filter((s) => s.trim())
    for (const section of sections) {
      const ls = section.split('\n').filter((l) => l.trim())
      if (ls.length < 2) continue
      const first = ls[0].trim()
      if (first === first.toUpperCase() || first.toLowerCase().includes('flashcard') || first.toLowerCase().includes('study guide')) continue
      const question = cleanInline(ls[0])
      const answer = ls.slice(1).join('\n').trim()
      if (question && answer) cards.push({ id: `card-${counter++}`, question, answer: cleanAnswer(answer), deck: '' })
    }
  }

  // A single deck name adds nothing — drop it so no deck chips/labels show.
  const names = new Set(cards.map((c) => c.deck))
  if (names.size <= 1) cards.forEach((c) => { c.deck = '' })
  return cards
}
