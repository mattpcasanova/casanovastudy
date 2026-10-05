// Class report for a graded batch: how the class did on each question and
// topic. The numbers are computed here from each paper's saved breakdown
// (grading_results.grade_breakdown), so they always match the marks; the AI
// only names topics and summarizes common mistakes (ClaudeService.classInsights).
// Pure and unit-tested.

import { normalizeQuestionKey, type GradedQuestion } from '@/lib/grading/parse'

export interface PaperForInsights {
  id: string
  name: string
  breakdown: GradedQuestion[]
}

export interface QuestionStat {
  key: string
  label: string
  /** Marks available (the most common value across papers). */
  possible: number
  avgMarks: number
  /** Class average as a percent of the marks available. */
  avgPct: number
  /** Papers that include this question. */
  n: number
  zeroCount: number
  fullCount: number
}

export interface TopicStat {
  name: string
  questions: string[]
  avgPct: number
  possible: number
}

/** AI part of the report, saved in grading_batch_insights.data. */
export interface ClassInsightsAI {
  summary: string
  topics: Array<{ name: string; questions: string[] }>
  struggles: Array<{ question: string; issue: string }>
  reteach: string[]
}

const mode = (values: number[]) => {
  const counts = new Map<number, number>()
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1))
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]?.[0] ?? 0
}

/** Per-question stats in paper order (first time each question appears). */
export function questionStats(papers: PaperForInsights[]): QuestionStat[] {
  const byKey = new Map<string, { label: string; awarded: number[]; possible: number[] }>()
  for (const paper of papers) {
    for (const q of paper.breakdown ?? []) {
      const key = normalizeQuestionKey(q.questionNumber)
      if (!key) continue
      const entry = byKey.get(key) ?? { label: q.questionNumber, awarded: [], possible: [] }
      entry.awarded.push(Number(q.marksAwarded) || 0)
      entry.possible.push(Number(q.marksPossible) || 0)
      byKey.set(key, entry)
    }
  }
  return [...byKey.entries()].map(([key, e]) => {
    const possible = mode(e.possible)
    const avgMarks = e.awarded.reduce((s, v) => s + v, 0) / e.awarded.length
    return {
      key,
      label: e.label,
      possible,
      avgMarks,
      avgPct: possible > 0 ? (avgMarks / possible) * 100 : 0,
      n: e.awarded.length,
      zeroCount: e.awarded.filter((v) => v <= 0).length,
      fullCount: e.awarded.filter((v, i) => v >= e.possible[i] && e.possible[i] > 0).length,
    }
  })
}

/**
 * Whether every paper was marked on the same questions and total. Batches
 * graded without a mark scheme (before the shared answer key) often weren't,
 * and per-question comparisons are then only rough.
 */
export function markedConsistently(papers: PaperForInsights[]): boolean {
  if (papers.length < 2) return true
  const shape = (p: PaperForInsights) => {
    const keys = (p.breakdown ?? []).map((q) => normalizeQuestionKey(q.questionNumber)).sort().join('|')
    const total = (p.breakdown ?? []).reduce((s, q) => s + (Number(q.marksPossible) || 0), 0)
    return `${keys}#${total}`
  }
  const first = shape(papers[0])
  return papers.every((p) => shape(p) === first)
}

/** Topic averages, weighted by marks, from the AI's grouping of question labels. */
export function topicStats(stats: QuestionStat[], topics: ClassInsightsAI['topics']): TopicStat[] {
  const byKey = new Map(stats.map((s) => [s.key, s]))
  return topics
    .map((t) => {
      const qs = t.questions.map((l) => byKey.get(normalizeQuestionKey(l))).filter((s): s is QuestionStat => !!s)
      const possible = qs.reduce((s, q) => s + q.possible, 0)
      const marks = qs.reduce((s, q) => s + q.avgMarks, 0)
      return { name: t.name, questions: qs.map((q) => q.label), possible, avgPct: possible > 0 ? (marks / possible) * 100 : 0 }
    })
    .filter((t) => t.questions.length > 0)
    .sort((a, b) => a.avgPct - b.avgPct)
}

/** Changes whenever a paper is added, removed or re-marked, so a saved report can be marked out of date. */
export function insightsSignature(papers: PaperForInsights[]): string {
  return papers
    .map((p) => `${p.id}:${(p.breakdown ?? []).map((q) => `${normalizeQuestionKey(q.questionNumber)}=${q.marksAwarded}/${q.marksPossible}`).join(',')}`)
    .sort()
    .join(';')
}

/**
 * What the AI reads: every question with its class stats and a few feedback
 * snippets (from students who lost marks first, so it can see what went wrong).
 * Students are numbered, never named.
 */
export function insightsInput(papers: PaperForInsights[], stats: QuestionStat[], opts = { perQuestion: 6, snippetChars: 220 }): string {
  const lines: string[] = [`${papers.length} students.`]
  for (const s of stats) {
    lines.push('', `Question ${s.label} (${s.possible} marks): class average ${s.avgMarks.toFixed(1)}/${s.possible} (${Math.round(s.avgPct)}%), ${s.zeroCount} scored 0, ${s.fullCount} full marks.`)
    const notes = papers
      .map((p, i) => ({ i, q: (p.breakdown ?? []).find((q) => normalizeQuestionKey(q.questionNumber) === s.key) }))
      .filter((x): x is { i: number; q: GradedQuestion } => !!x.q && !!x.q.explanation)
      .sort((a, b) => (a.q.marksAwarded / (a.q.marksPossible || 1)) - (b.q.marksAwarded / (b.q.marksPossible || 1)))
      .slice(0, opts.perQuestion)
    for (const { i, q } of notes) {
      lines.push(`- Student ${i + 1} (${q.marksAwarded}/${q.marksPossible}): ${q.explanation.replace(/\s+/g, ' ').slice(0, opts.snippetChars)}`)
    }
  }
  return lines.join('\n')
}

/** Accepts the model's JSON leniently; anything malformed is dropped rather than shown. */
export function parseClassInsights(raw: string): ClassInsightsAI | null {
  try {
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const str = (v: unknown, n: number) => (typeof v === 'string' ? v.trim().slice(0, n) : '')
    const topics = Array.isArray(json.topics)
      ? json.topics
          .map((t: { name?: unknown; questions?: unknown }) => ({ name: str(t?.name, 80), questions: Array.isArray(t?.questions) ? t.questions.map((q: unknown) => String(q).slice(0, 100)) : [] }))
          .filter((t: { name: string; questions: string[] }) => t.name && t.questions.length)
          .slice(0, 12)
      : []
    const struggles = Array.isArray(json.struggles)
      ? json.struggles
          .map((s: { question?: unknown; issue?: unknown }) => ({ question: str(s?.question, 100), issue: str(s?.issue, 500) }))
          .filter((s: { question: string; issue: string }) => s.question && s.issue)
          .slice(0, 8)
      : []
    const reteach = Array.isArray(json.reteach) ? json.reteach.map((r: unknown) => str(r, 300)).filter(Boolean).slice(0, 6) : []
    const summary = str(json.summary, 1200)
    if (!summary && !topics.length && !struggles.length) return null
    return { summary, topics, struggles, reteach }
  } catch {
    return null
  }
}
