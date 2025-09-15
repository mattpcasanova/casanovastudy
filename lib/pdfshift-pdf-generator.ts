import { StudyGuideResponse } from '../types'

export class PDFShiftPDFGenerator {
  private static readonly API_KEY = process.env.PDFSHIFT_API_KEY
  private static readonly API_URL = 'https://api.pdfshift.io/v3/convert/pdf'

  static async generatePDF(studyGuide: StudyGuideResponse): Promise<Buffer> {
    try {
      console.log('Generating PDF with PDFShift for format:', studyGuide.format)
      
      if (!this.API_KEY) {
        throw new Error('PDFSHIFT_API_KEY environment variable is required. Please add your PDFShift API key to .env.local')
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
          margin: '0.5in'
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
        color: #0f172a;
        background: #ffffff;
        font-size: 14px;
    }

    .document {
        max-width: 8.5in;
        margin: 0 auto;
        padding: 0.5in;
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
        color: #64748b;
        font-size: 1.125rem;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }

    .header .metadata {
        display: flex;
        justify-content: space-between;
        align-items: center;
        color: #64748b;
        font-size: 0.875rem;
        margin-top: 1rem;
    }

    .metadata-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .metadata-item strong {
        color: #334155;
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
        color: #0f172a;
        font-size: 1.5rem;
        font-weight: 700;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #e2e8f0;
    }

    .section-content {
        line-height: 1.7;
    }

    .footer {
        margin-top: 3rem;
        padding-top: 1rem;
        border-top: 1px solid #e2e8f0;
        text-align: center;
        color: #64748b;
        font-size: 0.875rem;
    }

    .page-number {
        position: fixed;
        bottom: 0.5in;
        right: 0.5in;
        font-size: 0.75rem;
        color: #94a3b8;
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

    h2 { font-size: 1.5rem; color: #0f172a; }
    h3 { font-size: 1.25rem; color: #1e293b; }
    h4 { font-size: 1.125rem; color: #334155; }

    p {
        margin-bottom: 1rem;
        line-height: 1.7;
    }

    ul, ol {
        margin-bottom: 1rem;
        padding-left: 0;
        list-style: none;
    }

    li {
        margin-bottom: 0.5rem;
        line-height: 1.6;
        position: relative;
        padding-left: 1.5rem;
    }

    ul li::before {
        content: "•";
        color: #2563eb;
        font-weight: bold;
        position: absolute;
        left: 0;
    }

    ol {
        counter-reset: item;
    }

    ol li {
        counter-increment: item;
    }

    ol li::before {
        content: counter(item) ".";
        color: #2563eb;
        font-weight: bold;
        position: absolute;
        left: 0;
    }

    strong {
        font-weight: 600;
        color: #0f172a;
    }

    em {
        font-style: italic;
        color: #64748b;
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

    /* Table Styling */
    table {
        width: 100%;
        border-collapse: collapse;
        margin: 1rem 0;
        font-size: 0.875rem;
    }

    th, td {
        padding: 0.75rem;
        text-align: left;
        border: 1px solid #e2e8f0;
    }

    th {
        background-color: #f8fafc;
        font-weight: 600;
        color: #0f172a;
    }

    tr:nth-child(even) {
        background-color: #f8fafc;
    }

    tr:hover {
        background-color: #f1f5f9;
    }

    /* Code and inline formatting */
    code {
        background-color: #f1f5f9;
        padding: 0.125rem 0.25rem;
        border-radius: 0.25rem;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
        color: #e11d48;
    }

    pre {
        background-color: #f8fafc;
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid #e2e8f0;
        overflow-x: auto;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    /* Blockquotes */
    blockquote {
        border-left: 4px solid #2563eb;
        padding-left: 1rem;
        margin: 1rem 0;
        font-style: italic;
        color: #64748b;
    }

    /* Print utilities */
    .print-avoid-break {
        page-break-inside: avoid;
    }

    .print-break {
        page-break-before: always;
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
    .outline-sections {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .outline-section {
        page-break-inside: avoid;
    }

    .outline-section.main {
        background: #eff6ff;
        border-left: 4px solid #2563eb;
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }

    .outline-section.sub {
        border-left: 4px solid #3b82f6;
        margin-left: 1rem;
        margin-bottom: 1rem;
        padding-left: 1rem;
    }

    .outline-section.detail {
        border-left: 4px solid #60a5fa;
        margin-left: 2rem;
        margin-bottom: 0.75rem;
        padding-left: 1rem;
    }

    .outline-title {
        font-size: 1.25rem;
        font-weight: 700;
        color: #2563eb;
        margin-bottom: 0.5rem;
    }

    .outline-subtitle {
        font-size: 1.125rem;
        font-weight: 600;
        color: #3b82f6;
        margin-bottom: 0.5rem;
    }

    .outline-detail {
        font-size: 1rem;
        font-weight: 500;
        color: #60a5fa;
        margin-bottom: 0.5rem;
    }

    .outline-content {
        color: #0f172a;
        line-height: 1.6;
    }

    .outline-content h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #3b82f6;
        margin-bottom: 0.5rem;
    }

    .outline-content h4 {
        font-size: 0.875rem;
        font-weight: 500;
        color: #60a5fa;
        margin-bottom: 0.25rem;
    }

    .outline-content p {
        font-size: 0.875rem;
        color: #64748b;
        margin-left: 1rem;
        margin-bottom: 0.25rem;
    }

    .outline-content ul {
        margin-left: 1rem;
        padding-left: 1rem;
    }

    .outline-content li {
        font-size: 0.875rem;
        color: #64748b;
        margin-bottom: 0.25rem;
    }

    .outline-key-terms {
        background: #fef3c7;
        border: 1px solid #ea580c;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-top: 1rem;
    }

    .outline-key-terms h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #ea580c;
        margin-bottom: 0.75rem;
    }

    .outline-key-terms-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
    }

    .outline-key-term {
        background: #ffffff;
        padding: 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid #f59e0b;
        font-size: 0.875rem;
    }

    .outline-key-term .term {
        font-weight: 600;
        color: #ea580c;
    }
    `
  }

  private static getFlashcardsCSS(): string {
    return `
    .flashcards-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin-bottom: 2rem;
    }

    .flashcard {
        background: #ffffff;
        border: 2px solid #2563eb;
        border-radius: 0.75rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        overflow: hidden;
        page-break-inside: avoid;
    }

    .flashcard-header {
        background: #2563eb;
        color: #ffffff;
        padding: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .flashcard-number {
        width: 2rem;
        height: 2rem;
        background: #ffffff;
        color: #2563eb;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.875rem;
    }

    .flashcard-question {
        padding: 1rem;
        border-bottom: 1px solid #e2e8f0;
    }

    .flashcard-question-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .flashcard-question-icon {
        width: 1.5rem;
        height: 1.5rem;
        background: #3b82f6;
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .flashcard-question-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #3b82f6;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .flashcard-question-text {
        font-size: 0.875rem;
        color: #0f172a;
        line-height: 1.5;
    }

    .flashcard-answer {
        padding: 1rem;
        background: #f8fafc;
    }

    .flashcard-answer-header {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .flashcard-answer-icon {
        width: 1.5rem;
        height: 1.5rem;
        background: #ea580c;
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
    }

    .flashcard-answer-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #ea580c;
        text-transform: uppercase;
        letter-spacing: 0.05em;
    }

    .flashcard-answer-text {
        font-size: 0.875rem;
        color: #0f172a;
        line-height: 1.5;
        white-space: pre-line;
    }
    `
  }

  private static getQuizCSS(): string {
    return `
    .quiz-instructions {
        background: #eff6ff;
        border: 1px solid #2563eb;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1.5rem;
    }

    .quiz-instructions h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #2563eb;
        margin-bottom: 0.5rem;
    }

    .quiz-instructions p {
        font-size: 0.875rem;
        color: #0f172a;
    }

    .quiz-question {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        page-break-inside: avoid;
    }

    .quiz-question-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .quiz-question-number {
        width: 2rem;
        height: 2rem;
        background: #2563eb;
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.875rem;
        flex-shrink: 0;
    }

    .quiz-question-text {
        font-size: 1rem;
        font-weight: 500;
        color: #0f172a;
        line-height: 1.5;
        flex: 1;
    }

    .quiz-options {
        margin-left: 3rem;
    }

    .quiz-option {
        display: flex;
        align-items: flex-start;
        gap: 0.75rem;
        padding: 0.75rem;
        margin-bottom: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        background: #f8fafc;
        transition: all 0.2s;
    }

    .quiz-option:hover {
        background: #f1f5f9;
        border-color: #cbd5e1;
    }

    .quiz-option-letter {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 0.75rem;
        flex-shrink: 0;
        color: #ffffff;
    }

    .quiz-option-letter.a { background: #dc2626; }
    .quiz-option-letter.b { background: #2563eb; }
    .quiz-option-letter.c { background: #16a34a; }
    .quiz-option-letter.d { background: #ca8a04; }

    .quiz-option-circle {
        width: 1rem;
        height: 1rem;
        border: 2px solid #e2e8f0;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .quiz-option-text {
        color: #0f172a;
        line-height: 1.5;
        flex: 1;
        font-size: 0.875rem;
    }

    .quiz-answer-key {
        background: #fef3c7;
        border: 1px solid #ea580c;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-top: 2rem;
        page-break-before: always;
    }

    .quiz-answer-key h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #ea580c;
        margin-bottom: 0.75rem;
    }

    .quiz-answer-grid {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 0.75rem;
    }

    .quiz-answer-item {
        background: #ffffff;
        padding: 0.5rem;
        border-radius: 0.25rem;
        text-align: center;
        border: 1px solid #f59e0b;
    }

    .quiz-answer-item span {
        font-size: 0.875rem;
        font-weight: 500;
    }
    `
  }

  private static getSummaryCSS(): string {
    return `
    .summary-sections {
        display: flex;
        flex-direction: column;
        gap: 2rem;
        margin-bottom: 2rem;
    }

    .summary-section {
        page-break-inside: avoid;
    }

    .summary-section h2 {
        font-size: 1.5rem;
        font-weight: 700;
        color: #2563eb;
        margin-bottom: 1rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid #2563eb;
    }

    .summary-content {
        color: #0f172a;
        line-height: 1.7;
    }

    .summary-content p {
        margin-bottom: 1rem;
        font-size: 0.875rem;
    }

    .summary-content ul, .summary-content ol {
        margin-bottom: 1rem;
        padding-left: 1.5rem;
    }

    .summary-content li {
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
    }

    .summary-highlight {
        background: #eff6ff;
        border-left: 4px solid #2563eb;
        padding: 1rem;
        margin: 1rem 0;
        border-radius: 0.5rem;
    }

    .summary-highlight h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #2563eb;
        margin-bottom: 0.75rem;
    }

    .summary-highlight ol {
        margin: 0;
        padding-left: 1.25rem;
    }

    .summary-highlight li {
        color: #0f172a;
        margin-bottom: 0.5rem;
    }

    .summary-comparison {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1.5rem;
        margin: 1rem 0;
    }

    .summary-comparison-item {
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1rem;
    }

    .summary-comparison-item h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #3b82f6;
        margin-bottom: 0.75rem;
    }

    .summary-comparison-item ul {
        margin: 0;
        padding-left: 1rem;
    }

    .summary-comparison-item li {
        font-size: 0.875rem;
        color: #0f172a;
        margin-bottom: 0.5rem;
    }

    .summary-organelles {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        margin: 1rem 0;
    }

    .summary-organelle {
        background: #fef3c7;
        border: 1px solid #ea580c;
        border-radius: 0.5rem;
        padding: 1rem;
    }

    .summary-organelle h3 {
        font-size: 1rem;
        font-weight: 600;
        color: #ea580c;
        margin-bottom: 0.5rem;
    }

    .summary-organelle p {
        font-size: 0.875rem;
        color: #0f172a;
        margin: 0;
    }

    .summary-key-terms {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-top: 1rem;
    }

    .summary-key-terms h2 {
        font-size: 1.125rem;
        font-weight: 600;
        color: #0f172a;
        margin-bottom: 1rem;
    }

    .summary-key-terms-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.75rem;
        font-size: 0.875rem;
    }

    .summary-key-term {
        background: #ffffff;
        padding: 0.5rem;
        border-radius: 0.25rem;
        border: 1px solid #e2e8f0;
    }

    .summary-key-term .term {
        font-weight: 600;
        color: #2563eb;
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
    
    // Filter out empty sections and improve content parsing
    const validSections = sections.filter(section => {
      const lines = section.split('\n').filter(line => line.trim())
      return lines.length > 0 && lines[0] !== '---'
    })
    
    return `
    <div class="content">
        <div class="outline-sections">
            ${validSections.map((section, index) => {
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
              <div class="${sectionClass} print-avoid-break">
                  <div class="${titleClass}">${title}</div>
                  <div class="outline-content">${this.formatContent(content)}</div>
              </div>`
            }).join('')}
        </div>
        
        <div class="outline-key-terms">
            <h2>Key Terms</h2>
            <div class="outline-key-terms-grid">
                <div class="outline-key-term">
                    <span class="term">Prokaryote:</span> Cell without nucleus
                </div>
                <div class="outline-key-term">
                    <span class="term">Eukaryote:</span> Cell with nucleus
                </div>
                <div class="outline-key-term">
                    <span class="term">Organelle:</span> Specialized cell structure
                </div>
                <div class="outline-key-term">
                    <span class="term">Cytoplasm:</span> Gel-like cell interior
                </div>
            </div>
        </div>
    </div>`
  }

  private static generateFlashcardsContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    // Filter out sections that are not proper Q&A pairs
    const validSections = sections.filter(section => {
      const lines = section.split('\n').filter(line => line.trim())
      const firstLine = lines[0]?.trim() || ''
      
      // Skip headings, empty sections, or sections with just "---"
      if (!firstLine || firstLine === '---' || firstLine.startsWith('#')) {
        return false
      }
      
      // Look for content that could be a question or has Q&A structure
      return lines.length >= 2 || firstLine.includes('?') || 
             firstLine.toLowerCase().includes('what') ||
             firstLine.toLowerCase().includes('which') ||
             firstLine.toLowerCase().includes('how') ||
             firstLine.toLowerCase().includes('why')
    })
    
    if (validSections.length === 0) {
      return `
      <div class="content">
          <div class="study-content">
              <h2>Study Content</h2>
              <div class="content-sections">
                  ${sections.map(section => `<p>${section}</p>`).join('')}
              </div>
          </div>
      </div>`
    }
    
    return `
    <div class="content">
        <div class="flashcards-grid">
            ${validSections.map((section, index) => {
              const lines = section.split('\n').filter(line => line.trim())
              
              // Try to find question and answer
              let question = lines[0] || 'Question not provided'
              let answer = 'Answer not provided'
              
              // Look for explicit Q: and A: markers
              const qIndex = lines.findIndex(line => line.toLowerCase().includes('q:') || line.toLowerCase().includes('question:'))
              const aIndex = lines.findIndex(line => line.toLowerCase().includes('a:') || line.toLowerCase().includes('answer:'))
              
              if (qIndex !== -1 && aIndex !== -1) {
                question = lines[qIndex].replace(/^(Q:|Question:)\s*/i, '')
                answer = lines[aIndex].replace(/^(A:|Answer:)\s*/i, '')
              } else if (qIndex !== -1) {
                question = lines[qIndex].replace(/^(Q:|Question:)\s*/i, '')
                answer = lines.slice(qIndex + 1).join(' ').trim() || 'Answer not provided'
              } else if (aIndex !== -1) {
                answer = lines[aIndex].replace(/^(A:|Answer:)\s*/i, '')
                question = lines.slice(0, aIndex).join(' ').trim() || 'Question not provided'
              } else if (lines.length >= 2) {
                // Assume first line is question, rest is answer
                question = lines[0]
                answer = lines.slice(1).join(' ').trim()
              }
              
              return `
              <div class="flashcard print-avoid-break">
                  <div class="flashcard-header">
                      <div class="flashcard-number">${index + 1}</div>
                  </div>
                  <div class="flashcard-question">
                      <div class="flashcard-question-header">
                          <div class="flashcard-question-icon">Q</div>
                          <span class="flashcard-question-label">Question</span>
                      </div>
                      <div class="flashcard-question-text">${question}</div>
                  </div>
                  <div class="flashcard-answer">
                      <div class="flashcard-answer-header">
                          <div class="flashcard-answer-icon">A</div>
                          <span class="flashcard-answer-label">Answer</span>
                      </div>
                      <div class="flashcard-answer-text">${answer}</div>
                  </div>
              </div>`
            }).join('')}
        </div>
    </div>`
  }

  private static generateQuizContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    // Parse content to separate actual questions from headings and other content
    const questions: Array<{
      question: string
      options: string[]
      correctAnswer?: string
    }> = []
    
    let currentQuestion: { question: string; options: string[]; correctAnswer?: string } | null = null
    
    for (const section of sections) {
      const lines = section.split('\n').filter(line => line.trim())
      const firstLine = lines[0]?.trim() || ''
      
      // Skip empty sections or sections with just "---"
      if (!firstLine || firstLine === '---' || firstLine.startsWith('#')) {
        continue
      }
      
      // Check if this looks like a question (contains question mark or starts with number)
      const isQuestion = firstLine.includes('?') || /^\d+\./.test(firstLine) || 
                        firstLine.toLowerCase().includes('what') ||
                        firstLine.toLowerCase().includes('which') ||
                        firstLine.toLowerCase().includes('how') ||
                        firstLine.toLowerCase().includes('why')
      
      if (isQuestion) {
        // Save previous question if exists
        if (currentQuestion) {
          questions.push(currentQuestion)
        }
        
        // Start new question
        currentQuestion = {
          question: firstLine,
          options: lines.slice(1).filter(line => line.trim() && !line.startsWith('---'))
        }
      } else if (currentQuestion && lines.length > 0) {
        // Add options to current question
        currentQuestion.options.push(...lines.filter(line => line.trim() && !line.startsWith('---')))
      }
    }
    
    // Add the last question
    if (currentQuestion) {
      questions.push(currentQuestion)
    }
    
    // If no proper questions found, create a simple structure
    if (questions.length === 0) {
      return `
      <div class="content">
          <div class="quiz-instructions">
              <h2>Instructions</h2>
              <p>This study guide contains important information for your exam. Review the content carefully.</p>
          </div>
          
          <div class="quiz-content">
              <h2>Study Content</h2>
              <div class="study-content">
                  ${sections.map(section => `<p>${section}</p>`).join('')}
              </div>
          </div>
      </div>`
    }
    
    return `
    <div class="content">
        <div class="quiz-instructions">
            <h2>Instructions</h2>
            <p>Choose the best answer for each question. Mark your answer clearly by filling in the corresponding circle.</p>
        </div>
        
        ${questions.map((q, index) => `
        <div class="quiz-question print-avoid-break">
            <div class="quiz-question-header">
                <div class="quiz-question-number">${index + 1}</div>
                <div class="quiz-question-text">${q.question}</div>
            </div>
            <div class="quiz-options">
                ${q.options.slice(0, 4).map((option, optIndex) => {
                  const letter = String.fromCharCode(65 + optIndex) // A, B, C, D
                  return `
                  <div class="quiz-option">
                      <div class="quiz-option-letter ${letter.toLowerCase()}">${letter}</div>
                      <div class="quiz-option-circle"></div>
                      <div class="quiz-option-text">${option}</div>
                  </div>`
                }).join('')}
            </div>
        </div>`).join('')}
        
        ${questions.length > 0 ? `
        <div class="quiz-answer-key">
            <h2>Answer Key</h2>
            <div class="quiz-answer-grid">
                ${questions.map((q, index) => {
                  // Try to determine correct answer from content
                  const correctAnswer = this.determineCorrectAnswer(q.options) || 'A'
                  return `
                  <div class="quiz-answer-item">
                      <span>${index + 1}. ${correctAnswer}</span>
                  </div>`
                }).join('')}
            </div>
        </div>` : ''}
    </div>`
  }

  private static determineCorrectAnswer(options: string[]): string | null {
    // Simple heuristic to determine correct answer
    // Look for options that seem more complete or have specific indicators
    
    if (options.length === 0) return 'A'
    
    // Look for options with bold text (likely correct answers)
    const boldOption = options.find(opt => opt.includes('**'))
    if (boldOption) {
      const index = options.indexOf(boldOption)
      return String.fromCharCode(65 + index) // A, B, C, D
    }
    
    // Look for options that are longer (often more complete)
    const longestOption = options.reduce((a, b) => a.length > b.length ? a : b)
    const index = options.indexOf(longestOption)
    return String.fromCharCode(65 + index) // A, B, C, D
  }

  private static generateSummaryContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    // Filter out empty sections and improve content parsing
    const validSections = sections.filter(section => {
      const lines = section.split('\n').filter(line => line.trim())
      return lines.length > 0 && lines[0] !== '---'
    })
    
    return `
    <div class="content">
        <div class="summary-sections">
            ${validSections.map((section, index) => {
              const lines = section.split('\n').filter(line => line.trim())
              const title = lines[0]?.replace(/^#+\s*/, '') || `Section ${index + 1}`
              const content = lines.slice(1).join('\n')
              
              return `
              <div class="summary-section print-avoid-break">
                  <h2>${title}</h2>
                  <div class="summary-content">${this.formatContent(content)}</div>
              </div>`
            }).join('')}
        </div>
        
        <div class="summary-key-terms">
            <h2>Key Terms to Remember</h2>
            <div class="summary-key-terms-grid">
                <div class="summary-key-term">
                    <span class="term">Cell Theory:</span> Fundamental principles about cells
                </div>
                <div class="summary-key-term">
                    <span class="term">Prokaryote:</span> Cell without a nucleus
                </div>
                <div class="summary-key-term">
                    <span class="term">Eukaryote:</span> Cell with a nucleus
                </div>
                <div class="summary-key-term">
                    <span class="term">Organelle:</span> Specialized cell structure
                </div>
                <div class="summary-key-term">
                    <span class="term">Nucleus:</span> Cell's control center
                </div>
                <div class="summary-key-term">
                    <span class="term">Mitochondria:</span> Cell's powerhouse
                </div>
            </div>
        </div>
    </div>`
  }

  private static formatContent(content: string): string {
    // First, handle tables
    let formatted = content.replace(/\|(.+)\|/g, (match, row) => {
      const cells = row.split('|').map((cell: string) => cell.trim()).filter((cell: string) => cell)
      if (cells.length > 1) {
        return `<tr>${cells.map((cell: string) => `<td>${cell}</td>`).join('')}</tr>`
      }
      return match
    })
    
    // Wrap consecutive table rows in table tags
    formatted = formatted.replace(/(<tr>.*<\/tr>(\s*<tr>.*<\/tr>)*)/g, (match) => {
      const rows = match.match(/<tr>.*?<\/tr>/g) || []
      if (rows.length > 1) {
        return `<table>${rows.join('')}</table>`
      }
      return match
    })
    
    // Handle markdown headers
    formatted = formatted.replace(/^### (.*$)/gm, '<h3>$1</h3>')
    formatted = formatted.replace(/^## (.*$)/gm, '<h2>$1</h2>')
    formatted = formatted.replace(/^# (.*$)/gm, '<h1>$1</h1>')
    
    // Handle bold and italic text
    formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    formatted = formatted.replace(/\*(.*?)\*/g, '<em>$1</em>')
    
    // Handle code blocks
    formatted = formatted.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    formatted = formatted.replace(/`(.*?)`/g, '<code>$1</code>')
    
    // Handle lists - convert to proper HTML
    formatted = formatted.replace(/^[\s]*[-*+]\s+(.+)$/gm, '<li>$1</li>')
    formatted = formatted.replace(/^[\s]*\d+\.\s+(.+)$/gm, '<li>$1</li>')
    
    // Wrap consecutive list items in ul/ol tags
    formatted = formatted.replace(/(<li>.*<\/li>(\s*<li>.*<\/li>)*)/g, (match) => {
      const items = match.match(/<li>.*?<\/li>/g) || []
      if (items.length > 1) {
        return `<ul>${items.join('')}</ul>`
      }
      return match
    })
    
    // Handle blockquotes
    formatted = formatted.replace(/^>\s*(.+)$/gm, '<blockquote>$1</blockquote>')
    
    // Handle horizontal rules
    formatted = formatted.replace(/^---$/gm, '<hr>')
    formatted = formatted.replace(/^\*\*\*$/gm, '<hr>')
    
    // Convert line breaks to <br> but preserve existing HTML structure
    formatted = formatted.replace(/\n(?![<\s])/g, '<br>')
    
    // Clean up multiple consecutive <br> tags
    formatted = formatted.replace(/(<br>\s*){3,}/g, '<br><br>')
    
    return formatted
  }

  private static generateFooter(): string {
    return `
    <div class="footer">
        <p>Generated by Casanova Study Guide Generator</p>
        <div class="page-number"></div>
    </div>`
  }
}
