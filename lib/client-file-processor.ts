/**
 * Client-side file processor for extracting content from documents
 * Bypasses Cloudinary for large files by processing them in the browser
 */

import PizZip from 'pizzip'
import { convertPdfToImages } from './pdf-to-images'

export interface ProcessedFileResult {
  name: string
  type: 'text' | 'images'
  content?: string // For text extraction
  images?: Array<{ data: Blob; name: string }> // For image conversion
}

/**
 * Extract text from a PPTX file client-side
 * Uses PizZip to parse the OOXML format
 */
export async function extractTextFromPPTX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

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
        slideTexts.push(`--- Slide ${slideFileNames.indexOf(fileName) + 1} ---\n${slideText}`)
      }
    }

    if (slideTexts.length === 0) {
      throw new Error('No text content found in PowerPoint file')
    }

    return slideTexts.join('\n\n')
  } catch (error) {
    console.error('PPTX extraction error:', error)
    throw new Error('Failed to extract text from PowerPoint file.')
  }
}

/**
 * Extract text from a DOCX file client-side
 * Uses PizZip to parse the OOXML format
 */
export async function extractTextFromDOCX(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer()
  const buffer = new Uint8Array(arrayBuffer)

  try {
    const zip = new PizZip(buffer)

    // The main document content is in word/document.xml
    const docXml = zip.files['word/document.xml']?.asText()

    if (!docXml) {
      throw new Error('Invalid DOCX file structure')
    }

    // Extract text from <w:t> tags (text content in Word)
    const textMatches = docXml.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
    const text = textMatches
      .map(match => {
        // Handle xml:space="preserve" attribute
        const content = match.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1')
        return content
      })
      .join('')

    // Also try to get paragraph breaks
    const paragraphs = docXml.split(/<w:p[^>]*>/).slice(1)
    const formattedText = paragraphs.map(p => {
      const pTextMatches = p.match(/<w:t[^>]*>([^<]*)<\/w:t>/g) || []
      return pTextMatches.map(m => m.replace(/<w:t[^>]*>([^<]*)<\/w:t>/, '$1')).join('')
    }).filter(p => p.trim()).join('\n\n')

    return formattedText || text
  } catch (error) {
    console.error('DOCX extraction error:', error)
    throw new Error('Failed to extract text from Word document.')
  }
}

/**
 * Check if a file can be processed client-side
 */
export function canProcessClientSide(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase()

  // PPTX and DOCX can be processed with PizZip
  if (extension === 'pptx' || extension === 'docx') {
    return true
  }

  // PDFs can be converted to images
  if (extension === 'pdf' || file.type === 'application/pdf') {
    return true
  }

  return false
}

/**
 * Check if a file is an old PPT format (not PPTX)
 */
export function isOldPPTFormat(file: File): boolean {
  const extension = file.name.split('.').pop()?.toLowerCase()
  return extension === 'ppt' && file.type === 'application/vnd.ms-powerpoint'
}

/**
 * Process a file client-side for study guide generation
 * Returns either extracted text or converted images
 */
export async function processFileClientSide(
  file: File,
  onProgress?: (message: string) => void
): Promise<ProcessedFileResult> {
  const extension = file.name.split('.').pop()?.toLowerCase()

  onProgress?.(`Processing ${file.name}...`)

  // Handle PPTX - extract text
  if (extension === 'pptx') {
    onProgress?.('Extracting text from PowerPoint...')
    const text = await extractTextFromPPTX(file)
    return {
      name: file.name,
      type: 'text',
      content: text
    }
  }

  // Handle DOCX - extract text
  if (extension === 'docx') {
    onProgress?.('Extracting text from Word document...')
    const text = await extractTextFromDOCX(file)
    return {
      name: file.name,
      type: 'text',
      content: text
    }
  }

  // Handle PDF - convert to images for Claude's vision
  if (extension === 'pdf' || file.type === 'application/pdf') {
    onProgress?.('Converting PDF to images...')
    const images = await convertPdfToImages(file, (current, total) => {
      onProgress?.(`Converting page ${current} of ${total}...`)
    })

    return {
      name: file.name,
      type: 'images',
      images: images.map(img => ({
        data: img.data,
        name: img.name
      }))
    }
  }

  throw new Error(`Cannot process file type: ${extension}`)
}

/**
 * Check if file should bypass Cloudinary (too large or can be processed locally)
 */
export function shouldBypassCloudinary(file: File): boolean {
  const MAX_CLOUDINARY_SIZE = 10 * 1024 * 1024 // 10MB
  const extension = file.name.split('.').pop()?.toLowerCase()

  // Always bypass for files over 10MB
  if (file.size > MAX_CLOUDINARY_SIZE) {
    return true
  }

  // For PPTX files, we can extract text client-side (more reliable than Cloudinary + server extraction)
  if (extension === 'pptx') {
    return true
  }

  return false
}
