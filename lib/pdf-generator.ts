import { StudyGuideResponse } from '@/types'

export class PDFGenerator {
  static generateHTML(studyGuide: StudyGuideResponse): string {
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
            padding: 20px;
        }
        
        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4facfe;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 1000;
        }
        
        .print-button:hover {
            background: #00f2fe;
            transform: translateY(-1px);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px 0;
            border-bottom: 3px solid #4facfe;
        }
        
        .logo {
            display: inline-block;
            width: 50px;
            height: 50px;
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 20px;
            font-weight: bold;
            margin-bottom: 15px;
        }
        
        .title {
            font-size: 28px;
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 8px;
        }
        
        .subtitle {
            font-size: 16px;
            color: #718096;
            margin-bottom: 15px;
        }
        
        .meta-info {
            display: flex;
            justify-content: center;
            gap: 30px;
            font-size: 14px;
            color: #4a5568;
        }
        
        .meta-item {
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .content {
            max-width: 800px;
            margin: 0 auto;
        }
        
        .section {
            margin-bottom: 30px;
        }
        
        .section-title {
            font-size: 22px;
            font-weight: bold;
            color: #2d3748;
            margin-bottom: 15px;
            padding-bottom: 8px;
            border-bottom: 2px solid #e2e8f0;
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
        
        .highlight {
            background: #f7fafc;
            padding: 15px;
            border-left: 4px solid #4facfe;
            margin: 15px 0;
            border-radius: 0 6px 6px 0;
        }
        
        .key-term {
            background: #e6fffa;
            padding: 10px 15px;
            border-radius: 6px;
            margin: 10px 0;
            border-left: 4px solid #00f2fe;
        }
        
        .key-term strong {
            color: #2d3748;
        }
        
        .quick-check {
            background: #fef5e7;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #f6ad55;
        }
        
        .quick-check strong {
            color: #c05621;
        }
        
        .connection-point {
            background: #f0fff4;
            padding: 15px;
            border-radius: 6px;
            margin: 15px 0;
            border-left: 4px solid #68d391;
        }
        
        .connection-point strong {
            color: #2f855a;
        }
        
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e2e8f0;
            color: #718096;
            font-size: 12px;
        }
        
        @media print {
            .print-button {
                display: none;
            }
            
            body {
                padding: 0;
            }
            
            .header {
                page-break-inside: avoid;
            }
            
            .section {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    <button class="print-button" onclick="window.print()">🖨️ Print to PDF</button>
    
    <div class="header">
        <div class="logo">CS</div>
        <h1 class="title">${studyGuide.title}</h1>
        <p class="subtitle">Study Guide</p>
        <div class="meta-info">
            <div class="meta-item">
                <span>📚</span>
                <span>${studyGuide.subject}</span>
            </div>
            <div class="meta-item">
                <span>🎓</span>
                <span>${studyGuide.gradeLevel}</span>
            </div>
            <div class="meta-item">
                <span>📄</span>
                <span>${studyGuide.format}</span>
            </div>
            <div class="meta-item">
                <span>📅</span>
                <span>${currentDate}</span>
            </div>
        </div>
    </div>
    
    <div class="content">
        ${studyGuide.content}
    </div>
    
    <div class="footer">
        <p>Generated by CasanovaStudy • Learn with clarity</p>
    </div>
    
    <script>
        // Add print functionality
        function printStudyGuide() {
            window.print();
        }
        
        // Add keyboard shortcut for print
        document.addEventListener('keydown', function(e) {
            if (e.ctrlKey && e.key === 'p') {
                e.preventDefault();
                window.print();
            }
        });
    </script>
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

}
