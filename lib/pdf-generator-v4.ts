import type { StudyGuideResponse } from "@/types"
import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib"

export class PDFGeneratorV4 {
  public static cleanText(text: string): string {
    if (!text) return ''
    
    return text
      .replace(/[\u{1F000}-\u{1FFFF}]/gu, '') // Remove emojis
      .replace(/[\u2600-\u27BF]/g, '') // Remove symbols
      .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim()
  }

  static async generatePDF(studyGuide: StudyGuideResponse): Promise<Buffer> {
    try {
      // Clean all content
      const cleanedStudyGuide = {
        ...studyGuide,
        content: this.cleanText(studyGuide.content),
        title: this.cleanText(studyGuide.title),
        subject: this.cleanText(studyGuide.subject),
        gradeLevel: this.cleanText(studyGuide.gradeLevel),
        format: this.cleanText(studyGuide.format)
      }
      
      const pdfDoc = await PDFDocument.create()
      
      // Embed fonts
      const fonts = {
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        italic: await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
      }

      // Safe color palette (all values 0.0-1.0)
      const colors = {
        primary: rgb(0.18, 0.38, 0.75),     // Professional blue
        secondary: rgb(0.08, 0.65, 0.85),   // Light blue
        accent: rgb(0.85, 0.35, 0.08),      // Orange
        success: rgb(0.08, 0.55, 0.25),     // Green
        warning: rgb(0.85, 0.55, 0.08),     // Yellow
        danger: rgb(0.75, 0.18, 0.18),      // Red
        dark: rgb(0.08, 0.08, 0.08),        // Almost black
        medium: rgb(0.35, 0.35, 0.35),      // Medium gray
        light: rgb(0.65, 0.65, 0.65),       // Light gray
        background: rgb(0.96, 0.96, 0.96),  // Very light gray
        white: rgb(1, 1, 1),
        border: rgb(0.85, 0.85, 0.85)
      }

      // Create generator
      const generator = new FixedFormatGenerator(pdfDoc, fonts, colors)
      
      // Generate content
      await generator.generate(cleanedStudyGuide)

      const pdfBytes = await pdfDoc.save()
      return Buffer.from(pdfBytes)

    } catch (error) {
      console.error("PDF generation error:", error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}

class FixedFormatGenerator {
  private pdfDoc: any
  private fonts: any
  private colors: any
  private currentPage: any
  private readonly pageWidth = 595.28 // A4 width
  private readonly pageHeight = 841.89 // A4 height
  private readonly margin = 40
  private readonly contentWidth: number
  private yPosition = 0

  constructor(pdfDoc: any, fonts: any, colors: any) {
    this.pdfDoc = pdfDoc
    this.fonts = fonts
    this.colors = colors
    this.contentWidth = this.pageWidth - 2 * this.margin
  }

  async generate(studyGuide: any): Promise<void> {
    this.addPage()
    this.drawHeader(studyGuide)
    
    const sections = this.parseContent(studyGuide.content)
    
    switch (studyGuide.format.toLowerCase()) {
      case 'outline':
        await this.renderOutline(sections)
        break
      case 'flashcards':
        await this.renderFlashcards(studyGuide.content)
        break
      case 'quiz':
        await this.renderQuiz(studyGuide.content)
        break
      case 'summary':
      default:
        await this.renderSummary(sections)
        break
    }
    
    this.addFooters()
  }

  private addPage(): void {
    this.currentPage = this.pdfDoc.addPage(PageSizes.A4)
    this.yPosition = this.pageHeight - this.margin
  }

  private needsNewPage(requiredSpace: number): boolean {
    return this.yPosition - requiredSpace < this.margin + 50
  }

  private checkAndAddPage(requiredSpace: number): void {
    if (this.needsNewPage(requiredSpace)) {
      this.addPage()
    }
  }

  private drawHeader(studyGuide: any): void {
    const headerHeight = 100
    
    // Header background
    this.currentPage.drawRectangle({
      x: 0,
      y: this.pageHeight - headerHeight,
      width: this.pageWidth,
      height: headerHeight,
      color: this.colors.primary,
    })
    
    // Top accent stripe
    this.currentPage.drawRectangle({
      x: 0,
      y: this.pageHeight - 6,
      width: this.pageWidth,
      height: 6,
      color: this.colors.secondary,
    })

    // Brand box
    this.currentPage.drawRectangle({
      x: this.pageWidth - 140,
      y: this.pageHeight - 32,
      width: 120,
      height: 22,
      color: this.colors.white,
    })

    this.currentPage.drawText("CasanovaStudy", {
      x: this.pageWidth - 130,
      y: this.pageHeight - 26,
      size: 11,
      font: this.fonts.bold,
      color: this.colors.primary,
    })

    // Title
    const title = studyGuide.title || "Study Guide"
    this.currentPage.drawText(title, {
      x: this.margin,
      y: this.pageHeight - 40,
      size: 20,
      font: this.fonts.bold,
      color: this.colors.white,
    })

    // Subtitle
    const formatNames = {
      outline: "Structured Study Outline",
      flashcards: "Interactive Flashcards", 
      quiz: "Practice Quiz",
      summary: "Comprehensive Summary"
    }
    
    const subtitle = formatNames[studyGuide.format?.toLowerCase() as keyof typeof formatNames] || "Study Guide"
    this.currentPage.drawText(subtitle, {
      x: this.margin,
      y: this.pageHeight - 62,
      size: 12,
      font: this.fonts.regular,
      color: this.colors.white,
    })

    // Metadata
    const metadata = [
      `Subject: ${studyGuide.subject || "General"}`,
      `Grade: ${studyGuide.gradeLevel || "N/A"}`,
      `Generated: ${new Date().toLocaleDateString()}`
    ]

    metadata.forEach((item, index) => {
      this.currentPage.drawText(item, {
        x: this.margin + (index * 150),
        y: this.pageHeight - 85,
        size: 9,
        font: this.fonts.regular,
        color: this.colors.white,
      })
    })

    this.yPosition = this.pageHeight - headerHeight - 30
  }

  private drawWrappedText(
    text: string, 
    x: number, 
    y: number, 
    options: {
      size?: number,
      font?: any,
      color?: any,
      maxWidth?: number,
      lineSpacing?: number
    } = {}
  ): number {
    const {
      size = 11,
      font = this.fonts.regular,
      color = this.colors.dark,
      maxWidth = this.contentWidth,
      lineSpacing = 1.3
    } = options

    if (!text || text.trim() === '') return 0

    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    // Word wrapping
    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      const textWidth = font.widthOfTextAtSize(testLine, size)
      
      if (textWidth <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine) {
          lines.push(currentLine)
          currentLine = word
        } else {
          lines.push(word) // Single word too long
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }

    // Draw lines
    let currentY = y
    const lineHeight = size * lineSpacing
    
    for (const line of lines) {
      // Check if we need a new page
      if (currentY < this.margin + 30) {
        this.addPage()
        currentY = this.yPosition
      }
      
      this.currentPage.drawText(line, {
        x,
        y: currentY,
        size,
        font,
        color,
      })
      
      currentY -= lineHeight
    }

    return lines.length * lineHeight
  }

  private parseContent(content: string): Array<{text: string, level: number, type: string}> {
    const lines = content.split('\n').filter(line => line.trim())
    const sections: Array<{text: string, level: number, type: string}> = []
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('# ')) {
        sections.push({ text: trimmed.replace('# ', ''), level: 1, type: 'heading' })
      } else if (trimmed.startsWith('## ')) {
        sections.push({ text: trimmed.replace('## ', ''), level: 2, type: 'heading' })
      } else if (trimmed.startsWith('### ')) {
        sections.push({ text: trimmed.replace('### ', ''), level: 3, type: 'heading' })
      } else if (trimmed.startsWith('- ')) {
        sections.push({ text: trimmed.replace('- ', ''), level: 4, type: 'bullet' })
      } else if (trimmed.match(/^\d+\./)) {
        sections.push({ text: trimmed, level: 0, type: 'numbered' })
      } else if (trimmed.match(/^[a-d]\)/i)) {
        sections.push({ text: trimmed, level: 0, type: 'choice' })
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        sections.push({ text: trimmed.replace(/\*\*/g, ''), level: 0, type: 'bold' })
      } else if (trimmed) {
        sections.push({ text: trimmed, level: 0, type: 'paragraph' })
      }
    }
    
    return sections
  }

