"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EditorBlock, ChecklistBlockData, generateChecklistItemId } from "@/lib/types/editor-blocks"
import { Plus, Trash2, GripVertical, Square } from "lucide-react"

interface ChecklistBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

export function ChecklistBlock({ block, onUpdate }: ChecklistBlockProps) {
  const data = block.data as ChecklistBlockData

  const handleChange = (updates: Partial<ChecklistBlockData>) => {
    onUpdate({
      data: { ...data, ...updates }
    })
  }

  const updateItem = (id: string, label: string) => {
    const newItems = data.items.map(item =>
      item.id === id ? { ...item, label } : item
    )
    handleChange({ items: newItems })
  }

  const addItem = () => {
    const newItem = {
      id: generateChecklistItemId(),
      label: ''
    }
    handleChange({ items: [...data.items, newItem] })
  }

  const removeItem = (id: string) => {
    if (data.items.length <= 1) return
    handleChange({ items: data.items.filter(item => item.id !== id) })
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const newIndex = direction === 'up' ? index - 1 : index + 1
    if (newIndex < 0 || newIndex >= data.items.length) return

    const newItems = [...data.items]
    const [removed] = newItems.splice(index, 1)
    newItems.splice(newIndex, 0, removed)
    handleChange({ items: newItems })
  }

  return (
    <div className="space-y-2">
      {data.items.map((item, index) => (
        <div key={item.id} className="flex items-center gap-2 group">
          <div className="flex flex-col">
            <Button
              variant="ghost"
              size="icon"
              className="h-4 w-4 opacity-0 group-hover:opacity-100"
              onClick={() => moveItem(index, 'up')}
              disabled={index === 0}
            >
              <GripVertical className="h-3 w-3" />
            </Button>
          </div>
          <Square className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <Input
            value={item.label}
            onChange={(e) => updateItem(item.id, e.target.value)}
            placeholder="Checklist item..."
            className="flex-1"
          />
          {data.items.length > 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-destructive hover:text-destructive opacity-0 group-hover:opacity-100"
              onClick={() => removeItem(item.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={addItem}
        className="w-full mt-2 bg-teal-50 border-teal-300 text-teal-700 hover:bg-teal-100 hover:border-teal-400"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Item
      </Button>
    </div>
  )
}
