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
  BookOpen
} from "lucide-react"

interface BlockToolbarProps {
  onAddBlock: (type: BlockType) => void
  disabled?: boolean
}

const blockTypes: { type: BlockType; icon: React.ComponentType<{ className?: string }>; label: string; description: string }[] = [
  { type: 'text', icon: Type, label: 'Text', description: 'Rich text with markdown support' },
  { type: 'section', icon: FolderOpen, label: 'Section', description: 'Collapsible section with nested content' },
  { type: 'alert', icon: AlertCircle, label: 'Alert', description: 'Info, warning, success, or exam tip callout' },
  { type: 'table', icon: Table2, label: 'Table', description: 'Data table with styled headers' },
  { type: 'quiz', icon: HelpCircle, label: 'Quiz', description: 'Interactive quiz questions' },
  { type: 'checklist', icon: CheckSquare, label: 'Checklist', description: 'Checkable item list' },
  { type: 'definition', icon: BookOpen, label: 'Definition', description: 'Term with definition and examples' },
]

export function BlockToolbar({ onAddBlock, disabled }: BlockToolbarProps) {
  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-2 p-3 bg-white rounded-lg border shadow-sm">
        <span className="flex items-center text-sm font-medium text-muted-foreground mr-2">
          Add Block:
        </span>
        {blockTypes.map(({ type, icon: Icon, label, description }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddBlock(type)}
                disabled={disabled}
                className="gap-2"
              >
                <Icon className="h-4 w-4" />
                {label}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{description}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  )
}
