"use client"

import { memo, useCallback } from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { EditorBlock } from "@/lib/types/editor-blocks"
import { BlockWrapper } from "./blocks/block-wrapper"
import { TextBlock } from "./blocks/text-block"
import { AlertBlock } from "./blocks/alert-block"
import { TableBlock } from "./blocks/table-block"
import { QuizBlock } from "./blocks/quiz-block"
import { ChecklistBlock } from "./blocks/checklist-block"
import { DefinitionBlock } from "./blocks/definition-block"
import { FlashcardsBlock } from "./blocks/flashcards-block"
import { PracticeBlock } from "./blocks/practice-block"
import { SectionBlock } from "./blocks/section-block"
import { InsertMenu, InsertChoice } from "./insert-menu"

// Stable editor actions (built once from the stable context callbacks) so
// memoized blocks don't re-render when an unrelated block changes.
export interface EditorActions {
  update: (id: string, updates: Partial<EditorBlock>) => void
  remove: (id: string) => void
  duplicate: (id: string) => void
  move: (id: string, direction: "up" | "down") => void
  select: (id: string | null) => void
  insert: (choice: InsertChoice, opts: { afterId?: string | null; parentId?: string; atStart?: boolean }) => void
}

interface BlockItemProps {
  block: EditorBlock
  actions: EditorActions
  isSelected: boolean
  // Only sections need the selected id (to highlight their children)
  selectedBlockId?: string | null
  nested?: boolean
  canMoveUp?: boolean
  canMoveDown?: boolean
}

// The single place a block type is mapped to its editor component (the top
// level and section children both render through here).
export function BlockBody({
  block,
  onUpdate,
  actions,
  selectedBlockId,
}: {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
  actions: EditorActions
  selectedBlockId?: string | null
}) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} onUpdate={onUpdate} />
    case "alert":
      return <AlertBlock block={block} onUpdate={onUpdate} />
    case "table":
      return <TableBlock block={block} onUpdate={onUpdate} />
    case "quiz":
      return <QuizBlock block={block} onUpdate={onUpdate} />
    case "checklist":
      return <ChecklistBlock block={block} onUpdate={onUpdate} />
    case "definition":
      return <DefinitionBlock block={block} onUpdate={onUpdate} />
    case "flashcards":
      return <FlashcardsBlock block={block} onUpdate={onUpdate} />
    case "practice":
      return <PracticeBlock block={block} onUpdate={onUpdate} />
    case "section":
      return <SectionBlock block={block} onUpdate={onUpdate} actions={actions} selectedBlockId={selectedBlockId ?? null} />
    default:
      return null
  }
}

export const BlockItem = memo(function BlockItem({
  block,
  actions,
  isSelected,
  selectedBlockId,
  nested = false,
  canMoveUp,
  canMoveDown,
}: BlockItemProps) {
  const id = block.id
  const onUpdate = useCallback((updates: Partial<EditorBlock>) => actions.update(id, updates), [actions, id])
  const onSelect = useCallback(() => actions.select(id), [actions, id])
  const onDelete = useCallback(() => actions.remove(id), [actions, id])
  const onDuplicate = useCallback(() => actions.duplicate(id), [actions, id])
  const onMoveUp = useCallback(() => actions.move(id, "up"), [actions, id])
  const onMoveDown = useCallback(() => actions.move(id, "down"), [actions, id])

  return (
    <BlockWrapper
      id={id}
      type={block.type}
      title={block.title}
      isSelected={isSelected}
      onSelect={onSelect}
      onDelete={onDelete}
      onDuplicate={onDuplicate}
      disableDrag={nested}
      onMoveUp={nested ? onMoveUp : undefined}
      onMoveDown={nested ? onMoveDown : undefined}
      canMoveUp={canMoveUp}
      canMoveDown={canMoveDown}
    >
      <BlockBody block={block} onUpdate={onUpdate} actions={actions} selectedBlockId={selectedBlockId} />
    </BlockWrapper>
  )
})

// Thin hover target between blocks: a hairline + "+" that opens the insert
// menu at that exact position. Fixed height, so revealing it never shifts layout.
export function BlockGap({
  onChoose,
  excludeContainers,
}: {
  onChoose: (choice: InsertChoice) => void
  excludeContainers?: boolean
}) {
  return (
    <div className="group/gap relative flex h-4 items-center">
      <div className="absolute inset-x-3 top-1/2 h-px -translate-y-1/2 bg-blue-300 opacity-0 transition-opacity duration-150 group-hover/gap:opacity-100" />
      <InsertMenu
        onChoose={onChoose}
        excludeContainers={excludeContainers}
        align="center"
        trigger={
          <button
            type="button"
            aria-label="Insert block here"
            className={cn(
              "relative z-10 mx-auto flex h-6 w-6 items-center justify-center rounded-full border border-blue-200 bg-white text-blue-600 shadow-sm",
              "opacity-0 transition-all duration-150 hover:scale-110 hover:bg-blue-600 hover:text-white group-hover/gap:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        }
      />
    </div>
  )
}
