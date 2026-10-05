"use client"

// "How the class did" on the class results page (/grade-exam/batch/[id]): the
// AI summary (topics, common mistakes, what to reteach) over numbers computed
// from every paper's marks (lib/grading/insights.ts). The AI part is written
// once and saved; it's offered again when a mark changes.

import { useEffect, useMemo, useRef, useState } from "react"
import { AlertTriangle, ArrowUpDown, Lightbulb, Loader2, RefreshCw, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { authFetch } from "@/lib/auth-fetch"
import { markedConsistently, questionStats, topicStats, type ClassInsightsAI, type PaperForInsights } from "@/lib/grading/insights"
import { isPlanBlock } from "@/lib/plan-rules"
import { usePlan } from "@/components/plan/plan-provider"
import { fontDisplay } from "@/lib/formats/design"
import { cn } from "@/lib/utils"

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

export function ClassReport({ batchId, papers, saved }: { batchId: string; papers: PaperForInsights[]; saved: SavedInsights | null }) {
  const { openPremium } = usePlan()
  const [report, setReport] = useState<SavedInsights | null>(saved)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hardestFirst, setHardestFirst] = useState(true)
  const [showQuestions, setShowQuestions] = useState<boolean | null>(null)

  const stats = useMemo(() => questionStats(papers), [papers])
  const consistent = useMemo(() => markedConsistently(papers), [papers])
  const topics = useMemo(() => (report ? topicStats(stats, report.insights.topics) : []), [stats, report])
  const ordered = useMemo(() => (hardestFirst ? [...stats].sort((a, b) => a.avgPct - b.avgPct) : stats), [stats, hardestFirst])

  const generate = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await authFetch(`/api/grade-batch/${batchId}/insights`, { method: "POST" })
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
      <h2 className={cn(fontDisplay, "text-3xl font-semibold tracking-tight text-slate-900")}>How the class did</h2>
      <p className="mt-1 text-slate-600">Where students lost marks, by topic and by question.</p>

      {!consistent && (
        <p className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900 ring-1 ring-inset ring-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          These papers weren&apos;t all marked on the same questions (they were graded without a shared mark scheme), so the per-question numbers are only a rough guide.
        </p>
      )}

      {/* AI summary */}
      <div className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl shadow-blue-900/10 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 font-semibold text-slate-900"><Sparkles className="h-4 w-4 text-blue-600" />Class summary</p>
          {report && !loading && (
            <Button variant="outline" size="sm" onClick={() => void generate()}>
              <RefreshCw className="mr-2 h-3.5 w-3.5" />{report.current ? "Write again" : "Update for the new marks"}
            </Button>
          )}
        </div>
        {report && !report.current && !loading && <p className="mt-2 text-sm text-amber-800">Some marks changed since this was written.</p>}

        {loading && <p className="mt-4 flex items-center gap-2 text-sm text-slate-600"><Loader2 className="h-4 w-4 animate-spin" />Reading every student&apos;s marks and feedback (about 15 seconds)…</p>}
        {error && !loading && (
          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-rose-800">
            {error}
            <Button variant="outline" size="sm" onClick={() => void generate()}>Try again</Button>
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
                          {stat && stat.n >= Math.ceil(papers.length / 2) && <span className={cn("ml-1.5 whitespace-nowrap text-sm font-medium", toneText(stat.avgPct))}>(class average {Math.round(stat.avgPct)}%)</span>}
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

      {/* Per-question numbers */}
      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
          <p className="font-semibold text-slate-900">Every question <span className="font-normal text-slate-500">({stats.length})</span></p>
          <div className="flex gap-1">
            {questionsOpen && (
              <Button variant="ghost" size="sm" onClick={() => setHardestFirst((v) => !v)}>
                <ArrowUpDown className="mr-2 h-3.5 w-3.5" />{hardestFirst ? "Question order" : "Hardest first"}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setShowQuestions(!questionsOpen)}>{questionsOpen ? "Hide" : "Show"}</Button>
          </div>
        </div>
        {questionsOpen && <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Question</th>
                <th className="px-4 py-2.5">Class average</th>
                <th className="px-4 py-2.5 text-right">Got 0</th>
                <th className="px-4 py-2.5 text-right">Full marks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {ordered.map((q) => (
                <tr key={q.key}>
                  <td className="px-4 py-2.5 font-medium text-slate-900">{q.label}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-3">
                      <span className="h-2 w-24 shrink-0 overflow-hidden rounded-full bg-slate-100 sm:w-40">
                        <span className={cn("block h-full rounded-full", tone(q.avgPct))} style={{ width: `${Math.max(2, q.avgPct)}%` }} />
                      </span>
                      <span className="whitespace-nowrap tabular-nums text-slate-700">{fmt(q.avgMarks)}/{q.possible} <span className={cn("font-semibold", toneText(q.avgPct))}>({Math.round(q.avgPct)}%)</span></span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{q.zeroCount} of {q.n}</td>
                  <td className="px-4 py-2.5 text-right tabular-nums text-slate-700">{q.fullCount} of {q.n}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>}
      </div>
    </section>
  )
}
