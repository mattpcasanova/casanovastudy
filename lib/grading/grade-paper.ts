// Grade one student paper against a mark scheme: the shared engine behind the
// single-paper grader (/api/grade-exam-stream) and batch grading
// (/api/grade-batch/paper). Streams Claude's marking (Sonnet 5, adaptive
// thinking), checks every mark-scheme question was graded, re-grades any it
// missed, drops "phantom" questions not in the scheme, and tallies the result.
// Moved out of the stream route 2026-10-03; behavior unchanged.

import { ClaudeService } from '@/lib/claude-api'
import { parseGradingOutput, type GradedQuestion } from '@/lib/grading/parse'

export type { GradedQuestion }

export interface PaperFile {
  buffer: Buffer
  name: string
  type: string
}

export interface GradedPaper {
  content: string
  breakdown: GradedQuestion[]
  totalMarks: number
  totalPossible: number
  percentage: number
  grade: string
  usage: { input_tokens: number; output_tokens: number; cache_read_input_tokens?: number; cache_creation_input_tokens?: number } | null
}

// Normalize question numbers for comparison, keeping section prefixes so
// Section A "2a" and Section C "2a" stay distinct.
export function normalizeQuestionNumber(qNum: string): string {
  return qNum
    .toLowerCase()
    .replace(/^question\s*/i, '')
    .replace(/^q\.?\s*/i, '')
    .replace(/\s+/g, '')
}

/** The "[MARK SCHEME SUMMARY] ... [END SUMMARY]" block Claude writes first. */
export function parseMarkSchemeSummary(content: string): { questions: Array<{ num: string; marks: number }>; total: number } | null {
  const match = content.match(/\[MARK SCHEME SUMMARY\]([\s\S]*?)\[END SUMMARY\]/i)
  if (!match) return null
  const summaryText = match[1]
  const questions: Array<{ num: string; marks: number }> = []
  // Entries like "1a(2)", "1(a)(3)", "Section A 2b(5)", "2 (4)".
  const entryPattern = /([A-Za-z0-9\s()]+?)\s*\((\d+)\)/g
  let entry
  while ((entry = entryPattern.exec(summaryText)) !== null) {
    const questionNum = entry[1].trim()
    const marks = parseInt(entry[2])
    if (!/total|marks|summary/i.test(questionNum) && marks > 0) questions.push({ num: questionNum, marks })
  }
  const totalMatch = summaryText.match(/Total:\s*(\d+)/i)
  const total = totalMatch ? parseInt(totalMatch[1]) : questions.reduce((s, q) => s + q.marks, 0)
  return { questions, total }
}

function findMissingQuestions(expected: Array<{ num: string; marks: number }>, graded: GradedQuestion[]) {
  const normalizedGraded = new Set(graded.map(q => normalizeQuestionNumber(q.questionNumber)))
  return expected.filter(q => !normalizedGraded.has(normalizeQuestionNumber(q.num)))
}

/** Drop questions that weren't in the mark scheme (allowing section-prefix variations). */
function filterToMarkSchemeQuestions(graded: GradedQuestion[], expected: Array<{ num: string; marks: number }>): GradedQuestion[] {
  const normalizedExpected = new Set(expected.map(q => normalizeQuestionNumber(q.num)))
  return graded.filter(q => {
    const normalized = normalizeQuestionNumber(q.questionNumber)
    if (normalizedExpected.has(normalized)) return true
    for (const exp of expected) {
      const expNorm = normalizeQuestionNumber(exp.num)
      if (normalized.includes(expNorm) || expNorm.includes(normalized)) return true
    }
    console.log(`⚠️ Filtering out unexpected question: "${q.questionNumber}" (not in mark scheme summary)`)
    return false
  })
}

export function letterGrade(percentage: number): string {
  if (percentage >= 90) return 'A'
  if (percentage >= 80) return 'B'
  if (percentage >= 70) return 'C'
  if (percentage >= 60) return 'D'
  return 'F'
}

export async function gradePaper(input: {
  markScheme: PaperFile[]
  student: PaperFile[]
  additionalComments?: string
  /** Live marking text (the single-paper page streams it). */
  onChunk?: (text: string) => void
  onProgress?: (message: string) => void
}): Promise<GradedPaper> {
  const claude = new ClaudeService()
  const gen = claude.gradeExamWithImagesStream({
    markSchemeText: '',
    studentExamText: '',
    markSchemeFiles: input.markScheme,
    studentExamFiles: input.student,
    additionalComments: input.additionalComments || undefined,
  })

  // Iterate manually: for-await drops the generator's return value (the usage).
  let content = ''
  let usage: GradedPaper['usage'] = null
  while (true) {
    const next = await gen.next()
    if (next.done) { usage = next.value?.usage ?? null; break }
    content += next.value
    input.onChunk?.(next.value)
  }

  let { breakdown, totalMarks, totalPossible, grade } = parseGradingOutput(content)

  const summary = parseMarkSchemeSummary(content)
  if (summary) {
    const before = breakdown.length
    breakdown = filterToMarkSchemeQuestions(breakdown, summary.questions)
    if (breakdown.length < before) {
      totalMarks = breakdown.reduce((sum, q) => sum + q.marksAwarded, 0)
      totalPossible = breakdown.reduce((sum, q) => sum + q.marksPossible, 0)
    }

    const missing = findMissingQuestions(summary.questions, breakdown)
    if (missing.length > 0) {
      input.onProgress?.(`Grading ${missing.length} additional question${missing.length > 1 ? 's' : ''}...`)
      try {
        const followUp = await claude.gradeMissingQuestions({
          markSchemeFiles: input.markScheme,
          studentExamFiles: input.student,
          missingQuestions: missing.map(q => `${q.num}(${q.marks})`),
          additionalComments: input.additionalComments || undefined,
        })
        // The follow-up call is part of this paper's cost.
        if (usage && followUp.usage) {
          usage = { ...usage, input_tokens: usage.input_tokens + (followUp.usage.input_tokens ?? 0), output_tokens: usage.output_tokens + (followUp.usage.output_tokens ?? 0) }
        }
        if (followUp.content) {
          const extra = '\n\n--- Additional Questions ---\n\n' + followUp.content
          content += extra
          input.onChunk?.(extra)
          const seen = new Set(breakdown.map(q => normalizeQuestionNumber(q.questionNumber)))
          for (const item of parseGradingOutput(followUp.content).breakdown) {
            if (!seen.has(normalizeQuestionNumber(item.questionNumber))) breakdown.push(item)
          }
          totalMarks = breakdown.reduce((sum, q) => sum + q.marksAwarded, 0)
          totalPossible = breakdown.reduce((sum, q) => sum + q.marksPossible, 0)
          grade = letterGrade(totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0)
        }
      } catch (e) {
        console.error('Follow-up grading failed:', e) // keep what we have
      }
    }
  } else {
    console.log('⚠️ No mark scheme summary found in response - cannot verify completeness')
  }

  const percentage = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0
  return { content, breakdown, totalMarks, totalPossible, percentage, grade, usage }
}
