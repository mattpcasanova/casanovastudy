// Turn logged wrong answers back into the questions themselves, so a
// weak-spot quiz can be written from what the student actually missed.
// study_results.item_id is `q:<id>` for quiz questions (lib/formats/quiz.ts ids)
// and `p:<id>` for practice activities (lib/formats/practice.ts ids). Pure and
// unit-tested; Learn and custom-guide items are skipped (no stable text here).

import { parseQuizContent } from '@/lib/formats/quiz'
import { parsePractice, type PracticeActivity } from '@/lib/formats/practice'
import { plainText } from '@/lib/formats/normalize'

export interface MissedQuestion {
  question: string
  answer: string
}

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)

function activityText(a: PracticeActivity): MissedQuestion | null {
  switch (a.kind) {
    case 'choice': return { question: a.prompt, answer: a.options[a.correct] ?? '' }
    case 'fill': return {
      question: a.parts.map((p) => (typeof p === 'string' ? p : '___')).join(''),
      answer: a.parts.filter((p): p is { answers: string[] } => typeof p !== 'string').map((p) => p.answers[0]).join('; '),
    }
    case 'match': return { question: a.prompt, answer: a.pairs.map((p) => `${p.term} = ${p.definition}`).join('; ') }
    case 'order': return { question: a.prompt, answer: a.items.join(' → ') }
    case 'sort': return { question: a.prompt, answer: a.buckets.map((b) => `${b.name}: ${b.items.join(', ')}`).join('; ') }
    case 'bug': return { question: a.prompt, answer: a.fix ?? 'the buggy line' }
  }
}

/** The questions behind these item ids in one guide's content. */
export function missedQuestionsFromGuide(content: string, itemIds: string[]): MissedQuestion[] {
  const out: MissedQuestion[] = []
  const quizIds = new Set(itemIds.filter((id) => id.startsWith('q:')).map((id) => id.slice(2)))
  const practiceIds = new Set(itemIds.filter((id) => id.startsWith('p:')).map((id) => id.slice(2)))
  if (quizIds.size) {
    for (const q of parseQuizContent(content)) {
      if (!quizIds.has(q.id)) continue
      const answer = q.type === 'mc' ? q.correctAnswer : q.type === 'tf' ? (q.correctAnswer ? 'True' : 'False') : q.sampleAnswer
      out.push({ question: q.question, answer })
    }
  }
  if (practiceIds.size) {
    for (const a of parsePractice(content)) {
      if (!practiceIds.has(a.id)) continue
      const m = activityText(a)
      if (m) out.push(m)
    }
  }
  return out.map((m) => ({ question: clip(plainText(m.question), 280), answer: clip(plainText(m.answer), 180) }))
}
