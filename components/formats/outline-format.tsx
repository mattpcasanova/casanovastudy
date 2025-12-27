"use client"

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
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

  // Build parent-child relationships for auto-checking
  const parentMap = buildParentMap(sections)
  const childrenMap = buildChildrenMap(sections)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  // Check if all children of a section are completed
  const areAllChildrenCompleted = (sectionId: string, currentCompleted: string[]): boolean => {
    const children = childrenMap[sectionId] || []
    if (children.length === 0) return true
    return children.every(childId => currentCompleted.includes(childId))
  }

  // Get all ancestors of a section (parent, grandparent, etc.)
  const getAncestors = (sectionId: string): string[] => {
    const ancestors: string[] = []
    let current = parentMap[sectionId]
    while (current) {
      ancestors.push(current)
      current = parentMap[current]
    }
    return ancestors
  }

  const toggleCompleted = (sectionId: string) => {
    setCompletedSections(prev => {
      const isCurrentlyCompleted = prev.includes(sectionId)
      let newCompleted: string[]

      if (isCurrentlyCompleted) {
        // Unchecking: remove this section and all its ancestors
        const ancestors = getAncestors(sectionId)
        newCompleted = prev.filter(id => id !== sectionId && !ancestors.includes(id))
      } else {
        // Checking: add this section
        newCompleted = [...prev, sectionId]

        // Auto-check parents if all their children are now completed
        const ancestors = getAncestors(sectionId)
        for (const ancestorId of ancestors) {
          if (areAllChildrenCompleted(ancestorId, newCompleted) && !newCompleted.includes(ancestorId)) {
            newCompleted.push(ancestorId)
          }
        }
      }

      return newCompleted
    })
  }

  const progressPercentage = (completedSections.length / allSectionIds.length) * 100

  return (
    <div className="space-y-6">
      {/* Progress Card - Rounded like Flashcards */}
      <div className="max-w-5xl mx-auto px-4 print:hidden">
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {completedSections.length} of {allSectionIds.length} sections complete
                  </span>
                </div>
                <Badge variant={progressPercentage === 100 ? "default" : "secondary"}>
                  {Math.round(progressPercentage)}%
                </Badge>
              </div>
              <Progress value={progressPercentage} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Outline Sections */}
      <div className="max-w-5xl mx-auto space-y-4 px-4">
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
            level={0}
          />
        ))}
      </div>
    </div>
  )
}

// Build a map of child -> parent relationships
function buildParentMap(sections: OutlineSection[], parentId?: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const section of sections) {
    if (parentId) {
      map[section.id] = parentId
    }
    if (section.children) {
      Object.assign(map, buildParentMap(section.children, section.id))
    }
  }
  return map
}

// Build a map of parent -> children relationships
function buildChildrenMap(sections: OutlineSection[]): Record<string, string[]> {
  const map: Record<string, string[]> = {}

  function traverse(section: OutlineSection) {
    if (section.children && section.children.length > 0) {
      map[section.id] = section.children.map(child => child.id)
      section.children.forEach(traverse)
    }
  }

  sections.forEach(traverse)
  return map
}

