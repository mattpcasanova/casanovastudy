"use client"

import { useState } from "react"
import { EditorBlock, TextBlockData } from "@/lib/types/editor-blocks"
import { AutoTextarea } from "../editor-ui"

interface TextBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
}

const TIPS: [string, string][] = [
  ["**bold**", "bold"],
  ["*italic*", "italic"],
  ["## Heading", "heading"],
  ["- item", "bullet list"],
  ["1. item", "numbered list"],
  ["| a | b |", "table"],
]

export function TextBlock({ block, onUpdate }: TextBlockProps) {
  const data = block.data as TextBlockData
  const [focused, setFocused] = useState(false)

  return (
    <div>
      <AutoTextarea
        minRows={3}
        placeholder="Start writing… Markdown works: **bold**, lists, ## headings, tables."
        value={data.markdown}
        onChange={(e) => onUpdate({ data: { ...data, markdown: e.target.value } })}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className="text-[0.95rem]"
      />
      {/* Markdown hints appear only while editing — no permanent cheat sheet */}
      <div
        className={`flex flex-wrap gap-x-3 gap-y-1 overflow-hidden px-2 text-[0.7rem] text-slate-400 transition-all duration-200 ${
          focused ? "mt-1.5 max-h-10 opacity-100" : "max-h-0 opacity-0"
        }`}
      >
        {TIPS.map(([syntax, label]) => (
          <span key={label}>
            <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-slate-500">{syntax}</code> {label}
          </span>
        ))}
      </div>
    </div>
  )
}
