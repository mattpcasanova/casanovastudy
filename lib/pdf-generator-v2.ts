import type { StudyGuideResponse } from "@/types"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"

export class PDFGeneratorV2 {
  public static cleanText(text: string): string {
    if (!text) return ''
    
    // First, aggressively remove all non-ASCII characters
    let cleaned = text
      // Remove specific problematic emoji (📚 = 0x1f4da) - multiple approaches
      .replace(/[\u{1F4DA}]/gu, '')
      .replace(/\uD83D\uDCDA/g, '')
      .replace(/📚/g, '')
      // Remove all emojis and special Unicode characters (comprehensive)
      .replace(/[\u{1F000}-\u{1F9FF}]/gu, '') // Emoji range
      .replace(/[\u{2600}-\u{27BF}]/gu, '') // Miscellaneous Symbols and Pictographs
      .replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // Miscellaneous Symbols and Pictographs
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map Symbols
      .replace(/[\u{1F700}-\u{1F77F}]/gu, '') // Alchemical Symbols
      .replace(/[\u{1F780}-\u{1F7FF}]/gu, '') // Geometric Shapes Extended
      .replace(/[\u{1F800}-\u{1F8FF}]/gu, '') // Supplemental Arrows-C
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1FA00}-\u{1FA6F}]/gu, '') // Chess Symbols
      .replace(/[\u{1FA70}-\u{1FAFF}]/gu, '') // Symbols and Pictographs Extended-A
      .replace(/[\u{1FB00}-\u{1FBFF}]/gu, '') // Symbols for Legacy Computing
      // Remove any remaining non-ASCII characters
      .replace(/[^\x00-\x7F]/g, '')
      // Keep only printable ASCII characters and whitespace
      .replace(/[^\x20-\x7E\s]/g, '')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
    
    // Additional safety check - remove any remaining problematic characters
    cleaned = cleaned.replace(/[^\x20-\x7E\s]/g, '')
    
    return cleaned
  }

  static async generatePDF(studyGuide: StudyGuideResponse): Promise<Buffer> {
    try {
      // Clean the study guide content before processing
      const cleanContent = PDFGeneratorV2.cleanText(studyGuide.content)
      const cleanTitle = PDFGeneratorV2.cleanText(studyGuide.title)
      const cleanSubject = PDFGeneratorV2.cleanText(studyGuide.subject)
      const cleanGradeLevel = PDFGeneratorV2.cleanText(studyGuide.gradeLevel)
      const cleanFormat = PDFGeneratorV2.cleanText(studyGuide.format)
      
      // Create a cleaned study guide object
      const cleanedStudyGuide = {
        ...studyGuide,
        content: cleanContent,
        title: cleanTitle,
        subject: cleanSubject,
        gradeLevel: cleanGradeLevel,
        format: cleanFormat
      }
      
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
      generator.createHeader(cleanedStudyGuide)
      yPosition = height - 180

      // Generate content based on format
      switch (cleanedStudyGuide.format.toLowerCase()) {
        case 'outline':
          await generator.generateOutline(cleanedStudyGuide.content, yPosition)
          break
        case 'flashcards':
          await generator.generateFlashcards(cleanedStudyGuide.content, yPosition)
          break
        case 'quiz':
          await generator.generateQuiz(cleanedStudyGuide.content, yPosition)
          break
        case 'summary':
          await generator.generateSummary(cleanedStudyGuide.content, yPosition)
          break
        default:
          await generator.generateSummary(cleanedStudyGuide.content, yPosition)
      }

      // Add footers
      const pages = pdfDoc.getPages()
      pages.forEach((currentPage, index) => {
        generator.addFooter(currentPage, index + 1, pages.length, cleanedStudyGuide.generatedAt)
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
      this.addNewPageIfNeeded(80)
      
      if (section.level === 1) {
        // Main section with proper text containment
        const boxHeight = 40
        const boxY = this.yPosition - boxHeight
        
        this.page.drawRectangle({
          x: this.margin - 10,
          y: boxY,
          width: this.contentWidth + 20,
          height: boxHeight,
          color: this.colors.primary,
        })
        
        // Center text in box
        const textWidth = this.helveticaBold.widthOfTextAtSize(section.title, 16)
        const textX = this.margin + (this.contentWidth - textWidth) / 2
        const textY = boxY + (boxHeight - 16) / 2 + 12
        
        this.page.drawText(section.title, {
          x: textX,
          y: textY,
          size: 16,
          font: this.helveticaBold,
          color: this.colors.white,
        })
        
        this.yPosition = boxY - 20
        
      } else if (section.level === 2) {
        // Sub-section with proper text containment
        const boxHeight = 35
        const boxY = this.yPosition - boxHeight
        
        this.page.drawRectangle({
          x: this.margin + 10,
          y: boxY,
          width: this.contentWidth - 20,
          height: boxHeight,
          color: this.colors.background,
          borderColor: this.colors.accent,
          borderWidth: 2,
        })
        
        // Center text in box
        const textWidth = this.helveticaBold.widthOfTextAtSize(section.title, 13)
        const textX = this.margin + 10 + (this.contentWidth - 20 - textWidth) / 2
        const textY = boxY + (boxHeight - 13) / 2 + 10
        
        this.page.drawText(section.title, {
          x: textX,
          y: textY,
          size: 13,
          font: this.helveticaBold,
          color: this.colors.accent,
        })
        
        this.yPosition = boxY - 15
        
      } else if (section.level === 3) {
        // Sub-sub-section with centered bullet
        const bulletSize = 4
        const bulletX = this.margin + 30
        const bulletY = this.yPosition - 8
        
        this.page.drawCircle({
          x: bulletX,
          y: bulletY,
          size: bulletSize,
          color: this.colors.accent,
        })
        
        this.addText(section.title, 11, this.helveticaBold, this.colors.darkText, 50)
        this.yPosition -= 15
        
      } else {
        // Regular content with proper indentation
        const indent = Math.min(section.level * 25, 100)
        this.addText(section.title, 10, this.helvetica, this.colors.darkText, indent)
        this.yPosition -= 12
      }
    }
  }

  async generateFlashcards(content: string, startY: number) {
    this.yPosition = startY
    const cards = this.extractFlashcards(content)
    
    cards.forEach((card, index) => {
      this.addNewPageIfNeeded(140)
      
      // Card number with better positioning
      const cardNumberSize = 20
      const cardNumberX = this.margin + 15
      const cardNumberY = this.yPosition - 15
      
      this.page.drawCircle({
        x: cardNumberX,
        y: cardNumberY,
        size: cardNumberSize,
        color: this.colors.primary,
      })
      
      this.page.drawText((index + 1).toString(), {
        x: cardNumberX - 6,
        y: cardNumberY - 7,
        size: 12,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      // Question card with proper text containment
      const cardWidth = this.contentWidth - 50
      const cardHeight = 60
      const cardX = this.margin + 45
      const cardY = this.yPosition - cardHeight
      
      // Card shadow
      this.page.drawRectangle({
        x: cardX + 2,
        y: cardY - 2,
        width: cardWidth,
        height: cardHeight,
        color: rgb(0.1, 0.1, 0.1),
      })
      
      // Card background
      this.page.drawRectangle({
        x: cardX,
        y: cardY,
        width: cardWidth,
        height: cardHeight,
        color: this.colors.cardBg,
        borderColor: this.colors.warning,
        borderWidth: 2,
      })
      
      // Question header
      const headerHeight = 25
      this.page.drawRectangle({
        x: cardX,
        y: cardY + cardHeight - headerHeight,
        width: cardWidth,
        height: headerHeight,
        color: this.colors.warning,
      })
      
      // Center "QUESTION" text
      const questionText = "QUESTION"
      const questionTextWidth = this.helveticaBold.widthOfTextAtSize(questionText, 10)
      this.page.drawText(questionText, {
        x: cardX + (cardWidth - questionTextWidth) / 2,
        y: cardY + cardHeight - headerHeight + 8,
        size: 10,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      // Question content
      this.addTextWrapped(card.question, cardX + 10, cardY + cardHeight - headerHeight - 10, 
                         cardWidth - 20, 11, this.helvetica, this.colors.darkText)
      
      this.yPosition = cardY - 20
      
      // Answer card with proper text containment
      const answerCardY = this.yPosition - cardHeight
      
      // Card shadow
      this.page.drawRectangle({
        x: cardX + 2,
        y: answerCardY - 2,
        width: cardWidth,
        height: cardHeight,
        color: rgb(0.1, 0.1, 0.1),
      })
      
      // Card background
      this.page.drawRectangle({
        x: cardX,
        y: answerCardY,
        width: cardWidth,
        height: cardHeight,
        color: this.colors.cardBg,
        borderColor: this.colors.success,
        borderWidth: 2,
      })
      
      // Answer header
      this.page.drawRectangle({
        x: cardX,
        y: answerCardY + cardHeight - headerHeight,
        width: cardWidth,
        height: headerHeight,
        color: this.colors.success,
      })
      
      // Center "ANSWER" text
      const answerText = "ANSWER"
      const answerTextWidth = this.helveticaBold.widthOfTextAtSize(answerText, 10)
      this.page.drawText(answerText, {
        x: cardX + (cardWidth - answerTextWidth) / 2,
        y: answerCardY + cardHeight - headerHeight + 8,
        size: 10,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      // Answer content
      this.addTextWrapped(card.answer, cardX + 10, answerCardY + cardHeight - headerHeight - 10, 
                         cardWidth - 20, 11, this.helvetica, this.colors.darkText)
      
      this.yPosition = answerCardY - 30
    })
  }

  async generateQuiz(content: string, startY: number) {
    this.yPosition = startY
    const questions = this.extractQuizQuestions(content)
    
    questions.forEach((q, index) => {
      this.addNewPageIfNeeded(180)
      
      // Question header with proper text containment
      const headerHeight = 35
      const headerY = this.yPosition - headerHeight
      
      this.page.drawRectangle({
        x: this.margin,
        y: headerY,
        width: this.contentWidth,
        height: headerHeight,
        color: this.colors.primary,
      })
      
      // Center question number
      const questionText = `Question ${index + 1}`
      const questionTextWidth = this.helveticaBold.widthOfTextAtSize(questionText, 14)
      this.page.drawText(questionText, {
        x: this.margin + (this.contentWidth - questionTextWidth) / 2,
        y: headerY + (headerHeight - 14) / 2 + 10,
        size: 14,
        font: this.helveticaBold,
        color: this.colors.white,
      })
      
      this.yPosition = headerY - 20
      
      // Question text with proper spacing
      this.addTextWrapped(q.question, this.margin + 15, this.yPosition, 
                         this.contentWidth - 30, 12, this.helvetica, this.colors.darkText)
      
      this.yPosition -= 30
      
      // Answer choices with better layout
      const choiceColors = [this.colors.quiz.a, this.colors.quiz.b, this.colors.quiz.c, this.colors.quiz.d]
      const choiceLabels = ['A', 'B', 'C', 'D']
      
      q.choices.forEach((choice: string, choiceIndex: number) => {
        this.addNewPageIfNeeded(40)
        
        // Choice container
        const choiceHeight = 30
        const choiceY = this.yPosition - choiceHeight
        const choiceX = this.margin + 20
        const choiceWidth = this.contentWidth - 40
        
        // Choice background
        this.page.drawRectangle({
          x: choiceX,
          y: choiceY,
          width: choiceWidth,
          height: choiceHeight,
          color: this.colors.background,
          borderColor: choiceColors[choiceIndex],
          borderWidth: 1,
        })
        
        // Choice bubble
        const bubbleSize = 12
        const bubbleX = choiceX + 15
        const bubbleY = choiceY + (choiceHeight - bubbleSize) / 2
        
        this.page.drawCircle({
          x: bubbleX,
          y: bubbleY,
          size: bubbleSize,
          color: choiceColors[choiceIndex],
        })
        
        this.page.drawText(choiceLabels[choiceIndex], {
          x: bubbleX - 4,
          y: bubbleY - 4,
          size: 10,
          font: this.helveticaBold,
          color: this.colors.white,
        })
        
        // Choice text
        this.addTextWrapped(choice, choiceX + 40, choiceY + (choiceHeight - 10) / 2, 
                           choiceWidth - 50, 10, this.helvetica, this.colors.darkText)
        
        this.yPosition = choiceY - 15
      })
      
      this.yPosition -= 25
    })
  }

  async generateSummary(content: string, startY: number) {
    this.yPosition = startY
    const sections = this.parseContent(content)
    
    for (const section of sections) {
      this.addNewPageIfNeeded(60)
      
      if (section.level === 1) {
        // Major heading with proper text containment
        const boxHeight = 35
        const boxY = this.yPosition - boxHeight
        
        this.page.drawRectangle({
          x: this.margin - 5,
          y: boxY,
          width: this.contentWidth + 10,
          height: boxHeight,
          color: this.colors.accent,
        })
        
        // Center text in box
        const textWidth = this.helveticaBold.widthOfTextAtSize(section.title, 14)
        const textX = this.margin + (this.contentWidth - textWidth) / 2
        const textY = boxY + (boxHeight - 14) / 2 + 10
        
        this.page.drawText(section.title, {
          x: textX,
          y: textY,
          size: 14,
          font: this.helveticaBold,
          color: this.colors.white,
        })
        
        this.yPosition = boxY - 20
        
      } else if (section.level === 2) {
        // Sub-heading with underline
        this.addText(section.title, 12, this.helveticaBold, this.colors.primary, 0)
        
        // Underline
        const titleWidth = this.helveticaBold.widthOfTextAtSize(section.title, 12)
        this.page.drawLine({
          start: { x: this.margin, y: this.yPosition + 8 },
          end: { x: this.margin + titleWidth, y: this.yPosition + 8 },
          thickness: 1.5,
          color: this.colors.primary,
        })
        
        this.yPosition -= 20
        
      } else if (section.level === 3) {
        // Sub-sub-heading with bullet
        const bulletSize = 3
        const bulletX = this.margin + 15
        const bulletY = this.yPosition - 6
        
        this.page.drawCircle({
          x: bulletX,
          y: bulletY,
          size: bulletSize,
          color: this.colors.accent,
        })
        
        this.addText(section.title, 11, this.helveticaBold, this.colors.darkText, 35)
        this.yPosition -= 18
        
      } else {
        // Body text with proper paragraph spacing
        this.addTextWrapped(section.title, this.margin, this.yPosition, 
                           this.contentWidth, 10, this.helvetica, this.colors.darkText)
        this.yPosition -= 15
      }
    }
  }

  private addText(text: string, fontSize: number, font: any, color: any, indent: number) {
    const cleanText = PDFGeneratorV2.cleanText(text)
    if (!cleanText) return
    
    // Check if we need a new page
    if (this.yPosition < this.margin + fontSize * 2) {
      this.addNewPageIfNeeded(fontSize * 2)
    }
    
    this.page.drawText(cleanText, {
      x: this.margin + indent,
      y: this.yPosition,
      size: fontSize,
      font: font,
      color: color,
    })
    
    this.yPosition -= fontSize * 1.4
  }

  private addTextWrapped(text: string, x: number, y: number, maxWidth: number, 
                        fontSize: number, font: any, color: any) {
    const cleanText = PDFGeneratorV2.cleanText(text)
    if (!cleanText) return
    
    const words = cleanText.split(' ')
    let line = ''
    let currentY = y
    let lineCount = 0
    
    for (const word of words) {
      const testLine = line + word + ' '
      const textWidth = font.widthOfTextAtSize(testLine, fontSize)
      
      if (textWidth > maxWidth && line !== '') {
        // Check if we need a new page
        if (currentY < this.margin + fontSize * 2) {
          this.addNewPageIfNeeded(fontSize * 2)
          currentY = this.yPosition
        }
        
        this.page.drawText(line.trim(), {
          x: x,
          y: currentY,
          size: fontSize,
          font: font,
          color: color,
        })
        currentY -= fontSize * 1.4
        lineCount++
        line = word + ' '
      } else {
        line = testLine
      }
    }
    
    if (line.trim()) {
      // Check if we need a new page for the last line
      if (currentY < this.margin + fontSize * 2) {
        this.addNewPageIfNeeded(fontSize * 2)
        currentY = this.yPosition
      }
      
      this.page.drawText(line.trim(), {
        x: x,
        y: currentY,
        size: fontSize,
        font: font,
        color: color,
      })
      lineCount++
    }
    
    // Update yPosition based on how many lines we drew
    this.yPosition = currentY - (lineCount * fontSize * 0.2)
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
      } else if (line.match(/^\d+\./)) {
        // Handle numbered questions
        sections.push({ title: line, level: 5 })
      } else if (line.match(/^[a-d]\)/)) {
        // Handle answer choices
        sections.push({ title: line, level: 6 })
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
    const questions: Array<{question: string, choices: string[], correctAnswer: number}> = []
    
    // Split content into lines for better parsing
    const lines = content.split('\n').map(line => line.trim()).filter(line => line)
    
    let currentQuestion = ''
    let currentChoices: string[] = []
    let questionNumber = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Check if this is a numbered question (1., 2., etc.)
      const questionMatch = line.match(/^(\d+)\.\s*(.*)/)
      if (questionMatch) {
        // Save previous question if we have one
        if (currentQuestion && currentChoices.length >= 2) {
          questions.push({
            question: currentQuestion,
            choices: currentChoices,
            correctAnswer: 0
          })
        }
        
        // Start new question
        questionNumber = parseInt(questionMatch[1])
        currentQuestion = questionMatch[2].trim()
        currentChoices = []
        continue
      }
      
      // Check if this is an answer choice (a), b), c), d))
      const choiceMatch = line.match(/^([a-d])\)\s*(.*)/)
      if (choiceMatch && currentQuestion) {
        currentChoices.push(choiceMatch[2].trim())
        continue
      }
      
      // Check if this is a Q: format question
      if (line.startsWith('**Q:') && line.includes('**A:')) {
        const qaMatch = line.match(/\*\*Q:\s*(.*?)\*\*\s*\*\*A:\s*(.*)/)
        if (qaMatch) {
          const question = qaMatch[1].trim()
          const answer = qaMatch[2].trim()
          
          questions.push({
            question: question,
            choices: [
              answer,
              "Incorrect option 1",
              "Incorrect option 2", 
              "Incorrect option 3"
            ],
            correctAnswer: 0
          })
        }
        continue
      }
    }
    
    // Don't forget the last question
    if (currentQuestion && currentChoices.length >= 2) {
      questions.push({
        question: currentQuestion,
        choices: currentChoices,
        correctAnswer: 0
      })
    }
    
    // If still no questions found, create from content sections
    if (questions.length === 0) {
      const sections = this.parseContent(content).filter(s => s.level <= 2)
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
    }
    
    return questions
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
