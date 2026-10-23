// Loads what the assigned-practice class report needs (service role; callers
// check the teacher owns the assignment): the guide's questions and each
// finished student's answers on the attempt that counts (lib/practice/report.ts).

import type { SupabaseClient } from '@supabase/supabase-js'
import { answersFromLog, guideTopics, practicePapers, questionResults, reportAttempt, reportQuestions, sanitizeAnswers, type StudentRun } from './report'
import type { AssignmentRow } from './server'
import { insightsSignature } from '@/lib/grading/insights'
import { normalizeQuestionKey } from '@/lib/grading/parse'

export async function loadPracticeReport(supabase: SupabaseClient, assignment: AssignmentRow) {
  const [{ data: guide }, { data: who }, { data: tries }, { data: cls }] = await Promise.all([
    supabase.from('study_guides').select('id, title, format, content').eq('id', assignment.study_guide_id).maybeSingle(),
    supabase.from('practice_assignment_students').select('roster_id, class_roster(first_name, last_name)').eq('assignment_id', assignment.id),
    supabase.from('practice_attempts').select('roster_id, student_user_id, pct, counted, finished_at, detail').eq('assignment_id', assignment.id).order('finished_at').limit(5000),
    supabase.from('classes').select('id, name, period').eq('id', assignment.class_id).maybeSingle(),
  ])
  const format = (guide?.format as string) ?? ''
  const questions = guide ? reportQuestions(format, (guide.content as string) ?? '') : []

  type Try = { pct: number; counted: boolean; finishedAt: string; userId: string; answers: ReturnType<typeof sanitizeAnswers> }
  const byStudent = new Map<string, Try[]>()
  for (const t of tries ?? []) {
    const list = byStudent.get(t.roster_id as string) ?? []
    list.push({ pct: Number(t.pct), counted: !!t.counted, finishedAt: t.finished_at as string, userId: t.student_user_id as string, answers: sanitizeAnswers((t.detail as { answers?: unknown } | null)?.answers) })
    byStudent.set(t.roster_id as string, list)
  }

  // Attempts from before answers were saved fall back to the answer log.
  const picked = new Map<string, { attempt: Try; after: string | null }>()
  for (const [rosterId, list] of byStudent) {
    const attempt = reportAttempt(list)
    if (!attempt) continue
    const earlier = list.filter((t) => t.finishedAt < attempt.finishedAt).map((t) => t.finishedAt).sort().pop() ?? assignment.created_at
    picked.set(rosterId, { attempt, after: earlier })
  }
  const needLog = [...picked.values()].filter((p) => !p.attempt.answers).map((p) => p.attempt.userId)
  const log = new Map<string, Array<{ item_id: string; correct: boolean; answered_at: string }>>()
  if (needLog.length && guide) {
    const { data: rows } = await supabase
      .from('study_results').select('user_id, item_id, correct, answered_at')
      .eq('study_guide_id', guide.id).in('user_id', [...new Set(needLog)]).in('source', ['quiz', 'practice', 'adaptive'])
      .gte('answered_at', assignment.created_at).limit(10000)
    for (const r of rows ?? []) log.set(r.user_id as string, [...(log.get(r.user_id as string) ?? []), r as { item_id: string; correct: boolean; answered_at: string }])
  }

  const names = new Map((who ?? []).map((w) => {
    const r = (Array.isArray(w.class_roster) ? w.class_roster[0] : w.class_roster) as { first_name: string; last_name: string } | null
    return [w.roster_id as string, `${r?.first_name ?? ''} ${r?.last_name ?? ''}`.trim() || 'Student'] as const
  }))
  const runs: StudentRun[] = []
  for (const [rosterId, { attempt, after }] of picked) {
    if (!names.has(rosterId)) continue // unassigned since
    const answers = attempt.answers ?? answersFromLog(log.get(attempt.userId) ?? [], after, attempt.finishedAt)
    if (!answers.length) continue
    runs.push({ rosterId, name: names.get(rosterId)!, answers, complete: format !== 'adaptive' })
  }
  runs.sort((a, b) => a.name.localeCompare(b.name))

  const papers = practicePapers(questions, runs)
  const results = questionResults(questions, runs)
  return {
    guide: guide ? { id: guide.id as string, title: guide.title as string, format } : null,
    className: cls ? `${cls.name}${cls.period ? ` (P${cls.period})` : ''}` : null,
    classId: assignment.class_id,
    assigned: names.size,
    questions,
    runs,
    papers,
    results,
    topics: guideTopics(questions),
    signature: insightsSignature(papers),
    questionText: new Map(questions.map((q) => [normalizeQuestionKey(q.label), q.text.slice(0, 200)])),
  }
}
