"use client"

import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { BlockType } from "@/lib/types/editor-blocks"
import {
  Type,
  FolderOpen,
  AlertCircle,
  Table2,
  HelpCircle,
  CheckSquare,
  BookOpen,
  CreditCard,
  List,
  ScrollText,
} from "lucide-react"

export type PresetKind = 'outline' | 'summary'

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void
  onAddPreset: (kind: PresetKind) => void
  disabled?: boolean
}

// The four study-guide "categories" surfaced as first-class building blocks.
// Outline & Summary are presets over section/text structures; Quiz & Flashcards
// are real block types. `preset` marks which handler to call. `accent` gives each
// study format its identity color (mirrors formatAccent in lib/formats/design.ts,
// so the four read as one colored family). Class strings are full literals so
// Tailwind's scanner keeps them.
type ToolbarItem =
  | { kind: 'block'; type: BlockType; icon: React.ComponentType<{ className?: string }>; label: string; description: string; accent?: string }
  | { kind: 'preset'; preset: PresetKind; icon: React.ComponentType<{ className?: string }>; label: string; description: string; accent?: string }

const studyFormats: ToolbarItem[] = [
  { kind: 'preset', preset: 'outline', icon: List, label: 'Outline', description: 'Collapsible hierarchical outline with nested topics', accent: 'border-blue-300 bg-blue-50 text-blue-700 hover:bg-blue-100 hover:border-blue-400' },
  { kind: 'preset', preset: 'summary', icon: ScrollText, label: 'Summary', description: 'A section for clean summary prose', accent: 'border-green-300 bg-green-50 text-green-700 hover:bg-green-100 hover:border-green-400' },
  { kind: 'block', type: 'quiz', icon: HelpCircle, label: 'Quiz', description: 'Interactive quiz questions with grading', accent: 'border-purple-300 bg-purple-50 text-purple-700 hover:bg-purple-100 hover:border-purple-400' },
  { kind: 'block', type: 'flashcards', icon: CreditCard, label: 'Flashcards', description: 'A deck of flip cards (front / back)', accent: 'border-indigo-300 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-400' },
]

const buildingBlocks: ToolbarItem[] = [
  { kind: 'block', type: 'text', icon: Type, label: 'Text', description: 'Rich text with markdown support' },
  { kind: 'block', type: 'section', icon: FolderOpen, label: 'Section', description: 'Collapsible section with nested content' },
  { kind: 'block', type: 'definition', icon: BookOpen, label: 'Definition', description: 'Term with definition and examples' },
  { kind: 'block', type: 'alert', icon: AlertCircle, label: 'Alert', description: 'Info, warning, success, or exam tip callout' },
  { kind: 'block', type: 'table', icon: Table2, label: 'Table', description: 'Data table with styled headers' },
  { kind: 'block', type: 'checklist', icon: CheckSquare, label: 'Checklist', description: 'Checkable item list' },
]

export function BlockToolbar({ onAddBlock, onAddPreset, disabled }: BlockToolbarProps) {
  const renderItem = (item: ToolbarItem) => {
    const Icon = item.icon
    const onClick = () =>
      item.kind === 'preset' ? onAddPreset(item.preset) : onAddBlock(item.type)

    return (
      <Tooltip key={item.label}>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={`gap-2 ${item.accent ?? ''}`}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{item.description}</p>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <TooltipProvider>
      <div className="space-y-3 p-3 bg-white rounded-lg border shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center text-sm font-semibold text-muted-foreground mr-1 min-w-[92px]">
            Study formats
          </span>
          {studyFormats.map(renderItem)}
        </div>
        <div className="flex flex-wrap items-center gap-2 border-t pt-3">
          <span className="flex items-center text-sm font-semibold text-muted-foreground mr-1 min-w-[92px]">
            Building blocks
          </span>
          {buildingBlocks.map(renderItem)}
        </div>
      </div>
    </TooltipProvider>
  )
}
