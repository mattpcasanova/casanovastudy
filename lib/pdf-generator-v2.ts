import type { StudyGuideResponse } from "@/types"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export class PDFGeneratorV2 {
  static async generatePDF(studyGuide: StudyGuideResponse): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.create()
      
      // Embed fonts
      const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)
      const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)

      // Professional color palette
      const colors = {
        primary: rgb(0.29, 0.67, 0.99), // #4facfe
        secondary: rgb(0, 0.95, 0.99), // #00f2fe
        accent: rgb(0.2, 0.6, 0.9),
        darkText: rgb(0.15, 0.15, 0.15),
        mediumText: rgb(0.4, 0.4, 0.4),
        lightText: rgb(0.6, 0.6, 0.6),
        background: rgb(0.97, 0.99, 1.0),
        cardBg: rgb(0.98, 0.99, 1.0),
        white: rgb(1, 1, 1),
        success: rgb(0.13, 0.59, 0.26),
        warning: rgb(0.8, 0.3, 0.1),
        border: rgb(0.85, 0.85, 0.85),
        quiz: {
          a: rgb(0.2, 0.7, 0.3),
          b: rgb(0.3, 0.5, 0.9),
          c: rgb(0.9, 0.5, 0.2),
          d: rgb(0.7, 0.2, 0.6)
        }
      }

      let page = pdfDoc.addPage([595.28, 841.89])
      const { width, height } = page.getSize()
      const margin = 50
      const contentWidth = width - margin * 2
      let yPosition = height - margin

      // Create format-specific generator
      const generator = new FormatGenerator(
        pdfDoc, page, width, height, margin, contentWidth, colors,
        helvetica, helveticaBold, helveticaOblique
      )

      // Create header
      generator.createHeader(studyGuide)
      yPosition = height - 180

      // Generate content based on format
      switch (studyGuide.format.toLowerCase()) {
        case 'outline':
          await generator.generateOutline(studyGuide.content, yPosition)
          break
        case 'flashcards':
          await generator.generateFlashcards(studyGuide.content, yPosition)
          break
        case 'quiz':
          await generator.generateQuiz(studyGuide.content, yPosition)
          break
        case 'summary':
          await generator.generateSummary(studyGuide.content, yPosition)
          break
        default:
          await generator.generateSummary(studyGuide.content, yPosition)
      }

      // Add footers
      const pages = pdfDoc.getPages()
      pages.forEach((currentPage, index) => {
        generator.addFooter(currentPage, index + 1, pages.length, studyGuide.generatedAt)
      })

      const pdfBytes = await pdfDoc.save()
      return Buffer.from(pdfBytes)

    } catch (error) {
      console.error("PDF generation error:", error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }
}

class FormatGenerator {
  private pdfDoc: any
  private page: any
  private width: number
  private height: number
  private margin: number
  private contentWidth: number
  private colors: any
  private helvetica: any
  private helveticaBold: any
  private helveticaOblique: any
  private yPosition: number

  constructor(pdfDoc: any, page: any, width: number, height: number, margin: number, 
              contentWidth: number, colors: any, helvetica: any, helveticaBold: any, helveticaOblique: any) {
    this.pdfDoc = pdfDoc
    this.page = page
    this.width = width
    this.height = height
    this.margin = margin
    this.contentWidth = contentWidth
    this.colors = colors
    this.helvetica = helvetica
    this.helveticaBold = helveticaBold
    this.helveticaOblique = helveticaOblique
    this.yPosition = height - 180
  }

  private addNewPageIfNeeded(requiredSpace: number = 80): boolean {
    if (this.yPosition < this.margin + requiredSpace) {
      this.page = this.pdfDoc.addPage([595.28, 841.89])
      this.yPosition = this.height - this.margin
      this.addPageBorder()
      return true
    }
    return false
  }

  private addPageBorder() {
    this.page.drawRectangle({
      x: this.margin - 5,
      y: this.margin - 5,
      width: this.contentWidth + 10,
      height: this.height - this.margin * 2 + 10,
      borderColor: this.colors.border,
      borderWidth: 0.5,
    })
  }

