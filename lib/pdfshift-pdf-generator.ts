import { StudyGuideResponse } from '../types'

export class PDFShiftPDFGenerator {
  private static readonly API_KEY = process.env.PDFSHIFT_API_KEY
  private static readonly API_URL = 'https://api.pdfshift.io/v3/convert/pdf'

  static async generatePDF(studyGuide: StudyGuideResponse): Promise<Buffer> {
    try {
      console.log('Generating PDF with PDFShift for format:', studyGuide.format)
      
      if (!this.API_KEY) {
        throw new Error('PDFSHIFT_API_KEY environment variable is required')
      }

      const html = this.generateHTML(studyGuide)
      
      const response = await fetch(this.API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${Buffer.from(`api:${this.API_KEY}`).toString('base64')}`
        },
        body: JSON.stringify({
          source: html,
          sandbox: false,
          landscape: false,
          format: 'A4',
          margin: '0.5in',
          print_media_type: true,
          no_background: false
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`PDFShift API error: ${response.status} - ${errorText}`)
      }

      const pdfBuffer = await response.arrayBuffer()
      return Buffer.from(pdfBuffer)
    } catch (error) {
      console.error('PDFShift PDF generation error:', error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private static generateHTML(studyGuide: StudyGuideResponse): string {
    const formatNames = {
      outline: "Structured Study Outline",
      flashcards: "Interactive Flashcards", 
      quiz: "Practice Quiz",
      summary: "Comprehensive Summary"
    }

    const formatName = formatNames[studyGuide.format] || "Study Guide"
    const currentDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${formatName} - ${studyGuide.subject}</title>
    <style>
        ${this.getBaseCSS()}
        ${this.getFormatCSS(studyGuide.format)}
    </style>
</head>
<body>
    <div class="document">
        ${this.generateHeader(studyGuide, formatName, currentDate)}
        ${this.generateContent(studyGuide)}
        ${this.generateFooter()}
    </div>
</body>
</html>`
  }

  private static getBaseCSS(): string {
    return `
    * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
    }

    body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        line-height: 1.6;
        color: #1f2937;
        background: #ffffff;
        font-size: 14px;
    }

    .document {
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0.75in;
        background: white;
        min-height: 11in;
    }

    .header {
        border-bottom: 3px solid #2563eb;
        padding-bottom: 1rem;
        margin-bottom: 2rem;
    }

    .header h1 {
        color: #2563eb;
        font-size: 2.5rem;
        font-weight: 700;
        margin-bottom: 0.5rem;
        letter-spacing: -0.025em;
    }

    .header .subtitle {
        color: #6b7280;
        font-size: 1.125rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }

    .header .metadata {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #6b7280;
        font-size: 0.875rem;
        margin-top: 1rem;
    }

    .metadata-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .metadata-item strong {
        color: #374151;
        font-weight: 600;
    }

    .content {
        margin-bottom: 2rem;
    }

    .section {
        margin-bottom: 2rem;
        page-break-inside: avoid;
    }

    .section-title {
        color: #1f2937;
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e5e7eb;
    }

    .section-content {
        line-height: 1.7;
    }

    .footer {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
        text-align: center;
        color: #6b7280;
        font-size: 0.875rem;
    }

    .page-number {
        position: fixed;
        bottom: 0.5in;
        right: 0.5in;
        font-size: 0.75rem;
        color: #9ca3af;
    }

    @media print {
        .document {
            margin: 0;
            padding: 0.5in;
        }
        
        .page-number::after {
            content: counter(page);
        }
    }

    /* Typography */
    h1, h2, h3, h4, h5, h6 {
        font-weight: 600;
        line-height: 1.25;
        margin-bottom: 0.5rem;
    }

    h2 { font-size: 1.5rem; color: #1f2937; }
    h3 { font-size: 1.25rem; color: #374151; }
    h4 { font-size: 1.125rem; color: #4b5563; }

    p {
        margin-bottom: 1rem;
        line-height: 1.7;
    }

    ul, ol {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
    }

    li {
        margin-bottom: 0.5rem;
        line-height: 1.6;
    }

    strong {
        font-weight: 600;
        color: #1f2937;
    }

    em {
        font-style: italic;
        color: #6b7280;
    }

    .highlight {
        background-color: #fef3c7;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-weight: 500;
    }

    .key-term {
        background-color: #dbeafe;
        color: #1e40af;
        padding: 0.125rem 0.375rem;
        border-radius: 0.25rem;
        font-weight: 500;
        font-size: 0.875rem;
    }
    `
  }

  private static getFormatCSS(format: string): string {
    switch (format) {
      case 'outline':
        return this.getOutlineCSS()
      case 'flashcards':
        return this.getFlashcardsCSS()
      case 'quiz':
        return this.getQuizCSS()
      case 'summary':
        return this.getSummaryCSS()
      default:
        return this.getSummaryCSS()
    }
  }

  private static getOutlineCSS(): string {
    return `
    .outline-section {
        margin-bottom: 2rem;
        border-left: 4px solid #2563eb;
        padding-left: 1rem;
    }

    .outline-section.main {
        border-left-color: #2563eb;
        background-color: #eff6ff;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1.5rem;
    }

    .outline-section.sub {
        border-left-color: #3b82f6;
        margin-left: 1rem;
        margin-bottom: 1rem;
    }

    .outline-section.detail {
        border-left-color: #60a5fa;
        margin-left: 2rem;
        margin-bottom: 0.75rem;
    }

    .outline-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #1e40af;
        margin-bottom: 0.5rem;
    }

    .outline-subtitle {
        font-size: 1.125rem;
        font-weight: 600;
        color: #2563eb;
        margin-bottom: 0.5rem;
    }

    .outline-detail {
        font-size: 1rem;
        font-weight: 500;
        color: #1d4ed8;
        margin-bottom: 0.5rem;
    }

    .outline-content {
        color: #374151;
        line-height: 1.6;
    }

    .outline-bullets {
        margin-top: 0.5rem;
        padding-left: 1rem;
    }

    .outline-bullets li {
        margin-bottom: 0.25rem;
        color: #4b5563;
    }
    `
  }

  private static getFlashcardsCSS(): string {
    return `
    .flashcard {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 1.5rem;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        page-break-inside: avoid;
    }

    .flashcard-number {
        background: #2563eb;
        color: white;
        width: 2rem;
        height: 2rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.875rem;
        margin-bottom: 1rem;
    }

    .flashcard-question {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .flashcard-question-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }

    .flashcard-question-text {
        font-size: 1rem;
        font-weight: 600;
        color: #1e293b;
        line-height: 1.5;
    }

    .flashcard-answer {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 0.5rem;
        padding: 1rem;
    }

    .flashcard-answer-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #0369a1;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }

    .flashcard-answer-text {
        font-size: 1rem;
        color: #0c4a6e;
        line-height: 1.6;
    }
    `
  }

  private static getQuizCSS(): string {
    return `
    .quiz-question {
        background: white;
        border: 2px solid #e5e7eb;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        page-break-inside: avoid;
    }

    .quiz-question-number {
        background: #2563eb;
        color: white;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1rem;
        margin-bottom: 1rem;
    }

    .quiz-question-text {
        font-size: 1.125rem;
        font-weight: 600;
        color: #1e293b;
        margin-bottom: 1.5rem;
        line-height: 1.5;
    }

    .quiz-options {
        margin-bottom: 1rem;
    }

    .quiz-option {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem;
        margin-bottom: 0.75rem;
        border: 1px solid #e5e7eb;
        border-radius: 0.5rem;
        background: #f9fafb;
        transition: all 0.2s;
    }

    .quiz-option:hover {
        background: #f3f4f6;
        border-color: #d1d5db;
    }

    .quiz-option-letter {
        background: #6b7280;
        color: white;
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.75rem;
        flex-shrink: 0;
    }

    .quiz-option-letter.a { background: #dc2626; }
    .quiz-option-letter.b { background: #2563eb; }
    .quiz-option-letter.c { background: #16a34a; }
    .quiz-option-letter.d { background: #ca8a04; }

    .quiz-option-text {
        color: #374151;
        line-height: 1.5;
        flex: 1;
    }

    .quiz-explanation {
        background: #f0f9ff;
        border: 1px solid #bae6fd;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-top: 1rem;
    }

    .quiz-explanation-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #0369a1;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 0.5rem;
    }

    .quiz-explanation-text {
        color: #0c4a6e;
        line-height: 1.6;
    }
    `
  }

  private static getSummaryCSS(): string {
    return `
    .summary-section {
        margin-bottom: 2rem;
        padding: 1.5rem;
        background: #f8fafc;
        border-radius: 0.75rem;
        border-left: 4px solid #2563eb;
    }

    .summary-section h3 {
        color: #1e40af;
        font-size: 1.25rem;
        font-weight: 700;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 1px solid #dbeafe;
    }

    .summary-content {
        color: #374151;
        line-height: 1.7;
    }

    .summary-content p {
        margin-bottom: 1rem;
    }

    .summary-content ul, .summary-content ol {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
    }

    .summary-content li {
        margin-bottom: 0.5rem;
    }

    .key-points {
        background: #fef3c7;
        border: 1px solid #f59e0b;
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 1rem 0;
    }

    .key-points h4 {
        color: #92400e;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
    }

    .key-points ul {
        margin: 0;
        padding-left: 1.25rem;
    }

    .key-points li {
        color: #78350f;
        margin-bottom: 0.5rem;
    }

    .important-note {
        background: #fef2f2;
        border: 1px solid #fca5a5;
        border-radius: 0.5rem;
        padding: 1rem;
        margin: 1rem 0;
    }

    .important-note h4 {
        color: #dc2626;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.75rem;
    }

    .important-note p {
        color: #991b1b;
        margin: 0;
    }
    `
  }

  private static generateHeader(studyGuide: StudyGuideResponse, formatName: string, currentDate: string): string {
    return `
    <div class="header">
        <h1>${formatName}</h1>
        <div class="subtitle">${studyGuide.subject}</div>
        <div class="metadata">
            <div class="metadata-item">
                <strong>Grade Level:</strong> ${studyGuide.gradeLevel}
            </div>
            <div class="metadata-item">
                <strong>Generated:</strong> ${currentDate}
            </div>
        </div>
    </div>`
  }

  private static generateContent(studyGuide: StudyGuideResponse): string {
    switch (studyGuide.format) {
      case 'outline':
        return this.generateOutlineContent(studyGuide)
      case 'flashcards':
        return this.generateFlashcardsContent(studyGuide)
      case 'quiz':
        return this.generateQuizContent(studyGuide)
      case 'summary':
        return this.generateSummaryContent(studyGuide)
      default:
        return this.generateSummaryContent(studyGuide)
    }
  }

  private static generateOutlineContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    return `
    <div class="content">
        ${sections.map((section, index) => {
          const lines = section.split('\n').filter(line => line.trim())
          const title = lines[0]?.replace(/^#+\s*/, '') || `Section ${index + 1}`
          const content = lines.slice(1).join('\n')
          
          const isMainSection = lines[0]?.startsWith('# ')
          const isSubSection = lines[0]?.startsWith('## ')
          const isDetail = lines[0]?.startsWith('### ')
          
          let sectionClass = 'outline-section'
          if (isMainSection) sectionClass += ' main'
          else if (isSubSection) sectionClass += ' sub'
          else if (isDetail) sectionClass += ' detail'
          
          let titleClass = 'outline-title'
          if (isSubSection) titleClass = 'outline-subtitle'
          else if (isDetail) titleClass = 'outline-detail'
          
          return `
          <div class="${sectionClass}">
              <div class="${titleClass}">${title}</div>
              <div class="outline-content">${this.formatContent(content)}</div>
          </div>`
        }).join('')}
    </div>`
  }

  private static generateFlashcardsContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    return `
    <div class="content">
        ${sections.map((section, index) => {
          const lines = section.split('\n').filter(line => line.trim())
          const question = lines.find(line => line.toLowerCase().includes('question') || line.toLowerCase().includes('q:')) || lines[0]
          const answer = lines.find(line => line.toLowerCase().includes('answer') || line.toLowerCase().includes('a:')) || lines[1] || 'Answer not provided'
          
          return `
          <div class="flashcard">
              <div class="flashcard-number">${index + 1}</div>
              <div class="flashcard-question">
                  <div class="flashcard-question-label">Question</div>
                  <div class="flashcard-question-text">${question.replace(/^(Q:|Question:)\s*/i, '')}</div>
              </div>
              <div class="flashcard-answer">
                  <div class="flashcard-answer-label">Answer</div>
                  <div class="flashcard-answer-text">${answer.replace(/^(A:|Answer:)\s*/i, '')}</div>
              </div>
          </div>`
        }).join('')}
    </div>`
  }