function OutlineSection({
  section,
  expandedSections,
  completedSections,
  toggleSection,
  toggleCompleted,
  checklistItems,
  setChecklistItems,
  level
}: {
  section: OutlineSection
  expandedSections: string[]
  completedSections: string[]
  toggleSection: (id: string) => void
  toggleCompleted: (id: string) => void
  checklistItems: Record<string, boolean>
  setChecklistItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
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

  // Check if this section should show a checkbox
  const shouldShowCheckbox = () => {
    // Never show checkbox for level 0 (main title)
    if (level === 0) return false
    // Don't show checkbox for Learning Objectives or Exam Focus Points
    const titleLower = section.title.toLowerCase()
    if (titleLower.includes('learning objectives') || titleLower.includes('exam focus')) return false
    return true
  }

  const showCheckbox = shouldShowCheckbox()

  // Level 0 sections render without a Card wrapper (no outer box)
  if (level === 0) {
    return (
      <div className="print:break-inside-avoid">
        {/* Title as a heading without box - no checkbox */}
        <div className="flex items-center gap-3 mb-4 pb-3 border-b-2 border-blue-600">
          <h2 className="text-2xl font-bold text-blue-900">{section.title}</h2>
        </div>

        {/* Content */}
        {section.content && (
          <div className="mb-4">
            <InteractiveContent
              content={section.content}
              sectionId={section.id}
              checklistItems={checklistItems}
              setChecklistItems={setChecklistItems}
            />
          </div>
        )}

        {/* Children sections (these get Card wrappers) */}
        {hasChildren && (
          <div className="space-y-4">
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
                level={level + 1}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Level 1+ sections use Card wrappers
  return (
    <Card className={`${getBgColor()} print:break-inside-avoid`}>
      <CardHeader
        className="cursor-pointer hover:bg-gray-50/50 transition-colors print:cursor-default"
        onClick={() => toggleSection(section.id)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1">
            {showCheckbox && (
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
            )}
            <CardTitle className={`${getTitleColor()} ${level === 1 ? 'text-lg' : 'text-base'}`}>
              {section.title}
            </CardTitle>
          </div>
          {hasChildren && (
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
      {(isExpanded || !hasChildren) && (
        <CardContent className="print:block">
          {section.content && (
            <InteractiveContent
              content={section.content}
              sectionId={section.id}
              checklistItems={checklistItems}
              setChecklistItems={setChecklistItems}
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
  setChecklistItems
}: {
  content: string
  sectionId: string
  checklistItems: Record<string, boolean>
  setChecklistItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
}) {
  // Split content by CHECKLIST: sections (NOTES sections are ignored)
  const parts = content.split(/(?=CHECKLIST:)/gi)

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

        // Skip NOTES sections (removed per user request)
        if (trimmed.match(/^NOTES:/i)) {
          return null
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

// Helper to check if a section should have a checkbox
function sectionHasCheckbox(section: OutlineSection, level: number): boolean {
  // Never show checkbox for level 0 (main title)
  if (level === 0) return false
  // Don't show checkbox for Learning Objectives or Exam Focus Points
  const titleLower = section.title.toLowerCase()
  if (titleLower.includes('learning objectives') || titleLower.includes('exam focus')) return false
  return true
}

function getAllSectionIds(sections: OutlineSection[], level: number = 0): string[] {
  const ids: string[] = []
  for (const section of sections) {
    // Only include sections that have checkboxes
    if (sectionHasCheckbox(section, level)) {
      ids.push(section.id)
    }
    if (section.children) {
      ids.push(...getAllSectionIds(section.children, level + 1))
    }
  }
  return ids
}

function formatContent(content: string): string {
  // First, handle markdown tables with separator row
  const tableRegex = /\|(.+\|)+\n\|[-:\s|]+\|\n(\|.+\|(\n)?)+/gm
  let processedContent = content.replace(tableRegex, (match) => {
    const lines = match.trim().split('\n')
    if (lines.length < 2) return match

    const headerCells = lines[0].split('|').filter(cell => cell.trim())
    const bodyRows = lines.slice(2) // Skip header and separator

    let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">'
    tableHtml += '<thead class="bg-blue-50"><tr>'
    headerCells.forEach(cell => {
      tableHtml += `<th class="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">${cell.trim()}</th>`
    })
    tableHtml += '</tr></thead><tbody>'

    bodyRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell.trim())
      const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      tableHtml += `<tr class="${bgClass}">`
      cells.forEach(cell => {
        tableHtml += `<td class="border border-gray-300 px-4 py-2 text-gray-700">${cell.trim()}</td>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</tbody></table></div>'
    return tableHtml
  })

  // Handle simpler tables without separator row (consecutive lines with pipes)
  const simpleTableRegex = /(\|[^|\n]+\|[^|\n]*\|?\n?){2,}/gm
  processedContent = processedContent.replace(simpleTableRegex, (match) => {
    // Check if already processed (contains HTML)
    if (match.includes('<table') || match.includes('<div')) return match

    const lines = match.trim().split('\n').filter(l => l.includes('|'))
    if (lines.length < 2) return match

    // First line is header
    const headerCells = lines[0].split('|').filter(cell => cell.trim())
    if (headerCells.length < 2) return match // Not a real table

    // Check if second line is a separator (skip it if so)
    let startRow = 1
    if (lines[1] && /^[\s|:-]+$/.test(lines[1])) {
      startRow = 2
    }
    const bodyRows = lines.slice(startRow)

    let tableHtml = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-300 rounded-lg overflow-hidden">'
    tableHtml += '<thead class="bg-blue-50"><tr>'
    headerCells.forEach(cell => {
      tableHtml += `<th class="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-900">${cell.trim()}</th>`
    })
    tableHtml += '</tr></thead><tbody>'

    bodyRows.forEach((row, index) => {
      const cells = row.split('|').filter(cell => cell.trim())
      if (cells.length === 0) return
      const bgClass = index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      tableHtml += `<tr class="${bgClass}">`
      cells.forEach(cell => {
        tableHtml += `<td class="border border-gray-300 px-4 py-2 text-gray-700">${cell.trim()}</td>`
      })
      tableHtml += '</tr>'
    })

    tableHtml += '</tbody></table></div>'
    return tableHtml
  })

  return processedContent
    // Handle markdown headers (#### first, then ###, then ##)
    .replace(/^#### (.+)$/gm, '<h4 class="text-base font-semibold text-gray-800 mt-4 mb-2">$1</h4>')
    .replace(/^### (.+)$/gm, '<h3 class="text-lg font-semibold text-gray-900 mt-4 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h2>')
    // Handle bold and italic
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-blue-700">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Handle lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul class="list-disc ml-6 space-y-1">$&</ul>')
    // Handle line breaks (but not after headers or tables)
    .replace(/(?<!<\/h[2-4]>|<\/table>|<\/div>)\n/g, '<br>')
}
