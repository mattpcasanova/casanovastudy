// Turn logged wrong answers back into the questions themselves, so a
// weak-spot quiz can be written from what the student actually missed.
// study_results.item_id is `q:<id>` for quiz questions (lib/formats/quiz.ts ids)
// and `p:<id>` for practice activities (lib/formats/practice.ts ids). Pure and
// unit-tested; Learn and custom-guide items are skipped (no stable text here).

import { parseQuizContent } from '@/lib/formats/quiz'
import { parsePractice, type PracticeActivity } from '@/lib/formats/practice'
import { plainText } from '@/lib/formats/normalize'
import type { GuidePrefill } from '@/lib/prefill'

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

/** The homepage request for "a new quiz on what I missed" in one guide. */
export function missedPrefill(guide: { title: string; subject?: string | null; gradeLevel?: string | null }, missed: MissedQuestion[]): GuidePrefill {
  const lines: string[] = []
  let used = 0
  for (const [i, m] of missed.entries()) {
    const line = `${i + 1}. ${m.question} (Correct answer: ${m.answer})`
    if (used + line.length > 6000) break // the request limit is 8,000 characters
    lines.push(line)
    used += line.length
  }
  const n = missed.length
  return {
    source: 'missed-quiz',
    sourceTitle: guide.title,
    studyGuideName: `Review: ${guide.title}`.slice(0, 120),
    format: 'quiz',
    subject: guide.subject ?? undefined,
    gradeLevel: guide.gradeLevel ?? undefined,
    detail: `${n} question${n === 1 ? '' : 's'} you missed`,
    studyRequest: [
      `Make a new practice quiz on what I got wrong in "${guide.title}".`,
      '',
      'These are the questions I missed, with the correct answers:',
      ...lines,
      '',
      'Write fresh questions that test the same skills from different angles (don\'t copy these word for word). Start with a couple of easier warm-up questions, then build up, and explain every answer so I understand why.',
    ].join('\n'),
  }
}
