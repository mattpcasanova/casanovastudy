"use client"

import { useRef } from "react"
import { cn } from "@/lib/utils"
import { EditorBlock, DefinitionBlockData, DefinitionColorVariant } from "@/lib/types/editor-blocks"
import { Plus, X } from "lucide-react"
import { DEFINITION_COLORS } from "../block-styles"
import { AddRowButton, AutoTextarea, ColorDots, focusLater } from "../editor-ui"

interface DefinitionBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const colorOptions = (Object.keys(DEFINITION_COLORS) as DefinitionColorVariant[]).map(value => ({
  value,
  label: DEFINITION_COLORS[value].label,
  swatch: DEFINITION_COLORS[value].swatch,
}))

export function DefinitionBlock({ block, onUpdate }: DefinitionBlockProps) {
  const data = block.data as DefinitionBlockData
  const color = DEFINITION_COLORS[data.colorVariant || "purple"] ?? DEFINITION_COLORS.purple
  const exampleRefs = useRef<(HTMLInputElement | null)[]>([])
  const examples = data.examples ?? []

  const handleChange = (updates: Partial<DefinitionBlockData>) => {
    onUpdate({ data: { ...data, ...updates } })
  }

  const addExample = () => {
    handleChange({ examples: [...examples, ""] })
    focusLater(() => exampleRefs.current[examples.length])
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <ColorDots value={data.colorVariant || "purple"} options={colorOptions} onChange={(colorVariant) => handleChange({ colorVariant })} />
      </div>
      <div className={cn("rounded-r-xl border-l-4 p-3 transition-colors duration-200", color.edge, color.bg)}>
        <input
          value={data.term}
          onChange={(e) => handleChange({ term: e.target.value })}
          placeholder="Term"
          className={cn("w-full rounded-md bg-transparent px-2 py-1 text-lg font-semibold outline-none placeholder:text-slate-400 focus:bg-white/70", color.term)}
        />
        <AutoTextarea
          value={data.definition}
          onChange={(e) => handleChange({ definition: e.target.value })}
          placeholder="What does it mean?"
          minRows={2}
          className={cn("hover:bg-white/50 focus:bg-white/80", color.text)}
        />

        {examples.length > 0 && (
          <div className="mt-2 space-y-0.5 border-t border-black/5 pt-2">
            <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-slate-500">Examples</p>
            {examples.map((example, index) => (
              <div key={index} className="group/ex flex items-center gap-1">
                <span className="pl-2 text-slate-400">•</span>
                <input
                  ref={(el) => { exampleRefs.current[index] = el }}
                  value={example}
                  onChange={(e) => {
                    const next = [...examples]
                    next[index] = e.target.value
                    handleChange({ examples: next })
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); addExample() }
                  }}
                  placeholder={`Example ${index + 1}`}
                  className="flex-1 rounded-md bg-transparent px-2 py-1 text-sm text-slate-700 outline-none placeholder:text-slate-400 focus:bg-white/80"
                />
                <button
                  type="button"
                  aria-label="Remove example"
                  onClick={() => handleChange({ examples: examples.filter((_, i) => i !== index) })}
                  className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition hover:text-rose-600 md:opacity-0 md:group-hover/ex:opacity-100"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <AddRowButton onClick={addExample} className="w-auto">
        <Plus className="h-4 w-4" /> Add example
      </AddRowButton>
    </div>
  )
}
