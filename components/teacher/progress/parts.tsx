"use client"

// Small shared pieces for the teacher progress pages.

import { Minus, TrendingDown, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export const scoreTone = (pct: number) => (pct >= 80 ? "text-emerald-700" : pct >= 65 ? "text-blue-700" : pct >= 50 ? "text-amber-700" : "text-rose-700")
export const scoreBg = (pct: number) => (pct >= 80 ? "bg-emerald-50 text-emerald-700" : pct >= 65 ? "bg-blue-50 text-blue-700" : pct >= 50 ? "bg-amber-50 text-amber-800" : "bg-rose-50 text-rose-700")
export const cellTone = (pct: number) => (pct >= 80 ? "bg-emerald-100 text-emerald-900" : pct >= 65 ? "bg-blue-100 text-blue-900" : pct >= 50 ? "bg-amber-100 text-amber-900" : "bg-rose-100 text-rose-900")
export const bar = (pct: number) => (pct >= 80 ? "bg-emerald-500" : pct >= 65 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-rose-500")

/** "+6" / "-12" with an arrow; the number is the latest set against the earlier ones. */
export function TrendChip({ trend, className, what = "the latest set" }: { trend: number | null; className?: string; what?: string }) {
  if (trend === null) return null
  const n = Math.round(trend)
  const flat = Math.abs(n) < 3
  const Icon = flat ? Minus : n > 0 ? TrendingUp : TrendingDown
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", flat ? "bg-slate-100 text-slate-600" : n > 0 ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700", className)}
      title={`${flat ? "About the same" : n > 0 ? `Up ${n} points` : `Down ${-n} points`} on ${what} compared with the earlier ones`}
    >
      <Icon className="h-3.5 w-3.5" />{flat ? "Steady" : `${n > 0 ? "+" : ""}${n}`}
    </span>
  )
}

export const periodLabel = (c: { name: string; period: string | null }, many: boolean) => (many && c.period ? `Period ${c.period}` : c.name)
