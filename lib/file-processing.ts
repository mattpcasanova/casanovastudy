// import pdf from 'pdf-parse' // Temporarily disabled due to build issues
import mammoth from 'mammoth'
import { ProcessedFile, FileType } from '@/types'

export class FileProcessor {
  private static readonly MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
  private static readonly ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain']

  static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 10MB' }
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Please upload PDF, DOCX, PPTX, or TXT files.' }
    }

    return { valid: true }
  }

  static getFileType(mimeType: string): FileType {
    const typeMap: Record<string, FileType> = {
      'application/pdf': 'pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
      'text/plain': 'txt'
    }
    return typeMap[mimeType] || 'txt'
  }

  static async processFile(file: File): Promise<ProcessedFile> {
    const validation = this.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    const fileType = this.getFileType(file.type)
    let content = ''

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)

      switch (fileType) {
        case 'pdf':
          content = await this.extractFromPDF(buffer)
          break
        case 'docx':
          content = await this.extractFromDOCX(buffer)
          break
        case 'pptx':
          content = await this.extractFromPPTX(buffer)
          break
        case 'txt':
          content = await this.extractFromTXT(buffer)
          break
        default:
          throw new Error('Unsupported file type')
      }

      return {
        name: file.name,
        type: file.type,
        size: file.size,
        content: content.trim(),
        extractedAt: new Date()
      }
    } catch (error) {
      throw new Error(`Failed to process file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async extractFromPDF(buffer: Buffer): Promise<string> {
    // Temporarily disabled PDF processing due to build issues
    // In production, you would implement proper PDF text extraction
    return 'PDF content extraction is temporarily unavailable. Please convert your PDF to DOCX or TXT format for processing.'
  }

  private static async extractFromDOCX(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer })
      return result.value
    } catch (error) {
      throw new Error('Failed to extract text from DOCX')
    }
  }

  private static async extractFromPPTX(buffer: Buffer): Promise<string> {
    // For now, we'll return a placeholder. PPTX extraction requires additional libraries
    // In a production app, you'd use libraries like 'pptx2json' or 'officegen'
    throw new Error('PPTX processing not yet implemented. Please convert to PDF or DOCX first.')
  }

  private static async extractFromTXT(buffer: Buffer): Promise<string> {
    return buffer.toString('utf-8')
  }

  static async processMultipleFiles(files: File[]): Promise<ProcessedFile[]> {
    const results: ProcessedFile[] = []
    const errors: string[] = []

    for (const file of files) {
      try {
        const processed = await this.processFile(file)
        results.push(processed)
      } catch (error) {
        errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      throw new Error(`All files failed to process:\n${errors.join('\n')}`)
    }

    return results
  }
}