  private async renderOutline(sections: Array<{text: string, level: number, type: string}>): Promise<void> {
    for (const section of sections) {
      this.checkAndAddPage(60)
      
      switch (section.level) {
        case 1: // Main heading
          this.yPosition -= 15
          
          // Background for heading
          this.currentPage.drawRectangle({
            x: this.margin - 10,
            y: this.yPosition - 30,
            width: this.contentWidth + 20,
            height: 30,
            color: this.colors.primary,
          })
          
          const textHeight1 = this.drawWrappedText(section.text, this.margin, this.yPosition - 10, {
            size: 15,
            font: this.fonts.bold,
            color: this.colors.white,
            maxWidth: this.contentWidth
          })
          
          this.yPosition -= Math.max(textHeight1, 30) + 10
          break
          
        case 2: // Sub heading
          this.yPosition -= 10
          
          // Left accent bar
          this.currentPage.drawRectangle({
            x: this.margin - 5,
            y: this.yPosition - 20,
            width: 3,
            height: 20,
            color: this.colors.secondary,
          })
          
          const textHeight2 = this.drawWrappedText(section.text, this.margin + 10, this.yPosition, {
            size: 13,
            font: this.fonts.bold,
            color: this.colors.primary
          })
          
          this.yPosition -= textHeight2 + 8
          break
          
        case 3: // Sub-sub heading
          this.yPosition -= 8
          
          // Bullet point
          this.currentPage.drawCircle({
            x: this.margin + 15,
            y: this.yPosition - 5,
            size: 2,
            color: this.colors.accent,
          })
          
          const textHeight3 = this.drawWrappedText(section.text, this.margin + 25, this.yPosition, {
            size: 12,
            font: this.fonts.bold,
            color: this.colors.dark
          })
          
          this.yPosition -= textHeight3 + 6
          break
          
        default: // Regular content
          const indent = section.type === 'bullet' ? 30 : 15
          const textHeight = this.drawWrappedText(section.text, this.margin + indent, this.yPosition, {
            size: 10,
            font: this.fonts.regular,
            color: this.colors.medium
          })
          
          this.yPosition -= textHeight + 4
      }
    }
  }

