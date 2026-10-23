"use client"

// "How the class did" on an assigned practice page (/teacher/practice/[id]):
// the graded-set class report (AI summary, topics) over students' answers,
// plus every question with its wording, the answer, who got it right and
// the wrong answers students gave. Links to the reteach plan.

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowUpDown, ChevronDown, ClipboardList, Loader2 } from "lucide-react"
import { ClassReport, type SavedInsights } from "@/components/grading/class-report"
import { actionButton } from "@/components/grading/grading-ui"
import { authFetch } from "@/lib/auth-fetch"
import { cn } from "@/lib/utils"
import { normalizeQuestionKey } from "@/lib/grading/parse"
import type { ClassInsightsAI, PaperForInsights } from "@/lib/grading/insights"
import type { QuestionResult, ReportStudent } from "@/lib/practice/report"

interface Data {
  format: string | null
  assigned: number
  finished: number
  results: QuestionResult[]
  papers: PaperForInsights[]
  topics: Array<{ name: string; questions: string[] }>
  insights: SavedInsights | null
}

const toneText = (pct: number) => (pct < 50 ? "text-rose-700" : pct < 70 ? "text-amber-700" : "text-emerald-700")

export function PracticeReport({ assignmentId, classId, refreshKey }: { assignmentId: string; classId: string; refreshKey?: unknown }) {
  const [data, setData] = useState<Data | null>(null)
  const [error, setError] = useState("")

  const load = useCallback(async () => {
    const res = await authFetch(`/api/practice-assignments/${assignmentId}/report`, { cache: "no-store" })
    const d = await res.json().catch(() => ({}))
    if (!res.ok) { setError(d.error || "Could not load the class report"); return }
    setData(d)
  }, [assignmentId])
  useEffect(() => { void load() }, [load, refreshKey])

  if (error) return <p className="mt-6 rounded-xl bg-rose-50 p-4 text-sm text-rose-800">{error}</p>
  if (!data) return <p className="mt-10 flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Loading how the class did…</p>
  if (!data.results.length) {
    return (
      <section className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-white p-6 text-slate-600">
        <p className="font-semibold text-slate-900">How the class did</p>
        <p className="mt-1 text-sm">Once students finish, this shows where they went wrong: by topic, question by question with the wrong answers they gave, and a reteach plan with small groups.</p>
      </section>
    )
  }

  return (
    <ClassReport
      // Remount when the data changes so a newly saved summary is picked up.
      key={data.insights?.createdAt ?? "none"}
      papers={data.papers}
      saved={data.insights}
      insightsUrl={`/api/practice-assignments/${assignmentId}/report`}
      source="practice"
      actions={
        <Link href={`/teacher/practice/${assignmentId}/reteach`} className={cn(actionButton, "bg-indigo-50 text-indigo-800 ring-indigo-200 hover:bg-indigo-100 hover:ring-indigo-300")}><ClipboardList />Reteach plan</Link>
      }
      renderBreakdown={(ai) => <PracticeQuestions data={data} ai={ai} classId={classId} />}
    />
  )
}

