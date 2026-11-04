// A bigger question bank for an assigned adaptive guide (server only). The
// guide is written with 4 graded questions per topic; when a teacher asks for
// more questions per topic on an assignment, the missing ones are written once
// here and appended to the teacher's guide as "MORE: k<n>" blocks, so every
// student draws from the same bank (the class report compares them on the same
// questions) and the cost is paid once, not per student. Content is only ever
// appended, so question ids and saved answers stay valid.
//
// Bounded by the guide itself: a topic is only ever filled up to the number
// asked for (at most PER_CONCEPT_PICKS' largest), after which this is a no-op.

import type { SupabaseClient } from '@supabase/supabase-js'
import { ClaudeService } from '@/lib/claude-api'
import { normalizeLanguage } from '@/lib/study-options'
import { detectExam, examInstructions } from '@/lib/exams/profiles'
import { PER_CONCEPT_PICKS } from './engine'
import { parseAdaptive, refillBlock, type AdaptiveQuestion } from './format'

const MAX_PER_CALL = 8
const CONCURRENCY = 3

export interface AdaptiveGuideRow {
  id: string
  title: string
  subject: string | null
  grade_level: string | null
  content: string
  language: string | null
  topic_focus: string | null
  difficulty_level: string | null
}
export const ADAPTIVE_GUIDE_COLUMNS = 'id, user_id, format, title, subject, grade_level, content, language, topic_focus, difficulty_level'

/** The TEST REFERENCE block for a guide written for a known test (lib/exams), so new questions keep its style. */
export function examBlockFor(row: Pick<AdaptiveGuideRow, 'topic_focus' | 'title' | 'subject' | 'difficulty_level'>): string | undefined {
  const match = detectExam([row.topic_focus, row.title].filter(Boolean).join('\n'), row.subject)
  return match ? examInstructions(match, 'adaptive', row.difficulty_level) : undefined
}

const gradedCount = (questions: AdaptiveQuestion[], conceptId: string) => questions.filter((q) => q.conceptId === conceptId && q.type !== 'explain').length

/** How many graded questions each topic is short of `perConcept`. */
export function bankShortfall(content: string, perConcept: number): Array<{ conceptId: string; missing: number }> {
  const guide = parseAdaptive(content)
  return guide.concepts
    .map((c) => ({ conceptId: c.id, missing: perConcept - gradedCount(guide.questions, c.id) }))
    .filter((c) => c.missing > 0)
}

/**
 * Fills every topic of the guide up to `perConcept` graded questions. Returns
 * how many were added and how many topics are still short (a failed write for
 * one topic doesn't stop the others; the session simply ends that topic sooner).
 */
export async function topUpAdaptiveBank(supabase: SupabaseClient, row: AdaptiveGuideRow, perConcept: number): Promise<{ added: number; short: number }> {
  const want = Math.min(perConcept, PER_CONCEPT_PICKS[PER_CONCEPT_PICKS.length - 1])
  const todo = bankShortfall(row.content, want)
  if (!todo.length) return { added: 0, short: 0 }
  const guide = parseAdaptive(row.content)
  const claude = new ClaudeService()
  const blocks = new Map<string, string>()

  const writeFor = async ({ conceptId, missing }: { conceptId: string; missing: number }) => {
    const concept = guide.concepts.find((c) => c.id === conceptId)!
    const existing = guide.questions.filter((q) => q.conceptId === conceptId).map((q) => q.prompt.replace(/\s+/g, ' ').slice(0, 300))
    // A couple more than needed, so the engine has a choice of levels.
    const count = Math.min(MAX_PER_CALL, missing + 2)
    try {
      const { text } = await claude.generateAdaptiveRefill({
        guideTitle: row.title,
        subject: row.subject ?? undefined,
        gradeLevel: row.grade_level ?? undefined,
        concept,
        existing,
        missed: [],
        level: 2,
        spread: true,
        count,
        language: normalizeLanguage(row.language),
        examBlock: examBlockFor(row),
      })
      const fresh = parseAdaptive(`CONCEPT: ${concept.name}\n\n${text}`).questions
        .filter((q) => q.type !== 'explain')
        .slice(0, count)
        .map(({ id: _id, conceptId: _c, ...q }) => q)
      if (fresh.length) blocks.set(conceptId, refillBlock(conceptId, fresh, 'MORE'))
      return fresh.length
    } catch (error) {
      console.error('Adaptive top-up failed for a topic:', error)
      return 0
    }
  }

  let added = 0
  const queue = [...todo]
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (let job = queue.shift(); job; job = queue.shift()) added += await writeFor(job)
  }))
  if (!blocks.size) return { added: 0, short: todo.length }

  // Re-read right before writing so a refill saved in between isn't overwritten.
  const { data: latest } = await supabase.from('study_guides').select('content').eq('id', row.id).single()
  const current = (latest?.content as string | undefined) ?? row.content
  const content = `${current.trimEnd()}\n\n${[...blocks.values()].join('\n\n')}\n`
  const { error } = await supabase.from('study_guides').update({ content }).eq('id', row.id)
  if (error) throw new Error(error.message)
  return { added, short: bankShortfall(content, want).length }
}
