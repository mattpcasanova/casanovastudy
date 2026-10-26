"use client"

// "How the class did" on the class results page (/grade-exam/batch/[id]): the
// AI summary (topics, common mistakes, what to reteach) over numbers computed
// from every paper's marks (lib/grading/insights.ts). The AI part is written
// once and saved; it's offered again when a mark changes.

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowUpDown, ChevronDown, Lightbulb, Loader2, RefreshCw, ClipboardList } from "lucide-react"
import { normalizeQuestionKey, type GradedQuestion } from "@/lib/grading/parse"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth-fetch"
import { markedConsistently, questionStats, topicStats, type ClassInsightsAI, type PaperForInsights } from "@/lib/grading/insights"
import { isPlanBlock } from "@/lib/plan-rules"
import { usePlan } from "@/components/plan/plan-provider"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"
import { actionButton } from "@/components/grading/grading-ui"

export interface SavedInsights {
  insights: ClassInsightsAI
  current: boolean
  createdAt: string
}

const tone = (pct: number) => (pct < 50 ? "bg-rose-500" : pct < 70 ? "bg-amber-500" : "bg-emerald-500")
const toneText = (pct: number) => (pct < 50 ? "text-rose-700" : pct < 70 ? "text-amber-700" : "text-emerald-700")
/** "Question 2b" / "2b" -> "Q2b"; labels that aren't plain numbers ("Lesson2-Q1") stay as they are. */
const questionChip = (label: string) => {
  const bare = label.replace(/^(question|q\.?)\s*/i, "")
  return /^\d/.test(bare) ? `Q${bare}` : bare
}
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1))

/**
 * Also used for assigned practice (`source="practice"`, components/assign/practice-report.tsx):
 * papers are students' answers scored 1/0, `insightsUrl` points at the
 * assignment's report route and `renderBreakdown` swaps in a question list
 * that shows the questions and the wrong answers students gave.
 */