/** Every question, one row each: right / wrong / blank split, % right, topic; open a row for the wording, answer and who picked what. */
function PracticeQuestions({ data, ai, classId }: { data: Data; ai: ClassInsightsAI | null; classId: string }) {
  const [hardestFirst, setHardestFirst] = useState(true)
  const [topicFilter, setTopicFilter] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)
  const adaptive = data.format === "adaptive"

  const topicOf = useMemo(() => {
    const m = new Map<string, string>()
    for (const t of ai?.topics ?? data.topics) for (const q of t.questions) m.set(normalizeQuestionKey(q), t.name)
    return m
  }, [ai, data.topics])
  const issueOf = useMemo(() => new Map((ai?.struggles ?? []).map((s) => [normalizeQuestionKey(s.question), s.issue])), [ai])
  const topicNames = [...new Set([...topicOf.values()])]

  const rows = useMemo(() => {
    const list = data.results.map((r) => ({ r, topic: topicOf.get(normalizeQuestionKey(r.question.label)) ?? (r.question.topic || null), issue: issueOf.get(normalizeQuestionKey(r.question.label)) ?? null }))
    const filtered = topicFilter ? list.filter((x) => x.topic === topicFilter) : list
    return hardestFirst ? [...filtered].sort((a, b) => a.r.pct - b.r.pct) : filtered
  }, [data.results, topicOf, issueOf, topicFilter, hardestFirst])

  const optionLabel = (r: QuestionResult, given: string | null) => {
    if (!given) return "Answer not saved"
    const i = r.question.options?.findIndex((o) => o.toLowerCase() === given.toLowerCase()) ?? -1
    return i >= 0 ? `${String.fromCharCode(65 + i)}. ${given}` : given
  }
  const names = (list: ReportStudent[]) => (
    <span className="flex flex-wrap gap-1.5">
      {list.map((st) => (
        <Link key={st.rosterId} href={`/teacher/classes/${classId}/students/${st.rosterId}`} className="rounded-lg bg-white px-2.5 py-1 text-sm font-medium text-slate-800 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700 hover:ring-blue-200">{st.name}</Link>
      ))}
    </span>
  )

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-blue-900/10">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-4">
        <div>
          <p className="font-semibold text-slate-900">Question by question <span className="font-normal text-slate-500">({data.results.length})</span></p>
          <p className="mt-0.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" />Right</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-rose-500" />Wrong</span>
            <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-slate-300" />Left blank</span>
            <span>{data.finished} of {data.assigned} finished. Click a question for who picked what.</span>
          </p>
          {adaptive && <p className="mt-1 text-xs text-slate-500">Adaptive practice gives each student different questions, so each one shows how many students answered it.</p>}
        </div>
        <button type="button" onClick={() => setHardestFirst(!hardestFirst)} className={actionButton}>
          <ArrowUpDown className="h-3.5 w-3.5" />{hardestFirst ? "Question order" : "Hardest first"}
        </button>
      </div>

      {topicNames.length > 1 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 px-5 py-3">
          <button type="button" onClick={() => setTopicFilter(null)} className={cn("rounded-full px-3 py-1 text-xs font-medium", !topicFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>All topics</button>
          {topicNames.map((t) => (
            <button key={t} type="button" onClick={() => setTopicFilter(t === topicFilter ? null : t)} className={cn("rounded-full px-3 py-1 text-xs font-medium", t === topicFilter ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200")}>{t}</button>
          ))}
        </div>
      )}

      <ul className="divide-y divide-slate-100">
        {rows.map(({ r, topic, issue }) => {
          const q = r.question
          const isOpen = expanded === q.itemId
          const wrongCount = r.wrong.reduce((n, w) => n + w.students.length, 0)
          const top = r.wrong.find((w) => w.given)
          return (
            <li key={q.itemId}>
              <button type="button" onClick={() => setExpanded(isOpen ? null : q.itemId)} aria-expanded={isOpen} className="grid w-full grid-cols-[3.25rem_minmax(0,1fr)_3.5rem_1.25rem] items-center gap-3 px-5 py-3 text-left hover:bg-slate-50 sm:grid-cols-[3.25rem_minmax(0,1fr)_9rem_3.5rem_1.25rem]">
                <span className="rounded-lg bg-slate-100 px-2 py-1 text-center text-sm font-semibold text-slate-800">Q{q.label}</span>
                <span className="min-w-0">
                  <span className="line-clamp-2 block text-sm text-slate-900 sm:line-clamp-none sm:truncate">{q.text}</span>
                  <span className="mt-1 flex h-2.5 overflow-hidden rounded-full bg-slate-100" aria-label={`${r.right.length} right, ${wrongCount} wrong, ${r.skipped.length} left blank`}>
                    <span className="bg-emerald-500" style={{ width: `${(r.right.length / r.n) * 100}%` }} />
                    <span className="bg-rose-500" style={{ width: `${(wrongCount / r.n) * 100}%` }} />
                    <span className="bg-slate-300" style={{ width: `${(r.skipped.length / r.n) * 100}%` }} />
                  </span>
                  <span className="mt-1 block text-xs text-slate-500 sm:truncate">
                    {topic ?? "No topic"}
                    {top && top.students.length > 1 ? <> · <span className="text-rose-700">{top.students.length} chose “{optionLabel(r, top.given)}”</span></> : issue ? <> · <span className="text-slate-600">{issue}</span></> : null}
                  </span>
                </span>
                <span className="hidden text-xs text-slate-600 sm:block">{r.right.length} of {r.n} right{r.skipped.length ? ` · ${r.skipped.length} blank` : ""}</span>
                <span className={cn("text-right text-sm font-semibold tabular-nums", toneText(r.pct))}>{Math.round(r.pct)}%</span>
                <ChevronDown className={cn("h-4 w-4 text-slate-400 transition", isOpen && "rotate-180")} />
              </button>
              {isOpen && (
                <div className="space-y-4 bg-slate-50/70 px-5 pb-5 pt-1">
                  <div className="text-sm text-slate-800">
                    <p className="whitespace-pre-line">{q.text}</p>
                    {q.options?.length ? (
                      <ol className="mt-2 space-y-0.5 text-slate-700">
                        {q.options.map((o, i) => <li key={i} className={cn(o === q.answer && "font-semibold text-emerald-800")}>{String.fromCharCode(65 + i)}. {o}</li>)}
                      </ol>
                    ) : null}
                    <p className="mt-2"><span className="font-medium text-slate-900">Answer:</span> {q.answer}</p>
                    {issue && <p className="mt-1"><span className="font-medium text-slate-900">What went wrong:</span> {issue}</p>}
                  </div>
                  {r.wrong.length > 0 && (
                    <div className="rounded-xl bg-rose-50 p-3 ring-1 ring-inset ring-rose-200">
                      <p className="text-xs font-semibold uppercase tracking-wide text-rose-700">Wrong ({wrongCount})</p>
                      <ul className="mt-2 space-y-2.5">
                        {r.wrong.map((w) => (
                          <li key={w.given ?? "-"}>
                            <p className="mb-1 text-sm text-slate-900"><span className="font-medium">{optionLabel(r, w.given)}</span> <span className="text-slate-500">· {w.students.length} student{w.students.length === 1 ? "" : "s"}</span></p>
                            {names(w.students)}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {r.skipped.length > 0 && (
                      <div className="rounded-xl bg-slate-100 p-3 ring-1 ring-inset ring-slate-200">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600">Left blank ({r.skipped.length})</p>
                        {names(r.skipped)}
                      </div>
                    )}
                    <div className="rounded-xl bg-emerald-50 p-3 ring-1 ring-inset ring-emerald-200">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-emerald-700">Right ({r.right.length})</p>
                      {r.right.length ? names(r.right) : <p className="text-sm text-slate-500">Nobody</p>}
                    </div>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
