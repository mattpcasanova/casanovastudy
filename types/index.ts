export interface StudyGuideData {
  files: File[]
  studyGuideName: string
  subject: string
  gradeLevel: string
  format: 'outline' | 'flashcards' | 'quiz' | 'summary'
  topicFocus?: string
  difficultyLevel?: 'beginner' | 'intermediate' | 'advanced'
  additionalInstructions?: string
}

export interface ProcessedFile {
  name: string
  type: string
  content: string
  originalSize: number
  processedSize: number
}

export interface CloudinaryFile {
  url: string
  filename: string
  size: number
  format: string
}

export interface StudyGuideRequest {
  files?: ProcessedFile[]
  cloudinaryFiles?: CloudinaryFile[]
  studyGuideName: string
  subject: string
  gradeLevel: string
  format: string
  topicFocus?: string
  difficultyLevel?: string
  additionalInstructions?: string
  userId?: string  // User ID to associate with the study guide
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
  studyGuideUrl?: string
  pdfDataUrl?: string
  pdfUrl?: string
  tokenUsage?: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
}

export interface EmailRequest {
  to: string
  subject: string
  studyGuideId: string
  pdfDataUrl?: string
  pdfUrl?: string
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
    total_tokens: number
  }
}

export type StudyGuideFormat = 'outline' | 'flashcards' | 'quiz' | 'summary'
export type GradeLevel = '9th' | '10th' | '11th' | '12th' | 'college'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type FileType = 'pdf' | 'pptx' | 'docx' | 'txt'
