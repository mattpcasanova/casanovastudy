"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronUp, CheckCircle, Circle, BookOpen } from 'lucide-react'

interface OutlineFormatProps {
  content: string
  subject: string
}

interface OutlineSection {
  id: string
  title: string
  level: number
  content: string
  children?: OutlineSection[]
}

export default function OutlineFormat({ content, subject }: OutlineFormatProps) {
  const sections = parseOutlineContent(content)
  const allSectionIds = getAllSectionIds(sections)
  const [expandedSections, setExpandedSections] = useState<string[]>(allSectionIds)
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const toggleCompleted = (sectionId: string) => {
    setCompletedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const progressPercentage = (completedSections.length / allSectionIds.length) * 100

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Progress Card */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Study Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Progress: {completedSections.length}/{allSectionIds.length} sections
              </span>
              <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
                {Math.round(progressPercentage)}%
              </Badge>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Outline Sections */}
      <div className="space-y-4">
        {sections.map(section => (
          <OutlineSection
            key={section.id}
            section={section}
            expandedSections={expandedSections}
            completedSections={completedSections}
            toggleSection={toggleSection}
            toggleCompleted={toggleCompleted}
            checklistItems={checklistItems}
            setChecklistItems={setChecklistItems}
            notes={notes}
            setNotes={setNotes}
            level={0}
          />
        ))}
      </div>
    </div>
  )
}

