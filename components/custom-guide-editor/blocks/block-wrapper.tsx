"use client"

import { ReactNode } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { BlockType } from "@/lib/types/editor-blocks"
import {
  Trash2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Type,
  FolderOpen,
  AlertCircle,
  Table2,
  HelpCircle,
  CheckSquare,
  BookOpen
} from "lucide-react"

export interface BlockWrapperProps {
  id: string
  type: BlockType
  title?: string
  isSelected: boolean
  onSelect: () => void
  onDelete: () => void
  children: ReactNode
  // Optional move props for nested blocks (inside sections)
  onMoveUp?: () => void
  onMoveDown?: () => void
  canMoveUp?: boolean
  canMoveDown?: boolean
  // Disable drag for nested blocks
  disableDrag?: boolean
}

const typeConfig: Record<BlockType, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  text: { icon: Type, label: 'Text', color: 'bg-gray-100 text-gray-700' },
  section: { icon: FolderOpen, label: 'Section', color: 'bg-blue-100 text-blue-700' },
  alert: { icon: AlertCircle, label: 'Alert', color: 'bg-amber-100 text-amber-700' },
  table: { icon: Table2, label: 'Table', color: 'bg-green-100 text-green-700' },
  quiz: { icon: HelpCircle, label: 'Quiz', color: 'bg-purple-100 text-purple-700' },
  checklist: { icon: CheckSquare, label: 'Checklist', color: 'bg-teal-100 text-teal-700' },
  definition: { icon: BookOpen, label: 'Definition', color: 'bg-indigo-100 text-indigo-700' },
}

export function BlockWrapper({
  id,
  type,
  title,
  isSelected,
  onSelect,
  onDelete,
  children,
  onMoveUp,
  onMoveDown,
  canMoveUp,
  canMoveDown,
  disableDrag = false,
}: BlockWrapperProps) {
  const config = typeConfig[type]
  const Icon = config.icon

  // Use sortable hook only if drag is not disabled
  const sortableResult = useSortable({ id, disabled: disableDrag })
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = sortableResult

  const style = disableDrag ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  // Determine if we show move buttons (for nested blocks) or drag handle (for top-level)
  const showMoveButtons = onMoveUp && onMoveDown

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={`relative transition-all ${
        isSelected
          ? 'ring-2 ring-primary shadow-md'
          : 'hover:shadow-sm'
      } ${isDragging ? 'shadow-xl' : ''}`}
      onClick={(e) => {
        // Only select if clicking on the card itself, not controls
        if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.block-content')) {
          onSelect()
        }
      }}
    >
      <CardHeader
        className={`py-2 px-3 flex flex-row items-center justify-between gap-2 bg-muted/30 ${
          !disableDrag ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        {...(disableDrag ? {} : { ...attributes, ...listeners })}
      >
        <div className="flex items-center gap-2">
          <GripVertical className={`h-5 w-5 ${disableDrag ? 'text-muted-foreground' : 'text-blue-500'}`} />
          <Badge variant="outline" className={`${config.color} gap-1`}>
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
          {title && (
            <span className="text-sm font-medium text-muted-foreground">
              {title}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          {showMoveButtons && (
            <>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-white hover:bg-blue-50 border-blue-300 hover:border-blue-500"
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveUp()
                }}
                disabled={!canMoveUp}
                title="Move up"
              >
                <ChevronUp className="h-4 w-4 text-blue-600" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7 bg-white hover:bg-blue-50 border-blue-300 hover:border-blue-500"
                onClick={(e) => {
                  e.stopPropagation()
                  onMoveDown()
                }}
                disabled={!canMoveDown}
                title="Move down"
              >
                <ChevronDown className="h-4 w-4 text-blue-600" />
              </Button>
            </>
          )}
          <Button
            variant="outline"
            size="icon"
            className="h-7 w-7 bg-white hover:bg-red-50 border-red-300 hover:border-red-500 text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-3 block-content" onClick={onSelect}>
        {children}
      </CardContent>
    </Card>
  )
}
