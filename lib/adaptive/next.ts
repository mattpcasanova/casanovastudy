// What to practice after an adaptive session ends (pure, unit-tested in
// next.test.ts). The finish screen recommends one next session from how each
// concept went, and offers the other sensible ones:
//   harder       every concept mastered cleanly → same topic, harder questions
//   focus        some concepts not mastered (or mastered shakily) → only those,
//                aimed at the questions the student got wrong
//   foundations  most concepts not mastered → those concepts again, starting
//                from easier building questions
// The choice becomes a homepage prefill (lib/prefill.ts) with format
// 'adaptive' and a difficulty that the prompt turns into a level shift.

import type { GuideDifficulty } from '@/lib/study-options'
import type { AdaptiveGuide } from './format'
import type { AdaptiveAnswer, ConceptProgress } from './engine'

export type NextKind = 'harder' | 'focus' | 'foundations'

export interface NextOption {
  kind: NextKind
  /** Concept names the new session covers. */
  concepts: string[]
  difficulty: GuideDifficulty
  /** Questions the student got wrong on those concepts (latest answer wrong), for the prompt. */
  missed: string[]
}

/** Mastered with at least 80% of all answers right: no need to revisit. */
const STRONG = 0.8

export function recommendNext(guide: AdaptiveGuide, answers: AdaptiveAnswer[], progress: ConceptProgress[]): { recommended: NextOption; others: NextOption[] } {
  const accuracy = (p: ConceptProgress) => (p.answered ? p.correct / p.answered : 0)
  const weak = progress.filter((p) => p.status !== 'mastered')
  const shaky = progress.filter((p) => p.status === 'mastered' && accuracy(p) < STRONG)
  const answered = progress.reduce((n, p) => n + p.answered, 0)
  const overall = answered ? progress.reduce((n, p) => n + p.correct, 0) / answered : 0

  const all = progress.map((p) => p.name)
  const harder: NextOption = { kind: 'harder', concepts: all, difficulty: 'hard', missed: [] }
  const focusOn = weak.length ? weak : shaky
  const focus: NextOption | null = focusOn.length && focusOn.length < progress.length
    ? { kind: 'focus', concepts: focusOn.map((p) => p.name), difficulty: 'standard', missed: missedQuestions(guide, answers, focusOn.map((p) => p.id)) }
    : null
  const foundationsOn = weak.length ? weak : progress
  const foundations: NextOption = { kind: 'foundations', concepts: foundationsOn.map((p) => p.name), difficulty: 'easier', missed: missedQuestions(guide, answers, foundationsOn.map((p) => p.id)) }

  let recommended: NextOption
  if (!weak.length && shaky.length < progress.length / 2) recommended = harder
  else if (weak.length > progress.length / 2 || overall < 0.5) recommended = foundations
  else recommended = focus ?? foundations

  const others = [harder, focus, weak.length ? foundations : null]
    .filter((o): o is NextOption => !!o && o !== recommended)
  return { recommended, others }
}

/** The prompts of questions whose latest answer was wrong, on these concepts (most recent first, max 8). */
export function missedQuestions(guide: AdaptiveGuide, answers: AdaptiveAnswer[], conceptIds: string[]): string[] {
  const ids = new Set(conceptIds)
  const byId = new Map(guide.questions.map((q) => [q.id, q]))
  const latest = new Map<string, boolean>()
  for (const a of answers) latest.set(a.q, a.correct)
  const out: string[] = []
  for (const [id, correct] of [...latest].reverse()) {
    const q = byId.get(id)
    if (correct || !q || q.type === 'explain' || !ids.has(q.conceptId)) continue
    out.push(q.prompt.replace(/\s+/g, ' ').slice(0, 300))
    if (out.length === 8) break
  }
  return out
}

/** Previous next-session suffixes, so titles don't chain ("X: Level up: Focus"). */
export function baseTitle(title: string): string {
  return title.replace(/\s*:\s*(level up|harder practice|focus on .*|foundations|more practice|adaptive practice)\s*$/i, '').trim() || title
}

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`)

/** The text the homepage sends as the study request for the next session. */
export function nextStudyRequest(option: NextOption, title: string): string {
  const topic = baseTitle(title)
  const lines: string[] = []
  if (option.kind === 'harder') {
    lines.push(`${topic}: harder adaptive practice. I already mastered these concepts and want harder, test-level questions: ${option.concepts.join('; ')}.`)
  } else if (option.kind === 'focus') {
    lines.push(`${topic}: focus only on ${option.concepts.join('; ')}. These are the parts I haven't mastered yet.`)
  } else {
    lines.push(`${topic}: build my foundations in ${option.concepts.join('; ')}. Start simple and build up step by step.`)
  }
  if (option.missed.length) {
    lines.push('', 'Questions I got wrong (target the mistakes behind them with new questions; do not repeat them):')
    option.missed.forEach((m) => lines.push(`- ${m}`))
  }
  return lines.join('\n')
}

export function nextTitle(option: NextOption, title: string): string {
  const topic = baseTitle(title)
  if (option.kind === 'harder') return `${topic}: Level up`
  if (option.kind === 'foundations') return `${topic}: Foundations`
  return `${topic}: Focus on ${option.concepts.length === 1 ? option.concepts[0] : `${option.concepts.length} concepts`}`
}

/** One line for the finish screen and the homepage banner. */
export function nextDetail(option: NextOption): string {
  if (option.kind === 'harder') return 'harder questions on everything you just mastered'
  if (option.kind === 'focus') return `${list(option.concepts)}, aimed at what you missed`
  return `easier building questions on ${list(option.concepts)}`
}
