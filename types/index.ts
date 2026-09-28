export interface StudyGuideData {
  files: File[]
  studyRequest?: string // what the student typed they want to study (may replace files)
  autoTitle?: boolean // name was left blank — use the generated guide's own title
  goal?: string // what they're studying for (see GOALS in lib/study-options.ts)
  sourcePolicy?: 'strict' | 'expand' // may the guide go beyond uploaded materials?
  materialsKind?: 'notes' | 'assessment' | 'topic_list' // detected type of the uploads
  planId?: string // generated from a study plan unit
  planUnit?: string
  studyGuideName: string
  subject: string
  gradeLevel: string
  format: StudyGuideFormat
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

export interface DirectContent {
  name: string
  content: string
}

export interface StudyGuideRequest {
  files?: ProcessedFile[]
  cloudinaryFiles?: CloudinaryFile[]
  directContent?: DirectContent[]  // Content processed client-side (bypasses Cloudinary)
  studyGuideName: string
  subject: string
  gradeLevel: string
  format: string
  topicFocus?: string
  difficultyLevel?: string
  additionalInstructions?: string
  studyRequest?: string  // Typed topic/notes; lets students generate without files
  autoTitle?: boolean  // Replace studyGuideName with the generated H1 title
  goal?: string
  sourcePolicy?: string
  materialsKind?: string
  planId?: string // parent study plan guide id
  planUnit?: string // PlanUnit.key within that plan
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
  studyRequest?: string
  goal?: string
  sourcePolicy?: 'strict' | 'expand'
  materialsKind?: 'notes' | 'assessment' | 'topic_list'
}

export interface ClaudeApiResponse {
  content: string
  usage: {
    input_tokens: number
    output_tokens: number
    total_tokens: number
  }
}

export type StudyGuideFormat = 'outline' | 'flashcards' | 'quiz' | 'summary' | 'practice' | 'plan' | 'cheatsheet' | 'timeline'
export type GradeLevel = '9th' | '10th' | '11th' | '12th' | 'college'
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'
export type FileType = 'pdf' | 'pptx' | 'docx' | 'txt'
