import type { StudyGuideResponse } from "@/types"
import { PDFDocument, rgb, StandardFonts, PageSizes } from "pdf-lib"

export class PDFGeneratorV3 {
  public static cleanText(text: string): string {
    if (!text) return ''
    
    // Remove emojis and non-ASCII characters more efficiently
    return text
      .replace(/[\uD83C-\uDBFF\uDC00-\uDFFF]+/g, '') // Emoji ranges
      .replace(/[\u2600-\u27BF]/g, '') // Miscellaneous symbols
      .replace(/[^\x20-\x7E\s]/g, '') // Keep only printable ASCII + whitespace
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

      // Professional color palette
      const colors = {
        primary: rgb(0.2, 0.4, 0.8),      // Deep blue
        secondary: rgb(0.1, 0.7, 0.9),    // Light blue
        accent: rgb(0.9, 0.4, 0.1),       // Orange
        success: rgb(0.1, 0.6, 0.3),      // Green
        warning: rgb(0.9, 0.6, 0.1),      // Yellow
        danger: rgb(0.8, 0.2, 0.2),       // Red
        dark: rgb(0.1, 0.1, 0.1),         // Almost black
        medium: rgb(0.4, 0.4, 0.4),       // Medium gray
        light: rgb(0.7, 0.7, 0.7),        // Light gray
        background: rgb(0.98, 0.98, 0.98), // Very light gray
        white: rgb(1, 1, 1),
        border: rgb(0.9, 0.9, 0.9)
      }

      // Create the generator
      const generator = new EnhancedFormatGenerator(pdfDoc, fonts, colors)
      
      // Generate based on format
      switch (cleanedStudyGuide.format.toLowerCase()) {
        case 'outline':
          await generator.generateOutline(cleanedStudyGuide)
          break
        case 'flashcards':
          await generator.generateFlashcards(cleanedStudyGuide)
          break
        case 'quiz':
          await generator.generateQuiz(cleanedStudyGuide)
          break
        case 'summary':
          await generator.generateSummary(cleanedStudyGuide)
          break
        default:
          await generator.generateSummary(cleanedStudyGuide)
      }

      const pdfBytes = await pdfDoc.save()
      return Buffer.from(pdfBytes)

    } catch (error) {
      console.error("PDF generation error:", error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}

class EnhancedFormatGenerator {
  private pdfDoc: any
  private fonts: any
  private colors: any
  private currentPage: any
  private pageWidth = 595.28 // A4 width
  private pageHeight = 841.89 // A4 height
  private margin = 50
  private yPosition = 0
  private lineHeight = 14

  constructor(pdfDoc: any, fonts: any, colors: any) {
    this.pdfDoc = pdfDoc
    this.fonts = fonts
    this.colors = colors
  }

  private addPage(): void {
    this.currentPage = this.pdfDoc.addPage(PageSizes.A4)
    this.yPosition = this.pageHeight - this.margin
    this.addPageBorder()
  }

  private addPageBorder(): void {
    this.currentPage.drawRectangle({
      x: this.margin - 10,
      y: this.margin - 10,
      width: this.pageWidth - 2 * (this.margin - 10),
      height: this.pageHeight - 2 * (this.margin - 10),
      borderColor: this.colors.border,
      borderWidth: 1,
    })
  }

  private checkPageSpace(requiredSpace: number): void {
    if (this.yPosition - requiredSpace < this.margin + 50) {
      this.addPage()
    }
  }

  private drawHeader(studyGuide: any): void {
    // Create gradient effect with overlapping rectangles
    const headerHeight = 120
    
    // Main header background
    this.currentPage.drawRectangle({
      x: 0,
      y: this.pageHeight - headerHeight,
      width: this.pageWidth,
      height: headerHeight,
      color: this.colors.primary,
    })
    
    // Accent stripe
    this.currentPage.drawRectangle({
      x: 0,
      y: this.pageHeight - 8,
      width: this.pageWidth,
      height: 8,
      color: this.colors.secondary,
    })

    // Brand box
    this.currentPage.drawRectangle({
      x: this.pageWidth - 150,
      y: this.pageHeight - 35,
      width: 130,
      height: 25,
      color: this.colors.white,
    })

    this.currentPage.drawText("CasanovaStudy", {
      x: this.pageWidth - 140,
      y: this.pageHeight - 28,
      size: 12,
      font: this.fonts.bold,
      color: this.colors.primary,
    })

    // Title
    const title = studyGuide.title || "Study Guide"
    this.currentPage.drawText(title, {
      x: this.margin,
      y: this.pageHeight - 45,
      size: 22,
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
      y: this.pageHeight - 70,
      size: 14,
      font: this.fonts.regular,
      color: this.colors.white,
    })

    // Metadata badges
    const metadata = [
      { label: "Subject", value: studyGuide.subject || "General" },
      { label: "Grade", value: studyGuide.gradeLevel || "N/A" },
      { label: "Generated", value: new Date().toLocaleDateString() }
    ]

    metadata.forEach((item, index) => {
      const badgeX = this.margin + (index * 160)
      const badgeY = this.pageHeight - 105
      
      // Badge background
      this.currentPage.drawRectangle({
        x: badgeX,
        y: badgeY,
        width: 140,
        height: 20,
        color: this.colors.white,
        opacity: 0.2,
      })
      
      this.currentPage.drawText(`${item.label}: ${item.value}`, {
        x: badgeX + 8,
        y: badgeY + 7,
        size: 9,
        font: this.fonts.regular,
        color: this.colors.white,
      })
    })

    this.yPosition = this.pageHeight - headerHeight - 20
  }

  private drawText(text: string, options: {
    x?: number,
    y?: number,
    size?: number,
    font?: any,
    color?: any,
    maxWidth?: number,
    lineSpacing?: number
  } = {}): number {
    const {
      x = this.margin,
      y = this.yPosition,
      size = 11,
      font = this.fonts.regular,
      color = this.colors.dark,
      maxWidth = this.pageWidth - 2 * this.margin,
      lineSpacing = 1.4
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
          // Single word is too long, add it anyway
          lines.push(word)
        }
      }
    }
    
    if (currentLine) {
      lines.push(currentLine)
    }

    // Draw each line
    let currentY = y
    for (const line of lines) {
      this.checkPageSpace(size * lineSpacing + 10)
      
      // Update currentY if we switched pages
      if (this.yPosition > currentY) {
        currentY = this.yPosition
      }
      
      this.currentPage.drawText(line, {
        x,
        y: currentY,
        size,
        font,
        color,
      })
      
      currentY -= size * lineSpacing
    }

    return lines.length * size * lineSpacing
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
      } else if (trimmed.startsWith('**') && trimmed.includes('**')) {
        sections.push({ text: trimmed.replace(/\*\*/g, ''), level: 0, type: 'bold' })
      } else if (trimmed) {
        sections.push({ text: trimmed, level: 0, type: 'paragraph' })
      }
    }
    
    return sections
  }

  async generateOutline(studyGuide: any): Promise<void> {
    this.addPage()
    this.drawHeader(studyGuide)
    
    const sections = this.parseContent(studyGuide.content)
    
    for (const section of sections) {
      this.checkPageSpace(50)
      
      switch (section.level) {
        case 1: // Main heading
          this.yPosition -= 20
          
          // Heading background
          this.currentPage.drawRectangle({
            x: this.margin - 10,
            y: this.yPosition - 25,
            width: this.pageWidth - 2 * (this.margin - 10),
            height: 35,
            color: this.colors.primary,
          })
          
          const textHeight = this.drawText(section.text, {
            x: this.margin,
            y: this.yPosition - 8,
            size: 16,
            font: this.fonts.bold,
            color: this.colors.white
          })
          
          this.yPosition -= textHeight + 25
          break
          
        case 2: // Sub heading
          this.yPosition -= 15
          
          // Sub-heading with left accent
          this.currentPage.drawRectangle({
            x: this.margin - 5,
            y: this.yPosition - 20,
            width: 4,
            height: 25,
            color: this.colors.secondary,
          })
          
          const subTextHeight = this.drawText(section.text, {
            x: this.margin + 10,
            y: this.yPosition - 5,
            size: 14,
            font: this.fonts.bold,
            color: this.colors.primary
          })
          
          this.yPosition -= subTextHeight + 15
          break
          
        case 3: // Sub-sub heading
          this.yPosition -= 10
          
          // Bullet point
          this.currentPage.drawCircle({
            x: this.margin + 20,
            y: this.yPosition - 6,
            size: 3,
            color: this.colors.accent,
          })
          
          const bulletHeight = this.drawText(section.text, {
            x: this.margin + 35,
            y: this.yPosition,
            size: 12,
            font: this.fonts.bold,
            color: this.colors.dark
          })
          
          this.yPosition -= bulletHeight + 8
          break
          
        default: // Regular content
          const indent = section.type === 'bullet' ? 40 : 20
          const contentHeight = this.drawText(section.text, {
            x: this.margin + indent,
            y: this.yPosition,
            size: 11,
            font: this.fonts.regular,
            color: this.colors.medium
          })
          
          this.yPosition -= contentHeight + 5
      }
    }
    
    this.addFooter()
  }

  async generateFlashcards(studyGuide: any): Promise<void> {
    this.addPage()
    this.drawHeader(studyGuide)
    
    const cards = this.extractFlashcards(studyGuide.content)
    
    cards.forEach((card, index) => {
      this.checkPageSpace(200)
      
      const cardWidth = this.pageWidth - 2 * this.margin - 40
      const cardHeight = 80
      
      // Card number badge
      this.currentPage.drawCircle({
        x: this.margin + 20,
        y: this.yPosition - 15,
        size: 15,
        color: this.colors.primary,
      })
      
      this.currentPage.drawText((index + 1).toString(), {
        x: this.margin + (index + 1 < 10 ? 16 : 12),
        y: this.yPosition - 19,
        size: 12,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      // Question card
      const questionY = this.yPosition - 40
      
      // Card shadow
      this.currentPage.drawRectangle({
        x: this.margin + 42,
        y: questionY - cardHeight - 2,
        width: cardWidth,
        height: cardHeight,
        color: rgb(0, 0, 0),
        opacity: 0.1,
      })
      
      // Question card background
      this.currentPage.drawRectangle({
        x: this.margin + 40,
        y: questionY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: this.colors.white,
        borderColor: this.colors.warning,
        borderWidth: 2,
      })
      
      // Question header
      this.currentPage.drawRectangle({
        x: this.margin + 40,
        y: questionY - 25,
        width: cardWidth,
        height: 25,
        color: this.colors.warning,
      })
      
      this.currentPage.drawText("QUESTION", {
        x: this.margin + 40 + (cardWidth - this.fonts.bold.widthOfTextAtSize("QUESTION", 11)) / 2,
        y: questionY - 17,
        size: 11,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      // Question content
      this.drawText(card.question, {
        x: this.margin + 50,
        y: questionY - 40,
        size: 10,
        maxWidth: cardWidth - 20,
        color: this.colors.dark
      })
      
      // Answer card
      const answerY = questionY - cardHeight - 20
      
      // Answer card shadow
      this.currentPage.drawRectangle({
        x: this.margin + 42,
        y: answerY - cardHeight - 2,
        width: cardWidth,
        height: cardHeight,
        color: rgb(0, 0, 0),
        opacity: 0.1,
      })
      
      // Answer card background
      this.currentPage.drawRectangle({
        x: this.margin + 40,
        y: answerY - cardHeight,
        width: cardWidth,
        height: cardHeight,
        color: this.colors.white,
        borderColor: this.colors.success,
        borderWidth: 2,
      })
      
      // Answer header
      this.currentPage.drawRectangle({
        x: this.margin + 40,
        y: answerY - 25,
        width: cardWidth,
        height: 25,
        color: this.colors.success,
      })
      
      this.currentPage.drawText("ANSWER", {
        x: this.margin + 40 + (cardWidth - this.fonts.bold.widthOfTextAtSize("ANSWER", 11)) / 2,
        y: answerY - 17,
        size: 11,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      // Answer content
      this.drawText(card.answer, {
        x: this.margin + 50,
        y: answerY - 40,
        size: 10,
        maxWidth: cardWidth - 20,
        color: this.colors.dark
      })
      
      this.yPosition = answerY - cardHeight - 30
    })
    
    this.addFooter()
  }

  async generateQuiz(studyGuide: any): Promise<void> {
    this.addPage()
    this.drawHeader(studyGuide)
    
    const questions = this.extractQuizQuestions(studyGuide.content)
    
    questions.forEach((question, index) => {
      this.checkPageSpace(200)
      
      // Question header
      this.currentPage.drawRectangle({
        x: this.margin,
        y: this.yPosition - 35,
        width: this.pageWidth - 2 * this.margin,
        height: 35,
        color: this.colors.primary,
      })
      
      this.currentPage.drawText(`Question ${index + 1}`, {
        x: this.margin + (this.pageWidth - 2 * this.margin - this.fonts.bold.widthOfTextAtSize(`Question ${index + 1}`, 16)) / 2,
        y: this.yPosition - 22,
        size: 16,
        font: this.fonts.bold,
        color: this.colors.white,
      })
      
      this.yPosition -= 50
      
      // Question text
      const questionHeight = this.drawText(question.question, {
        x: this.margin + 15,
        y: this.yPosition,
        size: 12,
        font: this.fonts.regular,
        color: this.colors.dark,
        maxWidth: this.pageWidth - 2 * this.margin - 30
      })
      
      this.yPosition -= questionHeight + 15
      
      // Answer choices
      const choiceColors = [this.colors.success, this.colors.primary, this.colors.warning, this.colors.danger]
      const choiceLabels = ['A', 'B', 'C', 'D']
      
      question.choices.forEach((choice, choiceIndex) => {
        this.checkPageSpace(35)
        
        const choiceY = this.yPosition - 30
        
        // Choice background
        this.currentPage.drawRectangle({
          x: this.margin + 20,
          y: choiceY,
          width: this.pageWidth - 2 * this.margin - 40,
          height: 30,
          color: this.colors.background,
          borderColor: choiceColors[choiceIndex],
          borderWidth: 1,
        })
        
        // Choice bubble
        this.currentPage.drawCircle({
          x: this.margin + 35,
          y: choiceY + 15,
          size: 10,
          color: choiceColors[choiceIndex],
        })
        
        this.currentPage.drawText(choiceLabels[choiceIndex], {
          x: this.margin + 31,
          y: choiceY + 11,
          size: 10,
          font: this.fonts.bold,
          color: this.colors.white,
        })
        
        // Choice text
        this.drawText(choice, {
          x: this.margin + 55,
          y: choiceY + 18,
          size: 10,
          font: this.fonts.regular,
          color: this.colors.dark,
          maxWidth: this.pageWidth - 2 * this.margin - 100
        })
        
        this.yPosition -= 35
      })
      
      this.yPosition -= 20
    })
    
    this.addFooter()
  }

  async generateSummary(studyGuide: any): Promise<void> {
    this.addPage()
    this.drawHeader(studyGuide)
    
    const sections = this.parseContent(studyGuide.content)
    
    for (const section of sections) {
      this.checkPageSpace(40)
      
      switch (section.type) {
        case 'heading':
          if (section.level === 1) {
            this.yPosition -= 20
            
            this.currentPage.drawRectangle({
              x: this.margin - 5,
              y: this.yPosition - 30,
              width: this.pageWidth - 2 * (this.margin - 5),
              height: 30,
              color: this.colors.accent,
            })
            
            const headingHeight = this.drawText(section.text, {
              x: this.margin,
              y: this.yPosition - 10,
              size: 16,
              font: this.fonts.bold,
              color: this.colors.white
            })
            
            this.yPosition -= headingHeight + 25
          } else {
            this.yPosition -= 15
            
            const subHeadingHeight = this.drawText(section.text, {
              x: this.margin,
              y: this.yPosition,
              size: 14,
              font: this.fonts.bold,
              color: this.colors.primary
            })
            
            // Underline
            this.currentPage.drawLine({
              start: { x: this.margin, y: this.yPosition - 5 },
              end: { x: this.margin + Math.min(this.fonts.bold.widthOfTextAtSize(section.text, 14), this.pageWidth - 2 * this.margin), y: this.yPosition - 5 },
              thickness: 2,
              color: this.colors.primary,
            })
            
            this.yPosition -= subHeadingHeight + 15
          }
          break
          
        case 'bullet':
          this.currentPage.drawCircle({
            x: this.margin + 15,
            y: this.yPosition - 6,
            size: 3,
            color: this.colors.accent,
          })
          
          const bulletHeight = this.drawText(section.text, {
            x: this.margin + 25,
            y: this.yPosition,
            size: 11,
            font: this.fonts.regular,
            color: this.colors.dark
          })
          
          this.yPosition -= bulletHeight + 8
          break
          
        case 'bold':
          const boldHeight = this.drawText(section.text, {
            x: this.margin,
            y: this.yPosition,
            size: 11,
            font: this.fonts.bold,
            color: this.colors.dark
          })
          
          this.yPosition -= boldHeight + 10
          break
          
        default:
          const paraHeight = this.drawText(section.text, {
            x: this.margin,
            y: this.yPosition,
            size: 11,
            font: this.fonts.regular,
            color: this.colors.medium
          })
          
          this.yPosition -= paraHeight + 8
      }
    }
    
    this.addFooter()
  }

  private extractFlashcards(content: string): Array<{question: string, answer: string}> {
    const cards: Array<{question: string, answer: string}> = []
    
    // Try Q&A format first
    const qaRegex = /\*\*Q:\s*(.*?)\*\*\s*\*\*A:\s*(.*?)(?=\*\*Q:|$)/g
    let match
    
    while ((match = qaRegex.exec(content)) !== null) {
      cards.push({
        question: match[1].trim(),
        answer: match[2].trim()
      })
    }
    
    // If no Q&A format, create from sections
    if (cards.length === 0) {
      const sections = this.parseContent(content)
      const headings = sections.filter(s => s.type === 'heading' && s.level <= 2)
      
      headings.forEach((heading, index) => {
        const nextHeading = headings[index + 1]
        const startIdx = sections.findIndex(s => s === heading)
        const endIdx = nextHeading ? sections.findIndex(s => s === nextHeading) : sections.length
        
        const content = sections.slice(startIdx + 1, endIdx)
          .filter(s => s.type === 'paragraph' || s.type === 'bullet')
          .map(s => s.text)
          .join(' ')
          .substring(0, 200) + '...'
        
        if (content.trim()) {
          cards.push({
            question: heading.text,
            answer: content
          })
        }
      })
    }
    
    return cards.slice(0, 10) // Limit to 10 cards
  }

  private extractQuizQuestions(content: string): Array<{question: string, choices: string[]}> {
    const questions: Array<{question: string, choices: string[]}> = []
    
    const lines = content.split('\n').map(line => line.trim()).filter(line => line)
    
    let currentQuestion = ''
    let currentChoices: string[] = []
    
    for (const line of lines) {
      // Numbered question
      if (line.match(/^\d+\./)) {
        if (currentQuestion && currentChoices.length >= 2) {
          questions.push({ question: currentQuestion, choices: currentChoices })
        }
        currentQuestion = line.replace(/^\d+\.\s*/, '')
        currentChoices = []
      }
      // Choice option
      else if (line.match(/^[a-d]\)/i)) {
        if (currentQuestion) {
          currentChoices.push(line.replace(/^[a-d]\)\s*/i, ''))
        }
      }
      // Q&A format
      else if (line.includes('**Q:') && line.includes('**A:')) {
        const qaMatch = line.match(/\*\*Q:\s*(.*?)\*\*\s*\*\*A:\s*(.*)/)
        if (qaMatch) {
          questions.push({
            question: qaMatch[1].trim(),
            choices: [
              qaMatch[2].trim(),
              "Alternative answer 1",
              "Alternative answer 2", 
              "Alternative answer 3"
            ]
          })
        }
      }
    }
    
    // Don't forget the last question
    if (currentQuestion && currentChoices.length >= 2) {
      questions.push({ question: currentQuestion, choices: currentChoices })
    }
    
    // Generate questions from content if none found
    if (questions.length === 0) {
      const sections = this.parseContent(content)
      const headings = sections.filter(s => s.type === 'heading' && s.level <= 2).slice(0, 5)
      
      headings.forEach(heading => {
        questions.push({
          question: `What is the main topic of: ${heading.text}?`,
          choices: [
            `Correct answer about ${heading.text}`,
            `Incorrect option 1`,
            `Incorrect option 2`,
            `Incorrect option 3`
          ]
        })
      })
    }
    
    return questions.slice(0, 10) // Limit to 10 questions
  }

  private addFooter(): void {
    const pages = this.pdfDoc.getPages()
    
    pages.forEach((page: any, index: number) => {
      // Footer line
      page.drawLine({
        start: { x: this.margin, y: 35 },
        end: { x: this.pageWidth - this.margin, y: 35 },
        thickness: 0.5,
        color: this.colors.border,
      })

      // Left footer text
      page.drawText("CasanovaStudy - AI Study Guide Generator", {
        x: this.margin,
        y: 22,
        size: 8,
        font: this.fonts.regular,
        color: this.colors.light,
      })

      // Right footer text
      page.drawText(`Generated on ${new Date().toLocaleDateString()} | Page ${index + 1} of ${pages.length}`, {
        x: this.pageWidth - 200,
        y: 22,
        size: 8,
        font: this.fonts.regular,
        color: this.colors.light,
      })
    })
  }
}
