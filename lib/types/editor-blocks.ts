// Editor-specific types for the custom guide block editor

import { CustomGuideContent, CustomSection, SectionContent } from './custom-guide'

// Block types that can be created in the editor
export type BlockType = 'text' | 'section' | 'alert' | 'table' | 'quiz' | 'checklist' | 'definition'

// Editor block structure
export interface EditorBlock {
  id: string
  type: BlockType
  title?: string
  data: EditorBlockData
  children?: EditorBlock[]
}

// Union of all block data types
export type EditorBlockData =
  | TextBlockData
  | SectionBlockData
  | AlertBlockData
  | TableBlockData
  | QuizBlockData
  | ChecklistBlockData
  | DefinitionBlockData

// Text block
export interface TextBlockData {
  type: 'text'
  markdown: string
}

// Section block (collapsible container)
export interface SectionBlockData {
  type: 'section'
  collapsed?: boolean
}

// Alert block
export interface AlertBlockData {
  type: 'alert'
  variant: 'info' | 'warning' | 'success' | 'exam-tip'
  title?: string
  message: string
}

// Table block
export interface TableBlockData {
  type: 'table'
  headers: string[]
  rows: string[][]
  headerStyle?: 'default' | 'blue' | 'green' | 'purple'
}

// Quiz block
export interface QuizBlockData {
  type: 'quiz'
  questions: EditorQuizQuestion[]
}

export interface EditorQuizQuestion {
  id: string
  questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'calculation'
  question: string
  options?: string[]
  correctAnswer: string
  explanation?: string
}

// Checklist block
export interface ChecklistBlockData {
  type: 'checklist'
  items: EditorChecklistItem[]
}

export interface EditorChecklistItem {
  id: string
  label: string
}

// Definition block
export interface DefinitionBlockData {
  type: 'definition'
  term: string
  definition: string
  examples?: string[]
}

// Guide metadata for the editor
export interface EditorGuideMetadata {
  title: string
  subject: string
  gradeLevel: string
  estimatedDuration?: number
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
}

