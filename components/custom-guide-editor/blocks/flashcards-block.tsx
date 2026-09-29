"use client"

import { useRef } from "react"
import { EditorBlock, FlashcardsBlockData, EditorFlashCard, generateFlashcardId } from "@/lib/types/editor-blocks"
import { Plus, ArrowUp, ArrowDown, X } from "lucide-react"
import { AddRowButton, AutoTextarea, InlineInput, focusLater } from "../editor-ui"
import { cn } from "@/lib/utils"

interface FlashcardsBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const cardIconBtn =
  "flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none"

export function FlashcardsBlock({ block, onUpdate }: FlashcardsBlockProps) {
  const data = block.data as FlashcardsBlockData
  const fronts = useRef<Map<string, HTMLTextAreaElement>>(new Map())

  const setCards = (cards: EditorFlashCard[]) => onUpdate({ data: { ...data, cards } })

  const updateCard = (id: string, updates: Partial<EditorFlashCard>) => {
    setCards(data.cards.map(card => (card.id === id ? { ...card, ...updates } : card)))
  }

  const addCard = () => {
    const card = { id: generateFlashcardId(), front: "", back: "" }
    setCards([...data.cards, card])
    focusLater(() => fronts.current.get(card.id))
  }

  const moveCard = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= data.cards.length) return
    const cards = [...data.cards]
    ;[cards[index], cards[target]] = [cards[target], cards[index]]
    setCards(cards)
  }

  return (
    <div className="space-y-3">
      <InlineInput
        value={block.title || ""}
        onChange={(e) => onUpdate({ title: e.target.value })}
        placeholder="Deck title, e.g. Key Terms, Unit 3"
        className="text-base font-semibold text-slate-900"
      />

      <div className="space-y-2">
        {data.cards.map((card, index) => (
          <div
            key={card.id}
            className="group/card relative grid overflow-hidden rounded-xl border border-slate-200 bg-white transition-shadow hover:shadow-sm md:grid-cols-2"
          >
            <div className="relative border-b border-slate-100 p-2 pt-6 md:border-b-0 md:border-r">
              <span className="absolute left-4 top-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-indigo-500">
                {index + 1} · Front
              </span>
              <AutoTextarea
                ref={(el) => { if (el) fronts.current.set(card.id, el); else fronts.current.delete(card.id) }}
                value={card.front}
                onChange={(e) => updateCard(card.id, { front: e.target.value })}
                placeholder="Question or term"
                className="font-medium text-slate-900"
              />
            </div>
            <div className="relative bg-indigo-50/30 p-2 pt-6">
              <span className="absolute left-4 top-2 text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-slate-400">Back</span>
              <AutoTextarea
                value={card.back}
                onChange={(e) => updateCard(card.id, { back: e.target.value })}
                onKeyDown={(e) => {
                  // Tab out of the last card's back → start a new card
                  if (e.key === "Tab" && !e.shiftKey && index === data.cards.length - 1 && card.front.trim() && card.back.trim()) {
                    e.preventDefault()
                    addCard()
                  }
                }}
                placeholder="Answer or definition"
                className="text-slate-700"
              />
            </div>
            <div
              className={cn(
                "absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-md bg-white/90 transition-opacity",
                "md:opacity-0 md:group-hover/card:opacity-100 md:group-focus-within/card:opacity-100"
              )}
            >
              <button type="button" className={cardIconBtn} onClick={() => moveCard(index, -1)} disabled={index === 0} aria-label="Move card up">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" className={cardIconBtn} onClick={() => moveCard(index, 1)} disabled={index === data.cards.length - 1} aria-label="Move card down">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              {data.cards.length > 1 && (
                <button
                  type="button"
                  className={cn(cardIconBtn, "hover:bg-rose-50 hover:text-rose-600")}
                  onClick={() => setCards(data.cards.filter(c => c.id !== card.id))}
                  aria-label="Delete card"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <AddRowButton onClick={addCard}>
        <Plus className="h-4 w-4" /> Add card
        <span className="ml-auto text-[0.7rem] font-normal text-slate-300">{data.cards.length} {data.cards.length === 1 ? "card" : "cards"}</span>
      </AddRowButton>
    </div>
  )
}
