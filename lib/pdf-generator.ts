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
/* ============================
   STUDY GUIDE PDF THEME (A4)
   Works with Puppeteer HTML->PDF
   ============================ */

/* ---------- Root tokens ---------- */
:root {
  /* Brand / neutrals (sRGB, print-friendly) */
  --brand-600: #4facfe; /* headers, accents - keeping your blue */
  --brand-500: #00f2fe;
  --brand-50:  #F5FAFF;

  --ink-900: #121212;
  --ink-800: #1f1f1f;
  --ink-700: #2e2e2e;
  --ink-600: #444;
  --ink-500: #555;
  --ink-400: #777;
  --ink-300: #999;
  --ink-200: #c7c7c7;
  --ink-100: #e8e8e8;

  /* Priority palette (high-contrast, prints well) */
  --pri-essential: #C53030; /* 🔴 Essential */
  --pri-important: #B7791F; /* 🟡 Important */
  --pri-support:   #2F855A; /* 🟢 Supporting */

  /* Background tints */
  --bg-essential: #FFF5F5;   /* very light red */
  --bg-important: #FFFBEB;   /* very light amber */
  --bg-support:   #F0FFF4;   /* very light green */

  /* Active learning accents */
  --qc:   #4facfe; /* Quick Check - using your blue */
  --term: #6B46C1; /* Key Term */
  --conn: #0F766E; /* Connection Points */

  /* Typography scale */
  --fs-12: 12pt; /* base for print readability */
  --fs-14: 14pt;
  --fs-16: 16pt;
  --fs-18: 18pt;
  --fs-20: 20pt;
  --fs-24: 24pt;
  --lh-tight: 1.2;
  --lh-normal: 1.45;
  --lh-loose: 1.6;

  /* Spacing (multiples of 4 for rhythm) */
  --space-4:  4pt;
  --space-6:  6pt;
  --space-8:  8pt;
  --space-10: 10pt;
  --space-12: 12pt;
  --space-16: 16pt;
  --space-20: 20pt;
  --space-24: 24pt;
  --space-32: 32pt;

  /* Borders & radius */
  --radius-sm: 6pt;
  --radius-md: 10pt;
  --radius-lg: 14pt;

  /* Shadows (subtle for screen, ignored in PDF if needed) */
  --shadow-sm: 0 1pt 2pt rgba(0,0,0,0.06);
  --shadow-md: 0 2pt 8pt rgba(0,0,0,0.08);
}

/* ---------- Page setup ---------- */
@page {
  size: A4;
  margin: 18mm 16mm 18mm 16mm; /* top/right/bottom/left */
}

