// Server only: finds the topics an earlier report of the same test already uses.
import type { SupabaseClient } from '@supabase/supabase-js'
import { courseKey } from '@/lib/classes/years'
import { TOPIC_MAP_RULES, topicMapCoverage, type ClassInsightsAI } from '@/lib/grading/insights'

export interface SetForTopics {
  batchId: string
  classId: string | null
  examTitle: string | null
  /** The set's total marks (the same test has the same total). */
  possible: number | null
  /** This set's question labels. */
  labels: string[]
  /** When this set was graded (ISO); now when left out. */
  gradedAt?: string
  /** Only reports written before this time (realigning saved reports). */
  before?: string
}

const mostCommon = (values: number[]) => {
  const counts = new Map<number, number>()
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null
}

/**
 * The topics another period's report already uses for this same test, so every
 * period reports the same areas. The earliest report sets them. "The same
 * test" has to be certain, because titles like "Unit 2" or "12 Page Answer
 * Booklet" repeat: same teacher and course, a different class, the same title
 * and total marks, graded within TOPIC_MAP_RULES.days of each other, and the
 * two sets share nearly all their question labels (both ways).
 */
export async function sharedTopicsFor(supabase: SupabaseClient, userId: string, set: SetForTopics): Promise<ClassInsightsAI['topics'] | null> {
  const title = set.examTitle?.trim()
  if (!set.classId || !title || !set.labels.length || !set.possible) return null
  const at = new Date(set.gradedAt ?? Date.now()).getTime()
  const span = TOPIC_MAP_RULES.days * 86400_000
  const { data: rows } = await supabase.from('grading_results').select('batch_id, class_id, total_possible_marks, created_at')
    .eq('user_id', userId).ilike('exam_title', title.replace(/[%_\\]/g, '\\$&')).not('batch_id', 'is', null).not('class_id', 'is', null)
    .neq('batch_id', set.batchId).neq('class_id', set.classId)
    .gte('created_at', new Date(at - span).toISOString()).lte('created_at', new Date(at + span).toISOString()).limit(2000)
  const byBatch = new Map<string, { classId: string; totals: number[] }>()
  for (const r of rows ?? []) {
    const b = byBatch.get(r.batch_id as string) ?? { classId: r.class_id as string, totals: [] }
    b.totals.push(Number(r.total_possible_marks))
    byBatch.set(r.batch_id as string, b)
  }
  if (!byBatch.size) return null
  const { data: classes } = await supabase.from('classes').select('id, name, course').in('id', [...new Set([set.classId, ...[...byBatch.values()].map((b) => b.classId)])])
  const keyOf = new Map((classes ?? []).map((c) => [c.id as string, courseKey(c.name as string, c.course as string | null)]))
  const mine = keyOf.get(set.classId)
  const siblings = [...byBatch].filter(([, b]) => mine && keyOf.get(b.classId) === mine && mostCommon(b.totals) === set.possible).map(([id]) => id)
  if (!siblings.length) return null
  const { data: saved } = await supabase.from('grading_batch_insights').select('data, created_at').in('batch_id', siblings).eq('user_id', userId).order('created_at', { ascending: true })
  for (const s of saved ?? []) {
    if (set.before && (s.created_at as string) >= set.before) continue
    const topics = (s.data as ClassInsightsAI)?.topics ?? []
    const theirs = topics.flatMap((t) => t.questions)
    if (!topics.length) continue
    // Both ways: the map places our questions, and its questions are ours.
    if (topicMapCoverage(set.labels, topics) >= TOPIC_MAP_RULES.minShare && topicMapCoverage(theirs, [{ name: '', questions: set.labels }]) >= TOPIC_MAP_RULES.minShare) return topics
  }
  return null
}
