// The learner profile ("memory"): what a student is strong and weak at, built
// from their answer log (study_results: one row per first answer in quizzes,
// practice and Learn). Pure and unit-tested; used by the Progress page
// (/progress) and by guide generation (learnerHistoryNote) so new guides lean
// on the student's weak spots.

export interface AnswerRow {
  subject: string | null
  topic: string | null
  correct: boolean
  answered_at: string
  study_guide_id?: string | null
  /** `q:<id>` quiz question, `p:<id>` practice activity (lib/learner/missed.ts). */
  item_id?: string | null
}

export interface TopicStat {
  key: string
  subject: string | null
  topic: string
  answered: number
  correct: number
  /** Accuracy over the most recent answers (what "weak" is judged on). */
  recentAccuracy: number
  recentAnswered: number
  lastAt: string
  guideIds: string[]
}

export interface SubjectStat {
  subject: string
  answered: number
  accuracy: number
}

export interface LearnerProfile {
  answered: number
  accuracy: number
  /** Consecutive days with answers, ending today or yesterday. */
  streak: number
  /** Answers per day for the last 14 days, oldest first. */
  last14: number[]
  subjects: SubjectStat[]
  topics: TopicStat[]
  weak: TopicStat[]
  strong: TopicStat[]
}

/**
 * Recent window per topic, the minimum answers before judging, and the bands.
 * A topic with every recent answer wrong counts as weak after just 2 (0 of 2
 * is a clear signal); everything else needs 3.
 */
export const PROFILE_RULES = { recentWindow: 10, minAnswers: 3, allWrongMinAnswers: 2, weakBelow: 0.7, strongAtLeast: 0.8 }

/** Topics are matched per subject, ignoring case. */
export function topicKey(row: { subject: string | null; topic: string | null }): string {
  return `${row.subject ?? ''}::${(row.topic ?? '').trim().toLowerCase()}`
}

const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`

export function buildProfile(rows: AnswerRow[], now = new Date()): LearnerProfile {
  const sorted = [...rows].sort((a, b) => b.answered_at.localeCompare(a.answered_at)) // newest first
  const answered = sorted.length
  const correct = sorted.filter((r) => r.correct).length

  // Activity: streak and the last 14 days.
  const days = new Map<string, number>()
  for (const r of sorted) {
    const k = dayKey(new Date(r.answered_at))
    days.set(k, (days.get(k) ?? 0) + 1)
  }
  const dayAt = (offset: number) => { const d = new Date(now); d.setDate(d.getDate() - offset); return dayKey(d) }
  let streak = 0
  for (let i = days.has(dayAt(0)) ? 0 : 1; days.has(dayAt(i)); i++) streak++
  const last14 = Array.from({ length: 14 }, (_, i) => days.get(dayAt(13 - i)) ?? 0)

  // Subjects.
  const bySubject = new Map<string, { n: number; c: number }>()
  for (const r of sorted) {
    if (!r.subject) continue
    const s = bySubject.get(r.subject) ?? { n: 0, c: 0 }
    s.n++; if (r.correct) s.c++
    bySubject.set(r.subject, s)
  }
  const subjects = [...bySubject].map(([subject, s]) => ({ subject, answered: s.n, accuracy: s.c / s.n })).sort((a, b) => b.answered - a.answered)

  // Topics, judged on their most recent answers so improvement shows.
  const byTopic = new Map<string, AnswerRow[]>()
  for (const r of sorted) {
    if (!r.topic?.trim()) continue
    const key = topicKey(r)
    byTopic.set(key, [...(byTopic.get(key) ?? []), r])
  }
  const topics: TopicStat[] = [...byTopic].map(([key, list]) => {
    const recent = list.slice(0, PROFILE_RULES.recentWindow)
    return {
      key,
      subject: list[0].subject,
      topic: list[0].topic!.trim(),
      answered: list.length,
      correct: list.filter((r) => r.correct).length,
      recentAnswered: recent.length,
      recentAccuracy: recent.filter((r) => r.correct).length / recent.length,
      lastAt: list[0].answered_at,
      guideIds: [...new Set(list.map((r) => r.study_guide_id).filter((id): id is string => !!id))],
    }
  })

  const judged = topics.filter((t) => t.recentAnswered >= PROFILE_RULES.minAnswers)
  const allWrong = topics.filter((t) => t.recentAccuracy === 0 && t.recentAnswered >= PROFILE_RULES.allWrongMinAnswers && t.recentAnswered < PROFILE_RULES.minAnswers)
  // Weakest first; ties go to the topic with more evidence, then the more recent one.
  const weak = [...judged, ...allWrong]
    .filter((t) => t.recentAccuracy < PROFILE_RULES.weakBelow)
    .sort((a, b) => a.recentAccuracy - b.recentAccuracy || b.recentAnswered - a.recentAnswered || b.lastAt.localeCompare(a.lastAt))
  const strong = judged
    .filter((t) => t.recentAccuracy >= PROFILE_RULES.strongAtLeast)
    .sort((a, b) => b.recentAccuracy - a.recentAccuracy || b.recentAnswered - a.recentAnswered)

  return { answered, accuracy: answered ? correct / answered : 0, streak, last14, subjects, topics, weak, strong }
}

const pct = (x: number) => `${Math.round(x * 100)}%`

/**
 * The homepage request for "Quiz me on my weak spots": each topic, and (when
 * known) the exact questions the student missed there, so the new quiz targets
 * those mistakes instead of just the topic name.
 */
export function weakSpotsRequest(
  weak: TopicStat[],
  guideTitles: Record<string, string> = {},
  missedByTopic: Record<string, Array<{ question: string; answer: string }>> = {},
): { studyRequest: string; studyGuideName: string; detail: string; subject?: string } {
  const picks = weak.slice(0, 5)
  const BUDGET = 6800 // the request limit is 8,000 characters
  let used = 0
  const lines: string[] = []
  for (const t of picks) {
    const from = t.guideIds.map((id) => guideTitles[id]).filter(Boolean)[0]
    const head = `- ${t.topic}${from ? ` (from "${from}")` : ''}: ${pct(t.recentAccuracy)} correct on my last ${t.recentAnswered}`
    lines.push(head)
    used += head.length
    const missed = missedByTopic[t.key] ?? []
    if (missed.length) {
      lines.push('  Questions I missed:')
      for (const [i, m] of missed.slice(0, 6).entries()) {
        const line = `  ${i + 1}. ${m.question} (Correct answer: ${m.answer})`
        if (used + line.length > BUDGET) break
        lines.push(line)
        used += line.length
      }
    }
  }
  const anyMissed = picks.some((t) => missedByTopic[t.key]?.length)
  const subjects = [...new Set(picks.map((t) => t.subject).filter(Boolean))]
  return {
    studyRequest: [
      'Make me a practice quiz on the topics I keep getting wrong. Explain each answer clearly and include a few easier warm-up questions before the harder ones.',
      ...lines,
      anyMissed ? 'Write fresh questions that test the same skills as the ones I missed, from different angles (don\'t copy them word for word).' : '',
    ].filter(Boolean).join('\n').slice(0, 7900),
    studyGuideName: picks.length === 1 ? `${picks[0].topic}: Weak Spot Quiz` : 'My Weak Spots Quiz',
    detail: picks.length === 1 ? picks[0].topic : `${picks.length} topics you're weakest on`,
    subject: subjects.length === 1 ? subjects[0]! : undefined,
  }
}

