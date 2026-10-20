// Teacher agreement with the AI's marks (pure, unit-tested). Compares the
// breakdown as graded (grading_results.ai_breakdown) with the teacher's final
// one, on reports the teacher reviewed (reviewed_at). Migration 065.

export interface MarkRow { questionNumber: string; marksAwarded: number; marksPossible: number }

export interface AgreementPaper {
  ai: MarkRow[]
  final: MarkRow[]
  /** Group work: copies of one paper share a group id and count once. */
  groupId?: string | null
}

export interface Agreement {
  papers: number
  questions: number
  /** Question marks the teacher left exactly as graded. */
  questionsKept: number
  /** Changed by at most 1 mark. */
  questionsWithin1: number
  /** Papers whose total didn't change. */
  papersUnchanged: number
  /** Mean absolute change in the paper's percentage, in points. */
  meanTotalShift: number
  /** Marks the teacher added (+) or took away (-) overall, as a share of marks possible. */
  netShift: number
}

const label = (q: string) => q.trim().toLowerCase().replace(/^q(uestion)?\s*/, '')
const num = (x: unknown) => (typeof x === 'number' && Number.isFinite(x) ? x : Number(x) || 0)

export function comparePaper(p: AgreementPaper): { questions: number; kept: number; within1: number; aiTotal: number; finalTotal: number; possible: number } {
  const finals = new Map(p.final.map((q) => [label(q.questionNumber), q]))
  let kept = 0
  let within1 = 0
  for (const q of p.ai) {
    const f = finals.get(label(q.questionNumber))
    // A question the teacher deleted counts as changed (by all its marks).
    const diff = Math.abs((f ? num(f.marksAwarded) : 0) - num(q.marksAwarded))
    if (f && diff < 1e-9) kept++
    if (f && diff <= 1 + 1e-9) within1++
  }
  const sum = (rows: MarkRow[], k: 'marksAwarded' | 'marksPossible') => rows.reduce((s, q) => s + num(q[k]), 0)
  return { questions: p.ai.length, kept, within1, aiTotal: sum(p.ai, 'marksAwarded'), finalTotal: sum(p.final, 'marksAwarded'), possible: Math.max(sum(p.ai, 'marksPossible'), sum(p.final, 'marksPossible')) }
}

export function agreement(papers: AgreementPaper[]): Agreement {
  const seenGroups = new Set<string>()
  let n = 0, questions = 0, kept = 0, within1 = 0, unchanged = 0, shift = 0, net = 0, possibleAll = 0
  for (const p of papers) {
    if (!p.ai.length) continue
    if (p.groupId) {
      if (seenGroups.has(p.groupId)) continue
      seenGroups.add(p.groupId)
    }
    const c = comparePaper(p)
    n++
    questions += c.questions
    kept += c.kept
    within1 += c.within1
    if (Math.abs(c.finalTotal - c.aiTotal) < 1e-9) unchanged++
    if (c.possible > 0) shift += (Math.abs(c.finalTotal - c.aiTotal) / c.possible) * 100
    net += c.finalTotal - c.aiTotal
    possibleAll += c.possible
  }
  return {
    papers: n,
    questions,
    questionsKept: kept,
    questionsWithin1: within1,
    papersUnchanged: unchanged,
    meanTotalShift: n ? shift / n : 0,
    netShift: possibleAll ? (net / possibleAll) * 100 : 0,
  }
}

/** "96%" of `part` over `whole`, or null when there's nothing to show. */
export function share(part: number, whole: number): number | null {
  return whole ? Math.round((part / whole) * 1000) / 10 : null
}
