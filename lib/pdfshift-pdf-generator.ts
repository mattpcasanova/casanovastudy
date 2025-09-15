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
      console.log('HTML generated, length:', html.length)
      
      // Add timeout to prevent hanging
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000) // 30 second timeout
      
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
        }),
        signal: controller.signal
      })

      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text()
        console.error('PDFShift API error response:', errorText)
        throw new Error(`PDFShift API error: ${response.status} - ${errorText}`)
      }

      const pdfBuffer = await response.arrayBuffer()
      console.log('PDF generated successfully, size:', pdfBuffer.byteLength)
      return Buffer.from(pdfBuffer)
    } catch (error) {
      console.error('PDFShift PDF generation error:', error)
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('PDF generation timed out after 30 seconds')
      }
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private static generateHTML(studyGuide: StudyGuideResponse): string {
    const formatNames: Record<string, string> = {
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

    /* Learning Outcomes */
    .learning-outcomes {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        page-break-inside: avoid;
    }

    .learning-outcomes h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 0.5rem;
    }

    .learning-outcomes-list {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .learning-outcome-item {
        color: #0f172a;
        font-size: 0.875rem;
        line-height: 1.5;
        padding-left: 0.5rem;
    }

    /* Priority Sections */
    .priority-section {
        font-size: 1.25rem;
        font-weight: 700;
        margin: 2rem 0 1rem 0;
        padding: 1rem;
        border-radius: 0.5rem;
        border-left: 4px solid;
    }

    .priority-section.essential {
        background-color: #fef2f2;
        border-left-color: #dc2626;
        color: #dc2626;
    }

    .priority-section.important {
        background-color: #fef3c7;
        border-left-color: #ea580c;
        color: #ea580c;
    }

    .priority-section.supporting {
        background-color: #f0fdf4;
        border-left-color: #16a34a;
        color: #16a34a;
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
        border: 2px solid #e2e8f0;
        border-radius: 0.75rem;
        padding: 1.5rem;
        margin-bottom: 2rem;
        box-shadow: 0 2px 4px 0 rgba(0, 0, 0, 0.1);
        page-break-inside: avoid;
    }

    .quiz-question-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1rem;
    }

    .quiz-question-number {
        width: 2.5rem;
        height: 2.5rem;
        background: #2563eb;
        color: #ffffff;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 1rem;
        flex-shrink: 0;
        box-shadow: 0 2px 4px 0 rgba(37, 99, 235, 0.3);
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
        background: #ffffff;
        transition: all 0.2s;
    }

    .quiz-option:hover {
        background: #f8fafc;
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
        background: #6b7280;
    }

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

    /* Quiz Sections */
    .quiz-section {
        margin-bottom: 2rem;
    }

    .quiz-section h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 0.5rem;
    }

    /* True/False Questions */
    .quiz-tf-options {
        display: flex;
        gap: 2rem;
        margin-left: 3rem;
    }

    .quiz-tf-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        background: #f8fafc;
    }

    .quiz-tf-option span {
        font-weight: 500;
        color: #0f172a;
    }

    /* Short Answer Questions */
    .quiz-short-answer {
        margin-left: 3rem;
    }

    .answer-lines {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
    }

    .answer-line {
        height: 1px;
        background: #e2e8f0;
        margin-bottom: 1rem;
    }

    /* Sample Answers */
    .quiz-sample-answers {
        margin-top: 2rem;
        page-break-inside: avoid;
    }

    .quiz-sample-answers h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 0.5rem;
    }

    .sample-answer {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 0.5rem;
        padding: 1rem;
        margin-bottom: 1rem;
    }

    .sample-answer h3 {
        color: #2563eb;
        font-size: 1rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
    }

    .sample-answer-content {
        margin-top: 0.5rem;
    }

    .sample-answer-content p {
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    /* Study Tips */
    .quiz-study-tips {
        margin-top: 2rem;
        background: #eff6ff;
        border: 1px solid #2563eb;
        border-radius: 0.5rem;
        padding: 1.5rem;
        page-break-inside: avoid;
    }

    .quiz-study-tips h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .quiz-study-tips ul {
        margin: 0;
        padding-left: 1.5rem;
    }

    .quiz-study-tips li {
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    /* Scoring */
    .quiz-scoring {
        margin-top: 2rem;
        page-break-inside: avoid;
    }

    .quiz-scoring h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 0.5rem;
    }

    .scoring-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .scoring-item {
        padding: 1rem;
        border-radius: 0.5rem;
        border: 1px solid;
        font-size: 0.875rem;
        line-height: 1.5;
    }

    .scoring-item.excellent {
        background: #f0fdf4;
        border-color: #16a34a;
        color: #16a34a;
    }

    .scoring-item.good {
        background: #fef3c7;
        border-color: #ea580c;
        color: #ea580c;
    }

    .scoring-item.fair {
        background: #fef2f2;
        border-color: #dc2626;
        color: #dc2626;
    }

    .scoring-item.needs-work {
        background: #f1f5f9;
        border-color: #64748b;
        color: #64748b;
    }

    /* Study Tips */
    .study-tips {
        margin-top: 2rem;
        background: #eff6ff;
        border: 1px solid #2563eb;
        border-radius: 0.5rem;
        padding: 1.5rem;
        page-break-inside: avoid;
    }

    .study-tips h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
    }

    .study-tips ul {
        margin: 0;
        padding-left: 1.5rem;
    }

    .study-tips li {
        margin-bottom: 0.5rem;
        font-size: 0.875rem;
        line-height: 1.5;
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
        <h1>${studyGuide.title || formatName}</h1>
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
    
    // Extract learning outcomes from the content
    const learningOutcomes = this.extractLearningOutcomes(studyGuide.content)
    
    return `
    <div class="content">
        ${learningOutcomes ? `
        <div class="learning-outcomes">
            <h2>Learning Outcomes</h2>
            <div class="learning-outcomes-list">
                ${learningOutcomes.map(outcome => `<div class="learning-outcome-item">• ${outcome}</div>`).join('')}
            </div>
        </div>` : ''}
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
        
        ${this.generateKeyTerms(studyGuide.content, studyGuide.subject).length > 0 ? `
        <div class="outline-key-terms">
            <h2>Key Terms</h2>
            <div class="outline-key-terms-grid">
                ${this.generateKeyTerms(studyGuide.content, studyGuide.subject).map(term => `
                <div class="outline-key-term">
                    <span class="term">${term.term}:</span> ${term.definition}
                </div>`).join('')}
            </div>
        </div>` : ''}
        
        <div class="study-tips">
            <h2>📚 Study Tips for Success</h2>
            <ul>
                <li>Use the priority system to focus your study time effectively</li>
                <li>Start with essential concepts before moving to important details</li>
                <li>Create your own examples and connections to reinforce learning</li>
                <li>Review supporting concepts to deepen your understanding</li>
            </ul>
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
    
    // Extract learning outcomes from the content
    const learningOutcomes = this.extractLearningOutcomes(studyGuide.content)
    
    if (validSections.length === 0) {
      return `
      <div class="content">
          ${learningOutcomes ? `
          <div class="learning-outcomes">
              <h2>Learning Outcomes</h2>
              <div class="learning-outcomes-list">
                  ${learningOutcomes.map(outcome => `<div class="learning-outcome-item">• ${outcome}</div>`).join('')}
              </div>
          </div>` : ''}
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
        ${learningOutcomes ? `
        <div class="learning-outcomes">
            <h2>Learning Outcomes</h2>
            <div class="learning-outcomes-list">
                ${learningOutcomes.map(outcome => `<div class="learning-outcome-item">• ${outcome}</div>`).join('')}
            </div>
        </div>` : ''}
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
        
        <div class="study-tips">
            <h2>📚 Study Tips for Success</h2>
            <ul>
                <li>Focus on understanding the core concepts rather than memorizing facts</li>
                <li>Practice active recall by covering answers and testing yourself</li>
                <li>Connect concepts to real-world examples and applications</li>
                <li>Review regularly to reinforce learning and identify knowledge gaps</li>
            </ul>
        </div>
    </div>`
  }

  private static generateQuizContent(studyGuide: StudyGuideResponse): string {
    const content = studyGuide.content
    
    // Parse different question types based on the actual content structure
    const multipleChoiceQuestions: Array<{
      question: string
      options: string[]
      correctAnswer: string
    }> = []
    
    const trueFalseQuestions: Array<{
      question: string
      correctAnswer: boolean
    }> = []
    
    const shortAnswerQuestions: Array<{
      question: string
      sampleAnswer: string
    }> = []
    
    // Split content into sections by main headers (## not ###)
    const sections = content.split(/(?=^## )/m)
    
    // If that didn't work, try splitting by ## with any characters after
    if (sections.length <= 1) {
      const sections2 = content.split(/(?=^## )/m)
      console.log('Trying alternative split, found:', sections2.length)
      if (sections2.length > 1) {
        sections.splice(0, sections.length, ...sections2)
      }
    }
    console.log('=== QUIZ DEBUG ===')
    console.log('Content length:', content.length)
    console.log('Sections found:', sections.length)
    console.log('Section previews:', sections.map(s => s.split('\n')[0].trim()).slice(0, 3))
    
    // Find the answer key section
    let answerKeySection = ''
    const answerKeyIndex = sections.findIndex(section => 
      section.toLowerCase().includes('answer key') || 
      section.toLowerCase().includes('answers:')
    )
    
    if (answerKeyIndex !== -1) {
      answerKeySection = sections[answerKeyIndex]
    }
    
    // Parse Multiple Choice Questions
    const mcSection = sections.find(section => 
      section.toLowerCase().includes('multiple choice') || 
      section.toLowerCase().includes('essential concepts') ||
      section.toLowerCase().includes('🔴 essential concepts')
    )
    
    if (mcSection) {
      const mcLines = mcSection.split('\n').filter(line => line.trim())
      let currentQuestion: { question: string; options: string[] } | null = null
      
      for (const line of mcLines) {
        const trimmedLine = line.trim()
        
        // Check if this is a question (starts with "### Question" or "Question")
        if (trimmedLine.match(/^(### Question \d+|Question \d+)/)) {
          console.log('Found question line:', trimmedLine)
          if (currentQuestion) {
            multipleChoiceQuestions.push({
              question: currentQuestion.question,
              options: currentQuestion.options,
              correctAnswer: this.determineCorrectAnswer(currentQuestion.options) || 'A'
            })
          }
          // Start new question - the actual question text will be on the next line
          currentQuestion = { question: '', options: [] }
        } else if (currentQuestion && trimmedLine.match(/^[A-D]\)/)) {
          // This is an option
          currentQuestion.options.push(trimmedLine)
          console.log('Added option:', trimmedLine)
        } else if (currentQuestion && trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.match(/^[A-D]\)/)) {
          // This is question text (comes after ### Question X)
          if (!currentQuestion.question) {
            // First line after question header is the question text
            currentQuestion.question = trimmedLine
            console.log('Set question text:', trimmedLine)
          } else {
            // Additional question text
            currentQuestion.question += ' ' + trimmedLine
            console.log('Extended question text:', currentQuestion.question)
          }
        }
      }
      
      // Add the last question
      if (currentQuestion) {
        multipleChoiceQuestions.push({
          question: currentQuestion.question,
          options: currentQuestion.options,
          correctAnswer: this.determineCorrectAnswer(currentQuestion.options) || 'A'
        })
      }
      
    console.log('MC Questions parsed:', multipleChoiceQuestions.length)
    multipleChoiceQuestions.forEach((q, i) => {
      console.log(`MC Q${i+1}:`, q.question.substring(0, 50) + '...', 'Options:', q.options.length)
      console.log('Options:', q.options)
    })
    }
    
    // Parse True/False Questions
    const tfSection = sections.find(section => 
      section.toLowerCase().includes('true/false') || 
      section.toLowerCase().includes('important concepts') ||
      section.toLowerCase().includes('🟡 important concepts')
    )
    
    if (tfSection) {
      const tfLines = tfSection.split('\n').filter(line => line.trim())
      let currentQuestion: { question: string; correctAnswer: boolean } | null = null
      
      for (let i = 0; i < tfLines.length; i++) {
        const trimmedLine = tfLines[i].trim()
        
        // Check if this is a T/F question (starts with "### Question" or "Question")
        if (trimmedLine.match(/^(### Question \d+|Question \d+)/)) {
          if (currentQuestion) {
            trueFalseQuestions.push(currentQuestion)
            console.log('Added T/F question:', currentQuestion.question.substring(0, 50) + '...')
          }
          // Extract question text from the line or next line
          let questionText = trimmedLine.replace(/^(### Question \d+|Question \d+)\s*/, '').trim()
          if (!questionText && i + 1 < tfLines.length) {
            // Question text is on the next line
            questionText = tfLines[i + 1].trim()
          }
          if (questionText) {
            // Determine correct answer from answer key
            const correctAnswer = this.findTrueFalseAnswer(answerKeySection, questionText)
            currentQuestion = { question: questionText, correctAnswer }
            console.log('Set T/F question text:', questionText.substring(0, 50) + '...')
          }
        } else if (currentQuestion && trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.match(/^(### Question \d+|Question \d+)/)) {
          // Additional question text for T/F
          currentQuestion.question += ' ' + trimmedLine
          console.log('Extended T/F question text:', currentQuestion.question.substring(0, 50) + '...')
        }
      }
      
      // Add the last question
      if (currentQuestion) {
        trueFalseQuestions.push(currentQuestion)
      }
    }
    
    // Parse Short Answer Questions
    const saSection = sections.find(section => 
      section.toLowerCase().includes('short answer') || 
      section.toLowerCase().includes('supporting concepts') ||
      section.toLowerCase().includes('🟢 supporting concepts')
    )
    
    if (saSection) {
      const saLines = saSection.split('\n').filter(line => line.trim())
      let currentQuestion: { question: string; sampleAnswer: string } | null = null
      
      for (let i = 0; i < saLines.length; i++) {
        const trimmedLine = saLines[i].trim()
        
        // Check if this is a short answer question
        if (trimmedLine.match(/^(### Question \d+|Question \d+)/)) {
          if (currentQuestion) {
            shortAnswerQuestions.push(currentQuestion)
            console.log('Added SA question:', currentQuestion.question.substring(0, 50) + '...')
          }
          // Extract question text from the line or next line
          let questionText = trimmedLine.replace(/^(### Question \d+|Question \d+)\s*/, '').trim()
          if (!questionText && i + 1 < saLines.length) {
            // Question text is on the next line
            questionText = saLines[i + 1].trim()
          }
          currentQuestion = { question: questionText, sampleAnswer: '' }
          console.log('Set SA question text:', questionText.substring(0, 50) + '...')
        } else if (currentQuestion && trimmedLine && !trimmedLine.startsWith('#') && !trimmedLine.match(/^(### Question \d+|Question \d+)/)) {
          // This is additional question text
          if (currentQuestion.question) {
            currentQuestion.question += ' ' + trimmedLine
            console.log('Extended SA question text:', currentQuestion.question.substring(0, 50) + '...')
          }
        }
      }
      
      // Add the last question
      if (currentQuestion) {
        shortAnswerQuestions.push(currentQuestion)
      }
      
      // Find sample answers from answer key
      shortAnswerQuestions.forEach((q, index) => {
        const sampleAnswer = this.findShortAnswerSample(answerKeySection, q.question, index + 1)
        if (sampleAnswer) {
          q.sampleAnswer = sampleAnswer
        }
      })
    }
    
    // Extract learning outcomes from the content
    const learningOutcomes = this.extractLearningOutcomes(studyGuide.content)
    
    // If no proper questions found, create a simple structure with styled content
    if (multipleChoiceQuestions.length === 0 && trueFalseQuestions.length === 0 && shortAnswerQuestions.length === 0) {
      console.log('No questions parsed, using fallback with styled content')
      return `
      <div class="content">
          ${learningOutcomes ? `
          <div class="learning-outcomes">
              <h2>Learning Outcomes</h2>
              <div class="learning-outcomes-list">
                  ${learningOutcomes.map(outcome => `<div class="learning-outcome-item">• ${outcome}</div>`).join('')}
              </div>
          </div>` : ''}
          <div class="quiz-instructions">
              <h2>Instructions</h2>
              <p>This study guide contains important information for your exam. Review the content carefully.</p>
          </div>

          <div class="quiz-content">
              <h2>Study Content</h2>
              <div class="study-content">
                  ${this.formatContent(content)}
              </div>
          </div>
      </div>`
    }
    
    console.log('=== GENERATING QUIZ HTML ===')
    console.log('MC Questions:', multipleChoiceQuestions.length)
    console.log('T/F Questions:', trueFalseQuestions.length)
    console.log('SA Questions:', shortAnswerQuestions.length)
    
    const html = `
    <div class="content">
        ${learningOutcomes ? `
        <div class="learning-outcomes">
            <h2>Learning Outcomes</h2>
            <div class="learning-outcomes-list">
                ${learningOutcomes.map(outcome => `<div class="learning-outcome-item">• ${outcome}</div>`).join('')}
            </div>
        </div>` : ''}
        <div class="quiz-instructions">
            <h2>Instructions</h2>
            <p>Answer all questions. For multiple choice, choose the best answer. For true/false, mark T or F. For short answer, provide a complete response.</p>
        </div>
        
        ${multipleChoiceQuestions.length > 0 ? `
        <div class="quiz-section">
            <h2>Multiple Choice Questions</h2>
            ${multipleChoiceQuestions.map((q, index) => `
            <div class="quiz-question print-avoid-break">
                <div class="quiz-question-header">
                    <div class="quiz-question-number">${index + 1}</div>
                    <div class="quiz-question-text">${q.question || 'Question text not found'}</div>
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
        </div>` : ''}
        
        ${trueFalseQuestions.length > 0 ? `
        <div class="quiz-section">
            <h2>True/False Questions</h2>
            ${trueFalseQuestions.map((q, index) => `
            <div class="quiz-question print-avoid-break">
                <div class="quiz-question-header">
                    <div class="quiz-question-number">${index + 1 + multipleChoiceQuestions.length}</div>
                    <div class="quiz-question-text">${q.question}</div>
                </div>
                <div class="quiz-tf-options">
                    <div class="quiz-tf-option">
                        <div class="quiz-option-circle"></div>
                        <span>True</span>
                    </div>
                    <div class="quiz-tf-option">
                        <div class="quiz-option-circle"></div>
                        <span>False</span>
                    </div>
                </div>
            </div>`).join('')}
        </div>` : ''}
        
        ${shortAnswerQuestions.length > 0 ? `
        <div class="quiz-section">
            <h2>Short Answer Questions</h2>
            ${shortAnswerQuestions.map((q, index) => `
            <div class="quiz-question print-avoid-break">
                <div class="quiz-question-header">
                    <div class="quiz-question-number">${index + 1 + multipleChoiceQuestions.length + trueFalseQuestions.length}</div>
                    <div class="quiz-question-text">${q.question}</div>
                </div>
                <div class="quiz-short-answer">
                    <div class="answer-lines">
                        <div class="answer-line"></div>
                        <div class="answer-line"></div>
                        <div class="answer-line"></div>
                    </div>
                </div>
            </div>`).join('')}
        </div>` : ''}
        
        <div class="quiz-answer-key">
            <h2>Answer Key</h2>
            <div class="quiz-answer-grid">
                ${multipleChoiceQuestions.map((q, index) => `
                <div class="quiz-answer-item">
                    <span>${index + 1}. ${q.correctAnswer}</span>
                </div>`).join('')}
                ${trueFalseQuestions.map((q, index) => `
                <div class="quiz-answer-item">
                    <span>${index + 1 + multipleChoiceQuestions.length}. ${q.correctAnswer ? 'T' : 'F'}</span>
                </div>`).join('')}
                ${shortAnswerQuestions.map((q, index) => `
                <div class="quiz-answer-item">
                    <span>${index + 1 + multipleChoiceQuestions.length + trueFalseQuestions.length}. See sample answer</span>
                </div>`).join('')}
            </div>
        </div>
        
        ${shortAnswerQuestions.length > 0 ? `
        <div class="quiz-sample-answers">
            <h2>Sample Answers for Short Answer Questions</h2>
            ${shortAnswerQuestions.map((q, index) => `
            <div class="sample-answer">
                <h3>Question ${index + 1 + multipleChoiceQuestions.length + trueFalseQuestions.length}:</h3>
                <p><strong>${q.question}</strong></p>
                <div class="sample-answer-content">
                    <p><strong>Sample Answer:</strong></p>
                    <p>${q.sampleAnswer}</p>
                </div>
            </div>`).join('')}
        </div>` : ''}
        
        <div class="quiz-study-tips">
            <h2>📚 Study Tips for Success</h2>
            <ul>
                <li>Focus on understanding the core concepts rather than memorizing facts</li>
                <li>Practice active recall by covering answers and testing yourself</li>
                <li>Connect concepts to real-world examples and applications</li>
                <li>Review regularly to reinforce learning and identify knowledge gaps</li>
            </ul>
        </div>
        
        <div class="quiz-scoring">
            <h2>Score Interpretation</h2>
            <div class="scoring-grid">
                <div class="scoring-item excellent">
                    <strong>9-11 correct:</strong> Excellent understanding of the material
                </div>
                <div class="scoring-item good">
                    <strong>7-8 correct:</strong> Good grasp with some areas for review
                </div>
                <div class="scoring-item fair">
                    <strong>5-6 correct:</strong> Basic understanding, need more practice
                </div>
                <div class="scoring-item needs-work">
                    <strong>Below 5:</strong> Review fundamental concepts before retesting
                </div>
            </div>
        </div>
    </div>`
    
    console.log('Generated HTML length:', html.length)
    console.log('HTML preview:', html.substring(0, 500) + '...')
    return html
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

  private static findTrueFalseAnswer(answerKeySection: string, questionText: string): boolean {
    if (!answerKeySection) return true // Default to true if no answer key
    
    // Look for T/F answers in the answer key
    const tfAnswers = answerKeySection.match(/\d+\.\s*[TF]/g)
    if (tfAnswers) {
      // Extract the question number from the question text
      const questionMatch = questionText.match(/Question (\d+)/)
      if (questionMatch) {
        const questionNum = parseInt(questionMatch[1])
        const answerMatch = tfAnswers.find(answer => answer.startsWith(`${questionNum}.`))
        if (answerMatch) {
          return answerMatch.includes('T')
        }
      }
    }
    
    return true // Default to true
  }

  private static findShortAnswerSample(answerKeySection: string, questionText: string, questionNumber: number): string {
    if (!answerKeySection) return 'Answer based on provided content'
    
    // Look for short answer samples in the answer key
    const lines = answerKeySection.split('\n')
    let inShortAnswerSection = false
    let currentAnswer = ''
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.toLowerCase().includes('short answer')) {
        inShortAnswerSection = true
        continue
      }
      
      if (inShortAnswerSection && trimmedLine.match(/^\d+\./)) {
        // This is a numbered answer
        if (currentAnswer && currentAnswer.includes(questionText.substring(0, 20))) {
          return currentAnswer.replace(/^\d+\.\s*/, '').trim()
        }
        currentAnswer = trimmedLine
      } else if (inShortAnswerSection && trimmedLine && !trimmedLine.startsWith('#')) {
        // This is part of the answer
        if (currentAnswer) {
          currentAnswer += ' ' + trimmedLine
        }
      }
    }
    
    // If we found an answer, return it
    if (currentAnswer && currentAnswer.includes(questionText.substring(0, 20))) {
      return currentAnswer.replace(/^\d+\.\s*/, '').trim()
    }
    
    return 'Answer based on provided content'
  }

  private static generateSummaryContent(studyGuide: StudyGuideResponse): string {
    const sections = studyGuide.content.split('\n\n').filter(section => section.trim())
    
    // Filter out empty sections and improve content parsing
    const validSections = sections.filter(section => {
      const lines = section.split('\n').filter(line => line.trim())
      return lines.length > 0 && lines[0] !== '---'
    })
    
    // Extract learning outcomes from the content
    const learningOutcomes = this.extractLearningOutcomes(studyGuide.content)
    
    return `
    <div class="content">
        ${learningOutcomes ? `
        <div class="learning-outcomes">
            <h2>Learning Outcomes</h2>
            <div class="learning-outcomes-list">
                ${learningOutcomes.map(outcome => `<div class="learning-outcome-item">• ${outcome}</div>`).join('')}
            </div>
        </div>` : ''}
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
        
        ${this.generateKeyTerms(studyGuide.content, studyGuide.subject).length > 0 ? `
        <div class="summary-key-terms">
            <h2>Key Terms to Remember</h2>
            <div class="summary-key-terms-grid">
                ${this.generateKeyTerms(studyGuide.content, studyGuide.subject).map(term => `
                <div class="summary-key-term">
                    <span class="term">${term.term}:</span> ${term.definition}
                </div>`).join('')}
            </div>
        </div>` : ''}
        
        <div class="study-tips">
            <h2>📚 Study Tips for Success</h2>
            <ul>
                <li>Focus on understanding the main concepts and their relationships</li>
                <li>Use the key terms to build your vocabulary and understanding</li>
                <li>Create mental connections between different concepts</li>
                <li>Practice explaining concepts in your own words</li>
            </ul>
        </div>
    </div>`
  }

  private static extractLearningOutcomes(content: string): string[] {
    const lines = content.split('\n')
    const outcomes: string[] = []
    
    // Look for learning outcomes patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for "Learning Outcomes" or "Objectives" sections
      if (line.toLowerCase().includes('learning outcomes') || 
          line.toLowerCase().includes('objectives') ||
          line.toLowerCase().includes('learning objectives')) {
        
        // Extract the next few lines as outcomes
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const outcomeLine = lines[j].trim()
          if (outcomeLine && !outcomeLine.startsWith('#') && outcomeLine !== '---') {
            // Clean up the outcome text
            const cleanOutcome = outcomeLine.replace(/^[-•*]\s*/, '').replace(/^\d+\.\s*/, '')
            if (cleanOutcome.length > 10) { // Only include substantial outcomes
              outcomes.push(cleanOutcome)
            }
          } else if (outcomeLine.startsWith('#') || outcomeLine === '---') {
            break // Stop at next section
          }
        }
        break
      }
    }
    
    return outcomes.slice(0, 5) // Limit to 5 outcomes max
  }

  private static generateKeyTerms(content: string, subject?: string): Array<{term: string, definition: string}> {
    const keyTerms: Array<{term: string, definition: string}> = []
    const lines = content.split('\n')
    
    // Look for key terms patterns
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for "Key Terms" or "Definitions" sections
      if (line.toLowerCase().includes('key terms') || 
          line.toLowerCase().includes('definitions') ||
          line.toLowerCase().includes('vocabulary')) {
        
        // Extract the next few lines as key terms
        for (let j = i + 1; j < Math.min(i + 15, lines.length); j++) {
          const termLine = lines[j].trim()
          if (termLine && !termLine.startsWith('#') && termLine !== '---') {
            // Look for term: definition pattern
            const colonIndex = termLine.indexOf(':')
            if (colonIndex > 0) {
              const term = termLine.substring(0, colonIndex).trim()
              const definition = termLine.substring(colonIndex + 1).trim()
              if (term.length > 2 && definition.length > 5) {
                keyTerms.push({ term, definition })
              }
            }
          } else if (termLine.startsWith('#') || termLine === '---') {
            break // Stop at next section
          }
        }
        break
      }
    }
    
    // If no explicit key terms section found, extract from content
    if (keyTerms.length === 0) {
      // Look for bold terms and their definitions
      const boldTerms = content.match(/\*\*([^*]+)\*\*[:\s]*([^*\n]+)/g)
      if (boldTerms) {
        boldTerms.slice(0, 8).forEach(term => {
          const match = term.match(/\*\*([^*]+)\*\*[:\s]*([^*\n]+)/)
          if (match) {
            const termName = match[1].trim()
            const definition = match[2].trim()
            if (termName.length > 2 && definition.length > 5) {
              keyTerms.push({ term: termName, definition })
            }
          }
        })
      }
    }
    
    // If still no key terms, extract important concepts from the content
    if (keyTerms.length === 0) {
      const words = content.toLowerCase().split(/\s+/)
      const importantWords = words.filter(word => 
        word.length > 6 && 
        !['the', 'and', 'for', 'are', 'with', 'this', 'that', 'from', 'they', 'have', 'been', 'were', 'said', 'each', 'which', 'their', 'time', 'will', 'about', 'there', 'could', 'other', 'after', 'first', 'well', 'also', 'where', 'much', 'some', 'these', 'would', 'into', 'through', 'during', 'before', 'between', 'within', 'without', 'because', 'although', 'however', 'therefore', 'furthermore', 'moreover', 'nevertheless', 'consequently'].includes(word)
      )
      
      // Get unique important words and create simple definitions
      const uniqueWords = [...new Set(importantWords)].slice(0, 6)
      uniqueWords.forEach(word => {
        keyTerms.push({ 
          term: word.charAt(0).toUpperCase() + word.slice(1), 
          definition: `Important concept related to ${subject || 'the topic'}` 
        })
      })
    }
    
    return keyTerms.slice(0, 8) // Limit to 8 key terms max
  }

  private static formatContent(content: string): string {
    // First, handle priority sections with emojis
    let formatted = content.replace(/^## 🔴 ESSENTIAL.*$/gm, '<h2 class="priority-section essential">🔴 ESSENTIAL CONCEPTS</h2>')
    formatted = formatted.replace(/^## 🟡 IMPORTANT.*$/gm, '<h2 class="priority-section important">🟡 IMPORTANT CONCEPTS</h2>')
    formatted = formatted.replace(/^## 🟢 SUPPORTING.*$/gm, '<h2 class="priority-section supporting">🟢 SUPPORTING CONCEPTS</h2>')
    
    // Handle tables
    formatted = formatted.replace(/\|(.+)\|/g, (match, row) => {
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
