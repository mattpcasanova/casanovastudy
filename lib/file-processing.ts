// Custom PDF text extraction implementation
import mammoth from 'mammoth'
import PizZip from 'pizzip'
import { ProcessedFile, FileType } from '@/types'

export class FileProcessor {
  private static readonly MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB (local development)
  private static readonly ALLOWED_TYPES = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'text/plain']

  static validateFile(file: File): { valid: boolean; error?: string } {
    if (file.size > this.MAX_FILE_SIZE) {
      return { valid: false, error: 'File size must be less than 20MB' }
    }

    if (!this.ALLOWED_TYPES.includes(file.type)) {
      return { valid: false, error: 'File type not supported. Please upload PDF, DOCX, PPTX, or TXT files.' }
    }

    // Warn about Cloudinary 10MB limit for PDFs
    if (file.type === 'application/pdf' && file.size > 10 * 1024 * 1024) {
      console.warn(`PDF file ${file.name} is ${(file.size / 1024 / 1024).toFixed(1)}MB. Will be compressed to fit Cloudinary's 10MB limit.`);
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
    console.log(`🔍 Processing file: ${file.name}`, {
      type: file.type,
      size: file.size,
      isFile: file instanceof File,
      hasArrayBuffer: typeof file.arrayBuffer === 'function'
    })
    
    const validation = this.validateFile(file)
    if (!validation.valid) {
      throw new Error(validation.error)
    }

    // Detect file type - try MIME type first, fallback to extension
    let fileType = this.getFileType(file.type)
    
    // If MIME type is missing or generic, try to detect from filename
    if (!file.type || file.type === 'application/octet-stream' || fileType === 'txt') {
      const extension = file.name.split('.').pop()?.toLowerCase()
      console.log(`⚠️ MIME type unclear (${file.type}), trying extension: ${extension}`)
      if (extension === 'pdf') {
        fileType = 'pdf'
        console.log('✅ Detected PDF from extension')
      } else if (extension === 'docx') {
        fileType = 'docx'
        console.log('✅ Detected DOCX from extension')
      } else if (extension === 'pptx') {
        fileType = 'pptx'
        console.log('✅ Detected PPTX from extension')
      }
    }
    
    console.log(`📄 Final file type detected: ${fileType}`)
    
    let content = ''

    try {
      console.log('📦 Converting file to buffer...')
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      
      console.log('✅ Buffer created:', {
        bufferLength: buffer.length,
        expectedSize: file.size,
        match: buffer.length === file.size,
        firstBytes: buffer.subarray(0, 10).toString('hex'),
        isPDF: buffer.subarray(0, 4).toString() === '%PDF'
      })
      
      // Verify PDF header if it's supposed to be a PDF
      if (fileType === 'pdf') {
        const pdfHeader = buffer.subarray(0, 4).toString()
        if (pdfHeader !== '%PDF') {
          console.error('❌ Invalid PDF header! Expected "%PDF", got:', pdfHeader)
          throw new Error(`Invalid PDF file: missing PDF header. File may be corrupted or not a valid PDF.`)
        }
        console.log('✅ PDF header verified:', pdfHeader)
      }

      switch (fileType) {
        case 'pdf':
          console.log('📄 Starting PDF extraction...')
          content = await this.extractFromPDF(buffer)
          console.log('✅ PDF extraction completed, content length:', content.length)
          
          // Check if we got the fallback message (extraction failed)
          // Note: We don't throw here - let the calling code handle the validation
          // This allows the grade-exam route to provide more specific error messages
          if (content.includes('PDF Document:') && content.includes('Status: Text extraction completed')) {
            console.error('❌ PDF extraction failed - got fallback message')
            console.error('Fallback content length:', content.length)
            console.error('Fallback content preview:', content.substring(0, 200))
            // Don't throw - return the fallback so calling code can handle it appropriately
          }
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
        type: fileType,
        content: content.trim(),
        originalSize: file.size,
        processedSize: content.trim().length
      }
    } catch (error) {
      throw new Error(`Failed to process file ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private static async extractFromPDF(buffer: Buffer): Promise<string> {
    try {
      // PRIORITY: Try pdf-parse FIRST (it's the most reliable method - same as study guide generator)
      // Method 1: Try pdf-parse with different options
      let pdfParseWorked = false
      try {
        // Import pdf-parse - handle test file errors gracefully
        // The test file error is harmless - pdf-parse module still works
        let pdfParse: any
        let importSucceeded = false
        
        // Try dynamic import first (works in Next.js/Turbopack)
        try {
          const pdfParseModule = await import('pdf-parse')
          pdfParse = pdfParseModule.default || pdfParseModule
          importSucceeded = true
          console.log('📦 pdf-parse loaded via dynamic import()')
        } catch (importError) {
          // Check if it's the test file error - if so, pdf-parse might still be partially loaded
          const errorMsg = importError instanceof Error ? importError.message : String(importError)
          if (errorMsg.includes('test/data') || errorMsg.includes('ENOENT')) {
            console.log('⚠️ pdf-parse test file error during import (harmless), trying to use module anyway...')
            // Try to access pdf-parse from require cache or try require
            try {
              if (typeof require !== 'undefined') {
                pdfParse = require('pdf-parse')
                importSucceeded = true
                console.log('📦 pdf-parse loaded via require() after import error')
              }
            } catch (requireError) {
              console.log('⚠️ require() also failed, but continuing to try pdf-parse...')
            }
          } else {
            // Real error - try require as fallback
            if (typeof require !== 'undefined') {
              try {
                pdfParse = require('pdf-parse')
                importSucceeded = true
                console.log('📦 pdf-parse loaded via require() fallback')
              } catch (requireError) {
                throw new Error(`Failed to load pdf-parse: ${errorMsg}`)
              }
            } else {
              throw importError
            }
          }
        }
        
        // If import failed completely, log and skip pdf-parse (don't throw - continue to fallback methods)
        if (!importSucceeded || !pdfParse) {
          console.warn('⚠️ pdf-parse module failed to load, will try fallback extraction methods')
          // Don't throw - continue to fallback methods below
        } else {
          console.log('📦 pdf-parse module loaded, attempting extraction (same method as study guide generator)...')
        
        // Try with different options - same as study guide generator uses
        const options = [
          { max: 0 }, // No page limit - try this first (most reliable)
          {}, // Default options
          { max: 0, version: 'v1.10.100' as any },
          { max: 0, version: 'v1.10.100' as any, useSystemFonts: true },
        ]
        
        for (let i = 0; i < options.length; i++) {
          const option = options[i]
          try {
            console.log(`Trying pdf-parse option ${i + 1}/${options.length}:`, option)
            // Use the buffer directly - pdf-parse should handle it
            // Wrap in try-catch to handle test file errors that pdf-parse may throw
            let data: any
            try {
              data = await pdfParse(buffer, option)
            } catch (parseError) {
              // If it's a test file error, ignore it and continue
              if (parseError instanceof Error && parseError.message.includes('test/data')) {
                console.log('⚠️ pdf-parse test file error during parsing (can be ignored), trying next option...')
                continue
              }
              throw parseError // Re-throw if it's a real error
            }
            console.log(`Option ${i + 1} result:`, {
              textLength: data.text?.length || 0,
              numPages: data.numpages,
              preview: data.text?.substring(0, 300),
              hasText: !!data.text && data.text.trim().length > 0
            })
            
            if (data.text && data.text.trim().length > 50) {
              console.log('✅ PDF-parse successful with options:', option, 'length:', data.text.length)
              console.log('Text preview (first 500 chars):', data.text.substring(0, 500))
              pdfParseWorked = true
              // Don't summarize for grading - we need all the text
              return data.text.trim()
            } else if (data.text && data.text.trim().length > 0) {
              console.log('⚠️ PDF-parse returned text but too short:', data.text.trim().length, 'chars')
              console.log('Short text preview:', data.text.substring(0, 200))
            } else {
              console.log('⚠️ PDF-parse returned empty or no text')
            }
          } catch (optionError) {
            // Ignore test file errors - they're from pdf-parse's internal test file
            if (optionError instanceof Error && optionError.message.includes('test/data')) {
              console.log('⚠️ pdf-parse test file error (can be ignored), trying next option...')
              continue
            }
            console.log('❌ PDF-parse option failed:', option, optionError instanceof Error ? optionError.message : String(optionError))
            continue
          }
        }
        
        if (!pdfParseWorked) {
          console.log('⚠️ All pdf-parse options failed or returned insufficient text')
        }
        }
      } catch (pdfParseError) {
        // Ignore test file errors - they're from pdf-parse's internal test file
        if (pdfParseError instanceof Error && pdfParseError.message.includes('test/data')) {
          console.log('⚠️ pdf-parse test file error during import (can be ignored), will try other methods...')
        } else {
          console.error('❌ PDF-parse completely failed:', pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError))
          console.error('Error details:', pdfParseError)
        }
      }
      
      // Method 2: Try with temporary file approach (sometimes works when direct buffer doesn't)
      try {
        const fs = await import('fs')
        const path = await import('path')
        const os = await import('os')
        
        const tempDir = os.tmpdir()
        const tempFile = path.join(tempDir, `pdf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.pdf`)
        
        try {
          fs.writeFileSync(tempFile, buffer)
          
          // Use require for pdf-parse (same as above)
          const pdfParse = require('pdf-parse')
          const data = await pdfParse(fs.readFileSync(tempFile))
          
          if (data.text && data.text.trim().length > 50) {
            console.log('✅ Temporary file approach successful, length:', data.text.length)
            console.log('Text preview:', data.text.substring(0, 300))
            // Don't summarize for grading - we need all the text
            return data.text.trim()
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
        // Ignore test file errors
        if (tempFileError instanceof Error && tempFileError.message.includes('test/data')) {
          console.log('⚠️ pdf-parse test file error in temp file approach (can be ignored)')
        } else {
          console.log('Temporary file approach failed:', tempFileError instanceof Error ? tempFileError.message : String(tempFileError))
        }
      }
      
      // Method 3: Try custom extraction as fallback (but check it's not PDF structure)
      console.log('Trying custom extraction as fallback...')
      const customText = this.extractTextFromPDFBuffer(buffer)
      console.log('Custom extraction result:', {
        length: customText?.length || 0,
        preview: customText?.substring(0, 200) + '...',
        firstChars: customText?.substring(0, 100)
      })
      
      // Check if custom extraction returned actual text (not PDF structure)
      const isPDFStructure = (text: string): boolean => {
        if (!text || text.length < 50) return false
        // Check for common PDF structure patterns
        const structurePatterns = [
          /endobj/g,
          /Pages\s+\d+\s+0\s+R/g,
          /Metadata\s+\d+\s+0\s+R/g,
          /FlateDecode/g,
          /WinAnsiEncoding/g,
          /FontFile2/g,
          /CIDFontType2/g
        ]
        const structureCount = structurePatterns.reduce((count, pattern) => {
          return count + (text.match(pattern) || []).length
        }, 0)
        // If more than 5 structure patterns found, it's likely PDF metadata
        return structureCount > 5 || (text.match(/endobj/g) || []).length > 10
      }
      
      if (customText && customText.trim().length > 50 && !isPDFStructure(customText)) {
        console.log('✅ Custom extraction successful (not PDF structure), length:', customText.length)
        return customText.trim()
      } else if (customText && isPDFStructure(customText)) {
        console.log('⚠️ Custom extraction returned PDF structure/metadata, skipping...')
      }
      
      // Method 4: Try aggressive extraction as last resort
      console.log('Trying aggressive extraction without content filtering...')
      const aggressiveText = this.extractTextAggressively(buffer)
      if (aggressiveText && aggressiveText.trim().length > 50 && !isPDFStructure(aggressiveText)) {
        console.log('✅ Aggressive extraction successful, length:', aggressiveText.length)
        return aggressiveText.trim()
      }
      
          // If nothing worked, throw an error - don't return fake content
          const fileSize = Math.round(buffer.length / 1024)
          console.error(`❌ All PDF extraction methods failed for file (${fileSize} KB)`)
          throw new Error(`Could not extract text from this PDF (${fileSize} KB). The PDF may be a scanned image or have complex encoding. Please try:\n1. Converting the PDF to a Word document (DOCX)\n2. Using a PDF with actual text (not scanned images)\n3. Copy/pasting the text into a TXT file`)
      
    } catch (error) {
      console.error('PDF extraction error:', error)
      // Preserve our helpful error messages, only wrap unexpected errors
      if (error instanceof Error && error.message.includes('Could not extract text')) {
        throw error
      }
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
      // Learning objectives and goals
      'learning objectives', 'learning intentions', 'learning goals', 'learning outcomes',
      'by the end', 'students will', 'understand', 'know', 'be able to',
      
      // Core educational concepts
      'definition', 'concept', 'formula', 'equation', 'theory', 'principle',
      'density', 'pressure', 'volume', 'mass', 'force', 'area', 'height',
      'calculate', 'solve', 'example', 'problem', 'solution', 'answer',
      'explain', 'describe', 'analyze', 'compare', 'contrast', 'identify',
      'properties', 'characteristics', 'features', 'types', 'kinds',
      'measurement', 'units', 'conversion', 'factor', 'ratio', 'proportion',
      'graph', 'chart', 'diagram', 'figure', 'illustration', 'example',
      'experiment', 'observation', 'hypothesis', 'conclusion', 'result',
      
      // Key terms and definitions
      'key terms', 'vocabulary', 'glossary', 'terminology',
      'important', 'essential', 'critical', 'fundamental',
      
      // Exam-related content
      'exam', 'test', 'assessment', 'evaluation', 'quiz', 'question',
      'practice', 'review', 'study', 'prepare', 'memorize'
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
    
    // Highest priority: Learning objectives and exam content
    if (lowerSentence.includes('learning objectives') || lowerSentence.includes('learning intentions')) score += 25
    if (lowerSentence.includes('by the end') || lowerSentence.includes('students will')) score += 20
    if (lowerSentence.includes('understand') || lowerSentence.includes('know') || lowerSentence.includes('be able to')) score += 15
    if (lowerSentence.includes('exam') || lowerSentence.includes('test') || lowerSentence.includes('assessment')) score += 12
    
    // High-value educational content
    if (lowerSentence.includes('definition') || lowerSentence.includes('define')) score += 10
    if (lowerSentence.includes('formula') || lowerSentence.includes('equation')) score += 10
    if (lowerSentence.includes('key terms') || lowerSentence.includes('vocabulary')) score += 12
    if (lowerSentence.includes('important') || lowerSentence.includes('essential') || lowerSentence.includes('critical')) score += 8
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
    if (lowerSentence.includes('compare') || lowerSentence.includes('contrast')) score += 6
    if (lowerSentence.includes('relationship') || lowerSentence.includes('connection')) score += 5
    
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
            
            // Filter out encoded/garbled text (but don't filter by educational content for grading)
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
            
            // Filter out encoded/garbled text (but don't filter by educational content for grading)
            if (this.isReadableText(extractedText)) {
              textObjects.push(extractedText.trim())
            }
          }
        }
      }
      
      // Pattern 3: Look for readable text patterns (for PowerPoint PDFs) - enhanced
      // Less restrictive for grading - we need all text
      const readableText = pdfString.match(/[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{10,}/g) || []
      for (const text of readableText) {
        if (this.isReadableText(text) && text.trim().length > 10) {
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
          
          if (this.isReadableText(extractedText) && extractedText.trim().length > 5) {
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
          
          if (this.isReadableText(extractedText) && extractedText.trim().length > 5) {
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

  private static extractTextAggressively(buffer: Buffer): string {
    try {
      const pdfString = buffer.toString('latin1')
      const textObjects: string[] = []
      
      // Extract ALL text from BT/ET blocks without filtering
      const btEtMatches = pdfString.match(/BT\s+.*?ET/gs) || []
      for (const match of btEtMatches) {
        const textMatches = match.match(/\((.*?)\)\s*Tj|\[(.*?)\]\s*TJ/g) || []
        for (const textMatch of textMatches) {
          const text = textMatch.match(/\(([^)]+)\)|\[([^\]]+)\]/)
          if (text) {
            let extractedText = (text[1] || text[2] || '')
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\n')
              .replace(/\\t/g, '\t')
              .replace(/\\(.)/g, '$1')
            
            // Only filter out obviously garbled text (very permissive)
            if (extractedText.trim().length > 3 && 
                !extractedText.match(/^[^\w\s]+$/) && // Not all symbols
                extractedText.match(/[A-Za-z]/)) { // Has at least one letter
              textObjects.push(extractedText.trim())
            }
          }
        }
      }
      
      return textObjects.join('\n').trim()
    } catch (error) {
      console.error('Aggressive extraction error:', error)
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
    try {
      const zip = new PizZip(buffer)
      const slideTexts: string[] = []

      // Get all slide files (slides are in ppt/slides/slideN.xml)
      const slideFileNames = Object.keys(zip.files).filter(name =>
        name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
      )

      // Sort slide files by number
      slideFileNames.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || '0')
        const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || '0')
        return numA - numB
      })

      // Extract text from each slide
      for (const fileName of slideFileNames) {
        const slideXml = zip.files[fileName].asText()

        // Extract text from <a:t> tags (text content in PowerPoint)
        const textMatches = slideXml.match(/<a:t>([^<]+)<\/a:t>/g) || []
        const slideText = textMatches
          .map(match => match.replace(/<\/?a:t>/g, ''))
          .join(' ')
          .trim()

        if (slideText) {
          slideTexts.push(slideText)
        }
      }

      if (slideTexts.length === 0) {
        throw new Error('No text content found in PowerPoint file')
      }

      return slideTexts.join('\n\n')
    } catch (error) {
      console.error('PPTX extraction error:', error)
      throw new Error('Failed to extract text from PowerPoint file. Please try converting to PDF or DOCX first.')
    }
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

  /**
   * Process a file from a Cloudinary URL
   */
  static async processFileFromUrl(url: string, filename: string): Promise<ProcessedFile> {
    try {
      console.log('Processing file from Cloudinary URL:', url);
      console.log('URL status check:', { url, filename });
      
      // Download file from Cloudinary
      // Try the original URL first
      let response = await fetch(url);
      console.log('Fetch response:', { 
        status: response.status, 
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // If unauthorized, try with different URL format
      if (!response.ok && response.status === 401) {
        console.log('Trying alternative URL format...');
        // Try removing the version parameter
        const alternativeUrl = url.replace(/\/v\d+\//, '/');
        console.log('Alternative URL:', alternativeUrl);
        
        response = await fetch(alternativeUrl);
        console.log('Alternative fetch response:', { 
          status: response.status, 
          statusText: response.statusText,
          ok: response.ok
        });
      }
      
      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status} ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine file type from URL or filename
      const fileType = this.getFileTypeFromUrl(url, filename);
      let content = '';

      switch (fileType) {
        case 'pdf':
          content = await this.extractFromPDF(buffer);
          break;
        case 'docx':
          content = await this.extractFromDOCX(buffer);
          break;
        case 'pptx':
          content = await this.extractFromPPTX(buffer);
          break;
        case 'txt':
          content = buffer.toString('utf-8');
          break;
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }

      // Summarize content if too long
      const summarizedContent = this.summarizeText(content);

      return {
        name: filename,
        type: fileType,
        content: summarizedContent,
        originalSize: buffer.length,
        processedSize: summarizedContent.length
      };

    } catch (error) {
      console.error('Error processing file from URL:', error);
      throw new Error(`Failed to process file from URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get file type from URL or filename
   */
  private static getFileTypeFromUrl(url: string, filename: string): FileType {
    // Try to get type from URL first
    if (url.includes('.pdf')) return 'pdf';
    if (url.includes('.docx')) return 'docx';
    if (url.includes('.pptx')) return 'pptx';
    if (url.includes('.txt')) return 'txt';

    // Fallback to filename
    const extension = filename.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'pdf';
      case 'docx': return 'docx';
      case 'pptx': return 'pptx';
      case 'txt': return 'txt';
      default: return 'txt';
    }
  }
}
