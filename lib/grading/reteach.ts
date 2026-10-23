// Reteach plan inputs, from a graded set's marks and its class report topics:
// which topics to reteach, and small groups of students by what each needs.
// Groups are worked out here (names stay on our side); the AI only sees
// "Group A: 6 students, weak on limiting reagent". Pure; unit-tested.

import { normalizeQuestionKey, type GradedQuestion } from './parse'
import { questionStats, type ClassInsightsAI } from './insights'

export interface ReteachPaper {
  id: string
  name: string
  rosterId: string | null
  breakdown: GradedQuestion[]
}

export interface TopicScore {
  name: string
  questions: string[]
  /** Class percent on the topic. */
  pct: number
}

export interface ReteachGroup {
  key: string
  kind: 'reteach' | 'practice' | 'extend'
  /** The topic a reteach group works on (null for practice/extend). */
  topic: string | null
  students: Array<{ paperId: string; name: string; rosterId: string | null; pct: number }>
}

const pctOf = (e: number, p: number) => (p > 0 ? (e / p) * 100 : 0)

/** Class percent per topic, weakest first. */
export function topicScores(papers: ReteachPaper[], topics: Array<{ name: string; questions: string[] }>): TopicScore[] {
  return topics.map((t) => {
    const keys = new Set(t.questions.map(normalizeQuestionKey))
    let earned = 0
    let possible = 0
    for (const p of papers) for (const q of p.breakdown) {
      if (!keys.has(normalizeQuestionKey(q.questionNumber))) continue
      earned += Number(q.marksAwarded) || 0
      possible += Number(q.marksPossible) || 0
    }
    return { name: t.name, questions: t.questions, pct: pctOf(earned, possible) }
  }).filter((t) => t.questions.length).sort((a, b) => a.pct - b.pct)
}

/** One student's percent on a topic (null when the topic wasn't on their paper). */
export function studentTopicPct(paper: ReteachPaper, topic: { questions: string[] }): number | null {
  const keys = new Set(topic.questions.map(normalizeQuestionKey))
  let earned = 0
  let possible = 0
  for (const q of paper.breakdown) {
    if (!keys.has(normalizeQuestionKey(q.questionNumber))) continue
    earned += Number(q.marksAwarded) || 0
    possible += Number(q.marksPossible) || 0
  }
  return possible > 0 ? pctOf(earned, possible) : null
}

export const RETEACH_RULES = { maxFocus: 3, needsBelow: 60, readyAtLeast: 80, focusBelow: 80 }

/**
 * Focus topics: the weakest ones the class averaged under 80% on (at most 3),
 * or the given ones. Each student joins at most one group:
 *  - reteach: their weakest focus topic under 60%
 *  - extend: 80%+ on every focus topic
 *  - practice: everyone else
 */
export function reteachGroups(papers: ReteachPaper[], topics: Array<{ name: string; questions: string[] }>, focusNames?: string[]): { focus: TopicScore[]; groups: ReteachGroup[] } {
  const scored = topicScores(papers, topics)
  const focus = focusNames?.length
    ? scored.filter((t) => focusNames.includes(t.name)).slice(0, RETEACH_RULES.maxFocus)
    : scored.filter((t) => t.pct < RETEACH_RULES.focusBelow).slice(0, RETEACH_RULES.maxFocus)
  const pick = focus.length ? focus : scored.slice(0, 1)

  const reteach = new Map<string, ReteachGroup>()
  const practice: ReteachGroup = { key: 'practice', kind: 'practice', topic: null, students: [] }
  const extend: ReteachGroup = { key: 'extend', kind: 'extend', topic: null, students: [] }

  for (const p of papers) {
    const scores = pick.map((t) => ({ t, pct: studentTopicPct(p, t) })).filter((x): x is { t: TopicScore; pct: number } => x.pct !== null)
    if (!scores.length) continue
    const weakest = scores.reduce((a, b) => (b.pct < a.pct ? b : a))
    const overall = scores.reduce((s, x) => s + x.pct, 0) / scores.length
    const student = { paperId: p.id, name: p.name, rosterId: p.rosterId, pct: Math.round(overall) }
    if (weakest.pct < RETEACH_RULES.needsBelow) {
      const g = reteach.get(weakest.t.name) ?? { key: `topic-${reteach.size + 1}`, kind: 'reteach' as const, topic: weakest.t.name, students: [] }
      g.students.push({ ...student, pct: Math.round(weakest.pct) })
      reteach.set(weakest.t.name, g)
    } else if (scores.every((x) => x.pct >= RETEACH_RULES.readyAtLeast)) {
      extend.students.push(student)
    } else {
      practice.students.push(student)
    }
  }

  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name)
  const groups = [...pick.map((t) => reteach.get(t.name)).filter((g): g is ReteachGroup => !!g), practice, extend]
    .filter((g) => g.students.length)
    .map((g) => ({ ...g, students: [...g.students].sort(byName) }))
  return { focus: pick, groups }
}