export function ClassReport({ batchId, papers, saved, insightsUrl, source = "test", actions, renderBreakdown }: {
  batchId?: string
  papers: PaperForInsights[]
  saved: SavedInsights | null
  insightsUrl?: string
  source?: "test" | "practice"
  /** Buttons beside the heading (e.g. the reteach plan). */
  actions?: ReactNode
  renderBreakdown?: (report: ClassInsightsAI | null) => ReactNode
}) {
  const practice = source === "practice"
  const url = insightsUrl ?? `/api/grade-batch/${batchId}/insights`
  const { openPremium } = usePlan()
  const [report, setReport] = useState<SavedInsights | null>(saved)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hardestFirst, setHardestFirst] = useState(true)
  const [showQuestions, setShowQuestions] = useState<boolean | null>(null)

  const stats = useMemo(() => questionStats(papers), [papers])
  // Practice: adaptive runs differ by design, so there's nothing to warn about.
  const consistent = useMemo(() => practice || markedConsistently(papers), [papers, practice])
  const topics = useMemo(() => (report ? topicStats(stats, report.insights.topics) : []), [stats, report])

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(url, { method: "POST" })
      const data = await res.json().catch(() => ({}))
      if (isPlanBlock(data)) { openPremium(data); return }
      if (!res.ok) throw new Error(data.error || "Could not write the class report")
      setReport({ insights: data.insights, current: true, createdAt: data.createdAt })
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not write the class report")
    } finally {
      setLoading(false)
    }
  }

  // Write the report the first time the page is opened.
  const started = useRef(false)
  useEffect(() => {
    if (started.current || saved || !stats.length) return
    started.current = true
    void generate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!stats.length) return null
  // Inconsistently marked papers have dozens of near-duplicate labels: lead with topics and keep the table folded.
  const questionsOpen = showQuestions ?? consistent

  return (
    <section className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className={cn(fontDisplay, "text-3xl font-semibold tracking-tight text-slate-900")}>How the class did</h2>
          <p className="mt-1 text-slate-600">{practice ? "Where students went wrong, by topic and by question (each student's best attempt)." : "Where students lost marks, by topic and by question."}</p>
        </div>
        {actions}
      </div>

      {!consistent && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          These papers weren&apos;t all marked on the same questions (they were graded without a shared answer key), so the per-question numbers are only a rough guide.
        </p>
      )}

      {/* AI summary */}
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-blue-900/10 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold text-slate-900"><ClipboardList className="h-4 w-4 text-blue-600" />Class summary</p>
          {report && !loading && (
            <Button variant="ghost" onClick={() => void generate()} className={actionButton}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />{report.current ? "Write again" : practice ? "Update with the new answers" : "Update for the new marks"}
            </Button>
          )}
        </div>
        {report && !report.current && !loading && <p className="mt-2 text-sm text-amber-800">{practice ? "More students have finished since this was written." : "Some marks changed since this was written."}</p>}

        {loading && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Reading every student&apos;s {practice ? "answers" : "marks and feedback"} (about 15 seconds)…</p>}
        {error && !loading && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-rose-800">
            {error}
            <Button variant="ghost" onClick={() => void generate()} className={actionButton}>Try again</Button>
          </div>
        )}

        {report && !loading && (
          <div className="mt-4 space-y-6">
            {report.insights.summary && <p className="text-[1.05rem] leading-relaxed text-slate-800">{report.insights.summary}</p>}

            {topics.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">By topic</h3>
                <ul className="mt-3 space-y-2.5">
                  {topics.map((t) => (
                    <li key={t.name} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 sm:grid-cols-[14rem_minmax(0,1fr)_3.5rem]">
                      <span className="min-w-0">
                        <span className="block font-medium leading-snug text-slate-900">{t.name}</span>
                        <span className="block truncate text-xs text-slate-500">Questions {t.questions.join(", ")}</span>
                      </span>
                      <span className="order-3 col-span-2 h-2.5 overflow-hidden rounded-full bg-slate-100 sm:order-none sm:col-span-1">
                        <span className={cn("block h-full rounded-full", tone(t.avgPct))} style={{ width: `${Math.max(2, t.avgPct)}%` }} />
                      </span>
                      <span className={cn("text-right text-sm font-semibold tabular-nums", toneText(t.avgPct))}>{Math.round(t.avgPct)}%</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {report.insights.struggles.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">What students got wrong</h3>
                <ul className="mt-3 space-y-3">
                  {report.insights.struggles.map((s) => {
                    const stat = stats.find((q) => q.label.toLowerCase().replace(/^(question|q\.?)\s*/, "") === s.question.toLowerCase().replace(/^(question|q\.?)\s*/, ""))
                    return (
                      <li key={s.question} className="flex gap-3">
                        <span className="mt-0.5 max-w-[9rem] shrink-0 self-start truncate rounded-lg bg-slate-100 px-2 py-0.5 text-sm font-semibold text-slate-700" title={s.question}>{questionChip(s.question)}</span>
                        <span className="text-slate-700">
                          {s.issue}
                          {stat && stat.n >= Math.ceil(papers.length / 2) && <span className={cn("ml-1.5 whitespace-nowrap text-sm font-medium", toneText(stat.avgPct))}>({practice ? `${Math.round(stat.avgPct)}% right` : `class average ${Math.round(stat.avgPct)}%`})</span>}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}

            {report.insights.reteach.length > 0 && (
              <div className="rounded-2xl bg-blue-50 p-4 ring-1 ring-inset ring-blue-100">
                <h3 className="flex items-center gap-2 font-semibold text-blue-900"><Lightbulb className="h-4 w-4" />Worth going over again</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-blue-950">
                  {report.insights.reteach.map((r) => <li key={r}>{r}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Question by question */}
      {renderBreakdown
        ? renderBreakdown(report?.insights ?? null)
        : <QuestionBreakdown papers={papers} stats={stats} report={report?.insights ?? null} open={questionsOpen} onToggle={() => setShowQuestions(!questionsOpen)} hardestFirst={hardestFirst} setHardestFirst={setHardestFirst} />}
    </section>
  )
}

/**
 * Every question, one row each: who got full / part / no marks (a split bar),
 * the class average and the question's topic. Opening a row shows what went
 * wrong, the students in each band (linked to their reports) and the marking
 * feedback from students who lost marks.
 */
function QuestionBreakdown({ papers, stats, report, open, onToggle, hardestFirst, setHardestFirst }: {
  papers: PaperForInsights[]
  stats: ReturnType<typeof questionStats>
  report: ClassInsightsAI | null
  open: boolean
  onToggle: () => void
  hardestFirst: boolean
  setHardestFirst: (v: boolean) => void
}) {
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const key = (l: string) => normalizeQuestionKey(l)
  const topicOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of report?.topics ?? []) for (const q of t.questions) m.set(key(q), t.name)
    return m
  }, [report])
  const issueOf = useMemo(() => new Map((report?.struggles ?? []).map((s) => [key(s.question), s.issue])), [report])

  const rows = useMemo(() => {
    const list = stats.map((q) => {
      const answers = papers.map((p) => ({ paper: p, q: p.breakdown.find((x) => key(x.questionNumber) === q.key) })).filter((a): a is { paper: PaperForInsights; q: GradedQuestion } => !!a.q)
      const full = answers.filter((a) => a.q.marksAwarded >= a.q.marksPossible && a.q.marksPossible > 0)
      const zero = answers.filter((a) => a.q.marksAwarded <= 0)
      const part = answers.filter((a) => !full.includes(a) && !zero.includes(a))
      return { stat: q, topic: topicOf.get(q.key) ?? null, issue: issueOf.get(q.key) ?? null, full, part, zero }
    })
    const filtered = topicFilter ? list.filter((r) => r.topic === topicFilter) : list
    return hardestFirst ? [...filtered].sort((a, b) => a.stat.avgPct - b.stat.avgPct) : filtered
  }, [stats, papers, topicOf, issueOf, topicFilter, hardestFirst])

  const topicNames = [...new Set((report?.topics ?? []).map((t) => t.name))]

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="font-semibold text-slate-900">Question by question <span className="font-normal text-slate-500">({stats.length})</span></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Full marks</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-400" />Some marks</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />No marks</span>
            <span>Click a question for who and why.</span>
          </p>
        </div>
        <div className="flex gap-1">
          {open && (
            <Button variant="ghost" onClick={() => setHardestFirst(!hardestFirst)} className={actionButton}>
              <ArrowUpDown className="mr-2 h-3.5 w-3.5" />{hardestFirst ? "Question order" : "Hardest first"}
            </Button>
          )}
          <Button variant="ghost" onClick={onToggle} className={actionButton}>{open ? "Hide" : "Show"}</Button>
        </div>
      </div>

      {open && topicNames.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-3">
          <button type="button" onClick={() => setTopicFilter(null)} className={cn("rounded-full px-3 py-1 text-xs font-medium", !topicFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>All topics</button>
          {topicNames.map((t) => (
            <button key={t} type="button" onClick={() => setTopicFilter(t === topicFilter ? null : t)} className={cn("rounded-full px-3 py-1 text-xs font-medium", t === topicFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>{t}</button>
          ))}
        </div>
      )}

      {open && (
        <ul className="divide-y divide-slate-100">
          {rows.map((r) => {
            const q = r.stat
            const isOpen = expanded === q.key
            const n = r.full.length + r.part.length + r.zero.length || 1
            return (
              <li key={q.key}>
                <button type="button" onClick={() => setExpanded(isOpen ? null : q.key)} aria-expanded={isOpen} className="grid w-full grid-cols-[4.5rem_minmax(0,1fr)_4rem_1.25rem] items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 sm:grid-cols-[4.5rem_minmax(0,1fr)_11rem_4rem_1.25rem]">
                  <span className="truncate rounded-lg bg-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-800" title={q.label}>{questionChip(q.label)}</span>
                  <span className="min-w-0">
                    <span className="flex h-3 overflow-hidden rounded-full bg-slate-100" aria-label={`${r.full.length} full marks, ${r.part.length} some marks, ${r.zero.length} no marks`}>
                      <span className="bg-emerald-500" style={{ width: `${(r.full.length / n) * 100}%` }} />
                      <span className="bg-amber-400" style={{ width: `${(r.part.length / n) * 100}%` }} />
                      <span className="bg-rose-500" style={{ width: `${(r.zero.length / n) * 100}%` }} />
                    </span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {r.topic ?? "Not grouped"}{r.issue ? " · " : ""}{r.issue && <span className="text-slate-600">{r.issue}</span>}
                    </span>
                  </span>
                  <span className="hidden text-xs text-slate-600 sm:block">{r.full.length} full · {r.part.length} some · {r.zero.length} none</span>
                  <span className={cn("text-right text-sm font-semibold tabular-nums", toneText(q.avgPct))}>{Math.round(q.avgPct)}%</span>
                  <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", isOpen && "rotate-180")} />
                </button>
                {isOpen && (
                  <div className="space-y-4 bg-slate-50/70 px-5 pb-5 pt-1">
                    <p className="text-sm text-slate-700">
                      Worth {q.possible} mark{q.possible === 1 ? "" : "s"}. Class average {fmt(q.avgMarks)} of {q.possible} ({Math.round(q.avgPct)}%).
                      {r.issue && <><br /><span className="font-medium text-slate-900">What went wrong:</span> {r.issue}</>}
                    </p>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      {([["No marks", r.zero, "text-rose-700", "bg-rose-50 ring-rose-200"], ["Some marks", r.part, "text-amber-800", "bg-amber-50 ring-amber-200"], ["Full marks", r.full, "text-emerald-700", "bg-emerald-50 ring-emerald-200"]] as const).map(([label, list, text, box]) => (
                        <div key={label} className={cn("rounded-xl p-3 ring-1 ring-inset", box)}>
                          <p className={cn("text-xs font-semibold uppercase tracking-wide", text)}>{label} ({list.length})</p>
                          <ul className="mt-2 space-y-1.5 text-sm">
                            {list.length === 0 && <li className="text-slate-400">Nobody</li>}
                            {list.map((a) => (
                              <li key={a.paper.id} className="flex justify-between gap-2">
                                <Link href={`/grade-report/${a.paper.id}`} className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg bg-white px-2.5 py-1 font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200">{a.paper.name}</Link>
                                {label === "Some marks" && <span className="shrink-0 tabular-nums text-slate-500">{fmt(a.q.marksAwarded)}/{fmt(a.q.marksPossible)}</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                    {[...r.zero, ...r.part].some((a) => a.q.explanation) && (
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Marking feedback for students who lost marks</p>
                        <ul className="mt-1.5 space-y-1.5 text-sm text-slate-700">
                          {[...r.zero, ...r.part].filter((a) => a.q.explanation).slice(0, 5).map((a) => (
                            <li key={a.paper.id}><span className="font-medium text-slate-900">{a.paper.name}:</span> {a.q.explanation}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
