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

// The formats a user can ask the AI to include when directing generation.
export type GuideFormatChoice = 'outline' | 'summary' | 'flashcards' | 'quiz' | 'definition' | 'table'

// Structured "specific control" directives for AI generation. All optional —
// when omitted the AI decides ("generic" mode).
export interface GuideControls {
  formats?: GuideFormatChoice[] // which formats to include
  flashcardCount?: number // target cards per flashcard deck
  quizCount?: number // target questions per quiz
  splitBy?: 'topic' | 'single' // one section per topic/chapter, or one combined guide
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  length?: 'concise' | 'detailed'
}

export interface CustomSection {
  id: string
  type: 'section' | 'definition' | 'alert' | 'quiz' | 'checklist' | 'table' | 'text' | 'flashcards'
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
  | FlashcardsContent

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

export interface FlashCard {
  id: string
  front: string
  back: string
}

export interface FlashcardsContent {
  type: 'flashcards'
  cards: FlashCard[]
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

export function isFlashcardsContent(content: SectionContent): content is FlashcardsContent {
  return content.type === 'flashcards'
}
