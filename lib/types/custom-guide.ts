// Types for custom study guide content structure

export interface CustomGuideContent {
  version: '1.0'
  sections: CustomSection[]
  metadata?: CustomGuideMetadata
}

export interface CustomGuideMetadata {
  estimatedDuration?: number // in minutes
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  tags?: string[]
}

export interface CustomSection {
  id: string
  type: 'section' | 'definition' | 'alert' | 'quiz' | 'checklist' | 'table' | 'text'
  title?: string
  collapsed?: boolean
  content: SectionContent
  children?: CustomSection[]
}

export type SectionContent =
  | TextContent
  | DefinitionContent
  | AlertContent
  | QuizContent
  | ChecklistContent
  | TableContent

export interface TextContent {
  type: 'text'
  markdown: string
}

export type DefinitionColorVariant = 'purple' | 'blue' | 'teal' | 'green' | 'pink' | 'orange'

export interface DefinitionContent {
  type: 'definition'
  term: string
  definition: string
  examples?: string[]
  colorVariant?: DefinitionColorVariant
}

export interface AlertContent {
  type: 'alert'
  variant: 'info' | 'warning' | 'success' | 'exam-tip'
  title?: string
  message: string
}

export interface QuizContent {
  type: 'quiz'
  questions: QuizQuestion[]
}

export interface QuizQuestion {
  id: string
  questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'calculation'
  question: string
  options?: string[]
  correctAnswer: string | boolean
  explanation?: string
}

export interface ChecklistContent {
  type: 'checklist'
  items: ChecklistItem[]
}

export interface ChecklistItem {
  id: string
  label: string
}

export interface TableContent {
  type: 'table'
  headers: string[]
  rows: string[][]
  headerStyle?: 'default' | 'blue' | 'green' | 'purple'
}

// Helper type guard functions
export function isTextContent(content: SectionContent): content is TextContent {
  return content.type === 'text'
}

export function isDefinitionContent(content: SectionContent): content is DefinitionContent {
  return content.type === 'definition'
}

export function isAlertContent(content: SectionContent): content is AlertContent {
  return content.type === 'alert'
}

export function isQuizContent(content: SectionContent): content is QuizContent {
  return content.type === 'quiz'
}

export function isChecklistContent(content: SectionContent): content is ChecklistContent {
  return content.type === 'checklist'
}

export function isTableContent(content: SectionContent): content is TableContent {
  return content.type === 'table'
}
