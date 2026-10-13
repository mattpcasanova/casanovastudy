// What a class struggles with across all its graded sets, by area. Each set's
// class report (grading_batch_insights) groups its questions into topics; for
// sets in a class the AI reuses the class's existing area names, so the same
// area adds up over the semester. Marks come from each paper's breakdown.
// Pure; unit-tested.

import { normalizeQuestionKey, type GradedQuestion } from '@/lib/grading/parse'

export interface AreaBatch {
  batchId: string
  title: string | null
  createdAt: string
  topics: Array<{ name: string; questions: string[] }>
  papers: Array<{ rosterId: string | null; name: string; breakdown: GradedQuestion[] }>
}

export interface AreaStudent {
  key: string
  name: string
  earned: number
  possible: number
  pct: number
}

export interface ClassArea {
  name: string
  /** Class percent over every graded question in this area. */
  pct: number
  earned: number
  possible: number
  /** Sets that tested this area. */
  sets: number
  /** Latest set's percent minus the earlier sets' (null with one set). */
  trend: number | null
  students: AreaStudent[]
  /** The questions behind it, for practice requests ("Unit 3 test, Q4"). */
  questions: Array<{ set: string; label: string; pct: number }>
}

export const areaKey = (name: string) => name.trim().toLowerCase().replace(/\s+/g, ' ')

export function classAreas(batches: AreaBatch[]): ClassArea[] {
  const areas = new Map<string, {
    name: string
    perSet: Map<string, { earned: number; possible: number; createdAt: string }>
    students: Map<string, AreaStudent>
    questions: Array<{ set: string; label: string; pct: number }>
  }>()

  // Oldest first, so an area keeps the spelling it was first given.
  for (const batch of [...batches].sort((a, b) => a.createdAt.localeCompare(b.createdAt))) {
    const areaOf = new Map<string, string>() // question key -> area key
    for (const t of batch.topics) {
      const k = areaKey(t.name)
      if (!areas.has(k)) areas.set(k, { name: t.name.trim(), perSet: new Map(), students: new Map(), questions: [] })
      for (const q of t.questions) areaOf.set(normalizeQuestionKey(q), k)
    }
    const questionTotals = new Map<string, { label: string; area: string; earned: number; possible: number }>()
    for (const paper of batch.papers) {
      const studentKey = paper.rosterId ?? `name:${paper.name.trim().toLowerCase()}`
      for (const q of paper.breakdown ?? []) {
        const qk = normalizeQuestionKey(q.questionNumber)
        const k = areaOf.get(qk)
        if (!k) continue
        const area = areas.get(k)!
        const earned = Number(q.marksAwarded) || 0
        const possible = Number(q.marksPossible) || 0
        const set = area.perSet.get(batch.batchId) ?? { earned: 0, possible: 0, createdAt: batch.createdAt }
        set.earned += earned
        set.possible += possible
        area.perSet.set(batch.batchId, set)
        const st = area.students.get(studentKey) ?? { key: studentKey, name: paper.name, earned: 0, possible: 0, pct: 0 }
        st.earned += earned
        st.possible += possible
        area.students.set(studentKey, st)
        const qt = questionTotals.get(qk) ?? { label: q.questionNumber, area: k, earned: 0, possible: 0 }
        qt.earned += earned
        qt.possible += possible
        questionTotals.set(qk, qt)
      }
    }
    for (const qt of questionTotals.values()) {
      if (qt.possible > 0) areas.get(qt.area)!.questions.push({ set: batch.title || 'Untitled', label: qt.label, pct: (qt.earned / qt.possible) * 100 })
    }
  }

  const pctOf = (e: number, p: number) => (p > 0 ? (e / p) * 100 : 0)
  return [...areas.values()]
    .map((a) => {
      const sets = [...a.perSet.values()].sort((x, y) => x.createdAt.localeCompare(y.createdAt))
      const earned = sets.reduce((s, x) => s + x.earned, 0)
      const possible = sets.reduce((s, x) => s + x.possible, 0)
      let trend: number | null = null
      if (sets.length > 1) {
        const last = sets[sets.length - 1]
        const before = sets.slice(0, -1)
        trend = pctOf(last.earned, last.possible) - pctOf(before.reduce((s, x) => s + x.earned, 0), before.reduce((s, x) => s + x.possible, 0))
      }
      const students = [...a.students.values()]
        .map((s) => ({ ...s, pct: pctOf(s.earned, s.possible) }))
        .sort((x, y) => x.pct - y.pct)
      return { name: a.name, pct: pctOf(earned, possible), earned, possible, sets: sets.length, trend, students, questions: a.questions.sort((x, y) => x.pct - y.pct) }
    })
    .filter((a) => a.possible > 0)
    .sort((a, b) => a.pct - b.pct)
}

/** Area names a class already uses, most-tested first, for the AI to reuse. */
export function knownAreaNames(topicLists: Array<Array<{ name: string }>>, limit = 30): string[] {
  const counts = new Map<string, { name: string; n: number }>()
  for (const topics of topicLists) {
    for (const t of topics) {
      const k = areaKey(t.name)
      const c = counts.get(k) ?? { name: t.name.trim(), n: 0 }
      c.n += 1
      counts.set(k, c)
    }
  }
  return [...counts.values()].sort((a, b) => b.n - a.n).slice(0, limit).map((c) => c.name)
}
