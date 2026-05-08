"use client"

import { use, useEffect, useState } from "react"
import { BigIdeaBars } from "@/components/practice-tests/big-idea-bars"
import { PracticeTestResultsPayload } from "@/lib/types/practice-test"

export default function ColleagueResultsPage({
  params,
}: {
  params: Promise<{ resultsShareToken: string }>
}) {
  const { resultsShareToken } = use(params)
  const [data, setData] = useState<PracticeTestResultsPayload | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch(`/api/practice-tests/results/${resultsShareToken}`)
        const json = await res.json()
        if (cancelled) return
        if (!res.ok) {
          setError(json.error ?? "Could not load results")
          return
        }
        setData(json)
      } catch {
        if (!cancelled) setError("Network error — check your connection and refresh")
      }
    }
    load()
    return () => { cancelled = true }
  }, [resultsShareToken])

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <h1 className="text-2xl font-bold mb-2">Results unavailable</h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    )
  }
  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12 max-w-3xl">
          <p className="text-muted-foreground">Loading…</p>
        </div>
      </div>
    )
  }

  const avg = data.aggregate.avg_score_pct

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-4xl space-y-8">
        <header className="border-b pb-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
            Practice Test · Read-only Results
          </div>
          <h1 className="text-3xl font-bold">{data.test.title}</h1>
          {data.test.description && (
            <p className="text-muted-foreground mt-1">{data.test.description}</p>
          )}
          <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground flex-wrap">
            <div>
              <div className="text-xs uppercase tracking-wide">Submissions</div>
              <div className="text-foreground font-mono text-lg">{data.aggregate.submissions}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide">Questions</div>
              <div className="text-foreground font-mono text-lg">{data.test.question_count}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide">Class average</div>
              <div className="text-foreground font-mono text-lg">
                {avg !== null ? `${avg.toFixed(0)}%` : "—"}
              </div>
            </div>
          </div>
        </header>

        <section>
          <h2 className="text-xl font-semibold mb-4">Class performance by Big Idea</h2>
          {data.aggregate.submissions > 0 ? (
            <div className="border rounded-md p-5">
              <BigIdeaBars breakdown={data.aggregate.big_idea} />
            </div>
          ) : (
            <p className="text-muted-foreground">No submissions yet.</p>
          )}
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4">Submissions</h2>
          {data.submissions.length === 0 ? (
            <p className="text-muted-foreground">No submissions yet.</p>
          ) : (
            <div className="border rounded-md overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-3 py-2 font-medium">Student</th>
                    <th className="text-right px-3 py-2 font-medium">Score</th>
                    <th className="text-right px-3 py-2 font-medium">Percent</th>
                    <th className="text-right px-3 py-2 font-medium">Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {data.submissions.map(s => {
                    const pct = s.score_max > 0 ? (s.score_total / s.score_max) * 100 : 0
                    return (
                      <tr key={s.id} className="border-t">
                        <td className="px-3 py-2">{s.student_name}</td>
                        <td className="px-3 py-2 text-right font-mono">{s.score_total}/{s.score_max}</td>
                        <td className="px-3 py-2 text-right font-mono">{pct.toFixed(0)}%</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">
                          {new Date(s.submitted_at).toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="text-xs text-muted-foreground text-center">
          Read-only view · The owning teacher can rotate this link at any time.
        </p>
      </div>
    </div>
  )
}
