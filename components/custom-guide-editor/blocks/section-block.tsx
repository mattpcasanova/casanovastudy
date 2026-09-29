"use client"

import { useState } from "react"
import { ChevronRight, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { fontDisplay } from "@/lib/formats/design"
import { EditorBlock } from "@/lib/types/editor-blocks"
import { BlockItem, BlockGap, EditorActions } from "../block-item"
import { InsertMenu } from "../insert-menu"
import { InlineInput } from "../editor-ui"

interface SectionBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
  actions: EditorActions
  selectedBlockId: string | null
}

export function SectionBlock({ block, onUpdate, actions, selectedBlockId }: SectionBlockProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const children = block.children ?? []

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => setIsExpanded(e => !e)}
          aria-label={isExpanded ? "Collapse section" : "Expand section"}
          aria-expanded={isExpanded}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <ChevronRight className={cn("h-4 w-4 transition-transform duration-200", isExpanded && "rotate-90")} />
        </button>
        <InlineInput
          value={block.title || ""}
          onChange={(e) => onUpdate({ title: e.target.value })}
          placeholder="Section title"
          className={cn(fontDisplay, "text-xl font-semibold text-slate-900")}
        />
        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[0.7rem] font-medium text-slate-500">
          {children.length} {children.length === 1 ? "block" : "blocks"}
        </span>
      </div>

      {/* grid-rows trick animates the collapse without measuring heights */}
      <div
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-200 ease-out",
          isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        )}
      >
        <div className="min-h-0 overflow-hidden" inert={!isExpanded}>
          <div className="ml-3.5 mt-2 border-l-2 border-sky-100 pl-3">
            {children.length === 0 ? (
              <InsertMenu
                excludeContainers
                onChoose={(choice) => actions.insert(choice, { parentId: block.id })}
                trigger={
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 rounded-lg border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-400 transition-colors hover:border-blue-300 hover:bg-blue-50/40 hover:text-blue-600"
                  >
                    <Plus className="h-4 w-4" />
                    Empty section. Add a block
                  </button>
                }
              />
            ) : (
              <>
                <BlockGap excludeContainers onChoose={(choice) => actions.insert(choice, { parentId: block.id, atStart: true })} />
                {children.map((child, index) => (
                  <div key={child.id}>
                    <BlockItem
                      block={child}
                      actions={actions}
                      isSelected={selectedBlockId === child.id}
                      nested
                      canMoveUp={index > 0}
                      canMoveDown={index < children.length - 1}
                    />
                    <BlockGap excludeContainers onChoose={(choice) => actions.insert(choice, { afterId: child.id })} />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