html {
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

body {
  font-family: Inter, "Segoe UI", Roboto, "Helvetica Neue", Arial, system-ui, sans-serif;
  color: var(--ink-800);
  font-size: var(--fs-12);
  line-height: var(--lh-normal);
  -webkit-font-smoothing: antialiased;
  margin: 0;
  counter-reset: h1 h2 h3 figure quickcheck;
}

/* Optional screen preview centering */
@media screen {
  body { background: #f7f7f7; }
  .page {
    width: 210mm; /* A4 width */
    margin: 12mm auto;
    background: #fff;
    box-shadow: var(--shadow-md);
    padding: 0;
  }
}

/* ---------- Running header/footer (fixed) ---------- */
.header, .footer {
  position: fixed;
  left: 0; right: 0;
  color: var(--ink-500);
  font-size: 9pt;
}
.header { top: 8mm; }
.footer { bottom: 8mm; }

.header .brand { color: var(--brand-600); font-weight: 600; }
.footer .page-num:after { content: counter(page); }

/* Avoid overlapping content with header/footer */
@media print {
  .content {
    padding-top: 12mm;
    padding-bottom: 12mm;
  }
}

/* ---------- Global type & spacing ---------- */
h1, h2, h3, h4 {
  color: var(--ink-900);
  margin: 0 0 var(--space-8);
  line-height: var(--lh-tight);
  page-break-after: avoid;
}
h1 {
  font-size: var(--fs-24);
  font-weight: 800;
  color: var(--brand-600);
  margin-top: var(--space-12);
  counter-increment: h1;
}
h2 {
  font-size: var(--fs-18);
  font-weight: 700;
  margin-top: var(--space-20);
  counter-increment: h2;
}
h3 {
  font-size: var(--fs-16);
  font-weight: 700;
  margin-top: var(--space-16);
  counter-increment: h3;
}
h4 {
  font-size: var(--fs-14);
  font-weight: 700;
}

p, ul, ol, dl, figure {
  margin: 0 0 var(--space-10);
}
ul, ol { padding-left: 18pt; }
li { margin: 0 0 var(--space-6); }
strong { color: var(--ink-900); }

/* Widows & orphans: reduce lonely lines on page breaks */
p, li { orphans: 3; widows: 3; }

/* Utility spacing */
.mt-0{margin-top:0!important}.mb-0{margin-bottom:0!important}
.mb-4{margin-bottom:var(--space-4)!important}
.mb-8{margin-bottom:var(--space-8)!important}
.mb-12{margin-bottom:var(--space-12)!important}
.mb-16{margin-bottom:var(--space-16)!important}
.pt-0{padding-top:0!important}

/* Page-break utilities */
.page-break { break-after: page; }
.avoid-break { break-inside: avoid; }

/* Tables (for outlines/quizzes) */
table {
  width: 100%;
  border-collapse: collapse;
  margin: var(--space-12) 0;
  font-size: var(--fs-12);
}
th, td {
  border: 0.5pt solid var(--ink-200);
  padding: 6pt 8pt;
  vertical-align: top;
}
th {
  background: var(--brand-50);
  font-weight: 700;
  color: var(--ink-800);
}

/* Code/inline definitions */
code, kbd {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace;
  font-size: 0.95em;
  background: #f6f6f6;
  padding: 1pt 3pt;
  border-radius: 3pt;
}

/* ---------- Learning Objectives (highest priority) ---------- */
.objectives {
  border: 1pt solid var(--brand-500);
  background: #ffffff;
  border-radius: var(--radius-md);
  padding: var(--space-16);
  margin: var(--space-12) 0 var(--space-20);
  break-inside: avoid;
  position: relative;
}
.objectives:before {
  content: "Learning Objectives";
  position: absolute;
  top: -10pt; left: 12pt;
  background: #fff;
  padding: 0 6pt;
  color: var(--brand-600);
  font-weight: 800;
  font-size: var(--fs-12);
  letter-spacing: 0.2pt;
}
.objectives ol {
  margin: var(--space-8) 0 0;
  padding-left: 16pt;
}
.objectives li {
  margin-bottom: var(--space-6);
}

/* ---------- Priority Levels ---------- */
.priority {
  border-left: 4pt solid var(--ink-200);
  padding: var(--space-10) var(--space-12);
  background: #fff;
  border-radius: var(--radius-sm);
  margin: var(--space-10) 0;
}
.priority .label {
  font-weight: 800;
  font-size: 10pt;
  text-transform: uppercase;
  letter-spacing: 0.3pt;
  display: inline-block;
  margin-bottom: var(--space-6);
}

/* Essential (🔴) */
.priority.essential {
  border-left-color: var(--pri-essential);
  background: var(--bg-essential);
}
.priority.essential .label { color: var(--pri-essential); }

/* Important (🟡) */
.priority.important {
  border-left-color: var(--pri-important);
  background: var(--bg-important);
}
.priority.important .label { color: var(--pri-important); }

/* Supporting (🟢) */
.priority.supporting {
  border-left-color: var(--pri-support);
  background: var(--bg-support);
}
.priority.supporting .label { color: var(--pri-support); }

/* Grayscale-friendly indicators */
@media print and (color: 0) {
  .priority.essential { background: #fafafa; border-left-style: solid; }
  .priority.important { background: #fbfbfb; border-left-style: dashed; }
  .priority.supporting { background: #fcfcfc; border-left-style: dotted; }
}

/* ---------- Active Learning Elements ---------- */
/* Quick Check */
.quick-check {
  border: 1pt solid var(--qc);
  background: #F3F8FF;
  border-radius: var(--radius-md);
  padding: var(--space-12);
  margin: var(--space-12) 0;
  break-inside: avoid;
  counter-increment: quickcheck;
}
.quick-check .title:before {
  content: "Quick Check " counter(quickcheck);
  font-weight: 800;
  color: var(--qc);
  margin-right: 6pt;
}
.quick-check .title {
  font-weight: 700;
  margin-bottom: var(--space-8);
}
.quick-check .prompt { margin-bottom: var(--space-8); }
.quick-check .answer {
  border-top: 0.5pt dashed var(--ink-200);
  padding-top: var(--space-8);
  color: var(--ink-700);
}

/* Key Term */
.key-term {
  border-left: 4pt solid var(--term);
  background: #F8F5FF;
  padding: var(--space-10) var(--space-12);
  border-radius: var(--radius-sm);
  margin: var(--space-10) 0;
  break-inside: avoid;
}
.key-term .term {
  font-weight: 800;
  color: var(--term);
}
.key-term .def {
  margin-top: var(--space-6);
}

/* Connection Points */
.connection {
  border: 1pt solid var(--conn);
  background: #F2FFFD;
  border-radius: var(--radius-md);
  padding: var(--space-12);
  margin: var(--space-12) 0;
  break-inside: avoid;
}
.connection .title {
  font-weight: 800;
  color: var(--conn);
  margin-bottom: var(--space-8);
}
.connection .list {
  padding-left: 16pt;
  margin: 0;
}
.connection .arrow {
  display: inline-block;
  border: 0.75pt solid var(--conn);
  border-radius: 12pt;
  padding: 1pt 6pt;
  font-size: 9pt;
  margin-right: 6pt;
}

/* ---------- Visual Learning Cues ---------- */
.note {
  background: #fff;
  border: 0.5pt solid var(--ink-200);
  border-radius: var(--radius-sm);
  padding: var(--space-8) var(--space-10);
  margin: var(--space-10) 0;
}
.callout {
  display: grid;
  grid-template-columns: 18pt 1fr;
  gap: var(--space-8);
  align-items: start;
}
.callout .icon {
  font-size: 14pt;
  line-height: 1;
}

/* Inline arrow cue */
.relation {
  display: inline-flex;
  align-items: center;
  gap: 6pt;
  font-weight: 600;
}
.relation .from, .relation .to { color: var(--ink-800); }
.relation .arrow { font-weight: 700; }

/* ---------- Format Types ---------- */
/* Outline */
.format-outline h2 {
  border-bottom: 1pt solid var(--ink-100);
  padding-bottom: 4pt;
}
.format-outline ul ul {
  margin-top: 2pt;
}

/* Flashcards: use .cards with .card items */
.cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-12);
  margin: var(--space-12) 0;
}
.card {
  border: 0.5pt solid var(--ink-200);
  border-radius: var(--radius-md);
  padding: var(--space-12);
  break-inside: avoid;
}
.card .front { font-weight: 800; margin-bottom: var(--space-6); }
.card .back  { color: var(--ink-700); }
@media print {
  .cards { grid-template-columns: 1fr 1fr; }
}

/* Quiz */
.quiz .q {
  margin: var(--space-10) 0;
  padding-bottom: var(--space-8);
  border-bottom: 0.5pt dashed var(--ink-200);
}
.quiz .q .stem { font-weight: 700; margin-bottom: var(--space-6); }
.quiz .q .choices { padding-left: 16pt; }
.quiz .q .answer {
  margin-top: var(--space-6);
  color: var(--ink-700);
}

/* Summary */
.summary {
  border: 1pt solid var(--ink-200);
  background: #fff;
  border-radius: var(--radius-md);
  padding: var(--space-12);
  margin: var(--space-16) 0;
}
.summary .title {
  font-weight: 800;
  color: var(--ink-900);
  margin-bottom: var(--space-8);
}

/* Concept Map (simple responsive grid) */
.concept-map {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-10);
  margin: var(--space-12) 0;
}
.concept-node {
  border: 0.75pt solid var(--ink-200);
  border-radius: var(--radius-md);
  padding: var(--space-10);
  text-align: center;
  break-inside: avoid;
}
.concept-node .title { font-weight: 700; margin-bottom: 4pt; }
.concept-node .meta { font-size: 10pt; color: var(--ink-500); }

/* Connectors (ASCII-friendly, prints cleanly) */
.connector {
  text-align: center;
  font-size: 10pt;
  color: var(--ink-500);
  margin: -6pt 0;
}

/* ---------- Figures & Captions ---------- */
figure img {
  max-width: 100%;
  display: block;
}
figcaption {
  font-size: 10pt;
  color: var(--ink-600);
  text-align: center;
  margin-top: 4pt;
}

/* ---------- Branding band (optional top banner) ---------- */
.brand-band {
  background: linear-gradient(90deg, var(--brand-600), var(--brand-500));
  color: #fff;
  padding: 10pt 12pt;
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  margin: 0 0 var(--space-12);
}
.brand-band .title {
  font-weight: 800;
  font-size: var(--fs-16);
}

/* ---------- Accessibility & contrast helpers ---------- */
.muted { color: var(--ink-600); }
.small { font-size: 10pt; }

/* ---------- Responsive tweaks for screen preview ---------- */
@media screen and (max-width: 1024px) {
  .concept-map { grid-template-columns: repeat(2, 1fr); }
  .cards { grid-template-columns: 1fr; }
}

/* ---------- "No color" safety (photocopiers) ---------- */
@media print and (color: 0) {
  .quick-check { border-style: solid; background: #fafafa; }
  .key-term    { border-left-style: solid; background: #fbfbff; }
  .connection  { border-style: solid; background: #f7fffe; }
  .brand-band  { background: #ddd; color: #000; }
}

/* ---------- Page break hints for bigger blocks ---------- */
.objectives,
.quick-check,
.connection,
.summary,
.cards,
.concept-map,
.priority { break-inside: avoid; }

/* ---------- Enhanced Header Structure ---------- */
.header {
  margin-bottom: 50px;
  padding: 30px 20px 30px 20px;
  border-bottom: 3px solid var(--brand-600);
  page-break-after: avoid;
  background: #ffffff;
  position: relative;
  z-index: 10;
}

.header-top {
  margin-bottom: 25px;
}

.logo-section {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 25px;
}

.logo {
  height: 40px;
  width: auto;
  max-width: 40px;
  display: block;
}

.logo-placeholder {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 800;
  color: #ffffff;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.brand-text {
  text-align: left;
}

.brand-name {
  color: var(--brand-600);
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
  margin: 0;
}

.brand-tagline {
  color: #666;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.2;
  margin: 0;
}

.header-content {
  text-align: center;
  margin-bottom: 25px;
}

.header h1 {
  color: var(--brand-600);
  font-size: 28px;
  margin-bottom: 15px;
  font-weight: 700;
  line-height: 1.2;
}

.header .subtitle {
  color: #666;
  font-size: 16px;
  margin-bottom: 0;
}

.header .meta {
  display: flex;
  justify-content: center;
  gap: 30px;
  font-size: 14px;
  color: #888;
  flex-wrap: wrap;
  margin-top: 25px;
  padding-top: 20px;
  border-top: 1px solid #e0e0e0;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* Ensure content starts after header */
.content {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px 10px 0 10px;
  clear: both;
  position: relative;
  z-index: 1;
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
  border-left: 4px solid var(--brand-600);
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
  border: 2px solid var(--brand-600);
  border-radius: 10px;
  padding: 20px;
  margin: 20px 0;
}

.concept {
  background: var(--brand-600);
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
        <div class="header-top">
            <div class="logo-section">
                <div class="logo-placeholder">CS</div>
                <div class="brand-text">
                    <div class="brand-name">CasanovaStudy</div>
                    <div class="brand-tagline">AI Study Guide Generator</div>
                </div>
            </div>
        </div>
        <div class="header-content">
            <h1>${studyGuide.title}</h1>
            <div class="subtitle">AI-Generated Study Guide</div>
        </div>
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
