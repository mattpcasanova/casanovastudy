"use client"

import { useState } from 'react'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { ChevronDown, ChevronRight, CheckCircle2, Circle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { displaySerif } from '@/lib/formats/fonts'
import { formatContent } from '@/lib/formats/format-content'
import { surface, fontDisplay, eyebrow, detectTier, stripTierEmoji, tierStyles, type Tier } from '@/lib/formats/design'

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
  const [expandedSections, setExpandedSections] = useState<string[]>(getAllSectionIds(sections, 0, true))
  const [completedSections, setCompletedSections] = useState<string[]>([])
  const [checklistItems, setChecklistItems] = useState<Record<string, boolean>>({})

  const parentMap = buildParentMap(sections)
  const childrenMap = buildChildrenMap(sections)

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    )
  }

  const areAllChildrenCompleted = (sectionId: string, currentCompleted: string[]): boolean => {
    const children = childrenMap[sectionId] || []
    if (children.length === 0) return true
    return children.every(childId => currentCompleted.includes(childId))
  }

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
        const ancestors = getAncestors(sectionId)
        newCompleted = prev.filter(id => id !== sectionId && !ancestors.includes(id))
      } else {
        newCompleted = [...prev, sectionId]
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

  const progressPercentage = allSectionIds.length ? (completedSections.length / allSectionIds.length) * 100 : 0

  return (
    <div className={cn(displaySerif.variable, 'max-w-5xl mx-auto px-4 space-y-5')}>
      {/* Progress */}
      <div className={cn(surface, 'p-5 print:hidden')}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-slate-600">
            <span className="text-slate-900 font-semibold">{completedSections.length}</span> of {allSectionIds.length} sections complete
          </span>
          <span className="text-sm font-semibold text-blue-600">{Math.round(progressPercentage)}%</span>
        </div>
        <Progress value={progressPercentage} className="h-1.5" />
      </div>

      {/* Sections */}
      <div className="space-y-6">
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
            tier={null}
          />
        ))}
      </div>
    </div>
  )
}

