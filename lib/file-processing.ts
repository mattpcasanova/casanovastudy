// Custom PDF text extraction implementation
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
    try {
      // Try multiple extraction methods for PowerPoint-converted PDFs
      
      // Method 1: Enhanced custom extraction
      const customText = this.extractTextFromPDFBuffer(buffer)
      if (customText && customText.trim().length > 100) {
        console.log('Custom extraction successful, length:', customText.length)
        return this.summarizeText(customText.trim())
      }
      
      // Method 2: Try pdf-parse with different options
      try {
        const pdfParse = await import('pdf-parse')
        
        // Try with different options
        const options = [
          { max: 0 },
          { max: 0, version: 'v1.10.100' },
          { max: 0, version: 'v1.10.100', useSystemFonts: true },
          {} // Default options
        ]
        
        for (const option of options) {
          try {
            const data = await pdfParse.default(buffer, option)
            if (data.text && data.text.trim().length > 50) {
              console.log('PDF-parse successful with options:', option, 'length:', data.text.length)
              return this.summarizeText(data.text.trim())
            }
          } catch (optionError) {
            console.log('PDF-parse option failed:', option, optionError.message)
            continue
          }
        }
      } catch (pdfParseError) {
        console.log('PDF-parse completely failed:', pdfParseError.message)
      }
      
      // Method 3: Try with temporary file approach
      try {
        const fs = await import('fs')
        const path = await import('path')
        const os = await import('os')
        
        const tempDir = os.tmpdir()
        const tempFile = path.join(tempDir, `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`)
        
        try {
          fs.writeFileSync(tempFile, buffer)
          
          const pdfParse = await import('pdf-parse')
          const data = await pdfParse.default(fs.readFileSync(tempFile))
          
          if (data.text && data.text.trim().length > 50) {
            console.log('Temporary file approach successful, length:', data.text.length)
            return this.summarizeText(data.text.trim())
          }
        } finally {
          // Clean up temp file
          try {
            if (fs.existsSync(tempFile)) {
              fs.unlinkSync(tempFile)
            }
          } catch (cleanupError) {
            // Ignore cleanup errors
          }
        }
      } catch (tempFileError) {
        console.log('Temporary file approach failed:', tempFileError.message)
      }
      
      // Method 4: Return whatever we got from custom extraction
      if (customText && customText.trim().length > 20) {
        console.log('Using partial custom extraction, length:', customText.length)
        return this.summarizeText(customText.trim())
      }
      
      // If nothing worked, provide a helpful response
      const fileSize = Math.round(buffer.length / 1024)
      return `PDF Document Analysis

File Size: ${fileSize} KB
Status: PDF file received and processed

Content Analysis:
This appears to be a PowerPoint presentation converted to PDF format. The text content could not be automatically extracted using standard methods.

To create your study guide, please try one of these methods:

1. Convert to DOCX format:
   - Use an online converter like SmallPDF.com or ILovePDF.com
   - Upload the converted DOCX file instead

2. Copy and paste the text:
   - Open the PDF in a PDF viewer
   - Select all text (Ctrl/Cmd + A)
   - Copy the text (Ctrl/Cmd + C)
   - Create a text file and paste the content
   - Upload the text file

3. Use the original PowerPoint file:
   - If you have the original .pptx file, upload that instead

The PDF file has been successfully received and the system is working correctly. The above methods will ensure optimal text extraction for study guide generation.`
      
    } catch (error) {
      console.error('PDF extraction error:', error)
      throw new Error('Failed to process PDF file. Please try converting to DOCX or text format.')
    }
  }

  private static summarizeText(text: string): string {
    try {
      // If text is already short enough, return as is
      if (text.length < 50000) {
        return text
      }
      
      console.log('Text too long, summarizing. Original length:', text.length)
      
      // Split text into sentences
      const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 10)
      
      // Remove duplicates and very short sentences
      const uniqueSentences = [...new Set(sentences)]
        .filter(s => s.trim().length > 20)
        .map(s => s.trim())
      
      // If we still have too many sentences, take a sample
      let selectedSentences = uniqueSentences
      if (uniqueSentences.length > 200) {
        // Take every nth sentence to get a representative sample
        const step = Math.ceil(uniqueSentences.length / 200)
        selectedSentences = uniqueSentences.filter((_, index) => index % step === 0)
      }
      
      // Take the first 150 sentences or until we're under 50k characters
      let result = ''
      for (const sentence of selectedSentences) {
        if (result.length + sentence.length > 50000) {
          break
        }
        result += sentence + '. '
      }
      
      console.log('Summarized text length:', result.length)
      return result.trim()
    } catch (error) {
      console.error('Text summarization error:', error)
      // If summarization fails, return a truncated version
      return text.substring(0, 50000) + '... [Content truncated due to length]'
    }
  }

  private static extractTextFromPDFBuffer(buffer: Buffer): string {
    try {
      // Convert buffer to string for text extraction
      const pdfString = buffer.toString('latin1')
      
      // Extract text using multiple patterns for PDF text objects
      const textObjects = []
      
      // Pattern 1: Extract text between BT and ET (text objects) - improved filtering
      const btEtMatches = pdfString.match(/BT\s+.*?ET/gs) || []
      for (const match of btEtMatches) {
        // Extract text from Tj and TJ operators
        const textMatches = match.match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g) || []
        for (const textMatch of textMatches) {
          const text = textMatch.match(/\(([^)]+)\)|\[([^\]]+)\]/)
          if (text) {
            const extractedText = (text[1] || text[2] || '')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\(.)/g, '$1') // Unescape other characters
            
            // Filter out encoded/garbled text
            if (this.isReadableText(extractedText)) {
              textObjects.push(extractedText.trim())
            }
          }
        }
      }
      
      // Pattern 2: Extract text from stream objects - improved filtering
      const streamMatches = pdfString.match(/stream\s+.*?endstream/gs) || []
      for (const stream of streamMatches) {
        // Look for text patterns in streams
        const textInStream = stream.match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g) || []
        for (const textMatch of textInStream) {
          const text = textMatch.match(/\(([^)]+)\)|\[([^\]]+)\]/)
          if (text) {
            const extractedText = (text[1] || text[2] || '')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\(.)/g, '$1')
            
            // Filter out encoded/garbled text
            if (this.isReadableText(extractedText)) {
              textObjects.push(extractedText.trim())
            }
          }
        }
      }
      
      // Pattern 3: Look for readable text patterns (for PowerPoint PDFs) - enhanced
      const readableText = pdfString.match(/[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{10,}/g) || []
      for (const text of readableText) {
        if (this.isReadableText(text) && text.trim().length > 10) {
          textObjects.push(text.trim())
        }
      }
      
      // Pattern 4: Look for text in parentheses - improved filtering
      const parenMatches = pdfString.match(/\(([^)]{3,})\)/g) || []
      for (const match of parenMatches) {
        const text = match.match(/\(([^)]+)\)/)
        if (text && text[1]) {
          const extractedText = text[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\(.)/g, '$1')
          
          if (this.isReadableText(extractedText) && extractedText.trim().length > 2) {
            textObjects.push(extractedText.trim())
          }
        }
      }
      
      // Pattern 5: Look for text in square brackets - improved filtering
      const bracketMatches = pdfString.match(/\[([^\]]{3,})\]/g) || []
      for (const match of bracketMatches) {
        const text = match.match(/\[([^\]]+)\]/)
        if (text && text[1]) {
          const extractedText = text[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\(.)/g, '$1')
          
          if (this.isReadableText(extractedText) && extractedText.trim().length > 2) {
            textObjects.push(extractedText.trim())
          }
        }
      }
      
      // Combine all extracted text and remove duplicates
      const uniqueTexts = [...new Set(textObjects)]
      const combinedText = uniqueTexts.join('\n')
      
      // Clean up the text
      return combinedText
        .replace(/\s+/g, ' ') // Replace multiple spaces with single space
        .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
        .replace(/\n\s+/g, '\n') // Remove leading spaces from lines
        .replace(/\s+\n/g, '\n') // Remove trailing spaces from lines
        .trim()
    } catch (error) {
      console.error('Custom PDF text extraction error:', error)
      return ''
    }
  }

  private static isReadableText(text: string): boolean {
    if (!text || text.trim().length < 3) return false
    
    // Check for encoded/garbled characters
    const garbledPattern = /[ïÓñ©x´Ø;rÈÉÅz<öçÏßx]/g
    if (garbledPattern.test(text)) return false
    
    // Check for too many special characters
    const specialCharCount = (text.match(/[^A-Za-z0-9\s.,!?;:'"()-]/g) || []).length
    const totalChars = text.length
    if (specialCharCount / totalChars > 0.3) return false
    
    // Check for readable word patterns
    const words = text.split(/\s+/).filter(w => w.length > 0)
    const readableWords = words.filter(w => /^[A-Za-z0-9.,!?;:'"()-]+$/.test(w))
    
    // At least 70% of words should be readable
    return readableWords.length / words.length >= 0.7
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
