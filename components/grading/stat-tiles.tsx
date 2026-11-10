// Headline numbers at the top of a teacher's data page (class results, a
// course, an assigned practice), and the spread of a class's scores.

import type { ReactNode } from "react"
import { fontDisplay } from "@/lib/formats/design"
import { SCORE_BANDS, scoreBands } from "@/lib/grading/score-bands"
import { cn } from "@/lib/utils"

/** Text color for a percent, the same bands used on score chips everywhere. */
export const scoreText = (pct: number) => (pct >= 80 ? "text-emerald-700" : pct >= 65 ? "text-blue-700" : pct >= 50 ? "text-amber-700" : "text-rose-700")

/** One headline number. `bar` (0-1) draws a thin fill under it; `tone` colors the number. */
export function StatTile({ label, value, hint, bar, tone, extra, className }: {
  label: string; value: string; hint?: ReactNode; bar?: number; tone?: string; extra?: ReactNode; className?: string
}) {
  return (
    <div className={cn("rounded-2xl bg-white p-4 ring-1 ring-slate-200", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn(fontDisplay, "mt-1 flex items-baseline gap-2 text-3xl font-semibold tabular-nums tracking-tight", tone ?? "text-slate-900")}>{value}{extra}</p>
      {bar != null && (
        <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-slate-100" aria-hidden="true">
          <span className={cn("animate-grow block h-full rounded-full", bar >= 1 ? "bg-emerald-500" : "bg-blue-600")} style={{ width: `${Math.round(Math.max(0, Math.min(1, bar)) * 100)}%` }} />
        </span>
      )}
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </div>
  )
}

const BAND_COLORS = ["bg-emerald-500", "bg-blue-500", "bg-amber-400", "bg-rose-500"]
const BANDS = SCORE_BANDS.map((b, i) => ({ ...b, bar: BAND_COLORS[i], dot: BAND_COLORS[i] }))

/** The class's scores as one bar split by band, with the count in each. */
export function ScoreSpread({ percents, className }: { percents: number[]; className?: string }) {
  const counts = scoreBands(percents)
  const total = percents.length
  return (
    <div className={cn("rounded-2xl bg-white p-4 ring-1 ring-slate-200", className)}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Score spread</p>
      {total === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Shows once papers have marks.</p>
      ) : (
        <>
          <div className="mt-3 flex h-3.5 overflow-hidden rounded-full bg-slate-100" role="img" aria-label={BANDS.map((b, i) => `${counts[i]} at ${b.label}`).join(", ")}>
            {BANDS.map((b, i) => counts[i] > 0 && <span key={b.label} className={cn("animate-grow h-full border-r-2 border-white last:border-r-0", b.bar)} style={{ width: `${(counts[i] / total) * 100}%` }} />)}
          </div>
          <ul className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-slate-600 sm:grid-cols-4">
            {BANDS.map((b, i) => (
              <li key={b.label} className={cn("flex items-center gap-1.5", counts[i] === 0 && "text-slate-400")}>
                <span className={cn("h-2.5 w-2.5 shrink-0 rounded-sm", counts[i] ? b.dot : "bg-slate-200")} aria-hidden="true" />
                <span className="font-semibold tabular-nums text-slate-900">{counts[i]}</span>
                <span className="truncate">{b.label}</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
