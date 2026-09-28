"use client"

import { ReactNode } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { BlockType } from "@/lib/types/editor-blocks"
import {
  Trash2,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Copy,
  Type,
  FolderOpen,
  AlertCircle,
  Table2,
  HelpCircle,
  CheckSquare,
  BookOpen,
  CreditCard,
  Puzzle
} from "lucide-react"

export interface BlockWrapperProps {
  id: string
  type: BlockType
  title?: string
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  onDuplicate?: () => void
  children: ReactNode
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  // Nested blocks (inside sections) reorder with arrows instead of drag
  disableDrag?: boolean
}

// ⚠️ Must stay a TOTAL Record<BlockType> — a missing key crashes the wrapper.
export const typeConfig: Record<BlockType, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  text: { icon: Type, label: 'Text', color: 'text-slate-500' },
  section: { icon: FolderOpen, label: 'Section', color: 'text-sky-600' },
  alert: { icon: AlertCircle, label: 'Callout', color: 'text-amber-600' },
  table: { icon: Table2, label: 'Table', color: 'text-emerald-600' },
  quiz: { icon: HelpCircle, label: 'Quiz', color: 'text-purple-600' },
  checklist: { icon: CheckSquare, label: 'Checklist', color: 'text-teal-600' },
  definition: { icon: BookOpen, label: 'Definition', color: 'text-violet-600' },
  flashcards: { icon: CreditCard, label: 'Flashcards', color: 'text-indigo-600' },
  practice: { icon: Puzzle, label: 'Practice', color: 'text-orange-600' },
}

const iconBtn =
  "inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:pointer-events-none disabled:opacity-30"

// Nested blocks (inside sections) must NOT call useSortable at all: even with
// `disabled`, they registered as droppables in the top-level list, so a drop
// often resolved to a nested child id that isn't in the root array and the
// reorder was silently discarded.
export function BlockWrapper(props: BlockWrapperProps) {
  return props.disableDrag ? <BlockChrome {...props} /> : <SortableBlockChrome {...props} />
}

function SortableBlockChrome(props: BlockWrapperProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id: props.id })

  return (
    <BlockChrome
      {...props}
      sortable={{
        setNodeRef,
        setActivatorNodeRef,
        handleProps: { ...attributes, ...listeners },
        // Translate only (no scale) so tall blocks don't squash while sorting.
        style: { transform: CSS.Translate.toString(transform), transition },
        isDragging,
      }}
    />
  )
}

interface SortableBits {
  setNodeRef: (el: HTMLElement | null) => void
  setActivatorNodeRef: (el: HTMLElement | null) => void
  handleProps: Record<string, unknown>
  style: React.CSSProperties
  isDragging: boolean
}

function BlockChrome({
  type,
  isSelected,
  onSelect,
  onDelete,
  onDuplicate,
  children,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  sortable,
}: BlockWrapperProps & { sortable?: SortableBits }) {
  const config = typeConfig[type]
  const Icon = config.icon
  const isDragging = sortable?.isDragging ?? false
  const showMoveButtons = !!(onMoveUp && onMoveDown)

  return (
    <div
      ref={sortable?.setNodeRef}
      style={sortable?.style}
      onPointerDownCapture={() => { if (!isSelected) onSelect() }}
      onFocusCapture={() => { if (!isSelected) onSelect() }}
      className={cn(
        "cg-block group/block relative rounded-xl border px-3 pb-3 pt-2 transition-[background-color,border-color,box-shadow,opacity] duration-200",
        isSelected
          ? "border-blue-200 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(37,99,235,0.25)]"
          : "border-transparent hover:border-slate-200 hover:bg-white",
        // The DragOverlay renders the floating copy; the original stays as a placeholder.
        isDragging && "opacity-40"
      )}
    >
      {/* Chrome row: handle + type label on the left, actions on the right */}
      <div className="mb-1 flex items-center gap-1">
        {sortable && (
          <button
            type="button"
            ref={sortable.setActivatorNodeRef}
            {...sortable.handleProps}
            aria-label="Drag to reorder"
            className={cn(iconBtn, "-ml-1 cursor-grab touch-none active:cursor-grabbing")}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <span className={cn("inline-flex items-center gap-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em]", config.color)}>
          <Icon className="h-3.5 w-3.5" />
          {config.label}
        </span>

        <div
          className={cn(
            "ml-auto flex items-center gap-0.5 transition-opacity duration-150",
            // Always visible on touch screens; revealed on hover/selection on desktop.
            isSelected ? "opacity-100" : "opacity-100 md:opacity-0 md:group-hover/block:opacity-100 md:group-focus-within/block:opacity-100"
          )}
        >
          {showMoveButtons && (
            <>
              <button type="button" className={iconBtn} onClick={onMoveUp} disabled={!canMoveUp} title="Move up" aria-label="Move up">
                <ArrowUp className="h-4 w-4" />
              </button>
              <button type="button" className={iconBtn} onClick={onMoveDown} disabled={!canMoveDown} title="Move down" aria-label="Move down">
                <ArrowDown className="h-4 w-4" />
              </button>
            </>
          )}
          {onDuplicate && (
            <button type="button" className={iconBtn} onClick={onDuplicate} title="Duplicate" aria-label="Duplicate block">
              <Copy className="h-4 w-4" />
            </button>
          )}
          <button
            type="button"
            className={cn(iconBtn, "hover:bg-rose-50 hover:text-rose-600")}
            onClick={onDelete}
            title="Delete"
            aria-label="Delete block"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="block-content">{children}</div>
    </div>
  )
}