  private static generateQuizContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    return `
    <div class="content">
        ${sections.map((section, index) => {
          const lines = section.split('\n').filter(line => line.trim())
          const question = lines[0] || `Question ${index + 1}`
          const options = lines.slice(1).filter(line => line.trim())
          
          return `
          <div class="quiz-question">
              <div class="quiz-question-number">${index + 1}</div>
              <div class="quiz-question-text">${question}</div>
              <div class="quiz-options">
                  ${options.map((option, optIndex) => {
                    const letter = String.fromCharCode(65 + optIndex) // A, B, C, D
                    return `
                    <div class="quiz-option">
                        <div class="quiz-option-letter ${letter.toLowerCase()}">${letter}</div>
                        <div class="quiz-option-text">${option}</div>
                    </div>`
                  }).join('')}
              </div>
          </div>`
        }).join('')}
    </div>`
  }

  private static generateSummaryContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    return `
    <div class="content">
        ${sections.map((section, index) => {
          const lines = section.split('\n').filter(line => line.trim())
          const title = lines[0]?.replace(/^#+\s*/, '') || `Section ${index + 1}`
          const content = lines.slice(1).join('\n')
          
          return `
          <div class="summary-section">
              <h3>${title}</h3>
              <div class="summary-content">${this.formatContent(content)}</div>
          </div>`
        }).join('')}
    </div>`
  }

  private static formatContent(content: string): string {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<span class="key-term">$1</span>')
      .replace(/\n/g, '<br>')
      .replace(/^•\s+/gm, '• ')
      .replace(/^\d+\.\s+/gm, (match) => match)
  }

  private static generateFooter(): string {
    return `
    <div class="footer">
        <p>Generated by Casanova Study Guide Generator</p>
        <div class="page-number"></div>
    </div>`
  }
}
