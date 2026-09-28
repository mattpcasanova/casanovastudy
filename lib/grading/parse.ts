// Parses the exam-grading model output into a per-question breakdown.
//
// The grading prompt asks for one entry per question:
//   **Question 1a**, Mark: 2/2 - feedback…   (feedback may wrap onto following lines)
// followed by closing sections (Total:, Percentage:, Grade:, Feedback:, Strengths:,
// Areas for improvement:). Parsing is LINE-based: an entry's feedback runs until
// the next entry line or a closing-section heading at the START of a line — so
// feedback that merely mentions "percentage" or "total" is no longer cut off
// (the old single regex stopped at those words anywhere in the text).

export interface GradedQuestion {
  questionNumber: string // bare label: "1", "2a", "3(b)(i)", "Section C 2a"
  marksAwarded: number
  marksPossible: number
  explanation: string
}

// "**Question 1a**, Mark: 2/2 - text", "Question 1a: Mark 2/2", "2b, Mark: 1/3 — text",
// "**1(a)(i)** Mark: 1/2", "- Question 4, Marks: 2.5/3: text"
const ENTRY = /^\s*(?:[-*•]\s+)?(?:\*\*)?\s*(?:question\s+|q\.?\s*)?(.{1,50}?)\s*(?:\*\*)?\s*[,:\-–—]?\s*(?:\*\*)?\s*marks?\s*(?:awarded)?\s*[:=]?\s*(?:\*\*)?\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*(?:marks?)?\s*(?:\*\*)?\s*[-–—:.]?\s*(.*)$/i

// Closing sections that end the last question's feedback (must start the line).
const SECTION_END = /^\s*(?:#{1,6}\s*)?(?:\*\*)?\s*(?:total(?:\s+marks)?|percentage|overall\s+grade|grade|final\s+grade|overall\s+feedback|general\s+feedback|feedback|summary|strengths|areas\s+(?:for|to)\s+improve\w*|next\s+steps|\[mark scheme summary\]|\[end summary\])\b/i

function cleanLabel(raw: string): string | null {
  const label = raw.replace(/\*\*/g, '').replace(/^(?:question|q\.?)\s*/i, '').replace(/[\s,:\-–—]+$/, '').trim()
  if (!label || label.length > 50) return null
  // Must look like a question identifier: contains a digit, or is a section/part reference.
  if (!/\d/.test(label) && !/^(section|part|option)\b/i.test(label)) return null
  // Reject prose that happens to contain "mark x/y" (e.g. "Lost 3 marks").
  if (/\b(lost|awarded|scored|gets?|earned|the|student|answer|because|but)\b/i.test(label)) return null
  return label
}

export function normalizeQuestionKey(label: string): string {
  return label.toLowerCase().replace(/^(?:question|q\.?)\s*/i, '').replace(/\s+/g, '')
}

export function parseGradingOutput(content: string): {
  breakdown: GradedQuestion[]
  totalMarks: number
  totalPossible: number
  grade: string
} {
  const breakdown: GradedQuestion[] = []
  const seen = new Set<string>()
  let current: GradedQuestion | null = null
  let inSummary = false

  const finish = () => {
    if (current) {
      current.explanation = current.explanation.replace(/\*\*/g, '').replace(/\s+/g, ' ').trim().slice(0, 2000)
      breakdown.push(current)
    }
    current = null
  }

  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    // Skip the mark-scheme summary block entirely.
    if (/\[mark scheme summary\]/i.test(line)) { finish(); inSummary = true; continue }
    if (inSummary) { if (/\[end summary\]/i.test(line)) inSummary = false; continue }

    const m = line.match(ENTRY)
    const label = m ? cleanLabel(m[1]) : null
    if (m && label) {
      finish()
      const key = normalizeQuestionKey(label)
      if (seen.has(key)) continue // duplicates: keep the first grading
      seen.add(key)
      current = {
        questionNumber: label,
        marksAwarded: parseFloat(m[2]),
        marksPossible: parseFloat(m[3]),
        explanation: m[4] ?? '',
      }
      continue
    }
    if (SECTION_END.test(line)) { finish(); continue }
    if (current && line.trim()) current.explanation += ' ' + line.trim()
  }
  finish()

  // Totals and grade always come from the breakdown (the model's own Total line
  // and letter grade can disagree or use non-US scales).
  const totalMarks = breakdown.reduce((s, q) => s + q.marksAwarded, 0)
  const totalPossible = breakdown.reduce((s, q) => s + q.marksPossible, 0)
  const pct = totalPossible > 0 ? (totalMarks / totalPossible) * 100 : 0
  const grade = pct >= 90 ? 'A' : pct >= 80 ? 'B' : pct >= 70 ? 'C' : pct >= 60 ? 'D' : 'F'
  return { breakdown, totalMarks, totalPossible, grade }
}
