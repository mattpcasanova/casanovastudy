"use client"

// "Picking up where you left off": shown when a saved quiz or practice run was
// put back on screen (useRunProgress). Start over only when the run isn't
// assigned work that will be sent to the teacher (finish it first, then retry).

import { History, RotateCcw } from "lucide-react"

export function ResumeStrip({ done, total, noun, onStartOver }: {
  done: number
  total: number
  noun: "question" | "activity"
  /** Omit on assigned work that counts. */
  onStartOver?: () => void
}) {
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-950 ring-1 ring-inset ring-blue-200 print:hidden">
      <span className="inline-flex min-w-0 flex-1 items-center gap-2">
        <History className="h-4 w-4 shrink-0 text-blue-700" />
        <span><span className="font-semibold">Picking up where you left off.</span> {done} of {total} {noun === "activity" ? "activities" : "questions"} done.</span>
      </span>
      {onStartOver ? (
        <button type="button" onClick={onStartOver} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 font-semibold text-slate-700 ring-1 ring-inset ring-slate-200 hover:ring-blue-300">
          <RotateCcw className="h-4 w-4" /> Start over
        </button>
      ) : (
        <span className="text-blue-800">Your answers are saved as you go. Finish to send it to your teacher.</span>
      )}
    </div>
  )
}
