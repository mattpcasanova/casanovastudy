/**
 * Core grading pipeline — shared by the manual grade-exam HTTP route and the
 * automatic submission grading triggered on student submit.
 *
 * Keeping this in a lib file means there is no internal server-to-server HTTP
 * call; both paths call the same function directly.
 */

import { DEFAULT_SCALE, gradeFor } from '@/lib/grading/scale'
import { FileProcessor } from './file-processing'
import { ClaudeService } from './claude-api'
import { createAdminClient } from './supabase-server'
import { parseGradingOutput } from './grading/parse'

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

  // Parse grade breakdown — same line-based parser as the streaming teacher
  // path (lib/grading/parse.ts). The legacy multi-strategy parser is kept only
  // as a fallback for responses that don't follow the requested format.
  let gradeBreakdown: GradeBreakdownItem[] = parseGradingOutput(gradingContent).breakdown
  if (gradeBreakdown.length === 0) gradeBreakdown = parseGradingBreakdown(gradingContent)

  let totalMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksAwarded, 0)
  let totalPossibleMarks = gradeBreakdown.reduce((sum, item) => sum + item.marksPossible, 0)

  // Only when no per-question lines were found, fall back to the model's own
  // "Total: X/Y" line (otherwise the breakdown sum is authoritative, as in the
  // streaming path — the model's total can disagree with its own marks).
  if (totalPossibleMarks === 0) {
    const totalPatterns = [
      /Total\s+(?:Mark|Marks)?[:\s]+(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)/i,
      /Overall.*?(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:marks?|points?)/i,
      /Total.*?(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:marks?|points?)?/i,
    ]
    for (const pattern of totalPatterns) {
      const m = gradingContent.replace(/\*\*/g, '').match(pattern)
      if (m && parseFloat(m[2]) > 0) {
        totalMarks = parseFloat(m[1])
        totalPossibleMarks = parseFloat(m[2])
        break
      }
    }
  }

  const percentage = totalPossibleMarks > 0 ? (totalMarks / totalPossibleMarks) * 100 : 0
  const grade = gradeFor(DEFAULT_SCALE, totalMarks, totalPossibleMarks)

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
      token_usage: claudeResponse.usage,
    })
    .select()
    .single()

  if (dbError || !savedGrading) {
    throw new Error(`Failed to save grading result: ${dbError?.message ?? 'no data returned'}`)
  }

  return {
    id: savedGrading.id,
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
