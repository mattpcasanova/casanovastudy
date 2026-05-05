/**
 * Core grading pipeline — shared by the manual grade-exam HTTP route and the
 * automatic submission grading triggered on student submit.
 *
 * Keeping this in a lib file means there is no internal server-to-server HTTP
 * call; both paths call the same function directly.
 */

import { FileProcessor } from './file-processing'
import { ClaudeService } from './claude-api'
import { PDFShiftPDFGenerator } from './pdfshift-pdf-generator'
import { storePDF } from '@/app/api/pdf/[filename]/route'
import { createAdminClient } from './supabase-server'

export interface FileMeta {
  buffer: Buffer
  name: string
  type: string
}

export interface GradeBreakdownItem {
  questionNumber: string
  marksAwarded: number
  marksPossible: number
  explanation: string
}

export interface GradingPipelineInput {
  userId: string
  userType: 'teacher' | 'student'
  markSchemeFile?: FileMeta
  studentFiles: FileMeta[]
  additionalComments?: string
}

export interface GradingPipelineResult {
  id: string
  pdfUrl: string
  pdfDataUrl: string
  totalMarks: number
  totalPossibleMarks: number
  gradeBreakdown: GradeBreakdownItem[]
  fullResponse: string
}

const VALID_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']

function isImageFile(f: { name: string; type: string }): boolean {
  const ext = f.name.split('.').pop()?.toLowerCase()
  return VALID_IMAGE_TYPES.includes(f.type) || (!!ext && IMAGE_EXTENSIONS.includes(ext))
}

