// Teacher progress (/teacher/progress): how a course's classes and students are
// doing across graded sets, assigned practice and the students' own studying,
// and what to focus on next. Rule-based, no AI, no network. Pure; unit-tested.

import { areaKey, classAreas, type AreaBatch, type ClassArea } from '@/lib/classes/areas'
import type { ClassWeakSpot } from '@/lib/classes/weak-spots'

export const PROGRESS_RULES = {
  /** An area under this percent is one to work on. */
  weakBelow: 70,
  /** An area whose latest set is this many points under the earlier ones is falling. */
  fallingBy: 10,
  /** A student whose latest paper is this many points under their earlier ones is slipping. */
  slippingBy: 10,
  /** A student averaging under this is struggling. */
  strugglingBelow: 60,
  /** Papers a student needs before they're called slipping (one can't fall). Struggling shows from the first paper and clears once their average recovers. */
  minPapers: 2,
  /** A period this many points under the course's other periods on the same test is behind. */
  classBehindBy: 10,
  /** Days without a graded set before a class is stale. */
  staleDays: 21,
  /** Assigned practice is a problem when more than this share is missing after the due date. */
  practiceMissingAbove: 0.5,
  /** A topic several linked students are stuck on in their own practice. */
  weakSpotStudents: 3,
  /** Suggestions shown. */
  maxSuggestions: 6,
}

/** One graded paper. */
export interface ScoreRow {
  batchId: string
  classId: string
  title: string | null
  createdAt: string
  rosterId: string | null
  name: string
  pct: number
}

/** One graded set (a batch) in one class. */
export interface SetSummary {
  batchId: string
  classId: string
  title: string | null
  /** When the set was first graded. */
  date: string
  papers: number
  average: number
}