/** The groups as the AI sees them: sizes and focus, never names. */
export function groupsForPrompt(groups: ReteachGroup[]): string {
  return groups.map((g) => {
    const n = `${g.students.length} student${g.students.length === 1 ? '' : 's'}`
    if (g.kind === 'reteach') return `- ${g.key}: ${n} who scored under 60% on "${g.topic}" (average ${Math.round(g.students.reduce((s, x) => s + x.pct, 0) / g.students.length)}%)`
    if (g.kind === 'extend') return `- ${g.key}: ${n} who scored 80%+ on every focus topic (ready for extension)`
    return `- ${g.key}: ${n} in between (need more practice, not reteaching)`
  }).join('\n')
}

/**
 * The evidence ClaudeService.reteachPlan reads: focus topics, the questions
 * behind them, what students got wrong (feedback, no names), the class
 * report's notes and the group sizes. `questionText` (practice) adds each
 * question's wording and phrases scores as right/wrong.
 */
export function reteachEvidence(papers: ReteachPaper[], insights: ClassInsightsAI, focus: TopicScore[], groups: ReteachGroup[], opts: { questionText?: Map<string, string> } = {}): string {
  const focusKeys = new Set(focus.flatMap((t) => t.questions.map(normalizeQuestionKey)))
  const stats = questionStats(papers.map((p) => ({ id: p.id, name: '', breakdown: p.breakdown }))).filter((s) => focusKeys.has(s.key))
  const evidence: string[] = []
  evidence.push(`FOCUS TOPICS (class percent):\n${focus.map((t) => `- ${t.name}: ${Math.round(t.pct)}% (questions ${t.questions.join(', ')})`).join('\n')}`)
  const text = opts.questionText
  evidence.push(`QUESTIONS:\n${stats.map((s) => {
    const wording = text?.get(s.key)
    return text
      ? `- ${s.label}${wording ? ` "${wording}"` : ''}: ${s.fullCount} of ${s.n} right (${Math.round(s.avgPct)}%)`
      : `- ${s.label}: class average ${Math.round(s.avgPct)}% of ${s.possible} marks, ${s.zeroCount} of ${s.n} scored 0`
  }).join('\n')}`)
  const snippets: string[] = []
  for (const s of stats) {
    const lost = papers
      .map((p) => p.breakdown.find((q) => normalizeQuestionKey(q.questionNumber) === s.key))
      .filter((q): q is GradedQuestion => !!q && q.marksAwarded < q.marksPossible && !!q.explanation)
    lost.slice(0, 4).forEach((q) => snippets.push(`- Q${s.label} (${q.marksAwarded}/${q.marksPossible}): ${q.explanation.slice(0, 240)}`))
  }
  if (snippets.length) evidence.push(`${text ? 'WRONG ANSWERS STUDENTS GAVE' : 'MARKING FEEDBACK FROM STUDENTS WHO LOST MARKS'}:\n${snippets.join('\n')}`)
  const struggles = (insights.struggles ?? []).filter((x) => focusKeys.has(normalizeQuestionKey(x.question)))
  if (struggles.length) evidence.push(`COMMON MISTAKES (class report):\n${struggles.map((x) => `- Q${x.question}: ${x.issue}`).join('\n')}`)
  if (insights.reteach?.length) evidence.push(`CLASS REPORT SUGGESTIONS:\n${insights.reteach.map((r) => `- ${r}`).join('\n')}`)
  evidence.push(`GROUPS FOR THE GROUP-WORK PART:\n${groupsForPrompt(groups)}`)
  return evidence.join('\n\n')
}

