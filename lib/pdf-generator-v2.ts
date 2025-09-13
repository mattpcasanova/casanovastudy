import { StudyGuideResponse } from '@/types'
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'

export class PDFGeneratorV2 {
  static async generatePDF(studyGuide: StudyGuideResponse): Promise<Buffer> {
    try {
      // Create a new PDF document
      const pdfDoc = await PDFDocument.create()
      
      // Add fonts
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      
      // Add a page
      let page = pdfDoc.addPage([595.28, 841.89]) // A4 size
      const { width, height } = page.getSize()
      
      // Set up margins
      const margin = 50
      let yPosition = height - margin
      
      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: any = rgb(0, 0, 0)) => {
        // Clean the text to remove any problematic characters
        const cleanText = text
          .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII characters and whitespace
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
        
        if (!cleanText) return // Skip empty text
        
        const font = isBold ? helveticaBold : helvetica
        const maxWidth = width - (margin * 2)
        
        // Simple word wrapping
        const words = cleanText.split(' ')
        let line = ''
        const lines = []
        
        for (const word of words) {
          const testLine = line + word + ' '
          const textWidth = font.widthOfTextAtSize(testLine, fontSize)
          
          if (textWidth > maxWidth && line !== '') {
            lines.push(line)
            line = word + ' '
          } else {
            line = testLine
          }
        }
        lines.push(line)
        
        // Draw lines
        for (const lineText of lines) {
          if (yPosition < margin) {
            // Add new page if needed
            const newPage = pdfDoc.addPage([595.28, 841.89])
            yPosition = height - margin
            page = newPage
          }
          
          page.drawText(lineText, {
            x: margin,
            y: yPosition,
            size: fontSize,
            font: font,
            color: color,
          })
          yPosition -= fontSize + 2
        }
      }
      
      // Add title
      addText(studyGuide.title, 24, true, rgb(0.2, 0.4, 0.8))
      yPosition -= 20
      
      // Add subtitle
      addText('Study Guide', 16, false, rgb(0.4, 0.4, 0.4))
      yPosition -= 30
      
      // Add metadata
      addText(`Subject: ${studyGuide.subject}`, 12, true)
      addText(`Grade Level: ${studyGuide.gradeLevel}`, 12, true)
      addText(`Format: ${studyGuide.format}`, 12, true)
      addText(`Generated: ${studyGuide.generatedAt.toLocaleDateString()}`, 12, true)
      yPosition -= 30
      
      // Add content with better formatting
      const content = this.formatContentForPDF(studyGuide.content, studyGuide.format)
      const sections = content.split('\n\n')
      
      for (const section of sections) {
        if (section.trim()) {
          // Check if it's a header
          if (section.startsWith('# ')) {
            addText(section.replace('# ', ''), 18, true, rgb(0.2, 0.4, 0.8))
            yPosition -= 10
          } else if (section.startsWith('## ')) {
            addText(section.replace('## ', ''), 16, true, rgb(0.3, 0.5, 0.9))
            yPosition -= 10
          } else if (section.startsWith('### ')) {
            addText(section.replace('### ', ''), 14, true, rgb(0.4, 0.6, 1.0))
            yPosition -= 10
          } else if (section.includes('**Q:') && section.includes('**A:')) {
            // Format flashcards
            const qaPairs = this.extractQA(section)
            for (const qa of qaPairs) {
              addText(`Q: ${qa.question}`, 12, true, rgb(0.8, 0.2, 0.2))
              addText(`A: ${qa.answer}`, 12, false, rgb(0.2, 0.6, 0.2))
              yPosition -= 15
            }
          } else {
            // Regular text
            addText(section, 12, false)
            yPosition -= 10
          }
        }
      }
      
      // Generate PDF bytes
      const pdfBytes = await pdfDoc.save()
      return Buffer.from(pdfBytes)
      
    } catch (error) {
      console.error('PDF generation error:', error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  private static formatContentForPDF(content: string, format: string): string {
    // Clean up the content for PDF generation
    let formatted = content
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove markdown bold
      .replace(/\*(.*?)\*/g, '$1') // Remove markdown italic
      .replace(/`(.*?)`/g, '$1') // Remove markdown code
      .replace(/\n\n+/g, '\n\n') // Clean up multiple newlines
      // Remove emojis and special characters that can't be encoded in WinAnsi
      .replace(/[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '')
      // Remove other problematic characters
      .replace(/[^\x00-\x7F]/g, '') // Remove all non-ASCII characters
      // Clean up any remaining problematic characters
      .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII characters and whitespace
    
    return formatted
  }
  
  private static extractQA(text: string): Array<{question: string, answer: string}> {
    const qaPairs = []
    const qaRegex = /\*\*Q:\s*(.*?)\*\*\s*\*\*A:\s*(.*?)(?=\*\*Q:|$)/gs
    let match
    
    while ((match = qaRegex.exec(text)) !== null) {
      qaPairs.push({
        question: match[1].trim(),
        answer: match[2].trim()
      })
    }
    
    return qaPairs
  }
}
