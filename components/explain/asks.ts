// Builds "Why?" requests for the Explain panel from quiz questions and
// practice activities: the question, its options, the right answer, what the
// student picked, and the guide's explanation.

import type { Question } from '@/lib/formats/quiz'
import type { PracticeActivity } from '@/lib/formats/practice'
import type { ExplainRequest } from './explain-provider'

const clip = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t)
const letter = (i: number) => String.fromCharCode(65 + i)

export function quizAsk(q: Question, chosen?: string): ExplainRequest {
  const lines = [`Explain this question from my quiz:`, q.question]
  if (q.type === 'mc') {
    q.options.forEach((o, i) => lines.push(`${letter(i)}) ${o}`))
    lines.push(`Correct answer: ${q.correctAnswer}`)
    if (chosen && chosen !== q.correctAnswer) lines.push(`I picked: ${chosen}`)
  } else if (q.type === 'tf') {
    lines.push(`Correct answer: ${q.correctAnswer ? 'True' : 'False'}`)
    if (chosen) lines.push(`I picked: ${chosen === 'true' ? 'True' : 'False'}`)
  } else {
    lines.push(`Model answer: ${q.sampleAnswer}`)
    if (chosen) lines.push(`My answer: ${chosen}`)
  }
  if (q.figure) lines.push('(The question shows a figure described by this spec:)', q.figure)
  if (q.explanation) lines.push(`The guide's explanation: ${q.explanation}`)
  return { label: `Why? “${clip(q.question.split('\n')[0], 110)}”`, prompt: lines.join('\n') }
}

export function activityAsk(a: PracticeActivity): ExplainRequest {
  const lines = ['Explain this practice activity from my guide:', a.prompt]
  switch (a.kind) {
    case 'choice':
      a.options.forEach((o, i) => lines.push(`${letter(i)}) ${o}`))
      lines.push(`Correct answer: ${a.options[a.correct]}`)
      break
    case 'match': a.pairs.forEach((p) => lines.push(`${p.term} = ${p.definition}`)); break
    case 'fill': lines.push(a.parts.map((p) => (typeof p === 'string' ? p : `[${p.answers[0]}]`)).join('')); break
    case 'order': lines.push(`Correct order: ${a.items.join(' → ')}`); break
    case 'sort': a.buckets.forEach((b) => lines.push(`${b.name}: ${b.items.join(', ')}`)); break
    case 'bug': lines.push(a.code.text, `Bug on line ${a.bugLines.join(', ')}${a.fix ? `; fix: ${a.fix}` : ''}`); break
  }
  if (a.code && a.kind !== 'bug') lines.push(a.code.text)
  if (a.figure) lines.push('(Figure spec:)', a.figure)
  if (a.explanation) lines.push(`The guide's explanation: ${a.explanation}`)
  const title = a.kind === 'fill' ? a.parts.map((p) => (typeof p === 'string' ? p : '___')).join('') : a.prompt
  return { label: `Why? “${clip(title.split('\n')[0], 110)}”`, prompt: lines.join('\n') }
}
