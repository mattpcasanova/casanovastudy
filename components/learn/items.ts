"use client"

// Turns a study guide into Learn-mode items. Item ids are stable across visits
// (they key the spaced-repetition state saved per guide): parser ids for
// flashcards/quiz/practice, block ids for custom guides.

import type { StudyGuideRecord } from '@/lib/supabase'
import type { CustomGuideContent, CustomSection, QuizQuestion } from '@/lib/types/custom-guide'
import { parsePractice, normalizePracticeActivities, type PracticeActivity, type ChoiceActivity } from '@/lib/formats/practice'
import { normalizeGuideMarkdown } from '@/lib/formats/normalize'
import { parseFlashcards } from '@/components/formats/flashcards-format'
import { parseQuizContent } from '@/components/formats/quiz-format'
import { parseTimeline } from '@/lib/formats/timeline'

export type LearnItem =
  | { id: string; kind: 'activity'; activity: PracticeActivity; topic?: string }
  | { id: string; kind: 'card'; front: string; back: string; topic?: string } // self-graded

export const LEARN_FORMATS = ['flashcards', 'quiz', 'practice', 'custom', 'timeline'] as const

function choice(id: string, prompt: string, options: string[], correct: number, topic?: string, explanation?: string): ChoiceActivity {
  return { kind: 'choice', id, prompt, options, correct, topic: topic ?? '', explanation }
}

function fromCustomQuiz(q: QuizQuestion, topic?: string): LearnItem | null {
  const id = `c:${q.id}`
  if (q.questionType === 'true-false') {
    const isTrue = q.correctAnswer === true || String(q.correctAnswer).toLowerCase() === 'true'
    return { id, kind: 'activity', topic, activity: choice(id, q.question, ['True', 'False'], isTrue ? 0 : 1, topic, q.explanation) }
  }
  if (q.questionType === 'multiple-choice' && q.options && q.options.length >= 2) {
    const idx = q.options.findIndex((o) => o === q.correctAnswer)
    if (idx < 0) return null
    return { id, kind: 'activity', topic, activity: choice(id, q.question, q.options, idx, topic, q.explanation) }
  }
  // Short answer / calculation: self-graded card.
  if (q.question && q.correctAnswer !== undefined && String(q.correctAnswer).trim()) {
    return { id, kind: 'card', topic, front: q.question, back: [String(q.correctAnswer), q.explanation].filter(Boolean).join('\n\n') }
  }
  return null
}

function walkCustom(sections: CustomSection[], topic: string | undefined, out: LearnItem[]) {
  for (const s of sections) {
    const t = s.type === 'section' ? s.title || topic : topic
    const c = s.content as unknown as Record<string, unknown>
    if (s.type === 'flashcards' && Array.isArray(c?.cards)) {
      for (const card of c.cards as Array<{ id: string; front: string; back: string }>) {
        if (card.front?.trim() && card.back?.trim()) out.push({ id: `c:${card.id}`, kind: 'card', front: card.front, back: card.back, topic: t })
      }
    } else if (s.type === 'quiz' && Array.isArray(c?.questions)) {
      for (const q of c.questions as QuizQuestion[]) {
        const item = fromCustomQuiz(q, t)
        if (item) out.push(item)
      }
    } else if (s.type === 'practice' && Array.isArray(c?.activities)) {
      for (const a of normalizePracticeActivities(c.activities, { strict: true, idPrefix: s.id })) {
        out.push({ id: `c:${s.id}:${a.id}`, kind: 'activity', activity: a, topic: t })
      }
    }
    if (s.children?.length) walkCustom(s.children, t, out)
  }
}

export function learnItemsFor(guide: Pick<StudyGuideRecord, 'format' | 'content' | 'custom_content'>): LearnItem[] {
  switch (guide.format) {
    case 'practice':
      return parsePractice(guide.content).map((a) => ({ id: `p:${a.id}`, kind: 'activity' as const, activity: a, topic: a.topic || undefined }))
    case 'flashcards':
      return parseFlashcards(guide.content).map((c) => ({
        id: `f:${c.id}`, kind: 'card' as const, front: c.question, back: c.answer, topic: c.deck || undefined,
      }))
    case 'quiz':
      return parseQuizContent(guide.content).flatMap((q): LearnItem[] => {
        const id = `q:${q.id}`
        const topic = q.section || undefined
        if (q.type === 'mc') {
          const idx = q.options.indexOf(q.correctAnswer)
          return idx < 0 ? [] : [{ id, kind: 'activity', topic, activity: choice(id, q.question, q.options, idx, q.section, q.explanation) }]
        }
        if (q.type === 'tf') return [{ id, kind: 'activity', topic, activity: choice(id, q.question, ['True', 'False'], q.correctAnswer ? 0 : 1, q.section, q.explanation) }]
        return [{ id, kind: 'card', topic, front: q.question, back: normalizeGuideMarkdown(q.sampleAnswer) }]
      })
    case 'timeline': {
      const out: LearnItem[] = []
      parseTimeline(guide.content).eras.forEach((era, i) => {
        for (const ev of era.events) {
          if (!ev.date) continue
          out.push({
            id: `t:${ev.key}`, kind: 'card', topic: era.title,
            front: `When did this happen, and why did it matter?\n\n**${ev.title}**`,
            back: [`**${ev.date}**${ev.what ? ` — ${ev.what}` : ''}`, ev.why && `**Why it matters:** ${ev.why}`].filter(Boolean).join('\n\n'),
          })
        }
        // Put the era's events in order (3-6 of them, evenly spread).
        if (era.events.length >= 3) {
          const n = Math.min(6, era.events.length)
          const picks = Array.from({ length: n }, (_, k) => era.events[Math.round((k * (era.events.length - 1)) / (n - 1))])
          const id = `t:order:${i + 1}`
          out.push({ id, kind: 'activity', topic: era.title, activity: { kind: 'order', id, topic: era.title, prompt: `Put these events from ${era.title} in order`, items: picks.map((e) => e.title), explanation: picks.map((e) => `${e.title} (${e.date})`).join(' → ') } })
        }
      })
      return out
    }
    case 'custom': {
      const cc = guide.custom_content as CustomGuideContent | undefined
      const out: LearnItem[] = []
      if (cc?.sections) walkCustom(cc.sections, undefined, out)
      return out
    }
    default:
      return []
  }
}