// Generate a unique block ID
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Generate a unique question ID
export function generateQuestionId(): string {
  return `q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Generate a unique checklist item ID
export function generateChecklistItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Create a new empty block of a specific type
export function createEmptyBlock(type: BlockType): EditorBlock {
  const id = generateBlockId()

  switch (type) {
    case 'text':
      return {
        id,
        type: 'text',
        data: { type: 'text', markdown: '' }
      }

    case 'section':
      return {
        id,
        type: 'section',
        title: 'New Section',
        data: { type: 'section', collapsed: false },
        children: []
      }

    case 'alert':
      return {
        id,
        type: 'alert',
        data: { type: 'alert', variant: 'info', message: '' }
      }

    case 'table':
      return {
        id,
        type: 'table',
        data: {
          type: 'table',
          headers: ['Column 1', 'Column 2'],
          rows: [['', '']],
          headerStyle: 'default'
        }
      }

    case 'quiz':
      return {
        id,
        type: 'quiz',
        data: {
          type: 'quiz',
          questions: [{
            id: generateQuestionId(),
            questionType: 'multiple-choice',
            question: '',
            options: ['', '', '', ''],
            correctAnswer: '',
            explanation: ''
          }]
        }
      }

    case 'checklist':
      return {
        id,
        type: 'checklist',
        data: {
          type: 'checklist',
          items: [{ id: generateChecklistItemId(), label: '' }]
        }
      }

    case 'definition':
      return {
        id,
        type: 'definition',
        data: {
          type: 'definition',
          term: '',
          definition: '',
          examples: []
        }
      }

    default:
      return {
        id,
        type: 'text',
        data: { type: 'text', markdown: '' }
      }
  }
}

// Convert EditorBlock array to CustomGuideContent
export function blocksToCustomContent(
  blocks: EditorBlock[],
  metadata?: EditorGuideMetadata
): CustomGuideContent {
  return {
    version: '1.0',
    sections: blocks.map(blockToSection),
    metadata: metadata ? {
      estimatedDuration: metadata.estimatedDuration,
      difficulty: metadata.difficulty,
      tags: metadata.tags
    } : undefined
  }
}

// Convert a single EditorBlock to CustomSection
function blockToSection(block: EditorBlock): CustomSection {
  const section: CustomSection = {
    id: block.id,
    type: block.type as CustomSection['type'],
    title: block.title,
    content: blockDataToSectionContent(block.data)
  }

  // Add children for section blocks
  if (block.type === 'section' && block.children && block.children.length > 0) {
    section.children = block.children.map(blockToSection)
  }

  // Add collapsed state for sections
  if (block.type === 'section' && block.data.type === 'section') {
    section.collapsed = block.data.collapsed
  }

  return section
}

// Convert EditorBlockData to SectionContent
function blockDataToSectionContent(data: EditorBlockData): SectionContent {
  switch (data.type) {
    case 'text':
      return { type: 'text', markdown: data.markdown }

    case 'section':
      return { type: 'text', markdown: '' } // Sections use children, not content

    case 'alert':
      return {
        type: 'alert',
        variant: data.variant,
        title: data.title,
        message: data.message
      }

    case 'table':
      return {
        type: 'table',
        headers: data.headers,
        rows: data.rows,
        headerStyle: data.headerStyle
      }

    case 'quiz':
      return {
        type: 'quiz',
        questions: data.questions.map(q => ({
          id: q.id,
          questionType: q.questionType,
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation
        }))
      }

    case 'checklist':
      return {
        type: 'checklist',
        items: data.items.map(item => ({
          id: item.id,
          label: item.label
        }))
      }

    case 'definition':
      return {
        type: 'definition',
        term: data.term,
        definition: data.definition,
        examples: data.examples
      }

    default:
      return { type: 'text', markdown: '' }
  }
}

// Convert CustomGuideContent to EditorBlock array (for editing existing guides)
export function customContentToBlocks(content: CustomGuideContent): EditorBlock[] {
  return content.sections.map(section => sectionToBlock(section, false))
}

// Convert CustomSection to EditorBlock (exported for incremental section additions)
// Use regenerateIds=true when adding AI-generated content to avoid duplicate key errors
export function sectionToBlock(section: CustomSection, regenerateIds: boolean = false): EditorBlock {
  const block: EditorBlock = {
    id: regenerateIds ? generateBlockId() : section.id,
    type: section.type as BlockType,
    title: section.title,
    data: sectionContentToBlockData(section.type, section.content, regenerateIds)
  }

  // Convert children for section blocks
  if (section.children && section.children.length > 0) {
    block.children = section.children.map(child => sectionToBlock(child, regenerateIds))
  }

  // Handle collapsed state
  if (section.type === 'section' && section.collapsed !== undefined) {
    (block.data as SectionBlockData).collapsed = section.collapsed
  }

  return block
}

// Convert SectionContent to EditorBlockData
function sectionContentToBlockData(type: string, content: SectionContent, regenerateIds: boolean = false): EditorBlockData {
  switch (type) {
    case 'text':
      if (content.type === 'text') {
        return { type: 'text', markdown: content.markdown }
      }
      break

    case 'section':
      return { type: 'section', collapsed: false }

    case 'alert':
      if (content.type === 'alert') {
        return {
          type: 'alert',
          variant: content.variant,
          title: content.title,
          message: content.message
        }
      }
      break

    case 'table':
      if (content.type === 'table') {
        return {
          type: 'table',
          headers: content.headers,
          rows: content.rows,
          headerStyle: content.headerStyle
        }
      }
      break

    case 'quiz':
      if (content.type === 'quiz') {
        return {
          type: 'quiz',
          questions: content.questions.map(q => ({
            id: regenerateIds ? generateQuestionId() : q.id,
            questionType: q.questionType,
            question: q.question,
            options: q.options,
            correctAnswer: String(q.correctAnswer),
            explanation: q.explanation
          }))
        }
      }
      break

    case 'checklist':
      if (content.type === 'checklist') {
        return {
          type: 'checklist',
          items: content.items.map(item => ({
            id: regenerateIds ? generateChecklistItemId() : item.id,
            label: item.label
          }))
        }
      }
      break

    case 'definition':
      if (content.type === 'definition') {
        return {
          type: 'definition',
          term: content.term,
          definition: content.definition,
          examples: content.examples
        }
      }
      break
  }

  // Default fallback
  return { type: 'text', markdown: '' }
}