function OutlineSection({
  section,
  expandedSections,
  completedSections,
  toggleSection,
  toggleCompleted,
  checklistItems,
  setChecklistItems,
  notes,
  setNotes,
  level
}: {
  section: OutlineSection
  expandedSections: string[]
  completedSections: string[]
  toggleSection: (id: string) => void
  toggleCompleted: (id: string) => void
  checklistItems: Record<string, boolean>
  setChecklistItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  notes: Record<string, string>
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>
  level: number
}) {
  const isExpanded = expandedSections.includes(section.id)
  const isCompleted = completedSections.includes(section.id)
  const hasChildren = section.children && section.children.length > 0

  const getBgColor = () => {
    if (level === 0) return 'border-l-4 border-blue-600'
    if (level === 1) return 'border-l-4 border-indigo-500'
    return 'border-l-4 border-gray-400'
  }

  const getTitleColor = () => {
    if (level === 0) return 'text-blue-900'
    if (level === 1) return 'text-indigo-800'
    return 'text-gray-800'
  }

  return (
    <Card className={`${getBgColor()} print:break-inside-avoid`}>
      <CardHeader
        className={level === 0 ? "print:cursor-default" : "cursor-pointer hover:bg-gray-50/50 transition-colors print:cursor-default"}
        onClick={level === 0 ? undefined : () => toggleSection(section.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                toggleCompleted(section.id)
              }}
              className="p-1 h-auto print:hidden"
            >
              {isCompleted ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Circle className="h-5 w-5" />
              )}
            </Button>
            <CardTitle className={`${getTitleColor()} text-${level === 0 ? 'xl' : level === 1 ? 'lg' : 'base'}`}>
              {section.title}
            </CardTitle>
          </div>
          {hasChildren && level !== 0 && (
            <div className="print:hidden">
              {isExpanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </div>
          )}
        </div>
      </CardHeader>
      {((level === 0 || isExpanded) || !hasChildren) && (
        <CardContent className="print:block">
          {section.content && (
            <InteractiveContent
              content={section.content}
              sectionId={section.id}
              checklistItems={checklistItems}
              setChecklistItems={setChecklistItems}
              notes={notes}
              setNotes={setNotes}
            />
          )}
          {hasChildren && (
            <div className="space-y-3 mt-4">
              {section.children!.map(child => (
                <OutlineSection
                  key={child.id}
                  section={child}
                  expandedSections={expandedSections}
                  completedSections={completedSections}
                  toggleSection={toggleSection}
                  toggleCompleted={toggleCompleted}
                  checklistItems={checklistItems}
                  setChecklistItems={setChecklistItems}
                  notes={notes}
                  setNotes={setNotes}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function InteractiveContent({
  content,
  sectionId,
  checklistItems,
  setChecklistItems,
  notes,
  setNotes
}: {
  content: string
  sectionId: string
  checklistItems: Record<string, boolean>
  setChecklistItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  notes: Record<string, string>
  setNotes: React.Dispatch<React.SetStateAction<Record<string, string>>>
}) {
  // Split content by CHECKLIST: and NOTES: sections
  const parts = content.split(/(?=(?:CHECKLIST:|NOTES:))/gi)

  return (
    <div className="prose prose-sm max-w-none space-y-4">
      {parts.map((part, partIndex) => {
        const trimmed = part.trim()

        // Handle CHECKLIST section
        if (trimmed.match(/^CHECKLIST:/i)) {
          const checklistContent = trimmed.replace(/^CHECKLIST:\s*/i, '')
          const items = checklistContent.split('\n').filter(line => line.trim().startsWith('-'))

          return (
            <div key={partIndex} className="border-2 border-blue-300 rounded-lg p-4 bg-blue-50/50">
              <h4 className="font-semibold text-blue-900 mb-3">Checklist</h4>
              <div className="space-y-2">
                {items.map((item, itemIndex) => {
                  const itemId = `${sectionId}-checklist-${partIndex}-${itemIndex}`
                  const itemText = item.replace(/^-\s*/, '').trim()

                  return (
                    <div key={itemId} className="flex items-start gap-2">
                      <Checkbox
                        id={itemId}
                        checked={checklistItems[itemId] || false}
                        onCheckedChange={(checked) => {
                          setChecklistItems(prev => ({
                            ...prev,
                            [itemId]: checked as boolean
                          }))
                        }}
                        className="mt-0.5"
                      />
                      <label
                        htmlFor={itemId}
                        className="text-sm leading-relaxed cursor-pointer select-none"
                      >
                        {itemText}
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        // Handle NOTES section
        if (trimmed.match(/^NOTES:/i)) {
          const notesId = `${sectionId}-notes-${partIndex}`

          return (
            <div key={partIndex} className="border-2 border-gray-300 rounded-lg p-4 bg-gray-50/50">
              <h4 className="font-semibold text-gray-900 mb-3">Notes</h4>
              <Textarea
                id={notesId}
                value={notes[notesId] || ''}
                onChange={(e) => {
                  setNotes(prev => ({
                    ...prev,
                    [notesId]: e.target.value
                  }))
                }}
                placeholder="Add your notes here..."
                className="min-h-[100px] resize-y bg-white"
              />
            </div>
          )
        }

        // Regular content
        return (
          <div
            key={partIndex}
            dangerouslySetInnerHTML={{
              __html: formatContent(trimmed)
            }}
          />
        )
      })}
    </div>
  )
}

function parseOutlineContent(content: string): OutlineSection[] {
  const lines = content.split('\n')
  const sections: OutlineSection[] = []
  let currentSection: OutlineSection | null = null
  let currentSubSection: OutlineSection | null = null
  let currentSubSubSection: OutlineSection | null = null
  let sectionCounter = 0

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue

    // Check for headers
    if (trimmed.startsWith('# ')) {
      currentSection = {
        id: `section-${sectionCounter++}`,
        title: trimmed.replace(/^#\s+/, ''),
        level: 1,
        content: '',
        children: []
      }
      sections.push(currentSection)
      currentSubSection = null
      currentSubSubSection = null
    } else if (trimmed.startsWith('## ')) {
      if (currentSection) {
        currentSubSection = {
          id: `section-${sectionCounter++}`,
          title: trimmed.replace(/^##\s+/, ''),
          level: 2,
          content: '',
          children: []
        }
        currentSection.children!.push(currentSubSection)
        currentSubSubSection = null
      }
    } else if (trimmed.startsWith('### ')) {
      const parent = currentSubSection || currentSection
      if (parent) {
        currentSubSubSection = {
          id: `section-${sectionCounter++}`,
          title: trimmed.replace(/^###\s+/, ''),
          level: 3,
          content: '',
          children: []
        }
        if (!parent.children) parent.children = []
        parent.children.push(currentSubSubSection)
      }
    } else {
      // Add content to the deepest current section
      const target = currentSubSubSection || currentSubSection || currentSection
      if (target) {
        target.content += (target.content ? '\n' : '') + trimmed
      }
    }
  }

  return sections
}

function getAllSectionIds(sections: OutlineSection[]): string[] {
  const ids: string[] = []
  for (const section of sections) {
    ids.push(section.id)
    if (section.children) {
      ids.push(...getAllSectionIds(section.children))
    }
  }
  return ids
}

function formatContent(content: string): string {
  return content
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-700">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-6 space-y-1">$&</ul>')
    .replace(/\n/g, '<br>')
}