  createHeader(studyGuide: StudyGuideResponse) {
    // Gradient header
    this.page.drawRectangle({
      x: 0,
      y: this.height - 140,
      width: this.width,
      height: 140,
      color: this.colors.primary,
    })

    // Brand mark
    this.page.drawRectangle({
      x: this.width - 120,
      y: this.height - 35,
      width: 100,
      height: 20,
      color: this.colors.white,
    })

    this.page.drawText("CasanovaStudy", {
      x: this.width - 110,
      y: this.height - 28,
      size: 10,
      font: this.helveticaBold,
      color: this.colors.primary,
    })

    // Title
    this.page.drawText(studyGuide.title, {
      x: this.margin,
      y: this.height - 50,
      size: 24,
      font: this.helveticaBold,
      color: this.colors.white,
    })

    // Format-specific subtitle
    const formatNames = {
      outline: "Structured Study Outline",
      flashcards: "Interactive Flashcards",
      quiz: "Practice Quiz",
      summary: "Comprehensive Summary"
    }

    this.page.drawText(formatNames[studyGuide.format.toLowerCase() as keyof typeof formatNames] || "Study Guide", {
      x: this.margin,
      y: this.height - 75,
      size: 14,
      font: this.helvetica,
      color: this.colors.white,
    })

    // Metadata
    const metadata = [
      `Subject: ${studyGuide.subject}`,
      `Grade: ${studyGuide.gradeLevel}`,
      `Format: ${studyGuide.format}`,
      `Generated: ${studyGuide.generatedAt.toLocaleDateString()}`
    ]

    metadata.forEach((item, index) => {
      this.page.drawText(item, {
        x: this.margin + (index * 120),
        y: this.height - 110,
        size: 9,
        font: this.helvetica,
        color: this.colors.white,
      })
    })
  }

  async generateOutline(content: string, startY: number) {
    this.yPosition = startY
    const sections = this.parseContent(content)
    
    for (const section of sections) {
      this.addNewPageIfNeeded(60)
      
      if (section.level === 1) {
        // Main section
        this.page.drawRectangle({
          x: this.margin - 10,
          y: this.yPosition - 30,
          width: this.contentWidth + 20,
          height: 35,
          color: this.colors.primary,
        })
        
        this.addText(section.title, 16, this.helveticaBold, this.colors.white, 0)
        this.yPosition -= 20
        
      } else if (section.level === 2) {
        // Sub-section
        this.page.drawRectangle({
          x: this.margin + 10,
          y: this.yPosition - 25,
          width: this.contentWidth - 20,
          height: 28,
          color: this.colors.background,
          borderColor: this.colors.accent,
          borderWidth: 2,
        })
        
        this.addText(section.title, 13, this.helveticaBold, this.colors.accent, 20)
        this.yPosition -= 15
        
      } else if (section.level === 3) {
        // Sub-sub-section with bullet
        this.page.drawCircle({
          x: this.margin + 35,
          y: this.yPosition - 6,
          size: 3,
          color: this.colors.accent,
        })
        
        this.addText(section.title, 11, this.helveticaBold, this.colors.darkText, 50)
        this.yPosition -= 10
        
      } else {
        // Regular content
        this.addText(section.title, 10, this.helvetica, this.colors.darkText, section.level * 20)
        this.yPosition -= 8
      }
    }
  }