  private async renderSummary(sections: Array<{text: string, level: number, type: string}>): Promise<void> {
    for (const section of sections) {
      this.checkAndAddPage(50)
      
      switch (section.type) {
        case 'heading':
          if (section.level === 1) {
            this.yPosition -= 15
            
            this.currentPage.drawRectangle({
              x: this.margin - 5,
              y: this.yPosition - 25,
              width: this.contentWidth + 10,
              height: 25,
              color: this.colors.accent,
            })
            
            const headingHeight = this.drawWrappedText(section.text, this.margin, this.yPosition - 8, {
              size: 14,
              font: this.fonts.bold,
              color: this.colors.white
            })
            
            this.yPosition -= Math.max(headingHeight, 25) + 12
          } else {
            this.yPosition -= 10
            
            const subHeadingHeight = this.drawWrappedText(section.text, this.margin, this.yPosition, {
              size: 12,
              font: this.fonts.bold,
              color: this.colors.primary
            })
            
            // Underline
            const textWidth = Math.min(
              this.fonts.bold.widthOfTextAtSize(section.text, 12), 
              this.contentWidth
            )
            this.currentPage.drawLine({
              start: { x: this.margin, y: this.yPosition - subHeadingHeight - 2 },
              end: { x: this.margin + textWidth, y: this.yPosition - subHeadingHeight - 2 },
              thickness: 1.5,
              color: this.colors.primary,
            })
            
            this.yPosition -= subHeadingHeight + 10
          }
          break
          
        case 'bullet':
          this.currentPage.drawCircle({
            x: this.margin + 10,
            y: this.yPosition - 5,
            size: 2,
            color: this.colors.accent,
          })
          
          const bulletHeight = this.drawWrappedText(section.text, this.margin + 20, this.yPosition, {
            size: 10,
            font: this.fonts.regular,
            color: this.colors.dark
          })
          
          this.yPosition -= bulletHeight + 6
          break
          
        case 'bold':
          const boldHeight = this.drawWrappedText(section.text, this.margin, this.yPosition, {
            size: 11,
            font: this.fonts.bold,
            color: this.colors.dark
          })
          
          this.yPosition -= boldHeight + 8
          break
          
        default:
          const paraHeight = this.drawWrappedText(section.text, this.margin, this.yPosition, {
            size: 10,
            font: this.fonts.regular,
            color: this.colors.medium
          })
          
          this.yPosition -= paraHeight + 6
      }
    }
  }

