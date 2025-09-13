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
      
      // Set up margins and layout
      const margin = 45
      const contentWidth = width - (margin * 2)
      let yPosition = height - margin
      
      // Helper function to add text with word wrapping
      const addText = (text: string, fontSize: number, isBold: boolean = false, color: any = rgb(0, 0, 0), x: number = margin) => {
        // Clean the text to remove any problematic characters
        const cleanText = text
          .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII characters and whitespace
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim()
        
        if (!cleanText) return // Skip empty text
        
        const font = isBold ? helveticaBold : helvetica
        const maxWidth = contentWidth - (x - margin)
        
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
            x: x,
            y: yPosition,
            size: fontSize,
            font: font,
            color: color,
          })
          yPosition -= fontSize + 2
        }
      }
      
      // Helper function to draw rectangles
      const drawRect = (x: number, y: number, width: number, height: number, color: any, strokeColor?: any) => {
        if (strokeColor) {
          page.drawRectangle({
            x: x,
            y: y,
            width: width,
            height: height,
            borderColor: strokeColor,
            borderWidth: 1,
          })
        } else {
          page.drawRectangle({
            x: x,
            y: y,
            width: width,
            height: height,
            color: color,
          })
        }
      }
      
      // Draw page border
      drawRect(margin, margin, contentWidth, height - (margin * 2), undefined, rgb(0.85, 0.85, 0.85))
      
      // Draw header with gradient effect
      const headerHeight = 140
      const headerY = height - headerHeight
      
      // Header background
      drawRect(margin, headerY, contentWidth, headerHeight, rgb(0.31, 0.67, 0.99))
      
      // Header overlay
      drawRect(margin, headerY, contentWidth, 70, rgb(1, 1, 1, 0.05))
      
      // Brand mark
      const brandText = 'CasanovaStudy'
      const brandWidth = helveticaBold.widthOfTextAtSize(brandText, 10)
      page.drawRectangle({
        x: width - margin - brandWidth - 20,
        y: headerY + headerHeight - 35,
        width: brandWidth + 10,
        height: 20,
        color: rgb(1, 1, 1, 0.2),
      })
      addText(brandText, 10, true, rgb(1, 1, 1), width - margin - brandWidth - 15)
      
      // Title
      yPosition = headerY + 80
      addText(studyGuide.title, 24, true, rgb(1, 1, 1))
      
      // Subtitle
      yPosition -= 5
      addText('AI-Generated Study Guide', 14, false, rgb(1, 1, 1, 0.9))
      
      // Metadata strip
      const metadataY = headerY + 20
      const metadataItems = [
        `Subject: ${studyGuide.subject}`,
        `Grade Level: ${studyGuide.gradeLevel}`,
        `Format: ${studyGuide.format}`,
        `Generated: ${studyGuide.generatedAt.toLocaleDateString()}`
      ]
      
      const boxWidth = contentWidth / 4
      for (let i = 0; i < metadataItems.length; i++) {
        const boxX = margin + (i * boxWidth)
        drawRect(boxX, metadataY, boxWidth - 5, 20, rgb(1, 1, 1, 0.15))
        addText(metadataItems[i], 9, false, rgb(1, 1, 1), boxX + 5)
      }
      
      // Content area
      yPosition = headerY - 20
      
      // Main section header
      const mainSectionText = `${studyGuide.subject} Study Guide: ${studyGuide.title}`
      const mainSectionHeight = 30
      drawRect(margin, yPosition - mainSectionHeight, contentWidth, mainSectionHeight, rgb(0.31, 0.67, 0.99))
      drawRect(margin, yPosition - mainSectionHeight, contentWidth, 15, rgb(1, 1, 1, 0.1))
      addText(mainSectionText, 18, true, rgb(1, 1, 1), margin + 10)
      yPosition -= mainSectionHeight + 15
      
      // Sub section
      const subSectionText = 'Comprehensive Summary for Exam Preparation'
      const subSectionHeight = 25
      drawRect(margin, yPosition - subSectionHeight, contentWidth, subSectionHeight, rgb(0.97, 0.98, 1))
      page.drawRectangle({
        x: margin,
        y: yPosition - subSectionHeight,
        width: contentWidth,
        height: subSectionHeight,
        borderColor: rgb(0.31, 0.67, 0.99),
        borderWidth: 2,
      })
      addText(subSectionText, 15, true, rgb(0.31, 0.67, 0.99), margin + 12)
      yPosition -= subSectionHeight + 15
      
      // Process content
      const content = this.formatContentForPDF(studyGuide.content, studyGuide.format)
      const sections = content.split('\n\n')
      
      for (const section of sections) {
        if (section.trim()) {
          // Check if it's a header
          if (section.startsWith('# ')) {
            const headerText = section.replace('# ', '')
            addText(headerText, 18, true, rgb(0.2, 0.4, 0.8))
            yPosition -= 10
          } else if (section.startsWith('## ')) {
            const headerText = section.replace('## ', '')
            addText(headerText, 15, true, rgb(0.31, 0.67, 0.99))
            yPosition -= 10
          } else if (section.startsWith('### ')) {
            const headerText = section.replace('### ', '')
            addText(headerText, 13, true, rgb(0.2, 0.6, 0.9))
            yPosition -= 10
          } else if (section.includes('**Q:') && section.includes('**A:')) {
            // Format flashcards with enhanced styling
            const qaPairs = this.extractQA(section)
            for (const qa of qaPairs) {
              const cardHeight = 40
              const cardY = yPosition - cardHeight
              
              // Card shadow
              drawRect(margin + 2, cardY - 2, contentWidth - 2, cardHeight, rgb(0, 0, 0, 0.1))
              
              // Card background
              drawRect(margin, cardY, contentWidth, cardHeight, rgb(0.98, 0.99, 1))
              page.drawRectangle({
                x: margin,
                y: cardY,
                width: contentWidth,
                height: cardHeight,
                borderColor: rgb(0.31, 0.67, 0.99),
                borderWidth: 1,
              })
              
              // Question header
              const questionHeight = 20
              drawRect(margin, cardY + cardHeight - questionHeight, contentWidth, questionHeight, rgb(0.8, 0.3, 0))
              addText(`Q: ${qa.question}`, 11, true, rgb(1, 1, 1), margin + 12)
              
              // Answer
              addText(`A: ${qa.answer}`, 11, false, rgb(0.13, 0.45, 0.15), margin + 12)
              
              yPosition -= cardHeight + 15
            }
          } else {
            // Regular text
            addText(section, 11, false, rgb(0.15, 0.15, 0.15))
            yPosition -= 10
          }
        }
      }
      
      // Footer
      const footerY = margin + 30
      page.drawLine({
        start: { x: margin, y: footerY },
        end: { x: width - margin, y: footerY },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85),
      })
      
      addText('CasanovaStudy - AI Study Guide Generator', 8, false, rgb(0.6, 0.6, 0.6), margin)
      addText(`Generated on ${studyGuide.generatedAt.toLocaleDateString()} | Page 1 of 1`, 8, false, rgb(0.6, 0.6, 0.6), width - margin - 200)
      
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
