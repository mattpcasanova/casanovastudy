"use client"

import { BIG_IDEA_LABELS, BIG_IDEAS, BigIdeaBreakdown } from "@/lib/types/practice-test"
import { cn } from "@/lib/utils"

interface BigIdeaBarsProps {
  breakdown: BigIdeaBreakdown
  // Sort by ascending pct (weakest first) so the teacher sees what to address first.
  sortByWeakest?: boolean
  className?: string
}

function pctColor(pct: number | null): string {
  if (pct === null) return "bg-slate-300 dark:bg-slate-700"
  if (pct < 40) return "bg-red-500"
  if (pct < 60) return "bg-orange-500"
  if (pct < 75) return "bg-amber-500"
  if (pct < 90) return "bg-lime-500"
  return "bg-emerald-500"
}

export function BigIdeaBars({ breakdown, sortByWeakest = true, className }: BigIdeaBarsProps) {
  const rows = BIG_IDEAS.map(bi => {
    const entry = breakdown[String(bi)] ?? { correct: 0, total: 0 }
    const pct = entry.total > 0 ? (entry.correct / entry.total) * 100 : null
    return { bi, label: BIG_IDEA_LABELS[bi], correct: entry.correct, total: entry.total, pct }
  })

  if (sortByWeakest) {
    rows.sort((a, b) => {
      // Empty (no questions) goes last
      if (a.pct === null && b.pct === null) return a.bi - b.bi
      if (a.pct === null) return 1
      if (b.pct === null) return -1
      return a.pct - b.pct
    })
  }

  return (
    <div className={cn("space-y-3", className)}>
      {rows.map(row => (
        <div key={row.bi} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="font-medium text-foreground">{row.label}</span>
            <span className="font-mono text-xs text-muted-foreground tabular-nums">
              {row.total === 0
                ? "no questions"
                : `${row.correct}/${row.total} · ${row.pct!.toFixed(0)}%`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full transition-all", pctColor(row.pct))}
              style={{ width: row.pct === null ? "0%" : `${Math.max(2, row.pct)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
