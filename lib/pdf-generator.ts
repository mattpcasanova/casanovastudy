import puppeteer from 'puppeteer'
import { StudyGuideResponse } from '@/types'

export class PDFGenerator {
  private static readonly PDF_OPTIONS = {
    format: 'A4' as const,
    margin: {
      top: '20mm',
      right: '15mm',
      bottom: '20mm',
      left: '15mm'
    },
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; color: #666;">CasanovaStudy - AI Study Guide Generator</div>',
    footerTemplate: '<div style="font-size: 10px; text-align: center; width: 100%; color: #666;">Generated on <span class="date"></span> | Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>'
  }

  static async generatePDF(studyGuide: StudyGuideResponse): Promise<Buffer> {
    let browser: puppeteer.Browser | null = null

    try {
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })

      const page = await browser.newPage()
      
      // Generate HTML content
      const html = this.generateHTML(studyGuide)
      
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      // Generate PDF
      const pdfBuffer = await page.pdf(this.PDF_OPTIONS)
      
      return pdfBuffer
    } catch (error) {
      console.error('PDF generation error:', error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      if (browser) {
        await browser.close()
      }
    }
  }

  private static generateHTML(studyGuide: StudyGuideResponse): string {
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
    <title>${studyGuide.title}</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: #fff;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 3px solid #4facfe;
        }
        
        .header h1 {
            color: #4facfe;
            font-size: 28px;
            margin-bottom: 10px;
            font-weight: 700;
        }
        
        .header .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 15px;
        }
        
        .header .meta {
            display: flex;
            justify-content: center;
            gap: 30px;
            font-size: 14px;
            color: #888;
            flex-wrap: wrap;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 5px;
        }
        
        .content {
            max-width: 100%;
            margin: 0 auto;
            padding: 0 10px;
        }
        
        .content h1, .content h2, .content h3, .content h4 {
            color: #2c3e50;
            margin-top: 25px;
            margin-bottom: 15px;
        }
        
        .content h1 {
            font-size: 24px;
            border-bottom: 2px solid #4facfe;
            padding-bottom: 10px;
        }
        
        .content h2 {
            font-size: 20px;
            color: #4facfe;
        }
        
        .content h3 {
            font-size: 18px;
            color: #5a6c7d;
        }
        
        .content h4 {
            font-size: 16px;
            color: #7f8c8d;
        }
        
        .content p {
            margin-bottom: 15px;
            text-align: justify;
        }
        
        .content ul, .content ol {
            margin-bottom: 15px;
            padding-left: 25px;
        }
        
        .content li {
            margin-bottom: 8px;
        }
        
        .content blockquote {
            border-left: 4px solid #4facfe;
            padding-left: 20px;
            margin: 20px 0;
            font-style: italic;
            color: #555;
            background: #f8f9fa;
            padding: 15px 20px;
        }
        
        .content code {
            background: #f1f2f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
        }
        
        .content pre {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
            border: 1px solid #e9ecef;
        }
        
        .content pre code {
            background: none;
            padding: 0;
        }
        
        .highlight {
            background: #fff3cd;
            padding: 15px;
            border-radius: 5px;
            border-left: 4px solid #ffc107;
            margin: 15px 0;
        }
        
        .quiz-question {
            background: #e3f2fd;
            padding: 15px;
            border-radius: 5px;
            margin: 15px 0;
            border-left: 4px solid #2196f3;
        }
        
        .quiz-answer {
            background: #e8f5e8;
            padding: 10px 15px;
            border-radius: 5px;
            margin: 10px 0;
            border-left: 4px solid #4caf50;
        }
        
        .flashcard {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 20px;
            margin: 15px 0;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .flashcard-question {
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        
        .flashcard-answer {
            color: #555;
        }
        
        .concept-map {
            background: #f8f9fa;
            border: 2px solid #4facfe;
            border-radius: 10px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .concept {
            background: #4facfe;
            color: white;
            padding: 8px 15px;
            border-radius: 20px;
            display: inline-block;
            margin: 5px;
            font-weight: bold;
        }
        
        .concept-connection {
            color: #666;
            font-style: italic;
            margin: 10px 0;
        }
        
        .page-break {
            page-break-before: always;
        }
        
        @media print {
            .header {
                page-break-after: avoid;
            }
            
            .content h1, .content h2 {
                page-break-after: avoid;
            }
            
            .flashcard, .quiz-question {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${studyGuide.title}</h1>
        <div class="subtitle">AI-Generated Study Guide</div>
        <div class="meta">
            <div class="meta-item">
                <strong>Subject:</strong> ${studyGuide.subject}
            </div>
            <div class="meta-item">
                <strong>Grade Level:</strong> ${studyGuide.gradeLevel}
            </div>
            <div class="meta-item">
                <strong>Format:</strong> ${studyGuide.format}
            </div>
            <div class="meta-item">
                <strong>Generated:</strong> ${currentDate}
            </div>
        </div>
    </div>
    
    <div class="content">
        ${this.formatContent(studyGuide.content, studyGuide.format)}
    </div>
</body>
</html>`
  }

  private static formatContent(content: string, format: string): string {
    // Basic formatting - in a real app, you'd want more sophisticated parsing
    let formatted = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code>$1</code>')

    // Add paragraph tags
    formatted = `<p>${formatted}</p>`

    // Format based on study guide type
    if (format === 'flashcards') {
      formatted = this.formatFlashcards(formatted)
    } else if (format === 'quiz') {
      formatted = this.formatQuiz(formatted)
    } else if (format === 'concept-map') {
      formatted = this.formatConceptMap(formatted)
    }

    return formatted
  }

  private static formatFlashcards(content: string): string {
    return content
      .replace(/Q:\s*(.*?)\s*A:\s*(.*?)(?=Q:|$)/gs, (match, question, answer) => {
        return `
          <div class="flashcard">
            <div class="flashcard-question">Q: ${question.trim()}</div>
            <div class="flashcard-answer">A: ${answer.trim()}</div>
          </div>
        `
      })
  }

  private static formatQuiz(content: string): string {
    return content
      .replace(/(\d+\.\s*.*?)(?=\d+\.|$)/gs, (match, question) => {
        return `
          <div class="quiz-question">
            ${question.trim()}
          </div>
        `
      })
  }

  private static formatConceptMap(content: string): string {
    return `
      <div class="concept-map">
        <h3>Concept Map</h3>
        ${content}
      </div>
    `
  }
}