function buildParentMap(sections: OutlineSection[], parentId?: string): Record<string, string> {
  const map: Record<string, string> = {}
  for (const section of sections) {
    if (parentId) map[section.id] = parentId
    if (section.children) Object.assign(map, buildParentMap(section.children, section.id))
  }
  return map
}

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
  level,
  tier,
}: {
  section: OutlineSection
  expandedSections: string[]
  completedSections: string[]
  toggleSection: (id: string) => void
  toggleCompleted: (id: string) => void
  checklistItems: Record<string, boolean>
  setChecklistItems: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  level: number
  tier: Tier | null
}) {
  const isExpanded = expandedSections.includes(section.id)
  const isCompleted = completedSections.includes(section.id)
  const hasChildren = section.children && section.children.length > 0
  const title = stripTierEmoji(section.title)

  // A section may declare a priority tier at any depth (the generator sometimes
  // nests 🔴/🟡/🟢 one level below the guide title). Detect it here and pass the
  // effective tier down so a whole priority group shares one accent color.
  const ownTier = detectTier(section.title)
  const effectiveTier = ownTier ?? tier

  const shouldShowCheckbox = () => {
    if (level === 0) return false
    const titleLower = section.title.toLowerCase()
    if (titleLower.includes('learning objectives') || titleLower.includes('exam focus')) return false
    return true
  }
  const showCheckbox = shouldShowCheckbox()

  const renderChildren = (extraClass = '') =>
    hasChildren && (
      <div className={cn('space-y-3', extraClass)}>
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
            tier={effectiveTier}
          />
        ))}
      </div>
    )

  // Level 0 — the top-level heading (no card, no checkbox)
  if (level === 0) {
    const t = ownTier ? tierStyles[ownTier] : null
    return (
      <section className="print:break-inside-avoid">
        <div className="mb-4">
          {t && (
            <span className={cn(eyebrow, 'inline-block rounded-full px-2.5 py-0.5 mb-2', t.chip)}>
              {t.label}
            </span>
          )}
          <h2 className={cn(fontDisplay, 'text-xl font-semibold text-slate-900 pb-2 border-b-2', t ? t.borderB : 'border-slate-200')}>
            {title}
          </h2>
        </div>

        {section.content && (
          <div className="mb-4">
            <InteractiveContent content={section.content} sectionId={section.id} checklistItems={checklistItems} setChecklistItems={setChecklistItems} />
          </div>
        )}

        {renderChildren('space-y-3')}
      </section>
    )
  }

  const t = effectiveTier ? tierStyles[effectiveTier] : null
  const own = ownTier ? tierStyles[ownTier] : null

  // Level 1+ — collapsible cards
  return (
    <div className={cn(surface, 'overflow-hidden border-l-4', t ? t.edge : 'border-l-slate-300', 'print:break-inside-avoid')}>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 print:cursor-default"
        onClick={() => toggleSection(section.id)}
      >
        {showCheckbox && (
          <span
            role="checkbox"
            aria-checked={isCompleted}
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); toggleCompleted(section.id) }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); toggleCompleted(section.id) } }}
            className="shrink-0 rounded-full outline-none focus-visible:ring-2 focus-visible:ring-blue-500 print:hidden"
          >
            {isCompleted
              ? <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              : <Circle className="h-5 w-5 text-slate-300" />}
          </span>
        )}
        <span className={cn('flex-1 font-semibold', own ? own.text : 'text-slate-800', level === 1 ? 'text-[1.05rem]' : 'text-sm', isCompleted && 'text-slate-400 line-through decoration-slate-300')}>
          {title}
        </span>
        {hasChildren && (
          <span className="shrink-0 text-slate-400 print:hidden">
            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </span>
        )}
      </button>

      {(isExpanded || !hasChildren) && (
        <div className="px-4 pb-4 pt-0 print:block">
          {section.content && (
            <div className={showCheckbox ? 'pl-8' : ''}>
              <InteractiveContent content={section.content} sectionId={section.id} checklistItems={checklistItems} setChecklistItems={setChecklistItems} />
            </div>
          )}
          {renderChildren('mt-3')}
        </div>
      )}
    </div>
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
  const parts = content.split(/(?=CHECKLIST:)/gi)

  return (
    <div className="prose prose-sm max-w-none space-y-3 text-slate-700">
      {parts.map((part, partIndex) => {
        const trimmed = part.trim()

        if (trimmed.match(/^CHECKLIST:/i)) {
          const checklistContent = trimmed.replace(/^CHECKLIST:\s*/i, '')
          const items = checklistContent.split('\n').filter(line => line.trim().startsWith('-'))

          return (
            <div key={partIndex} className="not-prose rounded-lg bg-slate-50 p-4 ring-1 ring-inset ring-slate-100">
              <p className={cn(eyebrow, 'text-slate-500 mb-3')}>Checklist</p>
              <div className="space-y-2">
                {items.map((item, itemIndex) => {
                  const itemId = `${sectionId}-checklist-${partIndex}-${itemIndex}`
                  const itemText = item.replace(/^-\s*/, '').trim()

                  return (
                    <div key={itemId} className="flex items-start gap-2.5">
                      <Checkbox
                        id={itemId}
                        checked={checklistItems[itemId] || false}
                        onCheckedChange={(checked) => {
                          setChecklistItems(prev => ({ ...prev, [itemId]: checked as boolean }))
                        }}
                        className="mt-0.5"
                      />
                      <label htmlFor={itemId} className="text-sm leading-relaxed text-slate-700 cursor-pointer select-none">
                        {itemText}
                      </label>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        }

        if (trimmed.match(/^NOTES:/i)) return null

        return (
          <div key={partIndex} dangerouslySetInnerHTML={{ __html: formatContent(trimmed) }} />
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

    if (trimmed.startsWith('# ')) {
      currentSection = { id: `section-${sectionCounter++}`, title: trimmed.replace(/^#\s+/, ''), level: 1, content: '', children: [] }
      sections.push(currentSection)
      currentSubSection = null
      currentSubSubSection = null
    } else if (trimmed.startsWith('## ')) {
      if (currentSection) {
        currentSubSection = { id: `section-${sectionCounter++}`, title: trimmed.replace(/^##\s+/, ''), level: 2, content: '', children: [] }
        currentSection.children!.push(currentSubSection)
        currentSubSubSection = null
      }
    } else if (trimmed.startsWith('### ')) {
      const parent = currentSubSection || currentSection
      if (parent) {
        currentSubSubSection = { id: `section-${sectionCounter++}`, title: trimmed.replace(/^###\s+/, ''), level: 3, content: '', children: [] }
        if (!parent.children) parent.children = []
        parent.children.push(currentSubSubSection)
      }
    } else {
      const target = currentSubSubSection || currentSubSection || currentSection
      if (target) target.content += (target.content ? '\n' : '') + trimmed
    }
  }

  return sections
}

function sectionHasCheckbox(section: OutlineSection, level: number): boolean {
  if (level === 0) return false
  const titleLower = section.title.toLowerCase()
  if (titleLower.includes('learning objectives') || titleLower.includes('exam focus')) return false
  return true
}

// Collect ids. Default: only checkbox-eligible sections (for progress counting).
// With `allExpandable`, collect every id (for the default-expanded set).
function getAllSectionIds(sections: OutlineSection[], level: number = 0, allExpandable = false): string[] {
  const ids: string[] = []
  for (const section of sections) {
    if (allExpandable || sectionHasCheckbox(section, level)) ids.push(section.id)
    if (section.children) ids.push(...getAllSectionIds(section.children, level + 1, allExpandable))
  }
  return ids
}
