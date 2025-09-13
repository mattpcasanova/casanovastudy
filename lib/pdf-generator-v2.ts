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
        const font = isBold ? helveticaBold : helvetica
        const maxWidth = width - (margin * 2)
        
        // Simple word wrapping
        const words = text.split(' ')
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