  private async renderFlashcards(content: string): Promise<void> {
    const cards = this.extractFlashcards(content)
    
    for (let i = 0; i < cards.length; i++) {
      const card = cards[i]
      this.checkAndAddPage(180)
      
      const cardWidth = this.contentWidth - 40
      const cardHeight = 70
      
      // Card number
      this.currentPage.drawCircle({
        x: this.margin + 15,
        y: this.yPosition - 12,
        size: 12,
        color: this.colors.primary,
      })
      
      this.currentPage.drawText((i + 1).toString(), {
        x: this.margin + (i + 1 < 10 ? 11 : 7),
        y: this.yPosition - 16,
        size: 10,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      // Question card
      this.yPosition -= 30
      
      this.currentPage.drawRectangle({
        x: this.margin + 35,
        y: this.yPosition - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: this.colors.white,
        borderColor: this.colors.warning,
        borderWidth: 2,
      })
      
      // Question header
      this.currentPage.drawRectangle({
        x: this.margin + 35,
        y: this.yPosition - 20,
        width: cardWidth,
        height: 20,
        color: this.colors.warning,
      })
      
      this.currentPage.drawText("QUESTION", {
        x: this.margin + 35 + (cardWidth - this.fonts.bold.widthOfTextAtSize("QUESTION", 10)) / 2,
        y: this.yPosition - 14,
        size: 10,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      // Question content
      this.drawWrappedText(card.question, this.margin + 45, this.yPosition - 35, {
        size: 9,
        maxWidth: cardWidth - 20,
        color: this.colors.dark
      })
      
      this.yPosition -= cardHeight + 15
      
      // Answer card
      this.currentPage.drawRectangle({
        x: this.margin + 35,
        y: this.yPosition - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: this.colors.white,
        borderColor: this.colors.success,
        borderWidth: 2,
      })
      
      // Answer header
      this.currentPage.drawRectangle({
        x: this.margin + 35,
        y: this.yPosition - 20,
        width: cardWidth,
        height: 20,
        color: this.colors.success,
      })
      
      this.currentPage.drawText("ANSWER", {
        x: this.margin + 35 + (cardWidth - this.fonts.bold.widthOfTextAtSize("ANSWER", 10)) / 2,
        y: this.yPosition - 14,
        size: 10,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      // Answer content
      this.drawWrappedText(card.answer, this.margin + 45, this.yPosition - 35, {
        size: 9,
        maxWidth: cardWidth - 20,
        color: this.colors.dark
      })
      
      this.yPosition -= cardHeight + 25
    }
  }

  private async renderQuiz(content: string): Promise<void> {
    const questions = this.extractQuizQuestions(content)
    
    for (let i = 0; i < questions.length; i++) {
      const question = questions[i]
      this.checkAndAddPage(160)
      
      // Question header
      this.currentPage.drawRectangle({
        x: this.margin,
        y: this.yPosition - 30,
        width: this.contentWidth,
        height: 30,
        color: this.colors.primary,
      })
      
      this.currentPage.drawText(`Question ${i + 1}`, {
        x: this.margin + (this.contentWidth - this.fonts.bold.widthOfTextAtSize(`Question ${i + 1}`, 14)) / 2,
        y: this.yPosition - 20,
        size: 14,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      this.yPosition -= 45
      
      // Question text
      const questionHeight = this.drawWrappedText(question.question, this.margin + 10, this.yPosition, {
        size: 11,
        font: this.fonts.regular,
        color: this.colors.dark,
        maxWidth: this.contentWidth - 20
      })
      
      this.yPosition -= questionHeight + 10
      
      // Answer choices
      const choiceColors = [this.colors.success, this.colors.primary, this.colors.warning, this.colors.danger]
      const choiceLabels = ['A', 'B', 'C', 'D']
      
      for (let j = 0; j < question.choices.length && j < 4; j++) {
        this.checkAndAddPage(30)
        
        const choice = question.choices[j]
        const choiceY = this.yPosition - 25
        
        // Choice background
        this.currentPage.drawRectangle({
          x: this.margin + 15,
          y: choiceY,
          width: this.contentWidth - 30,
          height: 25,
          color: this.colors.background,
          borderColor: choiceColors[j],
          borderWidth: 1,
        })
        
        // Choice bubble
        this.currentPage.drawCircle({
          x: this.margin + 27,
          y: choiceY + 12,
          size: 8,
          color: choiceColors[j],
        })
        
        this.currentPage.drawText(choiceLabels[j], {
          x: this.margin + 24,
          y: choiceY + 8,
          size: 9,
          font: this.fonts.bold,
          color: this.colors.white,
        })
        
        // Choice text
        this.drawWrappedText(choice, this.margin + 45, this.yPosition - 10, {
          size: 10,
          font: this.fonts.regular,
          color: this.colors.dark,
          maxWidth: this.contentWidth - 70
        })
        
        this.yPosition -= 30
      }
      
      this.yPosition -= 15
    }
  }

  private extractFlashcards(content: string): Array<{question: string, answer: string}> {
    const cards: Array<{question: string, answer: string}> = []
    
    // Try Q&A format
    const qaRegex = /\*\*Q:\s*(.*?)\*\*\s*\*\*A:\s*(.*?)(?=\*\*Q:|$)/gs
    let match
    
    while ((match = qaRegex.exec(content)) !== null) {
      cards.push({
        question: match[1].trim(),
        answer: match[2].trim()
      })
    }
    
    // Fallback: create from headings
    if (cards.length === 0) {
      const sections = this.parseContent(content)
      const headings = sections.filter(s => s.type === 'heading' && s.level <= 2)
      
      headings.forEach((heading, index) => {
        const nextHeading = headings[index + 1]
        const startIdx = sections.findIndex(s => s === heading)
        const endIdx = nextHeading ? sections.findIndex(s => s === nextHeading) : sections.length
        
        const contentText = sections.slice(startIdx + 1, endIdx)
          .filter(s => s.type === 'paragraph' || s.type === 'bullet')
          .map(s => s.text)
          .join(' ')
          .substring(0, 150) + '...'
        
        if (contentText.trim() && contentText !== '...') {
          cards.push({
            question: heading.text,
            answer: contentText
          })
        }
      })
    }
    
    return cards.slice(0, 8) // Limit to 8 cards
  }

  private extractQuizQuestions(content: string): Array<{question: string, choices: string[]}> {
    const questions: Array<{question: string, choices: string[]}> = []
    const lines = content.split('\n').map(line => line.trim()).filter(line => line)
    
    let currentQuestion = ''
    let currentChoices: string[] = []
    
    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentQuestion && currentChoices.length >= 2) {
          questions.push({ question: currentQuestion, choices: currentChoices })
        }
        currentQuestion = line.replace(/^\d+\.\s*/, '')
        currentChoices = []
      } else if (line.match(/^[a-d]\)/i)) {
        if (currentQuestion) {
          currentChoices.push(line.replace(/^[a-d]\)\s*/i, ''))
        }
      }
    }
    
    if (currentQuestion && currentChoices.length >= 2) {
      questions.push({ question: currentQuestion, choices: currentChoices })
    }
    
    // Fallback: generate from content
    if (questions.length === 0) {
      const sections = this.parseContent(content)
      const headings = sections.filter(s => s.type === 'heading' && s.level <= 2).slice(0, 5)
      
      headings.forEach(heading => {
        questions.push({
          question: `What is the main concept of: ${heading.text}?`,
          choices: [
            `The primary concept about ${heading.text}`,
            `An alternative concept`,
            `A different approach`,
            `An unrelated topic`
          ]
        })
      })
    }
    
    return questions.slice(0, 8) // Limit to 8 questions
  }

  private addFooters(): void {
    const pages = this.pdfDoc.getPages()
    
    pages.forEach((page: any, index: number) => {
      // Footer line
      page.drawLine({
        start: { x: this.margin, y: 30 },
        end: { x: this.pageWidth - this.margin, y: 30 },
        thickness: 0.5,
        color: this.colors.border,
      })

      // Left footer
      page.drawText("CasanovaStudy - AI Study Guide Generator", {
        x: this.margin,
        y: 18,
        size: 8,
        font: this.fonts.regular,
        color: this.colors.light,
      })

      // Right footer
      page.drawText(`Generated on ${new Date().toLocaleDateString()} | Page ${index + 1} of ${pages.length}`, {
        x: this.pageWidth - 180,
        y: 18,
        size: 8,
        font: this.fonts.regular,
        color: this.colors.light,
      })
    })
  }
}