/** Topic choices for the reteach options: class percent, with the ones reteachGroups would pick marked. */
export function reteachTopicOptions(papers: ReteachPaper[], topics: Array<{ name: string; questions: string[] }>): Array<{ name: string; pct: number; recommended: boolean }> {
  if (!topics.length) return []
  const recommended = new Set(reteachGroups(papers, topics).focus.map((t) => t.name))
  return topicScores(papers, topics).map((t) => ({ name: t.name, pct: Math.round(t.pct), recommended: recommended.has(t.name) }))
}

export interface ReteachPlanAI {
  title: string
  objectives: string[]
  warmUp: { minutes: number; task: string; lookFor: string }
  miniLesson: { minutes: number; steps: string[]; workedExample: { problem: string; solution: string[] }; misconceptions: Array<{ mistake: string; fix: string }> }
  groups: Array<{ key: string; minutes: number; activity: string; teacherMove: string }>
  exitTicket: Array<{ question: string; answer: string }>
  followUp: string
}

const str = (v: unknown, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : '')
const strs = (v: unknown, n = 10) => (Array.isArray(v) ? v.map((x) => str(x, 800)).filter(Boolean).slice(0, n) : [])
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Math.max(0, Math.round(Number(v))) : 0)

/** The AI's JSON reply, cleaned (anything missing becomes empty, never throws on shape). */
export function parseReteachPlan(raw: string): ReteachPlanAI | null {
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start < 0 || end <= start) return null
  let j: Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  try { j = JSON.parse(raw.slice(start, end + 1)) } catch { return null }
  const plan: ReteachPlanAI = {
    title: str(j.title, 200),
    objectives: strs(j.objectives, 4),
    warmUp: { minutes: num(j.warmUp?.minutes), task: str(j.warmUp?.task), lookFor: str(j.warmUp?.lookFor) },
    miniLesson: {
      minutes: num(j.miniLesson?.minutes),
      steps: strs(j.miniLesson?.steps, 8),
      workedExample: { problem: str(j.miniLesson?.workedExample?.problem), solution: strs(j.miniLesson?.workedExample?.solution, 10) },
      misconceptions: (Array.isArray(j.miniLesson?.misconceptions) ? j.miniLesson.misconceptions : []).slice(0, 6).map((m: Record<string, unknown>) => ({ mistake: str(m?.mistake, 400), fix: str(m?.fix, 400) })).filter((m: { mistake: string }) => m.mistake),
    },
    groups: (Array.isArray(j.groups) ? j.groups : []).slice(0, 6).map((g: Record<string, unknown>) => ({ key: str(g?.key, 40), minutes: num(g?.minutes), activity: str(g?.activity), teacherMove: str(g?.teacherMove, 800) })).filter((g: { key: string }) => g.key),
    exitTicket: (Array.isArray(j.exitTicket) ? j.exitTicket : []).slice(0, 5).map((q: Record<string, unknown>) => ({ question: str(q?.question, 600), answer: str(q?.answer, 600) })).filter((q: { question: string }) => q.question),
    followUp: str(j.followUp, 600),
  }
  return plan.title || plan.objectives.length || plan.miniLesson.steps.length ? plan : null
}
