export interface StudyGuideData {
  files: File[]
  subject: string
  gradeLevel: string
  format: 'outline' | 'flashcards' | 'quiz' | 'summary' | 'concept-map'
  topicFocus?: string
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
  additionalInstructions?: string
}

export interface ProcessedFile {
  name: string
  type: string
  size: number
  content: string
  extractedAt: Date
}

export interface StudyGuideRequest {
  files: ProcessedFile[]
  subject: string
  gradeLevel: string
  format: string
  topicFocus?: string
  difficultyLevel?: string
  additionalInstructions?: string
}

export interface StudyGuideResponse {
  id: string
  title: string
  content: string
  format: string
  generatedAt: Date
  fileCount: number
  subject: string
  gradeLevel: string
}

export interface EmailRequest {
  to: string
  subject: string
  studyGuideId: string
  pdfUrl: string
}

export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface FileUploadResponse {
  files: ProcessedFile[]
  totalSize: number
  processedCount: number
}

export interface ClaudeApiRequest {
  content: string
  subject: string
  gradeLevel: string
  format: string
  topicFocus?: string
  difficultyLevel?: string
  additionalInstructions?: string
}

export interface ClaudeApiResponse {
  content: string
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

export type StudyGuideFormat = 'outline' | 'flashcards' | 'quiz' | 'summary' | 'concept-map'
export type GradeLevel = '9th' | '10th' | '11th' | '12th' | 'college'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type FileType = 'pdf' | 'pptx' | 'docx' | 'txt'
