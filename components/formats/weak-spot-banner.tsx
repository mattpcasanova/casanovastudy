"use client"

// "Last time you missed N here": shown at the top of a quiz or practice guide
// when the student's latest answers to some of its items were wrong
// (useGuideHistory). Retry those items right away (free, no AI), or turn them
// into a fresh quiz on the homepage.

import { useState } from "react"
import { RotateCcw, Sparkles, Target, X } from "lucide-react"

export function WeakSpotBanner({ count, topics, noun, onRetry, onNewQuiz }: {
  count: number
  topics: string[]
  noun: "question" | "activity"
  onRetry: () => void
  onNewQuiz: () => void
}) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed || count === 0) return null
  const plural = count === 1 ? noun : noun === "activity" ? "activities" : "questions"
  const about = topics.slice(0, 2).join(" and ")
  return (
    <div role="status" className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-50 to-white p-4 ring-1 ring-inset ring-amber-200 sm:p-5 print:hidden">
      <button type="button" onClick={() => setDismissed(true)} aria-label="Dismiss" className="absolute right-3 top-3 rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-600"><X className="h-4 w-4" /></button>
      <div className="flex gap-3 pr-6">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white"><Target className="h-5 w-5" /></span>
        <div>
          <p className="font-semibold text-slate-900">Last time you missed {count} {plural} here{about ? <>, mostly on {about}</> : null}.</p>
          <p className="text-sm text-slate-600">Go back over them now while they&apos;re fresh.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={onRetry} className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-600"><RotateCcw className="h-4 w-4" />Retry those {count}</button>
            <button type="button" onClick={onNewQuiz} className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-amber-300"><Sparkles className="h-4 w-4 text-amber-500" />New quiz on them</button>
          </div>
        </div>
      </div>
    </div>
  )
}
