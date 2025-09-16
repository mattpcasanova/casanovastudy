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

    /* Quiz Questions - Clean Professional Design */
    .content .quiz-question,
    .quiz-section .quiz-question,
    .quiz-question,
    .quiz-questions .quiz-question {
        background: #ffffff !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 0.5rem !important;
        padding: 1.5rem !important;
        margin-bottom: 1.5rem !important;
        box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1) !important;
        page-break-inside: avoid !important;
        display: block !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }

    .quiz-question-header {
        display: flex !important;
        align-items: flex-start !important;
        gap: 1rem !important;
        margin-bottom: 1rem !important;
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

    /* Quiz Options - Professional Design with Colored Letters */
    .content .quiz-option,
    .quiz-options .quiz-option,
    .quiz-option {
        display: flex !important;
        align-items: center !important;
        gap: 0.75rem !important;
        padding: 0.75rem !important;
        margin-bottom: 0.5rem !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 0.375rem !important;
        background: #ffffff !important;
        width: 100% !important;
        box-sizing: border-box !important;
    }

    .quiz-option-letter {
        width: 1.5rem;
        height: 1.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.75rem;
        flex-shrink: 0;
        color: #ffffff;
    }

    /* Colored option letters matching target design */
    .quiz-option-letter.a {
        background: #ef4444; /* Red */
    }

    .quiz-option-letter.b {
        background: #2563eb; /* Blue */
    }

    .quiz-option-letter.c {
        background: #16a34a; /* Green */
    }

    .quiz-option-letter.d {
        background: #ea580c; /* Orange */
    }

    .quiz-option-circle {
        width: 1rem;
        height: 1rem;
        border: 2px solid #e2e8f0;
        border-radius: 50%;
        flex-shrink: 0;
        background: #ffffff;
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

    .quiz-questions {
        margin-bottom: 2rem;
    }

    .quiz-section-title {
        color: #2563eb;
        font-size: 1.5rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        margin-top: 2rem;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 0.5rem;
    }

    .quiz-section-divider {
        display: none;
    }

    .quiz-section h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 1rem;
        border-bottom: 2px solid #2563eb;
        padding-bottom: 0.5rem;
    }

    /* Section Headers with Blue Lines */
    .quiz-section-header {
        margin: 2rem 0 1.5rem 0;
        position: relative;
    }

    .quiz-section-header h2 {
        color: #2563eb;
        font-size: 1.25rem;
        font-weight: 600;
        margin-bottom: 0.5rem;
        background: #ffffff;
        padding-right: 1rem;
        display: inline-block;
    }

    .quiz-section-header::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 0;
        right: 0;
        height: 2px;
        background: #2563eb;
        z-index: -1;
    }

    /* True/False Questions - Horizontal Button Layout */
    .quiz-tf-options {
        display: flex;
        gap: 2rem;
        margin-left: 3rem;
    }

    .quiz-tf-option {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        border: 1px solid #e2e8f0;
        border-radius: 0.375rem;
        background: #ffffff;
        min-width: 120px;
    }

    .quiz-tf-option span {
        font-weight: 500;
        color: #0f172a;
        font-size: 0.875rem;
    }

    /* Short Answer Questions - Professional Answer Lines */
    .quiz-short-answer {
        margin-left: 3rem;
    }

    .answer-lines {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
        margin-top: 1rem;
    }

    .answer-line {
        height: 2px;
        background: #000000;
        width: 100%;
        margin-bottom: 0.5rem;
    }

    .answer-line.light {
        height: 1px;
        background: #d1d5db;
        margin-bottom: 0.25rem;
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
    
    console.log('=== QUIZ DEBUG ===')
    console.log('Content length:', content.length)
    
    // First, find the QUIZ section specifically
    const quizSectionStart = this.findQuizSection(content)
    if (!quizSectionStart) {
      console.log('No quiz section found, using fallback')
      console.log('Content preview:', content.substring(0, 500) + '...')
      return this.generateQuizFallback(content, studyGuide)
    }
    
    console.log('Found quiz section starting at:', quizSectionStart.substring(0, 200) + '...')
    
    // Debug: Show the first few lines of the quiz section
    const quizLines = quizSectionStart.split('\n').slice(0, 20)
    console.log('First 20 lines of quiz section:', quizLines)
    
    // Find the answer key section first
    let answerKeySection = ''
    const sections = content.split(/(?=^## )/m)
    const answerKeyIndex = sections.findIndex(section => 
      section.toLowerCase().includes('answer key') || 
      section.toLowerCase().includes('answers:') ||
      section.toLowerCase().includes('sample answer')
    )
    
    if (answerKeyIndex !== -1) {
      answerKeySection = sections[answerKeyIndex]
      console.log('Found answer key section:', answerKeySection.substring(0, 200) + '...')
    }
    
    // Parse the quiz section into different question types
    this.parseQuizSection(quizSectionStart, multipleChoiceQuestions, trueFalseQuestions, shortAnswerQuestions)
    
    // Extract sample answers for short answer questions
    if (answerKeySection && shortAnswerQuestions.length > 0) {
      shortAnswerQuestions.forEach((question, index) => {
        question.sampleAnswer = this.findShortAnswerSample(answerKeySection, question.question, index + 1)
      })
    }
    
    // Extract learning outcomes from the content
    const learningOutcomes = this.extractLearningOutcomes(studyGuide.content)
    
    // If no questions found, use fallback
    if (multipleChoiceQuestions.length === 0 && trueFalseQuestions.length === 0 && shortAnswerQuestions.length === 0) {
      console.log('No questions parsed, using fallback with styled content')
      return this.generateQuizFallback(content, studyGuide)
    }
    
    console.log('=== GENERATING QUIZ HTML ===')
    console.log('MC Questions:', multipleChoiceQuestions.length)
    console.log('T/F Questions:', trueFalseQuestions.length)
    console.log('SA Questions:', shortAnswerQuestions.length)
    console.log('MC Questions sample:', multipleChoiceQuestions.slice(0, 2))
    console.log('T/F Questions sample:', trueFalseQuestions.slice(0, 2))
    console.log('SA Questions sample:', shortAnswerQuestions.slice(0, 2))
    
    // Debug: Show the actual HTML being generated
    const quizHTML = this.createConsistentQuizHTML(multipleChoiceQuestions, trueFalseQuestions, shortAnswerQuestions)
    console.log('Generated Quiz HTML (first 500 chars):', quizHTML.substring(0, 500))
    
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
        
        ${quizHTML}
        
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
    
    console.log(`Looking for sample answer for question: ${questionText.substring(0, 50)}...`)
    
    // Look for short answer samples in the answer key
    const lines = answerKeySection.split('\n')
    let inShortAnswerSection = false
    let answerLines: string[] = []
    let currentAnswerNumber = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      if (line.toLowerCase().includes('short answer') || line.toLowerCase().includes('sample answer')) {
        inShortAnswerSection = true
        console.log('Found short answer section')
        continue
      }
      
      if (inShortAnswerSection && line.match(/^(\d+)\./)) {
        // This is a numbered answer
        const match = line.match(/^(\d+)\./)
        if (match) {
          currentAnswerNumber = parseInt(match[1])
          console.log(`Found answer ${currentAnswerNumber}`)
          
          // If this is the answer we're looking for
          if (currentAnswerNumber === questionNumber) {
            answerLines = [line]
            console.log(`Found matching answer for question ${questionNumber}`)
          }
        }
      } else if (inShortAnswerSection && line && !line.startsWith('#') && !line.startsWith('---') && answerLines.length > 0) {
        // This is part of the current answer
        answerLines.push(line)
        console.log(`Added line to answer: ${line.substring(0, 50)}...`)
      }
    }
    
    // If we found an answer, return it
    if (answerLines.length > 0) {
      const fullAnswer = answerLines.join(' ').replace(/^\d+\.\s*/, '').trim()
      console.log(`Returning sample answer: ${fullAnswer.substring(0, 100)}...`)
      return fullAnswer
    }
    
    console.log('No sample answer found, using default')
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

  private static findQuizSection(content: string): string | null {
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for emoji-based quiz sections (🔴, 🟡, 🟢)
      if (line.includes('🔴') || line.includes('🟡') || line.includes('🟢')) {
        console.log('Found emoji quiz section:', line)
        return lines.slice(i).join('\n')
      }
      
      // Look for traditional quiz headers
      if (line.includes('QUIZ') || line.includes('Quiz') || line.includes('quiz')) {
        console.log('Found quiz header:', line)
        return lines.slice(i).join('\n')
      }
      
      // Look for question sections
      if (line.includes('QUESTION') || line.includes('Question') || line.includes('question')) {
        console.log('Found question section:', line)
        return lines.slice(i).join('\n')
      }
      
      // Look for multiple choice sections
      if (line.toLowerCase().includes('multiple choice') || 
          line.toLowerCase().includes('true/false') ||
          line.toLowerCase().includes('short answer')) {
        console.log('Found quiz type section:', line)
        return lines.slice(i).join('\n')
      }
      
      // Look for lines that contain question patterns
      if (line.includes('?') && (line.match(/^\d+\.|^Question|^Q:/i) || line.length > 30)) {
        console.log('Found question pattern:', line)
        return lines.slice(i).join('\n')
      }
    }
    
    console.log('No quiz section found')
    return null
  }

  private static parseQuizSection(quizContent: string, mcQuestions: any[], tfQuestions: any[], saQuestions: any[]): void {
    const lines = quizContent.split('\n').filter(line => line.trim())
    let currentSection = ''
    let currentQuestion: any = null
    let questionNumber = 0
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Debug: Log lines that might be section headers
      if (line.includes('CHOICE') || line.includes('FALSE') || line.includes('ANSWER')) {
        console.log(`Potential section header: "${line}"`)
      }
      
      // Detect section headers
      if (line.includes('MULTIPLE CHOICE QUESTIONS') || line.includes('Multiple Choice Questions')) {
        currentSection = 'MC'
        console.log('Found MC section')
        continue
      } else if (line.includes('TRUE/FALSE QUESTIONS') || line.includes('True/False Questions')) {
        currentSection = 'TF'
        console.log('Found T/F section')
        continue
      } else if (line.includes('SHORT ANSWER QUESTIONS') || line.includes('Short Answer Questions')) {
        currentSection = 'SA'
        console.log('Found Short Answer section')
        continue
      }
      
      // Skip if we're not in a quiz section yet
      if (!currentSection) continue
      
      // Parse questions based on current section
      if (currentSection === 'MC') {
        // Look for question headers (### Question 1, Question 1:, etc.)
        if (line.match(/^### Question \d+|^Question \d+:|^\d+\./)) {
          if (currentQuestion) {
            mcQuestions.push(currentQuestion)
            console.log(`Pushed MC question with ${currentQuestion.options.length} options`)
          }
          questionNumber++
          // Extract question text from the next line
          let questionText = ''
          if (i + 1 < lines.length) {
            questionText = lines[i + 1].trim()
            i++ // Skip the question text line
          }
          currentQuestion = {
            question: questionText,
            options: [],
            correctAnswer: 'A' // Will be determined from answer key
          }
          console.log(`Found MC question ${questionNumber}:`, questionText.substring(0, 50) + '...')
        } else if (currentQuestion && line.match(/^[a-d]\)/i)) {
          // This is an option
          currentQuestion.options.push(line)
          console.log('Added MC option:', line)
        }
      } else if (currentSection === 'TF') {
        // Look for T/F questions
        if (line.match(/^### Question \d+|^Question \d+:|^\d+\./)) {
          if (currentQuestion) {
            tfQuestions.push(currentQuestion)
          }
          questionNumber++
          // Extract question text from the next line
          let questionText = ''
          if (i + 1 < lines.length) {
            questionText = lines[i + 1].trim()
            i++ // Skip the question text line
          }
          currentQuestion = {
            question: questionText,
            correctAnswer: true // Will be determined from answer key
          }
          console.log(`Found T/F question ${questionNumber}:`, questionText.substring(0, 50) + '...')
        }
      } else if (currentSection === 'SA') {
        // Look for short answer questions
        if (line.match(/^### Question \d+|^Question \d+:|^\d+\./)) {
          if (currentQuestion) {
            saQuestions.push(currentQuestion)
          }
          questionNumber++
          // Extract question text from the next line
          let questionText = ''
          if (i + 1 < lines.length) {
            questionText = lines[i + 1].trim()
            i++ // Skip the question text line
          }
          currentQuestion = {
            question: questionText,
            sampleAnswer: ''
          }
          console.log(`Found SA question ${questionNumber}:`, questionText.substring(0, 50) + '...')
        }
      }
    }
    
    // Add the last question
    if (currentQuestion) {
      if (currentSection === 'MC') {
        mcQuestions.push(currentQuestion)
      } else if (currentSection === 'TF') {
        tfQuestions.push(currentQuestion)
      } else if (currentSection === 'SA') {
        saQuestions.push(currentQuestion)
      }
    }
    
    console.log(`Parsed ${mcQuestions.length} MC, ${tfQuestions.length} T/F, ${saQuestions.length} SA questions`)
  }

  private static determineQuestionType(lines: string[], currentIndex: number): string {
    // Look ahead to see what follows this question
    for (let i = currentIndex + 1; i < Math.min(currentIndex + 15, lines.length); i++) {
      const line = lines[i].trim()
      
      // Skip empty lines
      if (!line) continue
      
      // Check for MC options (a), b), c), d)) or (A), (B), (C), (D))
      if (line.match(/^[a-d]\)|^\([A-D]\)|^[A-D]\./)) {
        console.log(`Found MC option: ${line}`)
        return 'MC'
      }
      
      // Check for T/F indicators in the question text itself
      if (line.toLowerCase().includes('true or false') || 
          line.toLowerCase().includes('true/false') ||
          line.toLowerCase().includes('mark true or false')) {
        console.log(`Found T/F indicator: ${line}`)
        return 'TF'
      }
      
      // Check for SA indicators (explain, describe, etc.)
      if (line.toLowerCase().includes('explain') || 
          line.toLowerCase().includes('compare') ||
          line.toLowerCase().includes('describe') ||
          line.toLowerCase().includes('what is') ||
          line.toLowerCase().includes('how does') ||
          line.toLowerCase().includes('why')) {
        console.log(`Found SA indicator: ${line}`)
        return 'SA'
      }
      
      // If we hit another question, stop looking
      if (line.match(/^(Question \d+:|^\d+\.|^Q\d+:|^Q:)/i)) {
        console.log(`Hit next question, stopping search: ${line}`)
        break
      }
    }
    
    console.log('No clear question type found, defaulting to SA')
    return 'SA' // Default to SA if unclear
  }

  private static collectMCOptions(lines: string[], currentIndex: number, question: any): void {
    for (let i = currentIndex + 1; i < Math.min(currentIndex + 15, lines.length); i++) {
      const line = lines[i].trim()
      
      // Skip empty lines
      if (!line) continue
      
      // Look for MC options: a), b), c), d) or (A), (B), (C), (D) or A., B., C., D.
      if (line.match(/^[a-d]\)|^\([A-D]\)|^[A-D]\./)) {
        question.options.push(line)
        console.log(`Added MC option: ${line}`)
      } else if (line.match(/^\d+\./)) {
        // Hit next numbered question, stop collecting
        console.log(`Hit next question while collecting MC options: ${line}`)
        break
      } else if (line.includes('Multiple Choice') || line.includes('True/False') || line.includes('Short Answer')) {
        // Hit section header, stop collecting
        console.log(`Hit section header while collecting MC options: ${line}`)
        break
      } else if (line && !line.match(/^[a-d]\)|^\([A-D]\)|^[A-D]\./)) {
        // Hit non-option line, stop collecting
        console.log(`Hit non-option line while collecting MC options: ${line}`)
        break
      }
    }
  }

  private static addQuestionToCorrectArray(question: any, mcQuestions: any[], tfQuestions: any[], saQuestions: any[]): void {
    switch (question.type) {
      case 'MC':
        mcQuestions.push({
          question: question.question,
          options: question.options,
          correctAnswer: this.determineCorrectAnswer(question.options)
        })
        break
      case 'TF':
        tfQuestions.push({
          question: question.question,
          correctAnswer: true
        })
        break
      case 'SA':
        saQuestions.push({
          question: question.question,
          sampleAnswer: question.sampleAnswer || ''
        })
        break
    }
  }

  /**
   * Creates a consistent quiz HTML structure with proper styling
   * This method ensures all quiz questions follow the same format and styling
   */
  private static createConsistentQuizHTML(mcQuestions: any[], tfQuestions: any[], saQuestions: any[]): string {
    let html = ''
    
    // Multiple Choice Questions
    if (mcQuestions.length > 0) {
      html += `<h2 class="quiz-section-title">Multiple Choice Questions</h2>`
      
      mcQuestions.forEach((question, index) => {
        html += this.createMCQuestionHTML(question, index + 1)
      })
    }
    
    // True/False Questions
    if (tfQuestions.length > 0) {
      html += `<h2 class="quiz-section-title">True/False Questions</h2>`
      
      tfQuestions.forEach((question, index) => {
        html += this.createTFQuestionHTML(question, mcQuestions.length + index + 1)
      })
    }
    
    // Short Answer Questions
    if (saQuestions.length > 0) {
      html += `<h2 class="quiz-section-title">Short Answer Questions</h2>`
      
      saQuestions.forEach((question, index) => {
        html += this.createSAQuestionHTML(question, mcQuestions.length + tfQuestions.length + index + 1)
      })
    }
    
    return html
  }

  private static createMCQuestionHTML(question: any, questionNumber: number): string {
    let html = `<div class="quiz-question print-avoid-break">
      <div class="quiz-question-header">
        <div class="quiz-question-number">${questionNumber}</div>
        <div class="quiz-question-text">${question.question}</div>
      </div>
      <div class="quiz-options">`
    
    question.options.forEach((option: string, index: number) => {
      const letter = option.charAt(0).toLowerCase()
      const optionText = option.substring(3) // Remove "a) " part
      
      html += `<div class="quiz-option">
        <div class="quiz-option-letter ${letter}">${letter.toUpperCase()}</div>
        <div class="quiz-option-circle"></div>
        <div class="quiz-option-text">${optionText}</div>
      </div>`
    })
    
    html += `</div></div>`
    return html
  }

  private static createTFQuestionHTML(question: any, questionNumber: number): string {
    return `<div class="quiz-question print-avoid-break">
      <div class="quiz-question-header">
        <div class="quiz-question-number">${questionNumber}</div>
        <div class="quiz-question-text">${question.question}</div>
      </div>
      <div class="quiz-tf-options">
        <div class="quiz-tf-option">
          <input type="radio" name="q${questionNumber}" value="true">
          <label>True</label>
        </div>
        <div class="quiz-tf-option">
          <input type="radio" name="q${questionNumber}" value="false">
          <label>False</label>
        </div>
      </div>
    </div>`
  }

  private static createSAQuestionHTML(question: any, questionNumber: number): string {
    return `<div class="quiz-question print-avoid-break">
      <div class="quiz-question-header">
        <div class="quiz-question-number">${questionNumber}</div>
        <div class="quiz-question-text">${question.question}</div>
      </div>
      <div class="answer-lines">
        <div class="answer-line"></div>
        <div class="answer-line light"></div>
        <div class="answer-line"></div>
        <div class="answer-line light"></div>
        <div class="answer-line"></div>
      </div>
    </div>`
  }

  private static generateQuizFallback(content: string, studyGuide: StudyGuideResponse): string {
    const learningOutcomes = this.extractLearningOutcomes(studyGuide.content)
    
    // Try to extract questions from the content even if parsing failed
    const questions = this.extractQuestionsFromContent(content)
    
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
            <p>Answer all questions. For multiple choice, choose the best answer. For true/false, mark T or F. For short answer, provide a complete response.</p>
        </div>

        ${questions.length > 0 ? `
        <div class="quiz-questions">
            ${questions.map((question, index) => this.createStyledQuestionHTML(question, index + 1)).join('')}
        </div>` : `
        <div class="quiz-content">
            <h2>Study Content</h2>
            <div class="study-content">
                ${this.formatContent(content)}
            </div>
        </div>`}
    </div>`
  }

  /**
   * Extract questions from content when formal parsing fails
   * This method looks for question patterns in the content and creates styled questions
   */
  private static extractQuestionsFromContent(content: string): Array<{question: string, type: string, options?: string[]}> {
    const questions: Array<{question: string, type: string, options?: string[]}> = []
    const lines = content.split('\n').filter(line => line.trim())
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      
      // Look for question patterns
      if (line.includes('?') && (line.length > 20 || line.match(/^\d+\.|^Question|^Q:/i))) {
        const question = line.replace(/^(Question \d+:|^\d+\.|^Q\d+:|^Q:)\s*/i, '').trim()
        
        if (question.length > 10) {
          // Determine question type based on content
          let type = 'SA' // Default to short answer
          
          // Check if it's multiple choice by looking at following lines
          for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
            const nextLine = lines[j].trim()
            if (nextLine.match(/^[a-d]\)|^\([A-D]\)|^[A-D]\./)) {
              type = 'MC'
              break
            }
            if (nextLine.toLowerCase().includes('true or false') || 
                nextLine.toLowerCase().includes('true/false')) {
              type = 'TF'
              break
            }
            if (nextLine.includes('?') || nextLine.match(/^(Question|Q:)/i)) {
              break
            }
          }
          
          questions.push({
            question: question,
            type: type,
            options: type === 'MC' ? this.extractMCOptionsFromContent(lines, i) : undefined
          })
        }
      }
    }
    
    return questions.slice(0, 15) // Limit to 15 questions max
  }

  /**
   * Extract multiple choice options from content
   */
  private static extractMCOptionsFromContent(lines: string[], questionIndex: number): string[] {
    const options: string[] = []
    
    for (let i = questionIndex + 1; i < Math.min(questionIndex + 10, lines.length); i++) {
      const line = lines[i].trim()
      
      if (line.match(/^[a-d]\)|^\([A-D]\)|^[A-D]\./)) {
        options.push(line)
      } else if (line.includes('?') || line.match(/^(Question|Q:)/i) || line === '') {
        break
      }
    }
    
    return options
  }

  /**
   * Create styled HTML for a question regardless of type
   */
  private static createStyledQuestionHTML(question: {question: string, type: string, options?: string[]}, questionNumber: number): string {
    switch (question.type) {
      case 'MC':
        return this.createMCQuestionHTML(question, questionNumber)
      case 'TF':
        return this.createTFQuestionHTML(question, questionNumber)
      case 'SA':
      default:
        return this.createSAQuestionHTML(question, questionNumber)
    }
  }
}