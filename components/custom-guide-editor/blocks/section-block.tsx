"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  EditorBlock,
  SectionBlockData,
  BlockType
} from "@/lib/types/editor-blocks"
import { BlockWrapper } from "./block-wrapper"
import { TextBlock } from "./text-block"
import { AlertBlock } from "./alert-block"
import { TableBlock } from "./table-block"
import { QuizBlock } from "./quiz-block"
import { ChecklistBlock } from "./checklist-block"
import { DefinitionBlock } from "./definition-block"
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Type,
  AlertCircle,
  Table2,
  HelpCircle,
  CheckSquare,
  BookOpen
} from "lucide-react"
import { useState } from "react"

interface SectionBlockProps {
  block: EditorBlock
  onUpdate: (updates: Partial<EditorBlock>) => void
  onAddBlock: (type: BlockType, afterId?: string, parentId?: string) => void
  onUpdateBlock: (id: string, updates: Partial<EditorBlock>) => void
  onDeleteBlock: (id: string) => void
  onMoveBlock: (id: string, direction: 'up' | 'down') => void
  selectedBlockId: string | null
  onSelectBlock: (id: string | null) => void
}

const childBlockTypes: { type: BlockType; icon: React.ComponentType<{ className?: string }>; label: string }[] = [
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'alert', icon: AlertCircle, label: 'Alert' },
  { type: 'table', icon: Table2, label: 'Table' },
  { type: 'quiz', icon: HelpCircle, label: 'Quiz' },
  { type: 'checklist', icon: CheckSquare, label: 'Checklist' },
  { type: 'definition', icon: BookOpen, label: 'Definition' },
]

export function SectionBlock({
  block,
  onUpdate,
  onAddBlock,
  onUpdateBlock,
  onDeleteBlock,
  onMoveBlock,
  selectedBlockId,
  onSelectBlock
}: SectionBlockProps) {
  const data = block.data as SectionBlockData
  const [isExpanded, setIsExpanded] = useState(true)
  const [showAddMenu, setShowAddMenu] = useState(false)

  const handleTitleChange = (title: string) => {
    onUpdate({ title })
  }

  const handleAddChildBlock = (type: BlockType) => {
    onAddBlock(type, undefined, block.id)
    setShowAddMenu(false)
  }

  const renderChildBlock = (childBlock: EditorBlock, index: number) => {
    const isSelected = selectedBlockId === childBlock.id
    const children = block.children || []
    const canMoveUp = index > 0
    const canMoveDown = index < children.length - 1

    const blockContent = () => {
      switch (childBlock.type) {
        case 'text':
          return (
            <TextBlock
              block={childBlock}
              onUpdate={(updates) => onUpdateBlock(childBlock.id, updates)}
            />
          )
        case 'alert':
          return (
            <AlertBlock
              block={childBlock}
              onUpdate={(updates) => onUpdateBlock(childBlock.id, updates)}
            />
          )
        case 'table':
          return (
            <TableBlock
              block={childBlock}
              onUpdate={(updates) => onUpdateBlock(childBlock.id, updates)}
            />
          )
        case 'quiz':
          return (
            <QuizBlock
              block={childBlock}
              onUpdate={(updates) => onUpdateBlock(childBlock.id, updates)}
            />
          )
        case 'checklist':
          return (
            <ChecklistBlock
              block={childBlock}
              onUpdate={(updates) => onUpdateBlock(childBlock.id, updates)}
            />
          )
        case 'definition':
          return (
            <DefinitionBlock
              block={childBlock}
              onUpdate={(updates) => onUpdateBlock(childBlock.id, updates)}
            />
          )
        default:
          return null
      }
    }

    return (
      <BlockWrapper
        key={childBlock.id}
        id={childBlock.id}
        type={childBlock.type}
        title={childBlock.title}
        isSelected={isSelected}
        onSelect={() => onSelectBlock(childBlock.id)}
        onDelete={() => onDeleteBlock(childBlock.id)}
        onMoveUp={() => onMoveBlock(childBlock.id, 'up')}
        onMoveDown={() => onMoveBlock(childBlock.id, 'down')}
        canMoveUp={canMoveUp}
        canMoveDown={canMoveDown}
        disableDrag={true}
      >
        {blockContent()}
      </BlockWrapper>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1">
          <Input
            value={block.title || ''}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Section title..."
            className="font-semibold"
          />
        </div>
        <Badge variant="outline" className="text-xs">
          {block.children?.length || 0} items
        </Badge>
      </div>

      {isExpanded && (
        <div className="pl-6 border-l-2 border-blue-200 space-y-3">
          {block.children && block.children.length > 0 ? (
            <>
              {block.children.map((child, index) => renderChildBlock(child, index))}
            </>
          ) : (
            <p className="text-sm text-muted-foreground py-2">
              No content in this section yet. Add blocks below.
            </p>
          )}

          {/* Add block menu */}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed"
              onClick={() => setShowAddMenu(!showAddMenu)}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add to Section
            </Button>

            {showAddMenu && (
              <Card className="absolute top-full left-0 right-0 mt-1 z-10">
                <CardContent className="p-2">
                  <div className="grid grid-cols-3 gap-1">
                    {childBlockTypes.map(({ type, icon: Icon, label }) => (
                      <Button
                        key={type}
                        variant="ghost"
                        size="sm"
                        className="justify-start gap-2"
                        onClick={() => handleAddChildBlock(type)}
                      >
                        <Icon className="h-4 w-4" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
