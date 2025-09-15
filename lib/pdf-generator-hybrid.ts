import type { StudyGuideResponse } from "@/types"

export class PDFGeneratorHybrid {
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

      // Check if we're in a serverless environment
      const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
      
      if (isServerless) {
        // For Vercel, we'll use a different approach
        console.log('Running in serverless environment, using fallback method')
        return await this.generatePDFServerless(cleanedStudyGuide)
      }

      // For local development, try Puppeteer first
      try {
        console.log('Running locally, attempting to use Puppeteer')
        return await this.generatePDFWithPuppeteer(cleanedStudyGuide)
      } catch (puppeteerError) {
        console.log('Puppeteer failed, falling back to alternative method:', puppeteerError)
        return await this.generatePDFServerless(cleanedStudyGuide)
      }

    } catch (error) {
      console.error("PDF generation error:", error)
      throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : "Unknown error"}`)
    }
  }

  private static async generatePDFWithPuppeteer(studyGuide: StudyGuideResponse): Promise<Buffer> {
    // Dynamic import to avoid bundling issues
    const puppeteer = await import('puppeteer')
    
    const browser = await puppeteer.default.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })

    try {
      const page = await browser.newPage()
      
      // Generate HTML content
      const html = this.generateHTML(studyGuide)
      
      await page.setContent(html, { waitUntil: 'networkidle0' })
      
      // Generate PDF
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in'
        }
      })

      return Buffer.from(pdf)
    } finally {
      await browser.close()
    }
  }

  private static async generatePDFServerless(studyGuide: StudyGuideResponse): Promise<Buffer> {
    // For serverless environments, we'll use an external service
    // For now, let's use a simple HTML-to-PDF service or fallback to a basic implementation
    
    // Generate HTML
    const html = this.generateHTML(studyGuide)
    
    // For now, we'll return a simple text-based PDF using a basic approach
    // In production, you could use services like:
    // - Puppeteer on a separate server
    // - PDF generation APIs
    // - Or other serverless PDF solutions
    
    throw new Error('Serverless PDF generation not available. Please run locally for now.')
  }

  private static generateHTML(studyGuide: StudyGuideResponse): string {
    const formatNames = {
      outline: "Structured Study Outline",
      flashcards: "Interactive Flashcards", 
      quiz: "Practice Quiz",
      summary: "Comprehensive Summary"
    }
    
    const subtitle = formatNames[studyGuide.format?.toLowerCase() as keyof typeof formatNames] || "Study Guide"
    
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
            font-family: 'Helvetica', 'Arial', sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        .page {
            min-height: 100vh;
            padding: 0;
            position: relative;
        }
        
        .header {
            background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
            color: white;
            padding: 40px;
            margin-bottom: 30px;
            position: relative;
            overflow: hidden;
        }
        
        .header::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 6px;
            background: #06b6d4;
        }
        
        .brand-box {
            position: absolute;
            top: 20px;
            right: 40px;
            background: white;
            color: #2563eb;
            padding: 8px 16px;
            border-radius: 4px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .title {
            font-size: 32px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        
        .subtitle {
            font-size: 18px;
            opacity: 0.9;
            margin-bottom: 20px;
        }
        
        .metadata {
            display: flex;
            gap: 40px;
            font-size: 14px;
            opacity: 0.9;
        }
        
        .content {
            padding: 0 40px 40px;
        }
        
        .main-heading {
            background: #2563eb;
            color: white;
            padding: 15px 20px;
            margin: 20px 0 15px 0;
            border-radius: 6px;
            font-size: 20px;
            font-weight: bold;
        }
        
        .sub-heading {
            color: #2563eb;
            font-size: 18px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            padding-left: 15px;
            border-left: 4px solid #06b6d4;
        }
        
        .sub-sub-heading {
            color: #1f2937;
            font-size: 16px;
            font-weight: bold;
            margin: 15px 0 8px 30px;
            position: relative;
        }
        
        .sub-sub-heading::before {
            content: '•';
            color: #f59e0b;
            font-weight: bold;
            position: absolute;
            left: -20px;
        }
        
        .paragraph {
            margin: 10px 0;
            line-height: 1.7;
            color: #4b5563;
        }
        
        .bullet-point {
            margin: 8px 0;
            padding-left: 20px;
            position: relative;
            color: #4b5563;
        }
        
        .bullet-point::before {
            content: '•';
            color: #f59e0b;
            font-weight: bold;
            position: absolute;
            left: 0;
        }
        
        .bold-text {
            font-weight: bold;
            color: #1f2937;
        }
        
        .flashcard {
            background: white;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            margin: 20px 0;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .flashcard-question {
            background: #fbbf24;
            color: white;
            padding: 12px 20px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .flashcard-answer {
            background: #10b981;
            color: white;
            padding: 12px 20px;
            font-weight: bold;
            font-size: 14px;
        }
        
        .flashcard-content {
            padding: 20px;
            color: #374151;
        }
        
        .quiz-question {
            background: #2563eb;
            color: white;
            padding: 15px 20px;
            margin: 20px 0 15px 0;
            border-radius: 6px;
            font-weight: bold;
            font-size: 16px;
        }
        
        .quiz-choice {
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            border-radius: 4px;
            padding: 12px 20px;
            margin: 8px 0;
            display: flex;
            align-items: center;
            gap: 12px;
        }
        
        .quiz-choice-letter {
            background: #10b981;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
        }
        
        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #f9fafb;
            border-top: 1px solid #e5e7eb;
            padding: 10px 40px;
            font-size: 12px;
            color: #6b7280;
            display: flex;
            justify-content: space-between;
        }
        
        @media print {
            .page {
                page-break-after: always;
            }
            .page:last-child {
                page-break-after: avoid;
            }
        }
    </style>
</head>
<body>
    <div class="page">
        <div class="header">
            <div class="brand-box">CasanovaStudy</div>
            <h1 class="title">${studyGuide.title}</h1>
            <p class="subtitle">${subtitle}</p>
            <div class="metadata">
                <span>Subject: ${studyGuide.subject}</span>
                <span>Grade: ${studyGuide.gradeLevel}</span>
                <span>Generated: ${new Date().toLocaleDateString()}</span>
            </div>
        </div>
        
        <div class="content">
            ${this.formatContent(studyGuide.content, studyGuide.format)}
        </div>
        
        <div class="footer">
            <span>CasanovaStudy - AI Study Guide Generator</span>
            <span>Generated on ${new Date().toLocaleDateString()}</span>
        </div>
    </div>
</body>
</html>`
  }

  private static formatContent(content: string, format: string): string {
    const lines = content.split('\n').filter(line => line.trim())
    let html = ''
    
    for (const line of lines) {
      const trimmed = line.trim()
      
      if (trimmed.startsWith('# ')) {
        html += `<div class="main-heading">${trimmed.replace('# ', '')}</div>`
      } else if (trimmed.startsWith('## ')) {
        html += `<div class="sub-heading">${trimmed.replace('## ', '')}</div>`
      } else if (trimmed.startsWith('### ')) {
        html += `<div class="sub-sub-heading">${trimmed.replace('### ', '')}</div>`
      } else if (trimmed.startsWith('- ')) {
        html += `<div class="bullet-point">${trimmed.replace('- ', '')}</div>`
      } else if (trimmed.startsWith('**') && trimmed.endsWith('**')) {
        html += `<div class="bold-text">${trimmed.replace(/\*\*/g, '')}</div>`
      } else if (trimmed.match(/^\d+\./)) {
        html += `<div class="paragraph"><strong>${trimmed}</strong></div>`
      } else if (trimmed.match(/^[a-d]\)/i)) {
        const choiceLetter = trimmed.charAt(0).toUpperCase()
        const choiceText = trimmed.substring(3)
        html += `<div class="quiz-choice">
          <div class="quiz-choice-letter">${choiceLetter}</div>
          <span>${choiceText}</span>
        </div>`
      } else if (trimmed) {
        html += `<div class="paragraph">${trimmed}</div>`
      }
    }
    
    return html
  }
}