export async function runGradingPipeline(input: GradingPipelineInput): Promise<GradingPipelineResult> {
  const { userId, userType, markSchemeFile, studentFiles, additionalComments } = input

  if (studentFiles.length === 0) throw new Error('No student files provided')

  // Process mark scheme text (for PDF/DOCX; images are handled by Claude vision)
  let markSchemeContent = ''
  if (markSchemeFile) {
    const fileObj = new File([new Uint8Array(markSchemeFile.buffer)], markSchemeFile.name, { type: markSchemeFile.type })
    const processed = await FileProcessor.processFile(fileObj)
    markSchemeContent = processed.content.trim()
  }

  // Process student files — extract text from docs, pass images straight to vision
  let studentExamContent = ''
  const studentExamBuffers: Array<{ buffer: Buffer; name: string; type: string }> = []

  for (const file of studentFiles) {
    studentExamBuffers.push({ buffer: file.buffer, name: file.name, type: file.type })
    if (!isImageFile(file)) {
      try {
        const fileObj = new File([new Uint8Array(file.buffer)], file.name, { type: file.type })
        const processed = await FileProcessor.processFile(fileObj)
        studentExamContent += processed.content.trim() + '\n\n'
      } catch {
        // Not a readable text file; Claude vision will handle it
      }
    }
  }

  const primaryStudentFile = studentFiles[0]
  const markSchemeParam = markSchemeFile
    ? { buffer: markSchemeFile.buffer, name: markSchemeFile.name, type: markSchemeFile.type }
    : undefined

  // Call Claude
  const claudeService = new ClaudeService()
  let claudeResponse

  if (userType === 'teacher') {
    claudeResponse = await claudeService.gradeExamWithImages({
      markSchemeText: markSchemeContent,
      studentExamText: studentExamContent,
      markSchemeImages: undefined,
      studentExamImages: undefined,
      markSchemeFile: markSchemeParam,
      studentExamFile: studentExamBuffers[0],
      studentExamFiles: studentExamBuffers.length > 1 ? studentExamBuffers : undefined,
      additionalComments: additionalComments || undefined,
    })
  } else {
    claudeResponse = await claudeService.gradeExamForStudent({
      studentExamText: studentExamContent,
      markSchemeText: markSchemeContent,
      studentExamFile: studentExamBuffers[0],
      studentExamFiles: studentExamBuffers.length > 1 ? studentExamBuffers : undefined,
      markSchemeFile: markSchemeParam,
    })
  }

  const gradingContent = claudeResponse.content

  if (
    gradingContent.toLowerCase().includes('cannot read') ||
    gradingContent.toLowerCase().includes('cannot see') ||
    gradingContent.toLowerCase().includes('please share') ||
    gradingContent.toLowerCase().includes('could you please provide')
  ) {
    throw new Error(
      'Failed to process the exam PDFs. This may be a temporary issue with the PDF conversion. ' +
      'Please try again, or ensure your PDFs are clear and readable.'
    )
  }

  // Parse grade breakdown
  const gradeBreakdown = parseGradingBreakdown(gradingContent)

  let totalMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksAwarded, 0)
  let totalPossibleMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksPossible, 0)

  const totalPatterns = [
    /Total\s+(?:Mark|Marks)?[:\s]+(\d+)\s*\/\s*(\d+)/i,
    /Overall.*?(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?)/i,
    /Total.*?(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?)/i,
    /(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?)\s*\([^)]*%\)/i,
  ]

  for (const pattern of totalPatterns) {
    const m = gradingContent.match(pattern)
    if (m) {
      const foundTotal = parseInt(m[1], 10)
      const foundPossible = parseInt(m[2], 10)
      if (foundPossible > totalPossibleMarks && foundTotal >= 0 && foundPossible > 0) {
        totalMarks = foundTotal
        totalPossibleMarks = foundPossible
        break
      }
    }
  }

  if (totalPossibleMarks === 0) {
    let sumAwarded = 0, sumPossible = 0
    for (const m of gradingContent.matchAll(/Question\s+\d+\s+Total[:\s]+(\d+)\s*\/\s*(\d+)/gi)) {
      sumAwarded += parseInt(m[1], 10)
      sumPossible += parseInt(m[2], 10)
    }
    if (sumPossible > 0) { totalMarks = sumAwarded; totalPossibleMarks = sumPossible }
  }

  // Generate graded PDF
  const gradingId = `graded_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

  const pdfContent = generateGradingPDFContent(
    gradingContent, totalMarks, totalPossibleMarks, gradeBreakdown,
    markSchemeFile?.name ?? 'mark-scheme', primaryStudentFile.name, additionalComments
  )

  const pdfBuffer = await PDFShiftPDFGenerator.generatePDF({
    id: gradingId,
    title: `Graded Exam - ${primaryStudentFile.name}`,
    content: pdfContent,
    format: 'summary',
    generatedAt: new Date(),
    fileCount: 2,
    subject: 'AICE Business',
    gradeLevel: 'AICE Level',
    tokenUsage: claudeResponse.usage,
  })

  if (!pdfBuffer || !Buffer.isBuffer(pdfBuffer) || pdfBuffer.length === 0) {
    throw new Error('Failed to generate valid PDF buffer')
  }

  storePDF(gradingId, pdfBuffer)

  const pdfDataUrl = `data:application/pdf;base64,${pdfBuffer.toString('base64')}`
  const pdfUrl = `/api/pdf/${gradingId}.pdf`

  const percentage = totalPossibleMarks > 0 ? (totalMarks / totalPossibleMarks) * 100 : 0
  let grade = 'F'
  if (percentage >= 90) grade = 'A'
  else if (percentage >= 80) grade = 'B'
  else if (percentage >= 70) grade = 'C'
  else if (percentage >= 60) grade = 'D'

  const studentName = primaryStudentFile.name.replace(/\.(pdf|docx|pptx|txt)$/i, '').replace(/_/g, ' ')

  // Always use service-role admin client so the insert works regardless of
  // whether the call originated from a browser request (cookie auth) or an
  // internal server-to-server call (no cookies).
  const { data: savedGrading, error: dbError } = await createAdminClient()
    .from('grading_results')
    .insert({
      user_id: userId,
      student_name: studentName,
      answer_sheet_filename: markSchemeFile?.name ?? null,
      student_exam_filename: primaryStudentFile.name,
      total_marks: totalMarks,
      total_possible_marks: totalPossibleMarks,
      percentage: parseFloat(percentage.toFixed(2)),
      grade,
      content: gradingContent,
      grade_breakdown: gradeBreakdown,
      additional_comments: additionalComments ?? null,
      pdf_url: pdfUrl,
      token_usage: claudeResponse.usage,
    })
    .select()
    .single()

  if (dbError || !savedGrading) {
    throw new Error(`Failed to save grading result: ${dbError?.message ?? 'no data returned'}`)
  }

  return {
    id: savedGrading.id,
    pdfUrl,
    pdfDataUrl,
    totalMarks,
    totalPossibleMarks,
    gradeBreakdown,
    fullResponse: gradingContent,
  }
}

// ---------------------------------------------------------------------------
// Helpers (previously private to grade-exam/route.ts)
// ---------------------------------------------------------------------------

export function parseGradingBreakdown(content: string): GradeBreakdownItem[] {
  const breakdown: GradeBreakdownItem[] = []

  // Method 1: "Mark: X/Y - explanation" format (what Claude produces naturally)
  let questionContext = '1'
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const questionHeaderMatch = line.match(/Question\s*(\d+)\s*-\s*[^(]+\(Total:\s*(\d+)/i)
    if (questionHeaderMatch) questionContext = questionHeaderMatch[1]

    const subQuestionMatch = line.match(/(\d+(?:\([a-z]+\))*(?:\([a-z]+\))?)\s*-\s*/i)
    if (subQuestionMatch) questionContext = subQuestionMatch[1]

    const altSubQuestionMatch = line.match(/^(\d+(?:\([a-z]+\))*(?:\([a-z]+\))?)[\s\-]/i)
    if (altSubQuestionMatch && !line.includes('Mark:')) questionContext = altSubQuestionMatch[1]

    const markMatch = line.match(/Mark:\s*(\d+)\s*\/\s*(\d+)\s*-\s*(.+)/i)
    if (markMatch) {
      let fullExplanation = markMatch[3].trim()
      if (fullExplanation.length < 50 && i + 1 < lines.length) {
        let j = i + 1
        while (j < lines.length && j < i + 3 && !lines[j].match(/Mark:|Question|^\d+[\(\)]/)) {
          if (lines[j].trim() && !lines[j].match(/^[-=*#\s]+$/)) {
            fullExplanation += ' ' + lines[j].trim()
          }
          j++
        }
      }
      breakdown.push({
        questionNumber: questionContext,
        marksAwarded: parseInt(markMatch[1], 10),
        marksPossible: parseInt(markMatch[2], 10),
        explanation: fullExplanation,
      })
    }
  }

  if (breakdown.length > 0) {
    return cleanBreakdown(breakdown)
  }

  // Method 1b: QUESTION/MARKS_AWARDED/MARKS_POSSIBLE/EXPLANATION structured format
  const structuredPattern = /QUESTION:\s*(.+?)\s*MARKS_AWARDED:\s*(\d+)\s*MARKS_POSSIBLE:\s*(\d+)\s*EXPLANATION:\s*(.+?)(?=QUESTION:|$)/gis
  let m
  while ((m = structuredPattern.exec(content)) !== null) {
    breakdown.push({
      questionNumber: m[1].trim(),
      marksAwarded: parseInt(m[2], 10),
      marksPossible: parseInt(m[3], 10),
      explanation: m[4].trim(),
    })
  }
  if (breakdown.length > 0) return cleanBreakdown(breakdown)

  // Method 2: flexible question/marks patterns
  const flexiblePattern = /(?:Question|QUESTION|Q):\s*(.+?)\s*(?:Marks\s*Awarded|MARKS_AWARDED|Marks):\s*(\d+)\s*(?:out\s*of|\/|Marks\s*Possible|MARKS_POSSIBLE):\s*(\d+)\s*(?:Explanation|EXPLANATION)?\s*(.+?)(?=(?:Question|QUESTION|Q):|$)/gis
  while ((m = flexiblePattern.exec(content)) !== null) {
    breakdown.push({
      questionNumber: m[1].trim(),
      marksAwarded: parseInt(m[2], 10),
      marksPossible: parseInt(m[3], 10),
      explanation: m[4] ? m[4].trim() : 'No explanation provided',
    })
  }
  if (breakdown.length > 0) return cleanBreakdown(breakdown)

  // Method 3: line-by-line question detection
  {
    const lns = content.split('\n')
    let currentQuestion: GradeBreakdownItem | null = null
    let questionCounter = 1

    for (let i = 0; i < lns.length; i++) {
      const line = lns[i].trim()

      const questionMatch =
        line.match(/(?:question|Question|QUESTION|Q|Part)\s*[:\s]*(\d+|[a-z]|\d+[a-z]?)/i) ||
        line.match(/^(\d+)[\.\)]\s*[A-Z]/) ||
        line.match(/^([a-z])[\.\)]\s*[A-Z]/i)

      if (questionMatch) {
        if (currentQuestion && (currentQuestion.marksPossible > 0 || currentQuestion.explanation.length > 10)) {
          breakdown.push(currentQuestion)
        }
        currentQuestion = {
          questionNumber: questionMatch[1] || String(questionCounter),
          marksAwarded: 0,
          marksPossible: 0,
          explanation: line + ' ',
        }
        questionCounter++
        continue
      }

      if (currentQuestion) {
        const markFormatMatch = line.match(/Mark:\s*(\d+)\s*\/\s*(\d+)\s*-\s*(.+)/i)
        if (markFormatMatch) {
          currentQuestion.marksAwarded = parseInt(markFormatMatch[1], 10)
          currentQuestion.marksPossible = parseInt(markFormatMatch[2], 10)
          currentQuestion.explanation = markFormatMatch[3].trim()
          continue
        }

        const marksPatterns = [
          /(\d+)\s*\/\s*(\d+)\s*(?:marks?|points?|pts?)?/i,
          /(\d+)\s*out\s*of\s*(\d+)\s*(?:marks?|points?|pts?)?/i,
          /(?:marks?|points?|pts?)[:\s]+(\d+)\s*\/\s*(\d+)/i,
          /award(?:ed)?[:\s]+(\d+)\s*(?:out\s*of|\/|\s+of)\s*(\d+)/i,
        ]
        for (const pattern of marksPatterns) {
          const marksMatch = line.match(pattern)
          if (marksMatch && marksMatch[2]) {
            currentQuestion.marksAwarded = parseInt(marksMatch[1], 10)
            currentQuestion.marksPossible = parseInt(marksMatch[2], 10)
            break
          }
        }
      }

      if (currentQuestion && line.length > 5 && !line.match(/^[-=*#\s]+$/)) {
        if (!line.match(/^(QUESTION|MARKS|EXPLANATION|---|===)/i)) {
          currentQuestion.explanation += line + ' '
        }
      }
    }

    if (currentQuestion && (currentQuestion.marksPossible > 0 || currentQuestion.explanation.length > 10)) {
      breakdown.push(currentQuestion)
    }
    if (breakdown.length > 0) return cleanBreakdown(breakdown)
  }

  // Fallback
  return [{
    questionNumber: '1',
    marksAwarded: 0,
    marksPossible: 0,
    explanation: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
  }]
}

function cleanBreakdown(breakdown: GradeBreakdownItem[]): GradeBreakdownItem[] {
  return breakdown.map(item => ({
    ...item,
    explanation: item.explanation.replace(/\s+/g, ' ').trim().substring(0, 500) +
      (item.explanation.replace(/\s+/g, ' ').trim().length > 500 ? '...' : ''),
  }))
}

export function generateGradingPDFContent(
  gradingContent: string,
  totalMarks: number,
  totalPossibleMarks: number,
  gradeBreakdown: GradeBreakdownItem[],
  markSchemeName: string,
  studentExamName: string,
  additionalComments?: string
): string {
  const percentage = totalPossibleMarks > 0 ? ((totalMarks / totalPossibleMarks) * 100).toFixed(1) : '0'
  const currentDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })

  let grade = 'F'
  let gradeColor = '#dc2626'
  const percentNum = parseFloat(percentage)
  if (percentNum >= 90) { grade = 'A'; gradeColor = '#059669' }
  else if (percentNum >= 80) { grade = 'B'; gradeColor = '#3b82f6' }
  else if (percentNum >= 70) { grade = 'C'; gradeColor = '#f59e0b' }
  else if (percentNum >= 60) { grade = 'D'; gradeColor = '#f97316' }

  const studentName = studentExamName.replace(/\.(pdf|docx)$/i, '').replace(/_/g, ' ')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #111827; line-height: 1.5; padding: 24px; background: #fff; }
.header { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; margin-bottom: 24px; border-bottom: 2px solid #e5e7eb; }
.student-name { font-size: 22px; font-weight: 700; color: #111827; }
.date { font-size: 13px; color: #6b7280; }
.score-banner { background: linear-gradient(135deg, ${gradeColor}15 0%, ${gradeColor}08 100%); border-left: 4px solid ${gradeColor}; padding: 20px 24px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: center; }
.score-main { display: flex; gap: 24px; align-items: center; }
.grade-box { font-size: 48px; font-weight: 800; color: ${gradeColor}; line-height: 1; min-width: 70px; text-align: center; }
.score-info { display: flex; flex-direction: column; gap: 4px; }
.score-points { font-size: 20px; font-weight: 600; color: #111827; }
.score-percent { font-size: 15px; color: #6b7280; }
.section-title { font-size: 16px; font-weight: 700; color: #111827; margin: 24px 0 12px 0; padding-bottom: 6px; border-bottom: 1px solid #e5e7eb; }
.question { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px 16px; margin-bottom: 10px; }
.q-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.q-number { font-size: 14px; font-weight: 700; color: #111827; }
.q-score { font-size: 13px; font-weight: 600; padding: 4px 10px; border-radius: 12px; white-space: nowrap; }
.q-feedback { font-size: 13px; color: #374151; line-height: 1.5; }
.summary { margin-top: 24px; padding-top: 20px; border-top: 2px solid #e5e7eb; display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.summary-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
.summary-title { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.summary-list { font-size: 13px; color: #374151; line-height: 1.6; }
.summary-list li { margin-bottom: 4px; }
.footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 11px; color: #9ca3af; }
</style>
</head>
<body>
<div class="header">
  <div class="student-name">${studentName}</div>
  <div class="date">${currentDate}</div>
</div>
<div class="score-banner">
  <div class="score-main">
    <div class="grade-box">${grade}</div>
    <div class="score-info">
      <div class="score-points">${totalMarks} / ${totalPossibleMarks} marks</div>
      <div class="score-percent">${percentage}% • AICE Business Exam</div>
    </div>
  </div>
</div>
<div class="section-title">Question Breakdown</div>
${gradeBreakdown.map((item) => {
  const qPercent = item.marksPossible > 0 ? ((item.marksAwarded / item.marksPossible) * 100) : 0
  let color = '#dc2626', bg = '#dc262615'
  if (qPercent >= 80) { color = '#059669'; bg = '#05966915' }
  else if (qPercent >= 60) { color = '#3b82f6'; bg = '#3b82f615' }
  else if (qPercent >= 40) { color = '#f59e0b'; bg = '#f59e0b15' }
  return `<div class="question">
  <div class="q-header">
    <div class="q-number">Question ${item.questionNumber}</div>
    <div class="q-score" style="background: ${bg}; color: ${color};">${item.marksAwarded}/${item.marksPossible} (${qPercent.toFixed(0)}%)</div>
  </div>
  <div class="q-feedback">${item.explanation}</div>
</div>`
}).join('')}
<div class="summary">
  <div class="summary-box">
    <div class="summary-title">Strengths</div>
    <ul class="summary-list">
      ${gradeBreakdown.filter(q => q.marksPossible > 0 && (q.marksAwarded / q.marksPossible) >= 0.7).slice(0, 3)
        .map(q => `<li>Question ${q.questionNumber}</li>`).join('') || '<li>Keep building on fundamentals</li>'}
    </ul>
  </div>
  <div class="summary-box">
    <div class="summary-title">Focus Areas</div>
    <ul class="summary-list">
      ${gradeBreakdown.filter(q => q.marksPossible > 0 && (q.marksAwarded / q.marksPossible) < 0.5).slice(0, 3)
        .map(q => `<li>Question ${q.questionNumber}</li>`).join('') || '<li>Maintain strong performance</li>'}
    </ul>
  </div>
</div>
<div class="footer">CasanovaStudy Exam Grader • ${currentDate}</div>
</body>
</html>`
}
