"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent } from "@/components/ui/card"
import { EditorBlock, FlashcardsBlockData, EditorFlashCard, generateFlashcardId } from "@/lib/types/editor-blocks"
import { Plus, Trash2, ChevronUp, ChevronDown } from "lucide-react"

interface FlashcardsBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

export function FlashcardsBlock({ block, onUpdate }: FlashcardsBlockProps) {
  const data = block.data as FlashcardsBlockData

  const handleChange = (updates: Partial<FlashcardsBlockData>) => {
    onUpdate({ data: { ...data, ...updates } })
  }

  const updateCard = (id: string, updates: Partial<EditorFlashCard>) => {
    handleChange({
      cards: data.cards.map(card => (card.id === id ? { ...card, ...updates } : card))
    })
  }

  const addCard = () => {
    handleChange({
      cards: [...data.cards, { id: generateFlashcardId(), front: "", back: "" }]
    })
  }

  const removeCard = (id: string) => {
    if (data.cards.length <= 1) return
    handleChange({ cards: data.cards.filter(card => card.id !== id) })
  }

  const moveCard = (index: number, direction: -1 | 1) => {
    const target = index + direction
    if (target < 0 || target >= data.cards.length) return
    const cards = [...data.cards]
    ;[cards[index], cards[target]] = [cards[target], cards[index]]
    handleChange({ cards })
  }

  return (
    <div className="space-y-3">
      {/* Optional deck title (shown on the block header + viewer) */}
      <div>
        <Label>Deck Title (optional)</Label>
        <Input
          value={block.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="e.g. Key Terms — Unit 3"
        />
      </div>

      {data.cards.map((card, index) => (
        <Card key={card.id} className="border">
          <CardContent className="pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">
                Card {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveCard(index, -1)}
                  disabled={index === 0}
                  title="Move up"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => moveCard(index, 1)}
                  disabled={index === data.cards.length - 1}
                  title="Move down"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
                {data.cards.length > 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:text-destructive"
                    onClick={() => removeCard(card.id)}
                    title="Delete card"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label>Front (question / term)</Label>
                <Textarea
                  value={card.front}
                  onChange={(e) => updateCard(card.id, { front: e.target.value })}
                  placeholder="What's on the front of the card?"
                  className="min-h-[70px] resize-y"
                />
              </div>
              <div>
                <Label>Back (answer / definition)</Label>
                <Textarea
                  value={card.back}
                  onChange={(e) => updateCard(card.id, { back: e.target.value })}
                  placeholder="What's revealed on the back?"
                  className="min-h-[70px] resize-y"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Button
        variant="outline"
        onClick={addCard}
        className="w-full bg-indigo-50 border-indigo-300 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Card
      </Button>
    </div>
  )
}
