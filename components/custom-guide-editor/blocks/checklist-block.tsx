"use client"

import { useRef } from "react"
import { EditorBlock, ChecklistBlockData, generateChecklistItemId } from "@/lib/types/editor-blocks"
import { Plus, X } from "lucide-react"
import { AddRowButton, focusLater, inlineField } from "../editor-ui"
import { cn } from "@/lib/utils"

interface ChecklistBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

// Keyboard-first list: Enter adds the next item, Backspace on an empty item
// removes it — the flow you'd expect from a notes app.
export function ChecklistBlock({ block, onUpdate }: ChecklistBlockProps) {
  const data = block.data as ChecklistBlockData
  const inputs = useRef<Map<string, HTMLInputElement>>(new Map())

  const setItems = (items: ChecklistBlockData["items"]) => {
    onUpdate({ data: { ...data, items } })
  }

  const insertAfter = (index: number) => {
    const item = { id: generateChecklistItemId(), label: "" }
    setItems([...data.items.slice(0, index + 1), item, ...data.items.slice(index + 1)])
    focusLater(() => inputs.current.get(item.id))
  }

  const removeAt = (index: number, focusPrev: boolean) => {
    if (data.items.length <= 1) return
    const prev = data.items[index - 1]
    setItems(data.items.filter((_, i) => i !== index))
    if (focusPrev && prev) focusLater(() => inputs.current.get(prev.id))
  }

  return (
    <div className="space-y-0.5">
      {data.items.map((item, index) => (
        <div key={item.id} className="group/item flex items-center gap-2">
          <span className="ml-2 h-4 w-4 shrink-0 rounded border-2 border-slate-300" aria-hidden />
          <input
            ref={(el) => { if (el) inputs.current.set(item.id, el); else inputs.current.delete(item.id) }}
            value={item.label}
            onChange={(e) => setItems(data.items.map(i => (i.id === item.id ? { ...i, label: e.target.value } : i)))}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                insertAfter(index)
              } else if (e.key === "Backspace" && !item.label && data.items.length > 1) {
                e.preventDefault()
                removeAt(index, true)
              }
            }}
            placeholder="To review…"
            className={cn(inlineField, "flex-1")}
          />
          {data.items.length > 1 && (
            <button
              type="button"
              onClick={() => removeAt(index, false)}
              aria-label="Remove item"
              className="flex h-7 w-7 items-center justify-center rounded-md text-slate-300 opacity-100 transition hover:bg-rose-50 hover:text-rose-600 md:opacity-0 md:group-hover/item:opacity-100"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      ))}
      <AddRowButton onClick={() => insertAfter(data.items.length - 1)}>
        <Plus className="h-4 w-4" /> Add item
        <span className="ml-auto text-[0.7rem] font-normal text-slate-300">or press Enter</span>
      </AddRowButton>
    </div>
  )
}