const STOP = new Set(['the', 'and', 'for', 'with', 'from', 'unit', 'quiz', 'test', 'guide', 'practice', 'study', 'about', 'what', 'how', 'into', 'your', 'their', 'this', 'that'])
const words = (s: string) => new Set(s.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 3 && !STOP.has(w)))

/**
 * A short note for the guide prompt about this learner's history in the guide's
 * subject/topic, or '' when there's nothing relevant. Never names the student.
 */
export function learnerHistoryNote(profile: LearnerProfile, ctx: { subject?: string | null; text?: string | null }, use: 'guide' | 'tutor' = 'guide'): string {
  const subject = ctx.subject && ctx.subject !== 'general' ? ctx.subject : null
  const asked = words(ctx.text ?? '')
  const relevant = (t: TopicStat) =>
    (subject && t.subject === subject) || [...words(t.topic)].some((w) => asked.has(w))
  const weak = profile.weak.filter(relevant).slice(0, 5)
  const strong = profile.strong.filter(relevant).slice(0, 3)
  if (!weak.length && !strong.length) return ''
  if (use === 'tutor') {
    return [
      'LEARNER HISTORY (from this student\'s own quiz and practice answers):',
      weak.length ? `- Recently struggling with: ${weak.map((t) => `${t.topic} (${pct(t.recentAccuracy)} of last ${t.recentAnswered})`).join('; ')}.` : '',
      strong.length ? `- Already strong at: ${strong.map((t) => t.topic).join('; ')}.` : '',
      '- If the question touches a topic they struggle with, slow down on the step students usually get wrong there and check that misconception directly. Don\'t list their scores back to them; at most say something like "this is a common slip".',
    ].filter(Boolean).join('\n')
  }
  return [
    'LEARNER HISTORY (from this student\'s own quiz and practice answers; use it, don\'t mention it):',
    weak.length ? `- Recently struggling with: ${weak.map((t) => `${t.topic} (${pct(t.recentAccuracy)} of last ${t.recentAnswered})`).join('; ')}. Where these fall inside this guide's scope, explain them more carefully and give them extra practice.` : '',
    strong.length ? `- Already strong at: ${strong.map((t) => t.topic).join('; ')}. Keep these brief if they come up.` : '',
    '- Still cover everything the guide is about; this only shifts emphasis.',
  ].filter(Boolean).join('\n')
}
