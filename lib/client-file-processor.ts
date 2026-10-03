/**
 * Text extraction for PowerPoint (.pptx) and Word (.docx) files in the browser.
 * Used by the shared upload preparer (lib/uploads/prepare.ts).
 */

import PizZip from 'pizzip'

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