  async generateFlashcards(content: string, startY: number) {
    this.yPosition = startY
    const cards = this.extractFlashcards(content)
    
    cards.forEach((card, index) => {
      this.addNewPageIfNeeded(120)
      
      // Card number
      this.page.drawCircle({
        x: this.margin + 20,
        y: this.yPosition - 20,
        size: 15,
        color: this.colors.primary,
      })
      
      this.page.drawText((index + 1).toString(), {
        x: this.margin + 16,
        y: this.yPosition - 26,
        size: 12,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      // Question card
      this.page.drawRectangle({
        x: this.margin + 40,
        y: this.yPosition - 50,
        width: this.contentWidth - 40,
        height: 45,
        color: this.colors.cardBg,
        borderColor: this.colors.warning,
        borderWidth: 2,
      })
      
      this.page.drawRectangle({
        x: this.margin + 40,
        y: this.yPosition - 22,
        width: this.contentWidth - 40,
        height: 22,
        color: this.colors.warning,
      })
      
      this.page.drawText("QUESTION", {
        x: this.margin + 50,
        y: this.yPosition - 16,
        size: 10,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      this.addTextWrapped(card.question, this.margin + 50, this.yPosition - 40, 
                         this.contentWidth - 60, 11, this.helvetica, this.colors.darkText)
      
      this.yPosition -= 60
      
      // Answer card
      this.page.drawRectangle({
        x: this.margin + 40,
        y: this.yPosition - 50,
        width: this.contentWidth - 40,
        height: 45,
        color: this.colors.cardBg,
        borderColor: this.colors.success,
        borderWidth: 2,
      })
      
      this.page.drawRectangle({
        x: this.margin + 40,
        y: this.yPosition - 22,
        width: this.contentWidth - 40,
        height: 22,
        color: this.colors.success,
      })
      
      this.page.drawText("ANSWER", {
        x: this.margin + 50,
        y: this.yPosition - 16,
        size: 10,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      this.addTextWrapped(card.answer, this.margin + 50, this.yPosition - 40, 
                         this.contentWidth - 60, 11, this.helvetica, this.colors.darkText)
      
      this.yPosition -= 80
    })
  }

  async generateQuiz(content: string, startY: number) {
    this.yPosition = startY
    const questions = this.extractQuizQuestions(content)
    
    questions.forEach((q, index) => {
      this.addNewPageIfNeeded(150)
      
      // Question header
      this.page.drawRectangle({
        x: this.margin,
        y: this.yPosition - 25,
        width: this.contentWidth,
        height: 25,
        color: this.colors.primary,
      })
      
      this.page.drawText(`Question ${index + 1}`, {
        x: this.margin + 15,
        y: this.yPosition - 18,
        size: 12,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      this.yPosition -= 35
      
      // Question text
      this.addTextWrapped(q.question, this.margin + 10, this.yPosition, 
                         this.contentWidth - 20, 11, this.helvetica, this.colors.darkText)
      
      this.yPosition -= 20
      
      // Answer choices
      const choiceColors = [this.colors.quiz.a, this.colors.quiz.b, this.colors.quiz.c, this.colors.quiz.d]
      const choiceLabels = ['A', 'B', 'C', 'D']
      
      q.choices.forEach((choice: string, choiceIndex: number) => {
        this.addNewPageIfNeeded(30)
        
        // Choice bubble
        this.page.drawCircle({
          x: this.margin + 20,
          y: this.yPosition - 10,
          size: 8,
          color: choiceColors[choiceIndex],
        })
        
        this.page.drawText(choiceLabels[choiceIndex], {
          x: this.margin + 16,
          y: this.yPosition - 14,
          size: 10,
          font: this.helveticaBold,
          color: this.colors.white,
        })
        
        this.addTextWrapped(choice, this.margin + 40, this.yPosition - 5, 
                           this.contentWidth - 50, 10, this.helvetica, this.colors.darkText)
        
        this.yPosition -= 25
      })
      
      this.yPosition -= 15
    })
  }

  async generateSummary(content: string, startY: number) {
    this.yPosition = startY
    const sections = this.parseContent(content)
    
    for (const section of sections) {
      this.addNewPageIfNeeded(40)
      
      if (section.level === 1) {
        // Major heading with background
        this.page.drawRectangle({
          x: this.margin - 5,
          y: this.yPosition - 25,
          width: this.contentWidth + 10,
          height: 25,
          color: this.colors.accent,
        })
        
        this.addText(section.title, 14, this.helveticaBold, this.colors.white, 5)
        this.yPosition -= 15
        
      } else if (section.level === 2) {
        // Sub-heading
        this.addText(section.title, 12, this.helveticaBold, this.colors.primary, 0)
        
        // Underline
        const titleWidth = this.helveticaBold.widthOfTextAtSize(section.title, 12)
        this.page.drawLine({
          start: { x: this.margin, y: this.yPosition + 5 },
          end: { x: this.margin + titleWidth, y: this.yPosition + 5 },
          thickness: 1,
          color: this.colors.primary,
        })
        
        this.yPosition -= 12
        
      } else {
        // Body text with proper paragraph spacing
        this.addTextWrapped(section.title, this.margin, this.yPosition, 
                           this.contentWidth, 10, this.helvetica, this.colors.darkText)
        this.yPosition -= 12
      }
    }
  }

  private addText(text: string, fontSize: number, font: any, color: any, indent: number) {
    const cleanText = this.cleanText(text)
    if (!cleanText) return
    
    this.page.drawText(cleanText, {
      x: this.margin + indent,
      y: this.yPosition,
      size: fontSize,
      font: font,
      color: color,
    })
    
    this.yPosition -= fontSize * 1.3
  }

  private addTextWrapped(text: string, x: number, y: number, maxWidth: number, 
                        fontSize: number, font: any, color: any) {
    const cleanText = this.cleanText(text)
    if (!cleanText) return
    
    const words = cleanText.split(' ')
    let line = ''
    let currentY = y
    
    for (const word of words) {
      const testLine = line + word + ' '
      const textWidth = font.widthOfTextAtSize(testLine, fontSize)
      
      if (textWidth > maxWidth && line !== '') {
        this.page.drawText(line.trim(), {
          x: x,
          y: currentY,
          size: fontSize,
          font: font,
          color: color,
        })
        currentY -= fontSize * 1.3
        line = word + ' '
      } else {
        line = testLine
      }
    }
    
    if (line.trim()) {
      this.page.drawText(line.trim(), {
        x: x,
        y: currentY,
        size: fontSize,
        font: font,
        color: color,
      })
    }
  }

  private parseContent(content: string) {
    const lines = content.split('\n').filter(line => line.trim())
    const sections = []
    
    for (const line of lines) {
      if (line.startsWith('# ')) {
        sections.push({ title: line.replace('# ', ''), level: 1 })
      } else if (line.startsWith('## ')) {
        sections.push({ title: line.replace('## ', ''), level: 2 })
      } else if (line.startsWith('### ')) {
        sections.push({ title: line.replace('### ', ''), level: 3 })
      } else if (line.startsWith('- ')) {
        sections.push({ title: line.replace('- ', ''), level: 4 })
      } else if (line.trim()) {
        sections.push({ title: line, level: 0 })
      }
    }
    
    return sections
  }

  private extractFlashcards(content: string) {
    const cards = []
    const qaRegex = /\*\*Q:\s*(.*?)\*\*\s*\*\*A:\s*(.*?)(?=\*\*Q:|$)/gs
    let match
    
    while ((match = qaRegex.exec(content)) !== null) {
      cards.push({
        question: match[1].trim(),
        answer: match[2].trim()
      })
    }
    
    // If no Q&A format found, create cards from headings and content
    if (cards.length === 0) {
      const sections = this.parseContent(content)
      for (let i = 0; i < sections.length - 1; i += 2) {
        if (sections[i] && sections[i + 1]) {
          cards.push({
            question: sections[i].title,
            answer: sections[i + 1].title
          })
        }
      }
    }
    
    return cards
  }

  private extractQuizQuestions(content: string) {
    // For now, create sample questions based on content
    const sections = this.parseContent(content).filter(s => s.level <= 2)
    const questions: Array<{question: string, choices: string[], correctAnswer: number}> = []
    
    sections.slice(0, 5).forEach((section, index) => {
      questions.push({
        question: `What is the main concept of: ${section.title}?`,
        choices: [
          `Option A for ${section.title}`,
          `Option B for ${section.title}`,
          `Option C for ${section.title}`,
          `Option D for ${section.title}`
        ],
        correctAnswer: 0
      })
    })
    
    return questions
  }

  private cleanText(text: string): string {
    return text
      .replace(/[^\x20-\x7E\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  }

  addFooter(page: any, pageNum: number, totalPages: number, generatedAt: Date) {
    page.drawLine({
      start: { x: this.margin, y: 35 },
      end: { x: this.width - this.margin, y: 35 },
      thickness: 0.5,
      color: this.colors.border,
    })

    page.drawText("CasanovaStudy - AI Study Guide Generator", {
      x: this.margin,
      y: 22,
      size: 8,
      font: this.helvetica,
      color: this.colors.lightText,
    })

    page.drawText(`Generated on ${generatedAt.toLocaleDateString()} | Page ${pageNum} of ${totalPages}`, {
      x: this.width - 180,
      y: 22,
      size: 8,
      font: this.helvetica,
      color: this.colors.lightText,
    })
  }
}
