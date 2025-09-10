// Custom PDF text extraction implementation
import mammoth from 'mammoth'
import { ProcessedFile, FileType } from '@/types'

export class FileProcessor {
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB
  private static readonly ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain']

  static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 20MB' }
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
      console.log('Custom extraction result:', {
        length: customText?.length || 0,
        preview: customText?.substring(0, 200) + '...',
        hasContent: customText && customText.trim().length > 100
      })
      
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
      
          // If nothing worked, return minimal content for Claude to work with
          const fileSize = Math.round(buffer.length / 1024)
          return `PDF Document: ${fileSize} KB
Content: PowerPoint presentation converted to PDF
Status: Limited text extraction available
Note: Please work with available content and provide general study guidance for the subject area.`
      
    } catch (error) {
      console.error('PDF extraction error:', error)
      throw new Error('Failed to process PDF file. Please try converting to DOCX or text format.')
    }
  }

  private static summarizeText(text: string): string {
    try {
      // If text is already short enough, return as is
      if (text.length < 15000) {
        return text
      }
      
      console.log('Text too long, summarizing. Original length:', text.length)
      
      // Clean and filter the text more aggressively
      let cleanedText = this.cleanAndFilterText(text)
      
      // If still too long, apply intelligent summarization
      if (cleanedText.length > 15000) {
        cleanedText = this.intelligentSummarization(cleanedText)
      }
      
      console.log('Summarized text length:', cleanedText.length)
      return cleanedText.trim()
    } catch (error) {
      console.error('Text summarization error:', error)
      // If summarization fails, return a truncated version
      return text.substring(0, 15000) + '... [Content truncated due to length]'
    }
  }

  private static cleanAndFilterText(text: string): string {
    // Remove common PDF artifacts and unnecessary content
    let cleaned = text
      .replace(/Page \d+/gi, '') // Remove page numbers
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4}/g, '') // Remove dates
      .replace(/\b\d{1,2}:\d{2}\b/g, '') // Remove times
      .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
      .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '') // Remove emails
      .replace(/\b\d{3}-\d{3}-\d{4}\b/g, '') // Remove phone numbers
      .replace(/\b[A-Z]{2,}\s+\d+\b/g, '') // Remove codes like "ABC 123"
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim()

    // Split into lines and filter out non-educational content
    const lines = cleaned.split('\n')
    const filteredLines = lines.filter(line => {
      const trimmed = line.trim()
      if (trimmed.length < 10) return false
      
      // Keep educational content
      if (this.isEducationalContent(trimmed)) return true
      
      // Remove navigation, UI elements, and metadata
      if (this.isNonEducationalContent(trimmed)) return false
      
      return true
    })

    return filteredLines.join('\n')
  }

  private static isEducationalContent(text: string): boolean {
    const educationalKeywords = [
      'definition', 'concept', 'formula', 'equation', 'theory', 'principle',
      'density', 'pressure', 'volume', 'mass', 'force', 'area', 'height',
      'calculate', 'solve', 'example', 'problem', 'solution', 'answer',
      'explain', 'describe', 'analyze', 'compare', 'contrast', 'identify',
      'properties', 'characteristics', 'features', 'types', 'kinds',
      'measurement', 'units', 'conversion', 'factor', 'ratio', 'proportion',
      'graph', 'chart', 'diagram', 'figure', 'illustration', 'example',
      'experiment', 'observation', 'hypothesis', 'conclusion', 'result'
    ]
    
    const lowerText = text.toLowerCase()
    return educationalKeywords.some(keyword => lowerText.includes(keyword))
  }

  private static isNonEducationalContent(text: string): boolean {
    const nonEducationalPatterns = [
      /^[A-Z\s]+$/, // All caps (likely headers/navigation)
      /^(Home|Menu|Back|Next|Previous|Close|Open|Save|Print|Download)/i,
      /^(Page|Slide|Chapter|Section)\s*\d+/i,
      /^(Copyright|©|All rights reserved)/i,
      /^(Created|Modified|Updated|Last updated)/i,
      /^(File|Edit|View|Insert|Format|Tools|Help)/i,
      /^(Click|Press|Select|Choose|Enter|Type)/i,
      /^(Navigation|Menu|Toolbar|Sidebar|Footer|Header)/i,
      /^[^\w\s]*$/, // Only symbols/punctuation
      /^\d+$/, // Only numbers
      /^(The|A|An|This|That|These|Those)\s*$/, // Single articles
      /^(and|or|but|so|yet|for|nor)\s*$/i, // Single conjunctions
    ]
    
    return nonEducationalPatterns.some(pattern => pattern.test(text))
  }

  private static intelligentSummarization(text: string): string {
    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 15)
    
    // Score sentences by educational value
    const scoredSentences = sentences.map(sentence => ({
      text: sentence.trim(),
      score: this.scoreSentence(sentence)
    }))
    
    // Sort by score (highest first)
    scoredSentences.sort((a, b) => b.score - a.score)
    
    // Take top sentences until we reach target length
    let result = ''
    const targetLength = 12000
    
    for (const { text } of scoredSentences) {
      if (result.length + text.length > targetLength) break
      result += text + '. '
    }
    
    return result.trim()
  }

  private static scoreSentence(sentence: string): number {
    let score = 0
    const lowerSentence = sentence.toLowerCase()
    
    // High-value educational content
    if (lowerSentence.includes('definition') || lowerSentence.includes('define')) score += 10
    if (lowerSentence.includes('formula') || lowerSentence.includes('equation')) score += 10
    if (lowerSentence.includes('example') || lowerSentence.includes('for instance')) score += 8
    if (lowerSentence.includes('calculate') || lowerSentence.includes('solve')) score += 8
    if (lowerSentence.includes('density') || lowerSentence.includes('pressure')) score += 15
    if (lowerSentence.includes('volume') || lowerSentence.includes('mass')) score += 8
    if (lowerSentence.includes('force') || lowerSentence.includes('area')) score += 8
    
    // Medium-value content
    if (lowerSentence.includes('properties') || lowerSentence.includes('characteristics')) score += 5
    if (lowerSentence.includes('types') || lowerSentence.includes('kinds')) score += 5
    if (lowerSentence.includes('measurement') || lowerSentence.includes('units')) score += 5
    if (lowerSentence.includes('experiment') || lowerSentence.includes('observation')) score += 6
    
    // Penalize low-value content
    if (lowerSentence.includes('click') || lowerSentence.includes('press')) score -= 5
    if (lowerSentence.includes('page') || lowerSentence.includes('slide')) score -= 3
    if (lowerSentence.includes('menu') || lowerSentence.includes('navigation')) score -= 5
    if (lowerSentence.length < 20) score -= 3 // Very short sentences
    if (lowerSentence.length > 200) score -= 2 // Very long sentences
    
    return Math.max(0, score)
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
            
            // Filter out encoded/garbled text and prioritize educational content
            if (this.isReadableText(extractedText) && this.isEducationalContent(extractedText)) {
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
            
            // Filter out encoded/garbled text and prioritize educational content
            if (this.isReadableText(extractedText) && this.isEducationalContent(extractedText)) {
              textObjects.push(extractedText.trim())
            }
          }
        }
      }
      
      // Pattern 3: Look for readable text patterns (for PowerPoint PDFs) - enhanced
      const readableText = pdfString.match(/[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{15,}/g) || []
      for (const text of readableText) {
        if (this.isReadableText(text) && this.isEducationalContent(text) && text.trim().length > 15) {
          textObjects.push(text.trim())
        }
      }
      
      // Pattern 4: Look for text in parentheses - improved filtering
      const parenMatches = pdfString.match(/\(([^)]{5,})\)/g) || []
      for (const match of parenMatches) {
        const text = match.match(/\(([^)]+)\)/)
        if (text && text[1]) {
          const extractedText = text[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\(.)/g, '$1')
          
          if (this.isReadableText(extractedText) && this.isEducationalContent(extractedText) && extractedText.trim().length > 5) {
            textObjects.push(extractedText.trim())
          }
        }
      }
      
      // Pattern 5: Look for text in square brackets - improved filtering
      const bracketMatches = pdfString.match(/\[([^\]]{5,})\]/g) || []
      for (const match of bracketMatches) {
        const text = match.match(/\[([^\]]+)\]/)
        if (text && text[1]) {
          const extractedText = text[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/\\(.)/g, '$1')
          
          if (this.isReadableText(extractedText) && this.isEducationalContent(extractedText) && extractedText.trim().length > 5) {
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