/** Sets from papers, oldest first. */
export function setSummaries(rows: ScoreRow[]): SetSummary[] {
  const sets = new Map<string, SetSummary & { total: number }>()
  for (const r of rows) {
    const s = sets.get(r.batchId) ?? { batchId: r.batchId, classId: r.classId, title: r.title, date: r.createdAt, papers: 0, average: 0, total: 0 }
    s.papers += 1
    s.total += r.pct
    if (r.createdAt < s.date) s.date = r.createdAt
    sets.set(r.batchId, s)
  }
  return [...sets.values()]
    .map(({ total, ...s }) => ({ ...s, average: s.papers ? total / s.papers : 0 }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

export interface Trend {
  /** Mean of the set averages (every set counts the same, whatever its size). */
  average: number | null
  latest: SetSummary | null
  /** Latest set's average minus the mean of the earlier sets' (null with fewer than 2 sets). */
  trend: number | null
}

export function scoreTrend(sets: SetSummary[]): Trend {
  const sorted = [...sets].sort((a, b) => a.date.localeCompare(b.date))
  if (!sorted.length) return { average: null, latest: null, trend: null }
  const mean = (list: SetSummary[]) => list.reduce((s, x) => s + x.average, 0) / list.length
  const latest = sorted[sorted.length - 1]
  const earlier = sorted.slice(0, -1)
  return { average: mean(sorted), latest, trend: earlier.length ? latest.average - mean(earlier) : null }
}

export type StudentWhy = 'slipping' | 'struggling'

export interface StudentTrend {
  /** Roster id, or name:<lowercased name> for a paper not matched to the class list. */
  key: string
  classId: string
  rosterId: string | null
  name: string
  papers: number
  /** Mean of their paper percents (like the student page). */
  average: number
  /** Latest paper minus the mean of the earlier ones (null with one paper). */
  trend: number | null
  why: StudentWhy | null
}

export const studentKey = (rosterId: string | null, name: string) => rosterId ?? `name:${name.trim().toLowerCase()}`

/** Each student's standing in each class, weakest first. */
export function studentTrends(rows: ScoreRow[], rules = PROGRESS_RULES): StudentTrend[] {
  const byStudent = new Map<string, ScoreRow[]>()
  for (const r of rows) {
    const k = `${r.classId}:${studentKey(r.rosterId, r.name)}`
    const list = byStudent.get(k) ?? []
    list.push(r)
    byStudent.set(k, list)
  }
  const out: StudentTrend[] = []
  for (const list of byStudent.values()) {
    const sorted = [...list].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    const mean = (l: ScoreRow[]) => l.reduce((s, x) => s + x.pct, 0) / l.length
    const average = mean(sorted)
    const earlier = sorted.slice(0, -1)
    const trend = earlier.length ? sorted[sorted.length - 1].pct - mean(earlier) : null
    const why: StudentWhy | null = average < rules.strugglingBelow ? 'struggling' : sorted.length >= rules.minPapers && trend !== null && trend <= -rules.slippingBy ? 'slipping' : null
    const first = sorted[0]
    out.push({ key: studentKey(first.rosterId, first.name), classId: first.classId, rosterId: first.rosterId, name: first.name, papers: sorted.length, average, trend, why })
  }
  return out.sort((a, b) => a.average - b.average)
}

export interface CourseArea extends ClassArea {
  /** Percent per class (period) that tested this area. */
  byClass: Record<string, number | undefined>
  /** The latest set that tested it (for its reteach plan). */
  latestBatchId: string | null
}

/** Areas across every class in a course, with each class's own percent. */
export function courseAreas(batches: AreaBatch[]): CourseArea[] {
  const all = classAreas(batches)
  const classIds = [...new Set(batches.map((b) => b.classId).filter((id): id is string => !!id))]
  const perClass = new Map(classIds.map((id) => [id, new Map(classAreas(batches.filter((b) => b.classId === id)).map((a) => [areaKey(a.name), a.pct]))]))
  return all.map((a) => {
    const k = areaKey(a.name)
    const byClass: Record<string, number | undefined> = {}
    for (const [id, areas] of perClass) byClass[id] = areas.get(k)
    const tested = batches.filter((b) => b.topics.some((t) => areaKey(t.name) === k)).sort((x, y) => y.createdAt.localeCompare(x.createdAt))
    return { ...a, byClass, latestBatchId: tested[0]?.batchId ?? null }
  })
}

export interface PracticeSummary {
  id: string
  title: string
  classId: string
  dueAt: string | null
  assigned: number
  done: number
  /** Not done and past the due date. */
  missing: number
}

export type SuggestionAction =
  | { kind: 'practice'; area: string; classId: string; batchId: string | null }
  | { kind: 'reteach'; batchId: string }
  | { kind: 'class'; classId: string; batchId?: string }
  | { kind: 'students' }
  | { kind: 'assignment'; id: string }
  | { kind: 'quiz'; topic: string; subject: string | null }
  | { kind: 'grade' }

export interface Suggestion {
  id: string
  kind: 'area' | 'falling' | 'class-behind' | 'students' | 'practice' | 'stale' | 'own-studying'
  title: string
  detail: string
  score: number
  action: SuggestionAction
}

export interface FocusInput {
  classes: Array<{ id: string; name: string; period: string | null }>
  sets: SetSummary[]
  areas: Array<ClassArea & Partial<Pick<CourseArea, 'byClass' | 'latestBatchId'>>>
  students: StudentTrend[]
  practice: PracticeSummary[]
  weakSpots: ClassWeakSpot[]
  now?: number
}

const n = (x: number) => Math.round(x)
const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`
const classLabel = (c: { name: string; period: string | null } | undefined, many: boolean) => (!c ? '' : many && c.period ? `Period ${c.period}` : c.name)
const firstNames = (names: string[], max = 3) => (names.length <= max ? names.join(', ') : `${names.slice(0, max).join(', ')} and ${names.length - max} more`)

/** What to focus on, best first. */
export function focusSuggestions(input: FocusInput, rules = PROGRESS_RULES): Suggestion[] {
  const now = input.now ?? Date.now()
  const many = input.classes.length > 1
  const classOf = (id: string) => input.classes.find((c) => c.id === id)
  const out: Suggestion[] = []

  // Areas: weak (and maybe falling), or just falling.
  let areaCount = 0
  for (const a of input.areas) {
    const falling = a.trend !== null && a.sets >= 2 && a.trend <= -rules.fallingBy
    const weak = a.pct < rules.weakBelow
    if (!weak && !falling) continue
    // The class that needs it most (lowest percent), else the only class.
    const worst = a.byClass ? Object.entries(a.byClass).filter(([, p]) => p !== undefined).sort((x, y) => (x[1] as number) - (y[1] as number))[0] : undefined
    const classId = worst?.[0] ?? input.classes[0]?.id ?? ''
    const where = many && worst ? ` (${classLabel(classOf(classId), many)} lowest at ${n(worst[1] as number)}%)` : ''
    if (weak) {
      if (areaCount >= 3) continue
      areaCount += 1
      out.push({
        id: `area:${areaKey(a.name)}`,
        kind: 'area',
        title: `${a.name}: ${n(a.pct)}% across ${plural(a.sets, 'graded set')}`,
        detail: `${falling ? `Down ${n(-a.trend!)} points on the latest set. ` : ''}Make practice on it${where}, or open the reteach plan.`,
        score: 20 + (rules.weakBelow - a.pct) + (falling ? 5 : 0),
        action: { kind: 'practice', area: a.name, classId, batchId: a.latestBatchId ?? null },
      })
    } else {
      out.push({
        id: `falling:${areaKey(a.name)}`,
        kind: 'falling',
        title: `${a.name} is slipping: down ${n(-a.trend!)} points on the latest set`,
        detail: `Still ${n(a.pct)}% overall. A quick practice set keeps it from sliding further${where}.`,
        score: 10 + -a.trend!,
        action: { kind: 'practice', area: a.name, classId, batchId: a.latestBatchId ?? null },
      })
    }
  }

  // A period behind the others on the same test.
  if (many) {
    const byTitle = new Map<string, SetSummary[]>()
    for (const s of input.sets) {
      const t = (s.title ?? '').trim().toLowerCase()
      if (!t) continue
      const list = byTitle.get(t) ?? []
      list.push(s)
      byTitle.set(t, list)
    }
    for (const sets of byTitle.values()) {
      const classes = new Set(sets.map((s) => s.classId))
      if (classes.size < 2) continue
      for (const s of sets) {
        const others = sets.filter((o) => o.classId !== s.classId)
        const diff = s.average - others.reduce((sum, o) => sum + o.average, 0) / others.length
        if (diff > -rules.classBehindBy) continue
        out.push({
          id: `behind:${s.batchId}`,
          kind: 'class-behind',
          title: `${classLabel(classOf(s.classId), true)} scored ${n(-diff)} points below your other periods on ${s.title}`,
          detail: `${n(s.average)}% against ${n(s.average - diff)}% elsewhere. Open the set's class report and reteach plan.`,
          score: 12 + -diff,
          action: { kind: 'class', classId: s.classId, batchId: s.batchId },
        })
      }
    }
  }

  // Students slipping or struggling.
  const struggling = input.students.filter((s) => s.why === 'struggling')
  const slipping = input.students.filter((s) => s.why === 'slipping')
  if (struggling.length) {
    out.push({
      id: 'students:struggling',
      kind: 'students',
      title: `${plural(struggling.length, 'student')} averaging under ${rules.strugglingBelow}%`,
      detail: `${firstNames(struggling.map((s) => s.name))}. Open their pages to see which areas, then assign them practice.`,
      score: 100 + Math.min(struggling.length, 10), // students first (Matt): the people before the topics
      action: { kind: 'students' },
    })
  }
  if (slipping.length) {
    out.push({
      id: 'students:slipping',
      kind: 'students',
      title: `${plural(slipping.length, 'student')} dropped ${rules.slippingBy}+ points on the latest test`,
      detail: `${firstNames(slipping.map((s) => s.name))}. Worth a word before the next one.`,
      score: 90 + Math.min(slipping.length, 10),
      action: { kind: 'students' },
    })
  }

  // Assigned practice mostly not done after the due date.
  for (const p of input.practice) {
    if (p.assigned < 2 || p.missing / p.assigned <= rules.practiceMissingAbove) continue
    out.push({
      id: `practice:${p.id}`,
      kind: 'practice',
      title: `${p.missing} of ${p.assigned} haven't done ${p.title}`,
      detail: `${many ? `${classLabel(classOf(p.classId), true)}. ` : ''}It's past due. Remind them, or move the due date.`,
      score: 10 + (p.missing / p.assigned) * 10,
      action: { kind: 'assignment', id: p.id },
    })
  }

  // Students' own studying on this teacher's guides (only those who joined with the code).
  let spots = 0
  for (const w of input.weakSpots) {
    if (w.students < rules.weakSpotStudents || spots >= 2) continue
    spots += 1
    out.push({
      id: `own:${w.key}`,
      kind: 'own-studying',
      title: `${plural(w.students, 'student')} keep missing ${w.topic} on the practice you assigned`,
      detail: `About ${n(w.accuracy * 100)}% right on their recent tries. A short quiz on it would help.`,
      score: 6 + Math.min(w.students, 10),
      action: { kind: 'quiz', topic: w.topic, subject: w.subject },
    })
  }

  // Nothing graded lately.
  const stale: string[] = []
  const never: string[] = []
  for (const c of input.classes) {
    const latest = input.sets.filter((s) => s.classId === c.id).map((s) => s.date).sort().pop()
    if (!latest) never.push(classLabel(c, many))
    else if (now - Date.parse(latest) > rules.staleDays * 86400000) stale.push(classLabel(c, many))
  }
  if (stale.length) {
    out.push({
      id: 'stale',
      kind: 'stale',
      title: `Nothing graded for ${stale.join(', ')} in over ${Math.floor(rules.staleDays / 7)} weeks`,
      detail: 'Trends and areas only update when a set is graded.',
      score: 3,
      action: { kind: 'grade' },
    })
  }
  if (never.length && input.sets.length) {
    out.push({
      id: 'never',
      kind: 'stale',
      title: `No graded sets yet for ${never.join(', ')}`,
      detail: 'Grade a set to see how they compare with your other periods.',
      score: 2,
      action: { kind: 'grade' },
    })
  }

  // Students to watch always lead; the rest by how much they matter.
  return out.sort((a, b) => b.score - a.score).slice(0, rules.maxSuggestions)
}
